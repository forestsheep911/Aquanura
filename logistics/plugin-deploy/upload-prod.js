#!/usr/bin/env node
const path = require('node:path');
const fs = require('fs-extra');
const chalk = require('chalk');
const { uploadPlugin } = require('./toolkit/kintone');
const { getPublicKeyDer, generatePluginId } = require('./toolkit/plugin/rsa');
const { loadEnv } = require('./toolkit/runtime/env');
const {
  findRepoRoot,
  resolvePluginRoot,
  resolvePluginZipPath,
  resolveEnvFilePath,
} = require('./toolkit/runtime/paths');

async function ensurePluginZip(pluginZip) {
  if (await fs.pathExists(pluginZip)) {
    return fs.readFile(pluginZip);
  }
  console.error(chalk.red(`[upload-prod] Plugin package not found: ${pluginZip}`));
  console.error(chalk.yellow('Please run pnpm --filter kintone-plugin-deploy run build first to generate plugin package'));
  process.exit(1);
}

async function inferPluginId(pluginRoot) {
  const envPluginId =
    process.env.KINTONE_PROD_PLUGIN_ID ||
    process.env.KINTONE_PLUGIN_ID ||
    process.env.KINTONE_DEV_PLUGIN_ID;
  if (envPluginId) {
    console.log(chalk.gray('[upload-prod] Plugin ID read from environment'));
    return envPluginId;
  }
  const ppkPath = path.join(pluginRoot, 'private.ppk');
  if (!(await fs.pathExists(ppkPath))) {
    return undefined;
  }
  try {
    const ppkContent = await fs.readFile(ppkPath, 'utf-8');
    const publicKey = getPublicKeyDer(ppkContent);
    const pluginId = generatePluginId(publicKey);
    console.log(chalk.gray(`[upload-prod] Auto-inferred plugin ID: ${pluginId}`));
    return pluginId;
  } catch (error) {
    console.warn(
      chalk.yellow(`[upload-prod] Failed to read ${ppkPath} to infer plugin ID: ${error?.message || error}`),
    );
    return undefined;
  }
}

async function resolveProdPluginZip(repoRoot, pluginRoot) {
  const candidates = [resolvePluginZipPath({ repoRoot, pluginRoot })];
  const manifestPath = path.join(pluginRoot, 'src', 'manifest.json');

  if (await fs.pathExists(manifestPath)) {
    const manifest = await fs.readJSON(manifestPath);
    const pluginName = (manifest.name?.en || manifest.name?.ja || manifest.name?.zh || 'plugin')
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5\u3040-\u30ff-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const pluginVersion = manifest.version || '1.0.0';
    candidates.push(path.join(pluginRoot, 'dist', `${pluginName}-plugin-${pluginVersion}.zip`));
  }

  candidates.push(path.join(pluginRoot, 'dist', 'plugin.zip'));
  const seen = new Set();
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    if (await fs.pathExists(candidate)) {
      return candidate;
    }
  }

  const distDir = path.join(pluginRoot, 'dist');
  if (await fs.pathExists(distDir)) {
    const zipFiles = (await fs.readdir(distDir)).filter((name) => name.endsWith('.zip'));
    if (zipFiles.length === 1) {
      return path.join(distDir, zipFiles[0]);
    }
  }

  return resolvePluginZipPath({ repoRoot, pluginRoot });
}

(async () => {
  loadEnv({ path: resolveEnvFilePath('.env') });
  const repoRoot = findRepoRoot();
  const pluginRoot = resolvePluginRoot({ repoRoot });
  const pluginZip = await resolveProdPluginZip(repoRoot, pluginRoot);

  const baseUrl = process.env.KINTONE_PROD_BASE_URL;
  const username = process.env.KINTONE_PROD_USERNAME;
  const password = process.env.KINTONE_PROD_PASSWORD;

  if (!baseUrl) {
    console.error(chalk.red('[upload-prod] Missing KINTONE_PROD_BASE_URL configuration'));
    process.exit(1);
  }

  if (!(username && password)) {
    console.error(chalk.red('[upload-prod] Missing username and password'));
    console.error(chalk.yellow('Plugin upload requires system administrator privileges, must use username and password authentication'));
    console.error('Please set KINTONE_PROD_USERNAME and KINTONE_PROD_PASSWORD in .env');
    process.exit(1);
  }

  const clientOptions = {
    baseUrl,
    auth: { username, password },
  };

  const pluginBuffer = await ensurePluginZip(pluginZip);
  const pluginId = await inferPluginId(pluginRoot);

  await uploadPlugin({
    clientOptions,
    pluginId,
    file: { name: path.basename(pluginZip), data: pluginBuffer },
  });

  console.log(chalk.green('[upload-prod] Upload completed'));
})();
