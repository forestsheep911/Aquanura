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
  console.error(chalk.red(`[upload-prod] 找不到插件包: ${pluginZip}`));
  console.error(chalk.yellow('请先运行 pnpm --filter kintone-plugin-deploy run build 生成插件包'));
  process.exit(1);
}

async function inferPluginId(pluginRoot) {
  const envPluginId =
    process.env.KINTONE_PROD_PLUGIN_ID ||
    process.env.KINTONE_PLUGIN_ID ||
    process.env.KINTONE_DEV_PLUGIN_ID;
  if (envPluginId) {
    console.log(chalk.gray('[upload-prod] 已读取环境中的插件ID'));
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
    console.log(chalk.gray(`[upload-prod] 自动推断插件ID: ${pluginId}`));
    return pluginId;
  } catch (error) {
    console.warn(
      chalk.yellow(`[upload-prod] 无法读取 ${ppkPath} 推断插件ID: ${error?.message || error}`),
    );
    return undefined;
  }
}

(async () => {
  loadEnv({ path: resolveEnvFilePath('.env') });
  const repoRoot = findRepoRoot();
  const pluginRoot = resolvePluginRoot({ repoRoot });
  const pluginZip = resolvePluginZipPath({ repoRoot, pluginRoot });

  const baseUrl = process.env.KINTONE_PROD_BASE_URL;
  const username = process.env.KINTONE_PROD_USERNAME;
  const password = process.env.KINTONE_PROD_PASSWORD;

  if (!baseUrl) {
    console.error(chalk.red('[upload-prod] 缺少 KINTONE_PROD_BASE_URL 配置'));
    process.exit(1);
  }

  if (!(username && password)) {
    console.error(chalk.red('[upload-prod] 缺少用户名和密码'));
    console.error(chalk.yellow('插件上传需要系统管理员权限，必须使用用户名和密码认证'));
    console.error('请在 .env 中设置 KINTONE_PROD_USERNAME 和 KINTONE_PROD_PASSWORD');
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

  console.log(chalk.green('[upload-prod] 上传完成'));
})();
