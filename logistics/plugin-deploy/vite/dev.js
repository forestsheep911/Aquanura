#!/usr/bin/env node
/* global fetch */
const path = require('node:path');
const fs = require('fs-extra');
const chalk = require('chalk');
const react = require('@vitejs/plugin-react');
const { transformSync } = require('esbuild');
const { certificateFor } = require('../toolkit/cert');
const { uploadPlugin } = require('../toolkit/kintone');
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

// 本地文件日志系统
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
        // 只有在无法写入文件时才输出到控制台
        console.error('[vite-dev] 无法写入日志文件:', error?.message || error);
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
  // 错误仍然输出到控制台
  console.error(`[vite-dev] ${fullMessage}`);
}

const reactPlugin = react({
  jsxRuntime: 'classic',
  include: [/\.(jsx|tsx|js)$/],
});

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
    devWarn('DEV_UPLOAD=true 但未设置 KINTONE_DEV_BASE_URL，跳过自动上传');
    return;
  }

  if (!(username && password)) {
    devWarn('DEV_UPLOAD=true 但缺少用户名/密码（插件上传需要管理员权限），跳过自动上传');
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
        devLog(`自动推断插件ID: ${pluginId}`);
      }
    } catch (error) {
      devWarn(`无法根据 private.ppk 推断插件ID: ${error?.message || error}`);
    }
  }

  let pluginBuffer = zipBuffer;
  let pluginName = 'plugin-dev.zip';

  if (!pluginBuffer) {
    if (!pluginZipPath) {
      devWarn('缺少插件包路径，无法执行自动上传');
      return;
    }

    if (!(await fs.pathExists(pluginZipPath))) {
      devWarn(`未找到插件包: ${pluginZipPath}，请先运行 pnpm build:vite`);
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
    devLog('已自动上传插件到开发环境');
  } catch (error) {
    devError('自动上传失败', error);
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
    console.log(`Usage: pnpm --filter ai-translate-plugin-deploy run dev [options]

Options:
  --help          Show this message and exit
  --mode [instant|lazy [quietWindow]]
                  Configure rebuild scheduling (e.g. --mode lazy 10m)
  VITE_PORT       Override dev server port (default 5173)
  VITE_HOST       Override dev server host (default 127.0.0.1)
  VITE_LOG_LEVEL  Set Vite log level (info|warn|error|silent)

Environment:
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
      if (arg && arg.startsWith('--mode=')) {
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
      `[vite-dev] DEV_LAZY_WINDOW="${envLazyWindowRaw}" 无法解析，将使用 ${formatDuration(
        DEFAULT_LAZY_WINDOW_MS,
      )}`,
    );
  }
  let lazyQuietWindowMs = envLazyWindowMs ?? DEFAULT_LAZY_WINDOW_MS;
  let lazyWindowSource = envLazyWindowMs
    ? `DEV_LAZY_WINDOW=${envLazyWindowRaw}`
    : `默认 ${formatDuration(DEFAULT_LAZY_WINDOW_MS)}`;

  const rawDevModeEnv = process.env.DEV_MODE || '';
  const envModeRaw = rawDevModeEnv.trim().toLowerCase();
  const truthyLegacyModes = new Set(['true', '1', 'yes', 'on']);
  const falsyLegacyModes = new Set(['false', '0', 'off', 'no']);
  let devMode = 'instant';
  let modeSource = '默认';
  if (envModeRaw) {
    if (envModeRaw === 'lazy' || envModeRaw === 'instant') {
      devMode = envModeRaw;
      modeSource = `DEV_MODE=${envModeRaw}`;
    } else if (truthyLegacyModes.has(envModeRaw) || falsyLegacyModes.has(envModeRaw)) {
      modeSource = `DEV_MODE=${envModeRaw}`;
    } else {
      console.warn(`[vite-dev] DEV_MODE="${rawDevModeEnv}" 未识别，将使用 instant 模式`);
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
        `[vite-dev] 未知 --mode 选项 "${modeFlag.value}", 将继续使用 ${devMode} 模式`,
      );
    } else {
      console.warn('[vite-dev] --mode 需要指定 instant 或 lazy');
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
            `[vite-dev] 无法解析静默期 "${durationCandidate}"，继续使用 ${formatDuration(
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

  ({ createServer, build: viteBuild } = require('vite'));

  const logLevel = process.env.VITE_LOG_LEVEL || (QUIET ? 'silent' : 'error');
  const resolveLogDir = () => {
    const envLogDir = process.env.DEV_LOG_DIR;
    if (envLogDir) {
      return path.isAbsolute(envLogDir) ? envLogDir : path.join(repoRoot, envLogDir);
    }
    return path.join(repoRoot, 'logistics', 'log');
  };

  // 初始化日志文件
  const logDir = resolveLogDir();
  await fs.ensureDir(logDir);
  devLogFile = path.join(logDir, 'dev.log');
  const modeDescription = isLazyMode
    ? `?? 懒编译模式已启用，静默窗口 ${formatDuration(lazyQuietWindowMs)} (${modeSource}，${lazyWindowSource})`
    : `? 即时编译模式 (${modeSource})`;
  devLog(modeDescription);
  if (isLazyMode) {
    devLog('提示：按 r 可手动跳过静默期立即重建');
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

  const manifest = await fs.readJSON(manifestPath);
  const manifestVersion = String(manifest.version ?? '');

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
      // 端点路径常量，运行时与 location.origin 拼接
      __DEV_LOG_ENDPOINT__: JSON.stringify('/__devlog'),
      __DEV_LIVE_ENDPOINT__: JSON.stringify('/__live'),
      __PLUGIN_VERSION__: JSON.stringify(manifestVersion),
      // 开发时日志开关控制（从环境变量读取）
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

  // 构建初始版本到临时目录
  const tempOut = path.join(pluginDistDir, '.dev-build');
  await fs.emptyDir(tempOut);

  const seenEntryRel = new Set();
  const entryInfos = [];
  const entryRelToInfo = new Map();
  for (const type of ['desktop', 'mobile', 'config']) {
    const jsFiles = manifest[type]?.js || [];
    for (const rel of jsFiles.filter((r) => !/^https?:\/\//.test(r))) {
      const normalizedRel = rel.replace(/\\/g, '/');
      if (seenEntryRel.has(normalizedRel)) continue;
      seenEntryRel.add(normalizedRel);
      const absPath = path.resolve(pluginRoot, 'src', normalizedRel);
      const info = { type, rel: normalizedRel, absPath };
      entryInfos.push(info);
      entryRelToInfo.set(normalizedRel, info);
    }
  }
  const allEntryRelSet = new Set(entryInfos.map((info) => info.rel));

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

  devLog('正在构建初始版本...');
  await buildEntries();
  lastChange = Date.now();

  let rebuildTimer = null;
  let rebuilding = false;
  let pendingChanges = false;
  let quietDeadline = null;
  let lastLazyNoticeAt = 0;
  const relRepo = (p) => path.relative(repoRoot, p).replace(/\\/g, '/');
  const relPlugin = (p) => path.relative(pluginRoot, p).replace(/\\/g, '/');
  const tempOutRel = relRepo(tempOut);
  const shouldIgnoreFile = (file) => {
    const relPath = relRepo(file);
    if (!relPath) return true;
    return (
      relPath.startsWith(tempOutRel) ||
      relPath.includes('node_modules') ||
      relPath.includes('.git') ||
      relPath.endsWith('.log')
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
      await buildEntries();
      lastChange = Date.now();
      devLog('✅ 重建完成，通知客户端刷新');
      notifyLiveClients();
    } catch (error) {
      devError('❌ 重建失败', error);
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
    if (force) {
      quietDeadline = null;
      planRebuildCheck(0);
      devLog(reason ? `🔁 手动触发重建 (${reason})` : '🔁 手动触发重建');
      return;
    }
    if (isLazyMode) {
      const now = Date.now();
      quietDeadline = now + lazyQuietWindowMs;
      const remaining = Math.max(quietDeadline - now, 0);
      if (now - lastLazyNoticeAt > 1000) {
        const suffix = reason ? ` (${reason})` : '';
        devLog(
          `⏳ 懒编译: 检测到源码变更${suffix}，将在 ${formatDuration(lazyQuietWindowMs)} 静默后重建`
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
      // 不触发重建，只记录日志
    });
    server.watcher.on('change', (file) => {
      if (!file) return;
      const relPath = relRepo(file);
      if (shouldIgnoreFile(file)) return;
      devLog(`📝 ${relPath}`);
      // 不触发重建，只记录日志
    });
    server.watcher.on('unlink', (file) => {
      if (!file) return;
      const relPath = relRepo(file);
      if (shouldIgnoreFile(file)) return;
      devLog(`❌ ${relPath}`);
      // 不触发重建，只记录日志
    });
  } catch (error) {
    devWarn(`监听文件变更失败: ${error?.message || error}`);
  }

  // 在初始构建完成后，注册重建监听器
  server.watcher.on('change', (file) => {
    if (!file || shouldIgnoreFile(file)) return;
    const relPath = relPlugin(file);
    // 仅在 src 目录下的变更触发重建
    if (relPath.startsWith('src/')) {
      devLog(`🔨 源码变化: ${relPath}`);
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
        devLog(`📡 广播到 ${active.length} 个客户端 (ts: ${lastChange})`);
      }
    } catch (error) {
      devError('broadcastWS 错误', error);
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
        devError('发送初始时间戳失败', error);
      }
      ws.on('error', (err) => {
        devError('WebSocket客户端错误', err);
      });
    });
    server.httpServer.on('upgrade', (req, socket, head) => {
      if (!req.url || !req.url.startsWith('/__live/ws')) return;
      wsServer.handleUpgrade(req, socket, head, (ws) => {
        wsServer.emit('connection', ws, req);
        devLog(`🔗 WebSocket连接建立 (总计: ${wsServer.clients.size})`);
      });
    });
  } catch (error) {
    devError('WebSocket初始化失败', error);
    wsServer = null;
  }

  // 提供静态文件服务
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
    devLog('⚠️  端口冲突检测:');
    devLog(`🎯 期望端口: ${preferPort} (已被占用)`);
    devLog(`🔄 自动切换到: ${actualPort}`);
    devLog('✅ 插件将自动适配新端口并重新上传到Kintone');
  } else {
    devLog(`✅ 端口 ${actualPort} 可用，正常启动`);
  }

  if (wsServer) {
    devLog(`🔄 WebSocket 热重载: wss://127.0.0.1:${actualPort}/__live/ws`);
  } else {
    devLog('⚠️ WebSocket 热重载不可用（缺少 ws 依赖或初始化失败）');
  }
  devLog(`🔁 SSE 热更新: https://127.0.0.1:${actualPort}/__live/sse`);

  // 注释掉 server.printUrls() 以保持控制台静默
  // server.printUrls();
  devLog('开发服务器已启动');
  devLog('HTTPS 已启用，如遇信任问题可执行 pnpm fix-cert');
  const devServerOrigin = `https://127.0.0.1:${actualPort}`;
  devLog(`日志端点: ${devServerOrigin}/__devlog`);
  if (allowLocalLog) {
    devLog(`本地日志文件: ${path.join(resolveLogDir(), 'dev.log')}`);
  } else if (isProduction) {
    devLog('本地日志已因生产模式禁用');
  } else {
    devLog('本地日志已禁用 (DEV_LOCAL_LOG_ENABLED=false)');
  }

  // 构建开发专用插件包（连接到 Vite 服务器）
  const baseUrl = `https://127.0.0.1:${actualPort}/__static/js`;
  devLog('正在构建开发插件包...');

  const { buildDevPlugin } = require('../toolkit/plugin');
  const { zip, id } = await buildDevPlugin({
    dirname: path.dirname(manifestPath),
    manifest,
    ppk: path.join(pluginRoot, 'private.ppk'),
    baseUrl,
    devTools: {
      icon: { type: 'dev-badge' },
    },
    viteMode: false,
  });
  devPluginId = id;

  // 保存开发插件包
  const devPluginZip = path.join(pluginDistDir, 'plugin-dev.zip');
  await fs.outputFile(devPluginZip, zip);
  devLog(`开发插件包已生成: ${devPluginZip}`);
  devLog(`插件ID: ${id}`);

  // 自动上传开发插件包
  const shouldUpload = process.env.DEV_UPLOAD === 'true';
  if (shouldUpload) {
    await maybeUpload({
      pluginZipPath: devPluginZip,
      pluginId: id,
      zipBuffer: zip,
      pluginRoot,
    });
  } else {
    devLog('提示：设置 DEV_UPLOAD=true 自动上传开发插件包');
  }

  // 输出一条简洁的启动完成提示
  console.log(`[vite-dev] ✅ 开发服务器已启动 (端口: ${actualPort}，日志文件: ${devLogFile})`);
  console.log(
    `[vite-dev] 当前编译模式: ${
      isLazyMode ? `lazy (${formatDuration(lazyQuietWindowMs)} 静默)` : 'instant'
    }`,
  );
  console.log('[vite-dev] 🔁 按 r 立即重建，按 q 退出，Ctrl+C 也可中断');

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (key) => {
      if (key === '\u0003') {
        console.log('\n[vite-dev] 收到退出信号，正在关闭...');
        process.exit(0);
      }

      if (key === 'r' || key === 'R') {
        console.log('[vite-dev] 🔁 手动触发立即重建...');
        scheduleRebuild({ reason: '手动触发', force: true });
      }

      if (key === 'q' || key === 'Q') {
        console.log('\n[vite-dev] 正在关闭开发服务器...');
        process.exit(0);
      }
    });
  }
})();
