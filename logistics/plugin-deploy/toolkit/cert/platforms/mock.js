const path = require('node:path');
const os = require('node:os');
const { pkgName } = require('../../common/constants');

let trustedCerts = [];

function getBaseDir() {
  return process.env.CERT_TOOLKIT_TEMP_DIR || os.tmpdir();
}

function addToTrustStores(certPath) {
  trustedCerts.push(certPath);
}

function removeFromTrustStores() {
  trustedCerts = [];
}

function getApplicationConfigPath(name = pkgName) {
  return path.join(getBaseDir(), `${name}-cert-test`);
}

function getTrustedCerts() {
  return trustedCerts.slice();
}

module.exports = {
  addToTrustStores,
  removeFromTrustStores,
  getApplicationConfigPath,
  getTrustedCerts,
};
