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
  console.error(chalk.red(`[upload-dev] Plugin package not found: ${pluginZip}`));
  console.error(chalk.yellow('Please run pnpm --filter kintone-plugin-deploy run build first to generate plugin package'));
  process.exit(1);
}

async function inferPluginId(pluginRoot) {
  const envPluginId =
    process.env.KINTONE_DEV_PLUGIN_ID || process.env.KINTONE_PLUGIN_ID || undefined;
  if (envPluginId) {
    console.log(chalk.gray('[upload-dev] Plugin ID read from environment, skipping auto-inference'));
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
    console.log(chalk.gray(`[upload-dev] Auto-inferred plugin ID: ${pluginId}`));
    return pluginId;
  } catch (error) {
    console.warn(
      chalk.yellow(`[upload-dev] Failed to read ${ppkPath} to infer plugin ID: ${error?.message || error}`),
    );
    return undefined;
  }
}

(async () => {
  loadEnv({ path: resolveEnvFilePath('.env') });
  const repoRoot = findRepoRoot();
  const pluginRoot = resolvePluginRoot({ repoRoot });
  const pluginZip = resolvePluginZipPath({ repoRoot, pluginRoot });

  const baseUrl = process.env.KINTONE_DEV_BASE_URL;
  const username = process.env.KINTONE_DEV_USERNAME;
  const password = process.env.KINTONE_DEV_PASSWORD;

  if (!baseUrl) {
    console.error(chalk.red('[upload-dev] Missing KINTONE_DEV_BASE_URL configuration'));
    process.exit(1);
  }

  if (!(username && password)) {
    console.error(chalk.red('[upload-dev] Missing username and password'));
    console.error(chalk.yellow('Plugin upload requires system administrator privileges, must use username and password authentication'));
    console.error('Please set KINTONE_DEV_USERNAME and KINTONE_DEV_PASSWORD in .env');
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

  console.log(chalk.green('[upload-dev] Upload completed'));
})();
