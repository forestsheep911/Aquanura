const path = require('node:path');
const fs = require('fs-extra');
const forge = require('node-forge');
const { rootCAPath, rootCAKeyPath, pkgDir, isSupported } = require('./constants');
const { createCA, createCert } = require('./cert');
const { removeFromTrustStores, addToTrustStores } = require('./platforms').platform;

const DEFAULT_CA_OPTIONS = {
  organization: 'Developer',
  countryCode: 'CN',
  state: 'Shanghai',
  locality: 'Shanghai',
  validity: 7300,
  renewBeforeDays: 30,
  forceTrust: false,
};

function readCertificateMetadata(certPath) {
  try {
    if (!fs.existsSync(certPath)) {
      return null;
    }
    const pem = fs.readFileSync(certPath, 'utf-8');
    const cert = forge.pki.certificateFromPem(pem);
    return {
      notBefore: cert.validity.notBefore,
      notAfter: cert.validity.notAfter,
      subject: cert.subject?.attributes || [],
    };
  } catch {
    return null;
  }
}

function shouldRenewCA({ renewBeforeDays }) {
  if (!fs.existsSync(rootCAPath) || !fs.existsSync(rootCAKeyPath)) {
    return true;
  }
  const metadata = readCertificateMetadata(rootCAPath);
  if (!metadata?.notAfter) {
    return true;
  }
  const renewWindow = (renewBeforeDays ?? DEFAULT_CA_OPTIONS.renewBeforeDays) * 24 * 60 * 60 * 1000;
  return metadata.notAfter.getTime() - Date.now() <= renewWindow;
}

function recreateCAFiles(options) {
  const ca = createCA(options);
  fs.ensureDirSync(path.dirname(rootCAPath));
  fs.outputFileSync(rootCAPath, ca.cert);
  fs.outputFileSync(rootCAKeyPath, ca.key);
}

function cleanupPartialCA() {
  for (const target of [rootCAPath, rootCAKeyPath]) {
    if (fs.existsSync(target)) {
      fs.removeSync(target);
    }
  }
}

function uninstall() {
  removeFromTrustStores(rootCAPath);
  fs.removeSync(pkgDir);
}

function install({
  organization = DEFAULT_CA_OPTIONS.organization,
  countryCode = DEFAULT_CA_OPTIONS.countryCode,
  state = DEFAULT_CA_OPTIONS.state,
  locality = DEFAULT_CA_OPTIONS.locality,
  validity = DEFAULT_CA_OPTIONS.validity,
  renewBeforeDays = DEFAULT_CA_OPTIONS.renewBeforeDays,
  forceTrust = DEFAULT_CA_OPTIONS.forceTrust,
} = {}) {
  if (!isSupported) {
    throw new Error(`Platform not supported: "${process.platform}"`);
  }

  const shouldRenew = shouldRenewCA({ renewBeforeDays });
  if (shouldRenew) {
    cleanupPartialCA();
    recreateCAFiles({
      organization,
      countryCode,
      state,
      locality,
      validity,
    });
  }

  if (forceTrust || shouldRenew) {
    addToTrustStores(rootCAPath);
  }

  return {
    renewed: shouldRenew,
    path: rootCAPath,
  };
}

function certificateFor(requestedDomains = []) {
  const validity = 7300;
  install({ validity });
  const requests = Array.isArray(requestedDomains) ? requestedDomains : [requestedDomains];
  const domains = [
    ...new Set(
      ['localhost', 'localhost.localdomain', '127.0.0.1', '0.0.0.0', '::1'].concat(requests),
    ),
  ];
  const ca = {
    cert: fs.readFileSync(rootCAPath),
    key: fs.readFileSync(rootCAKeyPath),
  };
  const cert = createCert({
    ca,
    domains,
    validity,
  });
  return cert;
}

function gen(
  requestedDomains = [],
  outputDir = process.cwd(),
  certFileName = 'public.pem',
  keyFileName = 'private.pem',
) {
  const cert = certificateFor(requestedDomains);
  const certPath = path.join(outputDir, certFileName);
  const keyPath = path.join(outputDir, keyFileName);
  fs.outputFileSync(certPath, cert.cert);
  fs.outputFileSync(keyPath, cert.key);
}

module.exports = {
  uninstall,
  install,
  certificateFor,
  gen,
  readCertificateMetadata,
};
