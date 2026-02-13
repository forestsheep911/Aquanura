#!/usr/bin/env node
/* global fetch */
const path = require('node:path');
const { spawn } = require('node:child_process');
const fs = require('fs-extra');
const ora = require('ora');
const chalk = require('chalk');
const { transformSync } = require('esbuild');
const { certificateFor } = require('../toolkit/cert');
const { uploadPlugin } = require('../toolkit/kintone');
const {
  getManifestValidateMode,
  validateManifest,
  formatValidationResult,
} = require('../toolkit/plugin/manifest-validate');
const { loadEnv } = require('../toolkit/runtime/env');
const i18n = require('../toolkit/i18n');
const {
  findRepoRoot,
  resolvePluginRoot,
  resolvePluginManifestPath,
  resolvePluginDistDir,
} = require('../toolkit/runtime/paths');
let createServer;

const repoRoot = findRepoRoot();
loadEnv({ path: path.join(repoRoot, '.env') });
const pluginRoot = resolvePluginRoot({ repoRoot });
const pluginDistDir = resolvePluginDistDir({ repoRoot, pluginRoot });
const manifestPath = resolvePluginManifestPath({ repoRoot, pluginRoot });

// Local file logging system
let devLogFile = null;
const logWriteQueue = [];
let logWriting = false;

async function writeToDevLog(message, level = 'INFO') {
  if (!devLogFile) return;

  const timestamp = new Date().toISOString();
  const logEntry = {
    ts: timestamp,
    level,
    message: typeof message === 'string' ? message : JSON.stringify(message),
  };

  logWriteQueue.push(logEntry);

  if (!logWriting) {
    logWriting = true;
    while (logWriteQueue.length > 0) {
      const entry = logWriteQueue.shift();
      try {
        await fs.appendFile(devLogFile, `${JSON.stringify(entry)}\n`);
      } catch (error) {
        // Only output to console when file write fails
        console.error('[vite-dev] Failed to write log file:', error?.message || error);
      }
    }
    logWriting = false;
  }
}

function devLog(message) {
  writeToDevLog(message, 'INFO').catch(() => { });
}

function devWarn(message) {
  writeToDevLog(message, 'WARN').catch(() => { });
}

function devError(message, error) {
  const fullMessage = error ? `${message}: ${error?.message || error}` : message;
  writeToDevLog(fullMessage, 'ERROR').catch(() => { });
  // Errors are still output to console
  console.error(`[vite-dev] ${fullMessage}`);
}

// ============================================================
// 依赖图：用于增量编译
// ============================================================

// 源文件 -> 依赖它的入口集合
const fileToEntries = new Map();
// 入口文件 -> 它依赖的所有源文件
const entryToFiles = new Map();

/**
 * 规范化模块路径，提取相对于 src 目录的路径
 * @param {string} modulePath - 模块绝对路径或相对路径
 * @returns {string|null} - 规范化后的相对路径，或 null（如果是 node_modules）
 */
function normalizeModulePath(modulePath) {
  if (!modulePath) return null;
  // 跳过 node_modules
  if (modulePath.includes('node_modules')) return null;
  // 跳过虚拟模块
  if (modulePath.startsWith('\0')) return null;

  // 转换为正斜杠
  const normalized = modulePath.replace(/\\/g, '/');

  // 提取 src/ 之后的部分
  const srcIndex = normalized.indexOf('/src/');
  if (srcIndex !== -1) {
    return `src${normalized.slice(srcIndex + 4)}`;
  }

  // 如果路径已经是相对路径（以 src/ 开头）
  if (normalized.startsWith('src/')) {
    return normalized;
  }

  return null;
}

/**
 * 规范化变化文件的路径
 * @param {string} changedFile - 变化文件的相对路径
 * @returns {string} - 规范化后的路径
 */
function normalizeFilePath(changedFile) {
  return changedFile.replace(/\\/g, '/');
}

/**
 * 更新依赖图
 * @param {string} entryRel - 入口文件相对路径 (如 'js/desktop.js')
 * @param {string[]} modulePaths - 该入口依赖的所有模块路径
 */
function updateDependencyGraph(entryRel, modulePaths) {
  // 清除该入口的旧依赖
  const oldFiles = entryToFiles.get(entryRel) || new Set();
  for (const file of oldFiles) {
    const entries = fileToEntries.get(file);
    if (entries) {
      entries.delete(entryRel);
      if (entries.size === 0) {
        fileToEntries.delete(file);
      }
    }
  }

  // 建立新依赖
  const newFiles = new Set();
  for (const modulePath of modulePaths) {
    const normalized = normalizeModulePath(modulePath);
    if (!normalized) continue;

    newFiles.add(normalized);
    if (!fileToEntries.has(normalized)) {
      fileToEntries.set(normalized, new Set());
    }
    fileToEntries.get(normalized).add(entryRel);
  }

  entryToFiles.set(entryRel, newFiles);
}

/**
 * 查找受影响的入口文件
 * @param {string} changedFile - 变化文件的相对路径
 * @returns {Set<string>|null} - 受影响的入口集合，或 null（表示需要全量编译）
 */
function getAffectedEntries(changedFile) {
  const normalized = normalizeFilePath(changedFile);
  const affected = fileToEntries.get(normalized);

  if (!affected || affected.size === 0) {
    // 未知文件变化，保守策略：返回 null 表示全量编译
    return null;
  }

  return new Set(affected);
}

/**
 * 清空依赖图（用于全量重建时）
 */
function clearDependencyGraph() {
  fileToEntries.clear();
  entryToFiles.clear();
}

// ============================================================

