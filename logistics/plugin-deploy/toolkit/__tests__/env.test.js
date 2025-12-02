const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('fs-extra');
const { loadEnv, parseBoolean, parseNumber, clearEnvCache } = require('../runtime/env');

test('parseBoolean handles diverse inputs', () => {
  assert.strictEqual(parseBoolean('true'), true);
  assert.strictEqual(parseBoolean('FALSE', true), false);
  assert.strictEqual(parseBoolean(undefined, true), true);
});

test('parseNumber coerces numeric strings', () => {
  assert.strictEqual(parseNumber('42', 0), 42);
  assert.strictEqual(parseNumber('abc', 7), 7);
});

test('loadEnv prioritizes process.env values', async (t) => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'env-test-'));
  t.after(() => {
    delete process.env.ENV_TEST_KEY;
    clearEnvCache();
    return fs.remove(tmp);
  });
  const envPath = path.join(tmp, '.env');
  await fs.writeFile(envPath, 'ENV_TEST_KEY=file\nENV_FLAG=true\n');

  process.env.ENV_TEST_KEY = 'process';
  const env = loadEnv({ path: envPath, injectProcess: false, force: true });
  assert.strictEqual(env.get('ENV_TEST_KEY'), 'process');
  assert.strictEqual(env.getBool('ENV_FLAG'), true);
});
