const path = require('node:path');
const fse = require('fs-extra');
const { createContentsZip, zipFiles } = require('./zip');
const { sign, getPublicKeyDer, generatePPK, generatePluginId } = require('./rsa');
const {
  getBundledScripts,
  getViteBundledScripts,
  transformScriptUrls,
  transformScriptUrlsVite,
  addDevBadge,
} = require('./manifest');

function getPPKContent(ppk) {
  const ppkPath = path.resolve(process.cwd(), ppk);
  return !fse.existsSync(ppkPath) ? generatePPK(ppkPath) : fse.readFileSync(ppkPath, 'utf-8');
}

function createPluginZip(ppkContent, contentsZip) {
  const signature = sign(contentsZip, ppkContent);
  const publicKeyDer = getPublicKeyDer(ppkContent);
  const pluginId = generatePluginId(publicKeyDer);
  return {
    zip: zipFiles({
      'contents.zip': contentsZip,
      PUBKEY: publicKeyDer,
      SIGNATURE: signature,
    }),
    id: pluginId,
  };
}

async function buildDevPlugin({
  dirname,
  manifest,
  ppk,
  baseUrl,
  devTools,
  viteMode = false,
  manifestDirRelativeToProjectRoot,
}) {
  const ppkContent = getPPKContent(ppk);
  const iconPath = path.join(dirname, manifest.icon);
  const manifestDir = manifestDirRelativeToProjectRoot || path.basename(dirname);

  // 根据配置决定是否处理图标
  const iconType = devTools?.icon?.type || false;
  const devIcon = iconType ? await addDevBadge(iconPath) : undefined;

  const manifestClone = JSON.parse(JSON.stringify(manifest));
  const rewrittenManifest = viteMode
    ? transformScriptUrlsVite(manifestClone, baseUrl, manifestDir)
    : transformScriptUrls(manifestClone, baseUrl);

  const contentsZip = createContentsZip(
    dirname,
    rewrittenManifest,
    devIcon
      ? {
          [manifest.icon]: devIcon,
        }
      : undefined,
  );

  return createPluginZip(ppkContent, contentsZip);
}

function buildPlugin({ dirname, manifest, ppk, assetsByChunkName, distPath, vite }) {
  const ppkContent = getPPKContent(ppk);
  const manifestDir = path.basename(dirname);

  let bundledScripts;
  if (vite?.manifestJson) {
    bundledScripts = getViteBundledScripts(
      manifest,
      vite.manifestJson,
      vite.outDirAbsolutePath,
      vite.manifestDirRelativeToProjectRoot || manifestDir,
    );
  } else if (assetsByChunkName && distPath) {
    bundledScripts = getBundledScripts(manifest, assetsByChunkName, distPath);
  } else {
    bundledScripts = {};
  }

  const contentsZip = createContentsZip(dirname, manifest, bundledScripts);
  return createPluginZip(ppkContent, contentsZip);
}

module.exports = { buildPlugin, buildDevPlugin };
