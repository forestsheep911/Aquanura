const test = require('node:test');
const assert = require('node:assert/strict');
const { PluginUploader } = require('../kintone');

function nextFrom(sequence, defaultResult = { id: 'default', version: '1' }) {
  if (!sequence.length) {
    return defaultResult;
  }
  const next = sequence.shift();
  if (next && next.error) {
    throw next.error;
  }
  return next.result ?? next;
}

function createStubClient({
  installSequence = [],
  updateSequence = [],
  uninstallSequence = [],
} = {}) {
  const calls = [];
  return {
    calls,
    file: {
      uploadFile: async () => {
        calls.push({ action: 'uploadFile' });
        return { fileKey: 'file-key' };
      },
    },
    plugin: {
      installPlugin: async (...args) => {
        calls.push({ action: 'install', args });
        return nextFrom(installSequence);
      },
      updatePlugin: async (...args) => {
        calls.push({ action: 'update', args });
        return nextFrom(updateSequence);
      },
      uninstallPlugin: async (...args) => {
        calls.push({ action: 'uninstall', args });
        return nextFrom(uninstallSequence);
      },
    },
  };
}

function createError({ code, id }) {
  return {
    response: {
      data: {
        code,
        id,
      },
    },
  };
}

test('install fallback updates existing plugin when duplicate detected', async () => {
  const client = createStubClient({
    installSequence: [{ error: createError({ code: 'GAIA_PL18', id: 'xyz' }) }],
    updateSequence: [{ result: { id: 'xyz', version: '2' } }],
  });
  const uploader = new PluginUploader({}, () => client);
  const result = await uploader.upload({ file: { name: 'plugin.zip', data: Buffer.alloc(0) } });
  assert.strictEqual(result.id, 'xyz');
  const updateCalls = client.calls.filter((call) => call.action === 'update');
  assert.strictEqual(updateCalls.length, 1);
});

test('update fallback reinstalls when id mismatch occurs', async () => {
  const client = createStubClient({
    updateSequence: [{ error: createError({ code: 'GAIA_PL22', id: 'abc' }) }],
    uninstallSequence: [{}],
    installSequence: [{ result: { id: 'abc', version: '3' } }],
  });
  const uploader = new PluginUploader({}, () => client);
  const result = await uploader.upload({
    pluginId: 'target',
    file: { name: 'plugin.zip', data: Buffer.alloc(0) },
  });
  assert.strictEqual(result.id, 'abc');
  const uninstallCalls = client.calls.filter((call) => call.action === 'uninstall');
  assert.strictEqual(uninstallCalls.length, 1);
});
