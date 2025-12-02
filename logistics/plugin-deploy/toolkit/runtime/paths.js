const path = require('node:path');
const fs = require('fs-extra');

const DEPLOY_ROOT = path.resolve(__dirname, '..', '..');

function hasRepoMarker(dir) {
  return (
    fs.existsSync(path.join(dir, 'pnpm-workspace.yaml')) || fs.existsSync(path.join(dir, '.git'))
  );
}

function findRepoRoot(startDir = DEPLOY_ROOT) {
  let current = path.resolve(startDir);
  const { root } = path.parse(current);

  while (current && current !== root) {
    if (hasRepoMarker(current)) {
      return current;
    }
    current = path.dirname(current);
  }

  return startDir;
}

function resolveFromRepo(relativePath, repoRoot = findRepoRoot()) {
  return path.resolve(repoRoot, relativePath);
}

function resolvePluginRoot({ repoRoot = findRepoRoot(), pluginRootOption } = {}) {
  const configuredPath = pluginRootOption ?? process.env.PLUGIN_ROOT;
  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(repoRoot, configuredPath);
  }
  return path.join(repoRoot, 'plugin');
}

function resolvePluginManifestPath(options = {}) {
  return path.join(resolvePluginRoot(options), 'src', 'manifest.json');
}

function resolvePluginDistDir(options = {}) {
  return path.join(resolvePluginRoot(options), 'dist');
}

function resolvePluginZipPath({
  repoRoot = findRepoRoot(),
  pluginRoot = resolvePluginRoot({ repoRoot }),
  pluginFileOption,
} = {}) {
  const configuredZip = pluginFileOption || process.env.PLUGIN_FILE_PATH || process.env.PLUGIN_ZIP;
  if (configuredZip) {
    return path.isAbsolute(configuredZip) ? configuredZip : path.resolve(repoRoot, configuredZip);
  }
  return path.join(pluginRoot, 'dist', 'plugin.zip');
}

function resolveDeployRoot() {
  return DEPLOY_ROOT;
}

function resolveEnvFilePath(filename = '.env') {
  return path.join(DEPLOY_ROOT, filename);
}

module.exports = {
  DEPLOY_ROOT,
  resolveDeployRoot,
  findRepoRoot,
  resolveFromRepo,
  resolvePluginRoot,
  resolvePluginManifestPath,
  resolvePluginDistDir,
  resolvePluginZipPath,
  resolveEnvFilePath,
};