async function createReactPlugin() {
  const mod = await import('@vitejs/plugin-react');
  const react = mod?.default;
  if (typeof react !== 'function') {
    throw new TypeError('Invalid @vitejs/plugin-react export: expected a default function.');
  }
  return react({
    jsxRuntime: 'classic',
    include: [/\.(jsx|tsx|js)$/],
  });
}

async function maybeUpload({
  pluginZipPath,
  pluginId: buildPluginId,
  zipBuffer,
  pluginRoot: overridePluginRoot,
}) {
  const baseUrl = process.env.KINTONE_DEV_BASE_URL;
  const username = process.env.KINTONE_DEV_USERNAME;
  const password = process.env.KINTONE_DEV_PASSWORD;

  if (!baseUrl) {
    devWarn('DEV_UPLOAD=true but KINTONE_DEV_BASE_URL is not set, skipping auto-upload');
    return;
  }

  if (!(username && password)) {
    devWarn('DEV_UPLOAD=true but username/password missing (plugin upload requires admin privileges), skipping auto-upload');
    return;
  }

  const clientOptions = {
    baseUrl,
    auth: { username, password },
  };

  let pluginId = buildPluginId;
  if (!pluginId) {
    try {
      const { getPublicKeyDer, generatePluginId } = require('../toolkit/plugin/rsa');
      const resolvedPluginRoot = overridePluginRoot || pluginRoot;
      const ppkPath = path.join(resolvedPluginRoot, 'private.ppk');
      if (await fs.pathExists(ppkPath)) {
        const ppkContent = await fs.readFile(ppkPath, 'utf-8');
        const publicKey = getPublicKeyDer(ppkContent);
        pluginId = generatePluginId(publicKey);
        devLog(`Auto-inferred plugin ID: ${pluginId}`);
      }
    } catch (error) {
      devWarn(`Failed to infer plugin ID from private.ppk: ${error?.message || error}`);
    }
  }

  let pluginBuffer = zipBuffer;
  let pluginName = 'plugin-dev.zip';

  if (!pluginBuffer) {
    if (!pluginZipPath) {
      devWarn('Missing plugin package path, cannot perform auto-upload');
      return;
    }

    if (!(await fs.pathExists(pluginZipPath))) {
      devWarn(`Plugin package not found: ${pluginZipPath}, please run pnpm build:vite first`);
      return;
    }

    pluginBuffer = await fs.readFile(pluginZipPath);
  }

  if (pluginZipPath) {
    pluginName = path.basename(pluginZipPath);
  }

  try {
    await uploadPlugin({
      clientOptions,
      pluginId,
      file: { name: pluginName, data: pluginBuffer },
    });
    devLog('Plugin auto-uploaded to dev environment');
  } catch (error) {
    devError('Auto-upload failed', error);
  }
}

const forceJsxPlugin = {
  name: 'force-jsx-loader',
  enforce: 'pre',
  transform(code, id) {
    if (!id.endsWith('.js')) return null;
    if (id.includes('node_modules')) return null;
    const result = transformSync(code, {
      loader: 'jsx',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
    });
    return { code: result.code, map: null };
  },
};

const DEFAULT_LAZY_WINDOW_MS = 10 * 1000; // 10 seconds
const durationMultipliers = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
};

const parseDurationMs = (value, defaultUnit = 's') => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim().toLowerCase();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d+(?:\.\d+)?)(ms|s|m|h)?$/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  const unit = match[2] || defaultUnit;
  const multiplier = durationMultipliers[unit];
  if (!multiplier) return null;
  const result = amount * multiplier;
  if (!Number.isFinite(result) || result <= 0) {
    return null;
  }
  return Math.round(result);
};

const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) return `${ms}ms`;
  if (ms % durationMultipliers.h === 0) return `${ms / durationMultipliers.h}h`;
  if (ms % durationMultipliers.m === 0) return `${ms / durationMultipliers.m}m`;
  if (ms % durationMultipliers.s === 0) return `${ms / durationMultipliers.s}s`;
  return `${ms}ms`;
};

