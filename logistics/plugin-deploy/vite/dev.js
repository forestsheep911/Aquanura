#!/usr/bin/env node
/* global fetch */
const path = require('node:path');
const fs = require('fs-extra');
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
const {
  findRepoRoot,
  resolveEnvFilePath,
  resolvePluginRoot,
  resolvePluginManifestPath,
  resolvePluginDistDir,
} = require('../toolkit/runtime/paths');
let createServer;
let viteBuild;

loadEnv({ path: resolveEnvFilePath('.env') });
const repoRoot = findRepoRoot();
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
  writeToDevLog(message, 'INFO').catch(() => {});
}

function devWarn(message) {
  writeToDevLog(message, 'WARN').catch(() => {});
}

function devError(message, error) {
  const fullMessage = error ? `${message}: ${error?.message || error}` : message;
  writeToDevLog(fullMessage, 'ERROR').catch(() => {});
  // Errors are still output to console
  console.error(`[vite-dev] ${fullMessage}`);
}

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

const DEFAULT_LAZY_WINDOW_MS = 60 * 1000; // 1 minute
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
                    --mode lazy            (lazy compilation with default 60s quiet window)
                    --mode lazy 17s        (lazy compilation with 17s quiet window)
                    --mode lazy 5m         (lazy compilation with 5 minutes quiet window)
                    --mode lazy 2h         (lazy compilation with 2 hours quiet window)
  VITE_PORT       Override dev server port (default 5173)
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
  ({ createServer, build: viteBuild } = await import('vite'));
  const reactPlugin = await createReactPlugin();

  const logLevel = process.env.VITE_LOG_LEVEL || (QUIET ? 'silent' : 'error');
  const resolveLogDir = () => {
    const envLogDir = process.env.DEV_LOG_DIR;
    if (envLogDir) {
      return path.isAbsolute(envLogDir) ? envLogDir : path.join(repoRoot, envLogDir);
    }
    return path.join(repoRoot, 'logistics', 'log');
  };

  // Initialize log file
  const logDir = resolveLogDir();
  await fs.ensureDir(logDir);
  devLogFile = path.join(logDir, 'dev.log');
  const modeDescription = isLazyMode
    ? `?? Lazy compilation mode enabled, quiet window ${formatDuration(lazyQuietWindowMs)} (${modeSource}, ${lazyWindowSource})`
    : `? Instant compilation mode (${modeSource})`;
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
  const preferPort = Number(process.env.VITE_PORT || 5173);

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

  const server = await createServer({
    root: pluginRoot,
    plugins: [forceJsxPlugin, reactPlugin],
    logLevel,
    customLogger: QUIET
      ? {
          info() {},
          warn() {},
          warnOnce() {},
          error(msg) {
            console.error(msg);
          },
          success() {},
          clearScreen() {},
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
        const info = { type, rel: normalizedRel, absPath };
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

  const quietOnWarn = (warning, warn) => {
    if (
      warning &&
      (warning.code === 'MODULE_LEVEL_DIRECTIVE' || warning.code === 'CHUNK_SIZE_LIMIT')
    ) {
      return;
    }
    warn(warning);
  };

  const buildEntries = async (targetRelSet) => {
    const isFull =
      !targetRelSet || targetRelSet.size === 0 || targetRelSet.size === allEntryRelSet.size;
    const list = targetRelSet
      ? entryInfos.filter((info) => targetRelSet.has(info.rel))
      : entryInfos;
    if (!list.length) return;

    for (let index = 0; index < list.length; index += 1) {
      const info = list[index];
      await viteBuild({
        root: pluginRoot,
        plugins: [forceJsxPlugin, reactPlugin],
        logLevel: process.env.VITE_LOG_LEVEL || (QUIET ? 'silent' : 'error'),
        esbuild: {
          loader: 'jsx',
          include: /\.js$/,
          exclude: [],
        },
        define: {
          __DEV_LOG_ENDPOINT__: JSON.stringify('/__devlog'),
          __DEV_LIVE_ENDPOINT__: JSON.stringify('/__live'),
          __PLUGIN_VERSION__: JSON.stringify(manifestVersion),
          __DEV_LOCAL_LOG_ENABLED__: JSON.stringify(process.env.DEV_LOCAL_LOG_ENABLED !== 'false'),
        },
        build: {
          outDir: tempOut,
          emptyOutDir: isFull && index === 0,
          chunkSizeWarningLimit: 4096,
          rollupOptions: {
            input: info.absPath,
            onwarn: quietOnWarn,
            output: {
              format: 'iife',
              entryFileNames: 'js/[name].js',
              assetFileNames: 'assets/[name][extname]',
            },
          },
        },
      });
    }
  };

  devLog('Building initial version...');
  await buildEntries();
  lastChange = Date.now();

  let rebuildTimer = null;
  let rebuilding = false;
  let pendingChanges = false;
  let pendingManifestChange = false;
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
    try {
      if (shouldReloadManifest) {
        manifest = await fs.readJSON(manifestPath);
        manifestVersion = String(manifest.version ?? '');
        computeEntriesFromManifest();

        const validation = validateCurrentManifest({ prefix: '[vite-dev]' });
        if (!validation.valid) {
          devError(
            'Manifest validation failed; rebuild skipped (serving last successful build).',
          );
          return;
        }
      }

      await buildEntries();

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
      devLog(`🔨 Source change: ${relPath}`);
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

  // Serve static files
  server.middlewares.use('/__static', async (req, res, next) => {
    try {
      const relPath = decodeURIComponent((req.url || '/').replace(/^\/__static\/?/, ''));
      const filePath = path.join(tempOut, relPath);
      if (!(await fs.pathExists(filePath))) return next();
      const ext = path.extname(filePath).toLowerCase();
      const type =
        ext === '.js'
          ? 'application/javascript'
          : ext === '.css'
            ? 'text/css'
            : ext === '.html'
              ? 'text/html'
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

  let actualPort = preferPort;
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

  // Output a concise startup completion message
  console.log(`[vite-dev] ✅ Dev server started (port: ${actualPort}, log file: ${devLogFile})`);
  console.log(
    `[vite-dev] Current compilation mode: ${
      isLazyMode ? `lazy (${formatDuration(lazyQuietWindowMs)} quiet)` : 'instant'
    }`,
  );
  console.log('[vite-dev] 🔁 Press r to rebuild immediately, q to quit, Ctrl+C also works');

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (key) => {
      if (key === '\u0003') {
        console.log('\n[vite-dev] Received exit signal, shutting down...');
        process.exit(0);
      }

      if (key === 'r' || key === 'R') {
        console.log('[vite-dev] 🔁 Manual rebuild triggered...');
        scheduleRebuild({ reason: 'manual trigger', force: true });
      }

      if (key === 'q' || key === 'Q') {
        console.log('\n[vite-dev] Shutting down dev server...');
        process.exit(0);
      }
    });
  }
})();
