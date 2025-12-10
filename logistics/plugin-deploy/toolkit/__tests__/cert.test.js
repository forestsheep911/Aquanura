const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('fs-extra');

function loadCertModule(tempDir) {
  process.env.CERT_TOOLKIT_PLATFORM = 'mock';
  process.env.CERT_TOOLKIT_TEMP_DIR = tempDir;
  const modulePath = require.resolve('../cert');
  delete require.cache[modulePath];
  return require(modulePath);
}

test('certificate install renews when missing and skips when valid', async (t) => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'cert-test-'));
  t.after(() => {
    delete process.env.CERT_TOOLKIT_PLATFORM;
    delete process.env.CERT_TOOLKIT_TEMP_DIR;
    const modulePath = require.resolve('../cert');
    delete require.cache[modulePath];
    return fs.remove(tmp);
  });

  const certModule = loadCertModule(tmp);
  const first = certModule.install({
    organization: 'Test CA',
    renewBeforeDays: 1,
  });
  assert.ok(first.renewed);
  assert.ok(fs.existsSync(first.path));

  const metadata = certModule.readCertificateMetadata(first.path);
  assert.ok(metadata.notAfter instanceof Date);

  const second = certModule.install({
    organization: 'Test CA',
    renewBeforeDays: 1,
  });
  assert.strictEqual(second.renewed, false);
});
