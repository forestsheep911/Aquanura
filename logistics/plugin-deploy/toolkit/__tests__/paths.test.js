const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('fs-extra');
const {
  findRepoRoot,
  resolvePluginRoot,
  resolvePluginZipPath,
  resolveEnvFilePath,
} = require('../runtime/paths');

test('findRepoRoot locates nearest workspace marker', async (t) => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'paths-root-'));
  t.after(() => fs.remove(tmp));
  const repoRoot = path.join(tmp, 'repo');
  const nested = path.join(repoRoot, 'packages', 'plugin', 'src');
  await fs.ensureDir(nested);
  await fs.writeFile(path.join(repoRoot, 'pnpm-workspace.yaml'), '');
  const resolved = findRepoRoot(nested);
  assert.strictEqual(resolved, repoRoot);
});

test('resolvePluginRoot respects relative override', async (t) => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'paths-plugin-'));
  t.after(() => fs.remove(tmp));
  const repoRoot = path.join(tmp, 'repo');
  await fs.ensureDir(repoRoot);
  const result = resolvePluginRoot({
    repoRoot,
    pluginRootOption: 'custom/plugin',
  });
  assert.strictEqual(result, path.join(repoRoot, 'custom', 'plugin'));
});

test('resolvePluginZipPath prefers explicit env path', async (t) => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'paths-zip-'));
  t.after(() => {
    delete process.env.PLUGIN_FILE_PATH;
    delete process.env.PLUGIN_ZIP;
    return fs.remove(tmp);
  });
  const repoRoot = path.join(tmp, 'repo');
  await fs.ensureDir(repoRoot);
  process.env.PLUGIN_FILE_PATH = 'artifacts/my.zip';
  const pluginRoot = path.join(repoRoot, 'plugin');
  await fs.ensureDir(path.join(pluginRoot, 'dist'));
  const resolved = resolvePluginZipPath({ repoRoot, pluginRoot });
  assert.strictEqual(resolved, path.join(repoRoot, 'artifacts', 'my.zip'));
});

test('resolveEnvFilePath points to deploy root', () => {
  const envPath = resolveEnvFilePath('.env');
  assert.match(envPath, /logistics[\\/]+plugin-deploy[\\/]\.env$/);
});
