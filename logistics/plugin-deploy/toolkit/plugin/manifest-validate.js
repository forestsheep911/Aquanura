const path = require('node:path');

function getManifestValidateMode(raw = process.env.MANIFEST_VALIDATE) {
  const normalized = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) return 'strict';
  if (['strict', 'warn', 'off'].includes(normalized)) return normalized;
  return 'strict';
}

function normalizeResult(result) {
  const valid = Boolean(result?.valid);
  const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
  const errors = Array.isArray(result?.errors) ? result.errors : [];
  return { valid, warnings, errors };
}

function formatAjvError(error) {
  if (!error) return 'Unknown validation error';

  const message = String(error.message || 'Invalid value');
  const instancePath = String(error.instancePath || '').trim();

  if (!instancePath) {
    return message;
  }

  const normalizedPath = instancePath.replace(/^\//, '');
  return `${normalizedPath}: ${message}`;
}

function formatValidationResult({ warnings, errors } = {}) {
  const warningMessages = (Array.isArray(warnings) ? warnings : [])
    .map((w) => (w && typeof w.message === 'string' ? w.message : String(w)))
    .filter(Boolean);

  const errorMessages = (Array.isArray(errors) ? errors : [])
    .map((e) => formatAjvError(e))
    .filter(Boolean);

  return { warnings: warningMessages, errors: errorMessages };
}

function createFileExistsValidator(pluginDir) {
  // plugin-manifest-validator will call this with manifest-relative paths
  return (filePath) => {
    try {
      const fs = require('fs-extra');
      const abs = path.join(pluginDir, filePath);
      const stat = fs.statSync(abs);
      return stat.isFile();
    } catch {
      return false;
    }
  };
}

function createMaxFileSizeValidator(pluginDir) {
  return (maxBytes, filePath) => {
    try {
      const fs = require('fs-extra');
      const abs = path.join(pluginDir, filePath);
      const stat = fs.statSync(abs);
      return stat.size <= maxBytes;
    } catch {
      return false;
    }
  };
}

function validateManifest({ manifest, pluginDir }) {
  const mod = require('@kintone/plugin-manifest-validator');
  const validate = typeof mod === 'function' ? mod : mod?.default;
  if (typeof validate !== 'function') {
    throw new TypeError(
      'Invalid @kintone/plugin-manifest-validator export: expected a function (CommonJS default export).',
    );
  }

  const result = validate(manifest, {
    maxFileSize: createMaxFileSizeValidator(pluginDir),
    fileExists: createFileExistsValidator(pluginDir),
  });
  return normalizeResult(result);
}

module.exports = {
  getManifestValidateMode,
  validateManifest,
  formatValidationResult,
};
