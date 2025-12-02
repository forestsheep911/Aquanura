const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { generateWebpackEntries } = require('../plugin/manifest');

test('generateWebpackEntries handles unix-style manifest paths', () => {
  const manifest = {
    desktop: { js: ['desktop/js/app.js'] },
  };
  const manifestPath = 'plugin/src/manifest.json';
  const entries = generateWebpackEntries(manifest, manifestPath);
  assert.deepEqual(entries, {
    app: './src/desktop/js/app.js',
  });
});

test('generateWebpackEntries handles windows-style manifest paths', () => {
  const manifest = {
    desktop: { js: ['desktop/js/app.js'] },
    mobile: { js: [] },
  };
  const manifestPath = path.join('C:\\', 'repo', 'plugin', 'src', 'manifest.json');
  const entries = generateWebpackEntries(manifest, manifestPath);
  assert.deepEqual(entries, {
    app: './src/desktop/js/app.js',
  });
});