(async () => {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`Usage:
  pnpm dev --mode lazy 17s
  node logistics/plugin-deploy/vite/dev.js --mode lazy 17s

Options:
  --help          Show this message and exit
  --mode [instant|lazy [quietWindow]]
                  Configure rebuild scheduling
                  Examples:
                    --mode instant          (immediate rebuild, default)
                    --mode lazy            (lazy compilation with default 10s quiet window)
                    --mode lazy 17s        (lazy compilation with 17s quiet window)
                    --mode lazy 5m         (lazy compilation with 5 minutes quiet window)
                    --mode lazy 2h         (lazy compilation with 2 hours quiet window)

Keyboard Shortcuts:
  r               Rebuild JS immediately (skip lazy quiet window)
  m               Repackage/re-upload manifest only (fast path)
  u               Full rebuild + manifest repackage/re-upload
  q               Exit dev server

Smart Reload:
  Code changes: incremental build + hot update.
  manifest.json changes: full rebuild + repackage (safe default).

  VITE_PORT       Override dev server port (default 3000)
  VITE_HOST       Override dev server host (default 127.0.0.1)
  VITE_LOG_LEVEL Set Vite log level (info|warn|error|silent)

Environment Variables:
  DEV_MODE           Default dev mode (instant|lazy)
  DEV_LAZY_WINDOW    Quiet window for lazy mode (e.g. 45s, 5m, 2h)
  DEV_HTTPS_DOMAINS  Comma-separated additional domains for the certificate
  DEV_UPLOAD         Upload built plugin.zip after dev server starts (requires Kintone creds)
  PLUGIN_FILE_PATH   Override path to plugin zip used for auto-upload
`);
    process.exit(0);
  }

  const findModeFlag = () => {
    for (let i = 0; i < argv.length; i += 1) {
      const arg = argv[i];
      if (arg === '--mode') {
        return { provided: true, value: argv[i + 1], durationIndex: i + 2 };
      }
      if (arg?.startsWith('--mode=')) {
        const [, rawValue = ''] = arg.split('=');
        return { provided: true, value: rawValue, durationIndex: i + 1 };
      }
    }
    return { provided: false, value: null, durationIndex: -1 };
  };

  const envLazyWindowRaw = process.env.DEV_LAZY_WINDOW;
  const envLazyWindowMs = parseDurationMs(envLazyWindowRaw);
  if (envLazyWindowRaw && !envLazyWindowMs) {
    console.warn(
      `[vite-dev] DEV_LAZY_WINDOW="${envLazyWindowRaw}" cannot be parsed, will use ${formatDuration(
        DEFAULT_LAZY_WINDOW_MS,
      )}`,
    );
  }
  let lazyQuietWindowMs = envLazyWindowMs ?? DEFAULT_LAZY_WINDOW_MS;
  let lazyWindowSource = envLazyWindowMs
    ? `DEV_LAZY_WINDOW=${envLazyWindowRaw}`
    : `default ${formatDuration(DEFAULT_LAZY_WINDOW_MS)}`;

  const rawDevModeEnv = process.env.DEV_MODE || '';
  const envModeRaw = rawDevModeEnv.trim().toLowerCase();
  const truthyLegacyModes = new Set(['true', '1', 'yes', 'on']);
  const falsyLegacyModes = new Set(['false', '0', 'off', 'no']);
  let devMode = 'instant';
  let modeSource = 'default';
  if (envModeRaw) {
    if (envModeRaw === 'lazy' || envModeRaw === 'instant') {
      devMode = envModeRaw;
      modeSource = `DEV_MODE=${envModeRaw}`;
    } else if (truthyLegacyModes.has(envModeRaw) || falsyLegacyModes.has(envModeRaw)) {
      modeSource = `DEV_MODE=${envModeRaw}`;
    } else {
      console.warn(`[vite-dev] DEV_MODE="${rawDevModeEnv}" not recognized, will use instant mode`);
    }
  }
  const modeFlag = findModeFlag();
  if (modeFlag.provided) {
    const normalized = String(modeFlag.value || '').trim().toLowerCase();
    if (normalized === 'lazy' || normalized === 'instant') {
      devMode = normalized;
      modeSource = '--mode';
    } else if (normalized) {
      console.warn(
        `[vite-dev] Unknown --mode option "${modeFlag.value}", will continue using ${devMode} mode`,
      );
    } else {
      console.warn('[vite-dev] --mode requires instant or lazy to be specified');
    }
    if (devMode === 'lazy' && modeFlag.durationIndex >= 0) {
      const durationCandidate = argv[modeFlag.durationIndex];
      if (durationCandidate && !durationCandidate.startsWith('-')) {
        const parsed = parseDurationMs(durationCandidate);
        if (parsed) {
          lazyQuietWindowMs = parsed;
          lazyWindowSource = `--mode ${durationCandidate}`;
        } else {
          console.warn(
            `[vite-dev] Cannot parse quiet window "${durationCandidate}", continuing with ${formatDuration(
              lazyQuietWindowMs,
            )}`,
          );
        }
      }
    }
  }
  const isLazyMode = devMode === 'lazy';

  const QUIET = String(process.env.QUIET || 'false').toLowerCase() === 'true';

  if (QUIET) {
    const originalLog = console.log;
    const originalWarn = console.warn;
    console.log = (...args) => {
      const first = String(args[0] || '');
      if (first.startsWith("The CJS build of Vite's Node API is deprecated")) return;
      return originalLog.apply(console, args);
    };
    console.warn = (...args) => {
      const first = String(args[0] || '');
      if (first.startsWith("The CJS build of Vite's Node API is deprecated")) return;
      return originalWarn.apply(console, args);
    };
  }

  // Use ESM import to avoid Vite's deprecated CJS Node API warning.
  ({ createServer } = await import('vite'));
  const reactPlugin = await createReactPlugin();

  const logLevel = process.env.VITE_LOG_LEVEL || (QUIET ? 'silent' : 'error');
  const resolveLogDir = () => {
    const envLogDir = process.env.DEV_LOG_DIR;
    if (envLogDir) {
      return path.isAbsolute(envLogDir) ? envLogDir : path.join(repoRoot, envLogDir);
    }
    return path.join(repoRoot, 'log');
  };

  // Initialize log file
  const logDir = resolveLogDir();
  await fs.ensureDir(logDir);
  devLogFile = path.join(logDir, 'dev.log');
  const modeDescription = isLazyMode
    ? `Lazy compilation mode enabled, quiet window ${formatDuration(lazyQuietWindowMs)} (${modeSource}, ${lazyWindowSource})`
    : `Instant compilation mode (${modeSource})`;
  devLog(modeDescription);
  if (isLazyMode) {
    devLog('Tip: Press r to manually skip quiet window and rebuild immediately');
  }
  const readRequestJson = (req) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      req.on('end', () => {
        if (!chunks.length) {
          resolve({});
          return;
        }
        try {
          const raw = Buffer.concat(chunks).toString('utf8');
          resolve(raw ? JSON.parse(raw) : {});
        } catch (error) {
          reject(error);
        }
      });
      req.on('error', reject);
    });
  const sendJson = (res, statusCode, payload) => {
    if (res.writableEnded) return;
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
  };
  let devPluginId = null;
  let lastChange = Date.now();
  const attachPluginId = (entry) => {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      if (!entry.pluginId && devPluginId) {
        return { ...entry, pluginId: devPluginId };
      }
      return { ...entry };
    }
    const enriched = { message: entry };
    if (devPluginId) {
      enriched.pluginId = devPluginId;
    }
    return enriched;
  };
  const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  const allowLocalLog = !isProduction && process.env.DEV_LOCAL_LOG_ENABLED !== 'false';
  const extraDomains = (process.env.DEV_HTTPS_DOMAINS || '')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
  const httpsConfig = certificateFor(extraDomains);
  const preferPort = Number(process.env.VITE_PORT || 3000);
  let actualPort = preferPort;

  const manifestValidateMode = getManifestValidateMode();
  const pluginDir = path.dirname(manifestPath);

  let manifest = await fs.readJSON(manifestPath);
  let manifestVersion = String(manifest.version ?? '');

  const printManifestValidation = (validation, { prefix, strictHint } = {}) => {
    const { warnings, errors } = formatValidationResult(validation);

    if (warnings.length > 0) {
      console.warn(
        chalk.yellow(`${prefix} Manifest validation warnings (${warnings.length}):`),
      );
      for (const warning of warnings) {
        console.warn(chalk.yellow(`- ${warning}`));
      }
    }

    if (!validation.valid) {
      console.error(chalk.red(`${prefix} Manifest validation failed: ${manifestPath}`));
      console.error(chalk.red('Invalid manifest.json:'));
      for (const error of errors) {
        console.error(chalk.red(`- ${error}`));
      }
      if (strictHint) {
        console.error(chalk.gray(strictHint));
      }
    }
  };

  const validateCurrentManifest = ({ prefix, strictHint } = {}) => {
    if (manifestValidateMode === 'off') {
      return { valid: true, warnings: [], errors: [] };
    }
    const validation = validateManifest({ manifest, pluginDir });
    printManifestValidation(validation, { prefix, strictHint });
    return validation;
  };

  // Fail fast before starting the dev server / generating the dev plugin.
  const initialValidation = validateCurrentManifest({
    prefix: '[vite-dev]',
    strictHint: 'Fix the manifest and re-run `pnpm dev`.',
  });
  if (!initialValidation.valid && manifestValidateMode === 'strict') {
    process.exit(1);
  }
  if (initialValidation.valid) {
    console.log(i18n.t('vite.manifest_valid'));
  }

  const server = await createServer({
    root: pluginRoot,
    plugins: [forceJsxPlugin, reactPlugin],
    logLevel,
    customLogger: QUIET
      ? {
        info() { },
        warn() { },
        warnOnce() { },
        error(msg) {
          console.error(msg);
        },
        success() { },
        clearScreen() { },
        hasWarned: false,
      }
      : undefined,
    esbuild: {
      loader: 'jsx',
      include: /\.js$/,
      exclude: [],
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    server: {
      host: process.env.VITE_HOST || '127.0.0.1',
      port: preferPort,
      https: { key: httpsConfig.key, cert: httpsConfig.cert },
      cors: true,
    },
    appType: 'custom',
    define: {
      // Endpoint path constants, concatenated with location.origin at runtime
      __DEV_LOG_ENDPOINT__: JSON.stringify('/__devlog'),
      __DEV_LIVE_ENDPOINT__: JSON.stringify('/__live'),
      __PLUGIN_VERSION__: JSON.stringify(manifestVersion),
      // Development log toggle control (read from environment variables)
      __DEV_LOCAL_LOG_ENABLED__: JSON.stringify(process.env.DEV_LOCAL_LOG_ENABLED !== 'false'),
    },
  });

  server.middlewares.use('/__devlog', async (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
    if (req.method !== 'POST') {
      return next();
    }
    if (!allowLocalLog) {
      sendJson(res, 200, {
        ok: false,
        disabled: true,
        reason: isProduction
          ? 'Local logging is disabled in production builds.'
          : 'DEV_LOCAL_LOG_ENABLED=false',
      });
      return;
    }
    let body;
    try {
      body = await readRequestJson(req);
    } catch (_error) {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON payload' });
      return;
    }
    const normalizedPayload =
      body && typeof body === 'object' && !Array.isArray(body) ? body : { message: body };
    const record = {
      ts: new Date().toISOString(),
      ...attachPluginId(normalizedPayload),
    };
    try {
      const logDir = resolveLogDir();
      await fs.ensureDir(logDir);
      const outFile = path.join(logDir, 'dev.log');
      await fs.appendFile(outFile, `${JSON.stringify(record)}\n`);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 500, { ok: false, error: String(error?.message || error) });
    }
  });

  // Build initial version to temporary directory
  const tempOut = path.join(pluginDistDir, '.dev-build');
  await fs.emptyDir(tempOut);

  let entryInfos = [];
  let entryRelToInfo = new Map();
  let allEntryRelSet = new Set();
  const computeEntriesFromManifest = () => {
    const seenEntryRel = new Set();
    const infos = [];
    const relToInfo = new Map();

    for (const type of ['desktop', 'mobile', 'config']) {
      const jsFiles = manifest[type]?.js || [];
      for (const rel of jsFiles.filter((r) => !/^https?:\/\//.test(r))) {
        const normalizedRel = rel.replace(/\\/g, '/');
        if (seenEntryRel.has(normalizedRel)) continue;
        seenEntryRel.add(normalizedRel);
        const absPath = path.resolve(pluginRoot, 'src', normalizedRel);
        const info = { type, rel: normalizedRel, absPath, index: infos.length };
        infos.push(info);
        relToInfo.set(normalizedRel, info);
      }
    }

    entryInfos = infos;
    entryRelToInfo = relToInfo;
    allEntryRelSet = new Set(infos.map((info) => info.rel));
  };
  computeEntriesFromManifest();
  if (entryInfos.length === 0) {
    console.error(
      chalk.red(`[vite-dev] No JavaScript entries defined in manifest.json: ${manifestPath}`),
    );
    if (manifestValidateMode === 'strict') {
      process.exit(1);
    }
  }

  const devPluginZipPath = path.join(pluginDistDir, 'plugin-dev.zip');
  let devPluginBaseUrl = null;
  const devPluginAutoUploadEnabled = process.env.DEV_UPLOAD === 'true';

  const rebuildDevPluginPackage = async () => {
    if (!devPluginBaseUrl) {
      return { ok: false, skipped: true, reason: 'Dev server base URL is not ready yet.' };
    }

    console.log(chalk.cyan(i18n.t('vite.packaging')));

    const { buildDevPlugin } = require('../toolkit/plugin');
    const { zip, id } = await buildDevPlugin({
      dirname: path.dirname(manifestPath),
      manifest,
      ppk: path.join(pluginRoot, 'private.ppk'),
      baseUrl: devPluginBaseUrl,
      devTools: {
        icon: { type: 'dev-badge' },
      },
      viteMode: false,
    });

    devPluginId = id;
    await fs.outputFile(devPluginZipPath, zip);

    if (devPluginAutoUploadEnabled) {
      await maybeUpload({
        pluginZipPath: devPluginZipPath,
        pluginId: id,
        zipBuffer: zip,
        pluginRoot,
      });
    }

    return { ok: true, id };
  };

  const buildWorkerPath = path.join(__dirname, 'build-worker.js');
  const workerResultMarker = '[build-worker:result]';
  let currentBuildChild = null;

  const runBuildInWorker = (config) =>
    new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ['--max-old-space-size=4096', buildWorkerPath, JSON.stringify(config)],
        {
          stdio: ['ignore', 'pipe', 'pipe'],
          cwd: repoRoot,
        },
      );
      currentBuildChild = child;

      const stdoutChunks = [];
      const stderrChunks = [];
      if (child.stdout) {
        child.stdout.on('data', (chunk) => stdoutChunks.push(Buffer.from(chunk)));
      }
      if (child.stderr) {
        child.stderr.on('data', (chunk) => stderrChunks.push(Buffer.from(chunk)));
      }

      child.on('close', (code) => {
        currentBuildChild = null;
        if (code !== 0) {
          const stderrOutput = Buffer.concat(stderrChunks).toString().trim();
          if (stderrOutput) {
            console.error(stderrOutput);
          }
          reject(new Error(`Build worker exited with code: ${code}`));
          return;
        }

        try {
          const stdoutOutput = Buffer.concat(stdoutChunks).toString('utf8');
          const markerLine = stdoutOutput
            .split(/\r?\n/)
            .find((line) => line.startsWith(workerResultMarker));
          if (!markerLine) {
            resolve({ dependencies: [] });
            return;
          }
          const payload = markerLine.slice(workerResultMarker.length);
          resolve(JSON.parse(payload));
        } catch (error) {
          reject(new Error(`Failed to parse build worker output: ${error?.message || error}`));
        }
      });

      child.on('error', (error) => {
        currentBuildChild = null;
        reject(error);
      });
    });

  const buildEntries = async (targetRelSet) => {
    const isFull =
      !targetRelSet || targetRelSet.size === 0 || targetRelSet.size === allEntryRelSet.size;
    const list = targetRelSet
      ? entryInfos.filter((info) => targetRelSet.has(info.rel))
      : entryInfos;
    if (!list.length) return;

    for (const info of list) {
      devLog(`Building entry: ${info.rel}`);
    }

    const indicesToBuild = list.map((info) => info.index);
    const workerResult = await runBuildInWorker({
      pluginRoot,
      tempOut,
      entryInfos,
      indicesToBuild,
      emptyOutDir: isFull,
      manifestVersion,
      actualPort,
      logLevel: 'error',
      devLogLevel: process.env.DEV_LOG_LEVEL || 'trace',
      localLogEnabled: process.env.DEV_LOCAL_LOG_ENABLED !== 'false',
    });

    const dependencyInfo = Array.isArray(workerResult?.dependencies)
      ? workerResult.dependencies
      : [];
    for (const item of dependencyInfo) {
      if (!item || typeof item.entryRel !== 'string' || !Array.isArray(item.modulePaths)) continue;
      updateDependencyGraph(item.entryRel, item.modulePaths);
    }
  };

  // Helper: Restore stdin raw mode after ora spinner
  const restoreStdin = () => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
    }
  };

  const buildEntriesWithSpinner = async (targetRelSet) => {
    const spinner = ora({
      text: i18n.t('vite.spinner_building'),
      color: 'cyan',
      spinner: 'dots',
    }).start();

    try {
      await buildEntries(targetRelSet);
      spinner.succeed(i18n.t('vite.spinner_success'));
      restoreStdin();
    } catch (e) {
      spinner.fail(i18n.t('vite.spinner_failed'));
      restoreStdin();
      throw e;
    }
  };

  devLog('Building initial version...');
  await buildEntriesWithSpinner();
  lastChange = Date.now();

  let rebuildTimer = null;
  let rebuilding = false;
  let pendingChanges = false;
  let pendingManifestChange = false;
  const pendingChangedFiles = new Set(); // 追踪变化的文件，用于增量编译
  let quietDeadline = null;
  let lastLazyNoticeAt = 0;
  const relRepo = (p) => path.relative(repoRoot, p).replace(/\\/g, '/');
  const relPlugin = (p) => path.relative(pluginRoot, p).replace(/\\/g, '/');
  const tempOutRel = relRepo(tempOut);
  const shouldIgnoreFile = (file) => {
    const relPath = relRepo(file);
    if (!relPath) return true;
    const fileName = path.basename(file);
    return (
      relPath.startsWith(tempOutRel) ||
      relPath.includes('node_modules') ||
      relPath.includes('.git') ||
      relPath.endsWith('.log') ||
      // Filter Vite internal temporary config files (e.g., vite.config.js.timestamp-xxx.mjs)
      fileName.includes('.timestamp-') ||
      // Filter other common temporary files
      fileName.endsWith('.tmp') ||
      fileName.startsWith('~')
    );
  };

  const planRebuildCheck = (delayMs = 0) => {
    if (rebuildTimer) clearTimeout(rebuildTimer);
    const safeDelay = Number.isFinite(delayMs) ? Math.max(0, delayMs) : 0;
    rebuildTimer = setTimeout(runRebuildIfNeeded, safeDelay);
  };

  const runRebuildIfNeeded = async () => {
    rebuildTimer = null;
    if (!pendingChanges) return;
    const shouldReloadManifest = pendingManifestChange;
    pendingManifestChange = false;
    if (isLazyMode && quietDeadline) {
      const remaining = quietDeadline - Date.now();
      if (remaining > 0) {
        planRebuildCheck(remaining);
        return;
      }
    }
    if (rebuilding) {
      planRebuildCheck(isLazyMode ? 250 : 50);
      return;
    }
    pendingChanges = false;
    rebuilding = true;
    const previousDeadline = quietDeadline;
    quietDeadline = null;

    // 复制并清空待处理的变化文件集合
    const changedFiles = new Set(pendingChangedFiles);
    pendingChangedFiles.clear();

    try {
      if (shouldReloadManifest) {
        manifest = await fs.readJSON(manifestPath);
        manifestVersion = String(manifest.version ?? '');
        computeEntriesFromManifest();
        clearDependencyGraph(); // manifest 变化时清空依赖图

        const validation = validateCurrentManifest({ prefix: '[vite-dev]' });
        if (!validation.valid) {
          devError(
            'Manifest validation failed; rebuild skipped (serving last successful build).',
          );
          return;
        }
      }

      // 计算受影响的入口（增量编译）
      let targetRelSet = null;
      if (changedFiles.size > 0 && !shouldReloadManifest) {
        targetRelSet = new Set();
        for (const file of changedFiles) {
          const affected = getAffectedEntries(file);
          if (affected === null) {
            // 某个文件无法追踪（新文件或未知文件），回退到全量编译
            targetRelSet = null;
            devLog(`Unknown file changed: ${file}, falling back to full rebuild`);
            break;
          }
          for (const entry of affected) {
            targetRelSet.add(entry);
          }
        }
      }

      // 输出编译日志
      if (targetRelSet && targetRelSet.size > 0) {
        devLog(`📦 Incremental build: ${Array.from(targetRelSet).join(', ')}`);
      } else {
        devLog('📦 Full rebuild: all entries');
      }

      await buildEntriesWithSpinner(targetRelSet);

      if (shouldReloadManifest) {
        const result = await rebuildDevPluginPackage();
        if (!result?.ok) {
          devError(
            `Manifest changed but dev plugin could not be rebuilt (${result?.reason || 'unknown'}).`,
          );
          return;
        }
        devLog(`Manifest changed; dev plugin rebuilt (pluginId: ${result.id}).`);
      }

      lastChange = Date.now();
      devLog('Rebuild completed; notifying live clients.');
      notifyLiveClients();
    } catch (error) {
      devError('Rebuild failed', error);
    } finally {
      rebuilding = false;
      if (pendingChanges) {
        const hasDeadline = Boolean(quietDeadline);
        const delay = isLazyMode
          ? hasDeadline
            ? Math.max(quietDeadline - Date.now(), 0)
            : Math.max(previousDeadline ? previousDeadline - Date.now() : 0, 0)
          : 200;
        planRebuildCheck(delay);
      }
    }
  };

  const scheduleRebuild = ({ reason = '', force = false } = {}) => {
    pendingChanges = true;
    if (reason === 'src/manifest.json') {
      pendingManifestChange = true;
    }
    if (force) {
      quietDeadline = null;
      planRebuildCheck(0);
      devLog(reason ? `🔁 Manual rebuild triggered (${reason})` : '🔁 Manual rebuild triggered');
      return;
    }
    if (isLazyMode) {
      const now = Date.now();
      quietDeadline = now + lazyQuietWindowMs;
      const remaining = Math.max(quietDeadline - now, 0);
      if (now - lastLazyNoticeAt > 1000) {
        const suffix = reason ? ` (${reason})` : '';
        devLog(
          `⏳ Lazy compilation: source change detected${suffix}, will rebuild after ${formatDuration(lazyQuietWindowMs)} quiet window`
        );
        lastLazyNoticeAt = now;
      }
      planRebuildCheck(remaining);
      return;
    }
    planRebuildCheck(200);
  };

  let isManifestPackageReloading = false;
  let pendingManifestPackageReload = false;
  const rebuildManifestPackageOnly = async () => {
    if (isManifestPackageReloading) {
      pendingManifestPackageReload = true;
      devLog('Manifest package reload already running, queued another request.');
      return;
    }

    isManifestPackageReloading = true;
    pendingManifestPackageReload = false;

    try {
      manifest = await fs.readJSON(manifestPath);
      manifestVersion = String(manifest.version ?? '');
      computeEntriesFromManifest();

      const validation = validateCurrentManifest({ prefix: '[vite-dev]' });
      if (!validation.valid) {
        devError(
          'Manifest validation failed; package-only reload skipped (serving last successful build).',
        );
        return;
      }

      const result = await rebuildDevPluginPackage();
      if (!result?.ok) {
        devError(
          `Manifest package-only reload failed (${result?.reason || 'unknown reason'}).`,
        );
        return;
      }

      devLog(`Manifest package-only reload completed (pluginId: ${result.id}).`);
    } catch (error) {
      devError('Manifest package-only reload failed', error);
    } finally {
      isManifestPackageReloading = false;
      if (pendingManifestPackageReload) {
        setTimeout(() => {
          void rebuildManifestPackageOnly();
        }, 200);
      }
    }
  };

  try {
    server.watcher.on('add', (file) => {
      if (!file) return;
      const relPath = relRepo(file);
      if (shouldIgnoreFile(file)) return;
      devLog(`➕ ${relPath}`);
      // Do not trigger rebuild, only log
    });
    server.watcher.on('change', (file) => {
      if (!file) return;
      const relPath = relRepo(file);
      if (shouldIgnoreFile(file)) return;
      devLog(`📝 ${relPath}`);
      // Do not trigger rebuild, only log
    });
    server.watcher.on('unlink', (file) => {
      if (!file) return;
      const relPath = relRepo(file);
      if (shouldIgnoreFile(file)) return;
      devLog(`❌ ${relPath}`);
      // Do not trigger rebuild, only log
    });
  } catch (error) {
    devWarn(`Failed to watch file changes: ${error?.message || error}`);
  }

  // Register rebuild watcher after initial build completes
  server.watcher.on('change', (file) => {
    if (!file || shouldIgnoreFile(file)) return;
    const relPath = relPlugin(file);
    // Only changes in src directory trigger rebuild
    if (relPath.startsWith('src/')) {
      // Manifest change triggers full rebuild + dev plugin reupload
      if (relPath === 'src/manifest.json' || path.basename(file) === 'manifest.json') {
        devLog(i18n.t('vite.manifest_change', { path: relPath }));
        scheduleRebuild({ reason: 'src/manifest.json', force: true });
        return;
      }
      devLog(`🔨 Source change: ${relPath}`);
      pendingChangedFiles.add(relPath); // 记录变化的文件用于增量编译
      scheduleRebuild({ reason: relPath });
    }
  });

  const sseClients = new Set();
  const broadcastSSE = () => {
    if (!sseClients.size) return;
    const payload = `data: {"ts":${lastChange}}\n\n`;
    for (const res of Array.from(sseClients)) {
      if (!res || res.writableEnded) {
        sseClients.delete(res);
        continue;
      }
      try {
        res.write(payload);
      } catch {
        sseClients.delete(res);
      }
    }
  };

  server.middlewares.use('/__live/sse', (req, res) => {
    const removeClient = () => {
      if (!sseClients.has(res)) return;
      sseClients.delete(res);
      try {
        res.end();
      } catch {
        /* noop */
      }
    };
    try {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      sseClients.add(res);
      res.write(`data: {"ts":${lastChange}}\n\n`);
      req.on('close', removeClient);
      req.on('error', removeClient);
    } catch {
      removeClient();
    }
  });

  server.middlewares.use((req, res, next) => {
    if (req.url !== '/__live') return next();
    try {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ts: lastChange }));
    } catch (error) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: String(error?.message || error) }));
    }
  });

  let wsServer = null;
  const broadcastWS = () => {
    if (!wsServer) return;
    try {
      const clients = wsServer.clients || [];
      const active = Array.from(clients).filter((client) => client.readyState === 1);
      if (active.length > 0) {
        const payload = JSON.stringify({ ts: lastChange });
        for (const client of active) {
          client.send(payload);
        }
        devLog(`📡 Broadcasting to ${active.length} clients (ts: ${lastChange})`);
      }
    } catch (error) {
      devError('broadcastWS error', error);
    }
  };

  const notifyLiveClients = () => {
    broadcastSSE();
    broadcastWS();
  };

  try {
    const WebSocket = require('ws');
    wsServer = new WebSocket.Server({ noServer: true });
    wsServer.on('connection', (ws) => {
      try {
        ws.send(JSON.stringify({ ts: lastChange }));
      } catch (error) {
        devError('Failed to send initial timestamp', error);
      }
      ws.on('error', (err) => {
        devError('WebSocket client error', err);
      });
    });
    server.httpServer.on('upgrade', (req, socket, head) => {
      if (!req.url || !req.url.startsWith('/__live/ws')) return;
      wsServer.handleUpgrade(req, socket, head, (ws) => {
        wsServer.emit('connection', ws, req);
        devLog(`🔗 WebSocket connection established (total: ${wsServer.clients.size})`);
      });
    });
  } catch (error) {
    devError('WebSocket initialization failed', error);
    wsServer = null;
  }

  // Serve static files (JS from tempOut, CSS/other assets from src)
  server.middlewares.use('/__static', async (req, res, next) => {
    try {
      const relPath = decodeURIComponent((req.url || '/').replace(/^\/__static\/?/, ''));

      // Try tempOut first (compiled JS files)
      let filePath = path.join(tempOut, relPath);
      let fileExists = await fs.pathExists(filePath);

      // If not found in tempOut, try source directory (CSS, images, etc.)
      if (!fileExists) {
        filePath = path.join(pluginRoot, 'src', relPath);
        fileExists = await fs.pathExists(filePath);
      }

      if (!fileExists) return next();

      const ext = path.extname(filePath).toLowerCase();
      const type =
        ext === '.js'
          ? 'application/javascript'
          : ext === '.css'
            ? 'text/css'
            : ext === '.html'
              ? 'text/html'
              : ext === '.png'
                ? 'image/png'
                : ext === '.jpg' || ext === '.jpeg'
                  ? 'image/jpeg'
                  : ext === '.svg'
                    ? 'image/svg+xml'
                    : 'application/octet-stream';
      res.setHeader('Content-Type', type);
      res.setHeader('Cache-Control', 'no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Access-Control-Allow-Origin', '*');
      const content = await fs.readFile(filePath);
      res.end(content);
    } catch (_e) {
      return next();
    }
  });

  await server.listen();

  try {
    const addr = server?.httpServer?.address?.();
    if (addr && typeof addr === 'object' && addr.port) {
      actualPort = addr.port;
    } else if (Array.isArray(server.resolvedUrls?.local) && server.resolvedUrls.local[0]) {
      const url = new URL(server.resolvedUrls.local[0]);
      actualPort = Number(url.port) || actualPort;
    }
  } catch {
    /* ignore */
  }

  if (actualPort !== preferPort) {
    devLog('⚠️  Port conflict detected:');
    devLog(`🎯 Expected port: ${preferPort} (already in use)`);
    devLog(`🔄 Auto-switched to: ${actualPort}`);
    devLog('✅ Plugin will automatically adapt to new port and re-upload to Kintone');
  } else {
    devLog(`✅ Port ${actualPort} available, starting normally`);
  }

  if (wsServer) {
    devLog(`🔄 WebSocket hot reload: wss://127.0.0.1:${actualPort}/__live/ws`);
  } else {
    devLog('⚠️ WebSocket hot reload unavailable (missing ws dependency or initialization failed)');
  }
  devLog(`🔁 SSE hot update: https://127.0.0.1:${actualPort}/__live/sse`);

  // Commented out server.printUrls() to keep console quiet
  // server.printUrls();
  devLog('Dev server started');
  devLog('HTTPS enabled, run pnpm fix-cert if you encounter trust issues');
  const devServerOrigin = `https://127.0.0.1:${actualPort}`;
  devLog(`Log endpoint: ${devServerOrigin}/__devlog`);
  if (allowLocalLog) {
    devLog(`Local log file: ${path.join(resolveLogDir(), 'dev.log')}`);
  } else if (isProduction) {
    devLog('Local logging disabled due to production mode');
  } else {
    devLog('Local logging disabled (DEV_LOCAL_LOG_ENABLED=false)');
  }

  // Build dev plugin package (connected to Vite server)
  devPluginBaseUrl = `https://127.0.0.1:${actualPort}/__static/js`;
  devLog('Building dev plugin package...');
  const devPluginResult = await rebuildDevPluginPackage();
  if (!devPluginResult?.ok) {
    throw new Error(
      `Failed to build dev plugin package: ${devPluginResult?.reason || 'unknown error'}`,
    );
  }
  devLog(`Dev plugin package generated: ${devPluginZipPath}`);
  devLog(`Plugin ID: ${devPluginResult.id}`);
  if (!devPluginAutoUploadEnabled) {
    devLog('Tip: Set DEV_UPLOAD=true to auto-upload dev plugin package');
  }

  // === Detailed startup info (matching AI-Import output) ===

  // Port status
  if (actualPort !== preferPort) {
    console.log(i18n.t('vite.port_conflict_title'));
    console.log(i18n.t('vite.port_conflict_expected', { port: preferPort }));
    console.log(i18n.t('vite.port_conflict_switch', { port: actualPort }));
    console.log(i18n.t('vite.port_conflict_ok'));
  } else {
    console.log(i18n.t('vite.port_ok', { port: actualPort }));
  }

  // Hot reload status
  if (wsServer) {
    console.log(i18n.t('vite.hot_reload', { port: actualPort }));
  }

  // Server info block
  console.log(i18n.t('vite.server_info_title'));
  console.log(i18n.t('vite.server_https', { port: actualPort }));
  console.log(i18n.t('vite.server_ws', { port: actualPort }));
  console.log(i18n.t('vite.server_log', { port: actualPort }));
  console.log(i18n.t('vite.server_static', { port: actualPort }));
  console.log(i18n.t('vite.server_port_status', {
    port: actualPort,
    status: actualPort !== preferPort
      ? i18n.t('vite.server_port_fallback', { expected: preferPort })
      : i18n.t('vite.server_port_ok'),
  }));

  // Compilation mode
  if (isLazyMode) {
    console.log(i18n.t('vite.mode_lazy', { window: formatDuration(lazyQuietWindowMs), source: `${modeSource}` }));
    console.log(i18n.t('vite.lazy_hint'));
  } else {
    console.log(i18n.t('vite.mode_instant', { source: modeSource }));
  }

  // Manifest smart reload info
  console.log(i18n.t('vite.manifest_reload_title'));
  console.log(i18n.t('vite.manifest_reload_code'));
  console.log(i18n.t('vite.manifest_reload_manifest'));

  // Full instructions
  console.log(i18n.t('vite.instructions_full'));

  // cleanupAndExit: unified exit function
  const cleanupAndExit = (code = 0) => {
    if (currentBuildChild) {
      try {
        currentBuildChild.kill();
      } catch {
        /* noop */
      }
      currentBuildChild = null;
    }
    process.exit(code);
  };

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (key) => {
      if (key === '\u0003') {
        console.log(i18n.t('vite.shutdown'));
        cleanupAndExit(0);
      }

      if (key === 'r' || key === 'R') {
        console.log(i18n.t('vite.rebuild_manual_js'));
        scheduleRebuild({ reason: 'manual trigger', force: true });
      }

      if (key === 'm' || key === 'M') {
        console.log(i18n.t('vite.rebuild_manual_manifest'));
        void rebuildManifestPackageOnly();
      }

      if (key === 'u' || key === 'U') {
        console.log(i18n.t('vite.rebuild_manual_full'));
        scheduleRebuild({ reason: 'src/manifest.json', force: true });
      }

      if (key === 'q' || key === 'Q') {
        console.log(i18n.t('vite.shutdown'));
        cleanupAndExit(0);
      }
    });
  }

  // Signal handlers for robust exit
  process.on('SIGINT', () => {
    console.log(i18n.t('vite.shutdown'));
    cleanupAndExit(0);
  });
  process.on('SIGTERM', () => {
    cleanupAndExit(0);
  });
})();
