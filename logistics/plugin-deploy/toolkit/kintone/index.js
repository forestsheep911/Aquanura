const { KintoneRestAPIClient } = require('@kintone/rest-api-client');
const logger = require('../utils/logger');

const DUPLICATE_CODE = 'GAIA_PL18';
const ID_MISMATCH_CODE = 'GAIA_PL22';

function normalizeErrorCode(error) {
  return error?.code || error?.response?.data?.code;
}

function normalizeErrorId(error) {
  return error?.id || error?.response?.data?.id;
}

function logSuccess(action, result) {
  logger.log(`Plugin ${action} successful:`);
  logger.log(`- ID: ${result.id}`);
  logger.log(`- Version: ${result.version}`);
}

class PluginUploader {
  constructor(clientOptions, clientFactory = (options) => new KintoneRestAPIClient(options)) {
    this.client = clientFactory(clientOptions);
  }

  async upload({ pluginId, file }) {
    logger.log(`Uploading ${file.name || 'plugin'}...`);
    const { fileKey } = await this.client.file.uploadFile({ file });
    return pluginId
      ? this.updateWithFallback(pluginId, fileKey)
      : this.installWithFallback(fileKey);
  }

  async installWithFallback(fileKey) {
    try {
      const result = await this.client.plugin.installPlugin({ fileKey });
      logSuccess('installed', result);
      return result;
    } catch (error) {
      const code = normalizeErrorCode(error);
      const existingId = normalizeErrorId(error);
      if (code === DUPLICATE_CODE && existingId) {
        logger.warn(`Detected existing plugin (ID: ${existingId}), switching to update flow...`);
        return this.updatePlugin(existingId, fileKey);
      }
      throw error;
    }
  }

  async updateWithFallback(pluginId, fileKey) {
    try {
      return await this.updatePlugin(pluginId, fileKey);
    } catch (error) {
      const code = normalizeErrorCode(error);
      const existingId = normalizeErrorId(error);

      if (code === DUPLICATE_CODE && existingId) {
        if (existingId !== pluginId) {
          logger.warn(
            `Target ID (${pluginId}) does not exist, found actual ID (${existingId}), updating it...`,
          );
        } else {
          logger.warn(`Target ID (${pluginId}) already exists, retrying update...`);
        }
        return this.updatePlugin(existingId, fileKey);
      }

      if (code === ID_MISMATCH_CODE) {
        logger.warn(`Plugin ID mismatch (target: ${pluginId}), attempting uninstall and reinstall...`);
        return this.reinstall(pluginId, fileKey, error);
      }

      logger.warn(`Update with target ID (${pluginId}) failed, attempting to install new plugin directly...`);
      return this.installWithFallback(fileKey);
    }
  }

  async reinstall(pluginId, fileKey, originalError) {
    try {
      await this.client.plugin.uninstallPlugin({ id: pluginId });
      logger.log(`Plugin uninstalled (ID: ${pluginId})`);
      const result = await this.client.plugin.installPlugin({ fileKey });
      logSuccess('reinstalled', result);
      return result;
    } catch (error) {
      const code = normalizeErrorCode(error);
      const conflictingId = normalizeErrorId(error);

      if (code === DUPLICATE_CODE && conflictingId) {
        logger.warn('ID conflict still exists after uninstall, updating conflicting ID...');
        return this.updatePlugin(conflictingId, fileKey);
      }

      logger.error('Uninstall and reinstall failed, please handle manually:');
      logger.error('- Open Kintone admin console to delete conflicting plugin');
      logger.error('- Temporarily disable DEV_UPLOAD or switch to manual upload');
      throw originalError;
    }
  }

  async updatePlugin(pluginId, fileKey) {
    const result = await this.client.plugin.updatePlugin({ id: pluginId, fileKey });
    logSuccess('updated', result);
    return result;
  }
}

async function uploadPlugin({ clientOptions, clientFactory, ...rest }) {
  const uploader = new PluginUploader(clientOptions, clientFactory);
  return uploader.upload(rest);
}

module.exports = {
  uploadPlugin,
  PluginUploader,
};
