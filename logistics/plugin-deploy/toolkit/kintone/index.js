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
  logger.log(`插件${action}成功:`);
  logger.log(`- ID: ${result.id}`);
  logger.log(`- Version: ${result.version}`);
}

class PluginUploader {
  constructor(clientOptions, clientFactory = (options) => new KintoneRestAPIClient(options)) {
    this.client = clientFactory(clientOptions);
  }

  async upload({ pluginId, file }) {
    const { fileKey } = await this.client.file.uploadFile({ file });
    return pluginId
      ? this.updateWithFallback(pluginId, fileKey)
      : this.installWithFallback(fileKey);
  }

  async installWithFallback(fileKey) {
    try {
      const result = await this.client.plugin.installPlugin({ fileKey });
      logSuccess('安装', result);
      return result;
    } catch (error) {
      const code = normalizeErrorCode(error);
      const existingId = normalizeErrorId(error);
      if (code === DUPLICATE_CODE && existingId) {
        logger.warn(`检测到已有插件 (ID: ${existingId})，自动转为更新流程...`);
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
            `目标 ID (${pluginId}) 不存在，发现实际 ID (${existingId})，将对其执行更新...`,
          );
        } else {
          logger.warn(`目标 ID (${pluginId}) 已存在，重新尝试更新...`);
        }
        return this.updatePlugin(existingId, fileKey);
      }

      if (code === ID_MISMATCH_CODE) {
        logger.warn(`插件 ID 不匹配 (目标: ${pluginId})，尝试卸载后重新安装...`);
        return this.reinstall(pluginId, fileKey, error);
      }

      logger.warn(`使用目标 ID (${pluginId}) 更新失败，尝试直接安装新插件...`);
      return this.installWithFallback(fileKey);
    }
  }

  async reinstall(pluginId, fileKey, originalError) {
    try {
      await this.client.plugin.uninstallPlugin({ id: pluginId });
      logger.log(`插件已卸载 (ID: ${pluginId})`);
      const result = await this.client.plugin.installPlugin({ fileKey });
      logSuccess('重新安装', result);
      return result;
    } catch (error) {
      const code = normalizeErrorCode(error);
      const conflictingId = normalizeErrorId(error);

      if (code === DUPLICATE_CODE && conflictingId) {
        logger.warn('卸载后发现 ID 仍冲突，将对冲突 ID 执行更新...');
        return this.updatePlugin(conflictingId, fileKey);
      }

      logger.error('卸载并重新安装失败，请手动处理:');
      logger.error('- 打开 kintone 管理后台删除冲突插件');
      logger.error('- 暂时关闭 DEV_UPLOAD 或改为手动上传');
      throw originalError;
    }
  }

  async updatePlugin(pluginId, fileKey) {
    const result = await this.client.plugin.updatePlugin({ id: pluginId, fileKey });
    logSuccess('更新', result);
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
