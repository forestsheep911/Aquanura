const platformName = process.env.CERT_TOOLKIT_PLATFORM || process.platform;
module.exports.platform = require(`./${platformName}`);
