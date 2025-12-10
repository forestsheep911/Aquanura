const fs = require('fs-extra');
const dotenv = require('dotenv');
const { resolveEnvFilePath } = require('./paths');

let cachedEnv = null;

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off', ''].includes(normalized)) return false;
  return defaultValue;
}

function parseNumber(value, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : defaultValue;
}

function parseEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return {};
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  return dotenv.parse(content);
}

function applyToProcessEnv(values) {
  Object.entries(values).forEach(([key, value]) => {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

function loadEnv(options = {}) {
  const envPath = options.path || resolveEnvFilePath('.env');
  if (!options.force && cachedEnv?.path === envPath) {
    return cachedEnv.result;
  }

  const parsed = parseEnvFile(envPath);

  if (options.injectProcess !== false) {
    applyToProcessEnv(parsed);
  }

  const result = {
    path: envPath,
    raw: parsed,
    get(key, fallback) {
      if (process.env[key] !== undefined) {
        return process.env[key];
      }
      if (parsed[key] !== undefined) {
        return parsed[key];
      }
      return fallback;
    },
    getBool(key, fallback = false) {
      return parseBoolean(this.get(key), fallback);
    },
    getNumber(key, fallback) {
      return parseNumber(this.get(key), fallback);
    },
  };

  cachedEnv = { path: envPath, result };
  return result;
}

function clearEnvCache() {
  cachedEnv = null;
}

module.exports = {
  loadEnv,
  parseBoolean,
  parseNumber,
  clearEnvCache,
};
