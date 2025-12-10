#!/usr/bin/env node
const { execSync } = require('node:child_process');
const fs = require('fs-extra');
const chalk = require('chalk');
const { install, readCertificateMetadata } = require('./toolkit/cert');
const { rootCAPath, rootCAKeyPath, pkgDir } = require('./toolkit/cert/constants');
const { removeFromTrustStores } = require('./toolkit/cert/platforms').platform;

class CertFixer {
  async run() {
    console.log(chalk.cyan('🔧 修复开发证书信任问题\n'));

    try {
      await this.cleanupOldCertificates();
      await this.reinstallCertificate();
      await this.verifyInstallation();

      console.log(chalk.green('\n🎉 证书修复完成！'));
      console.log(chalk.gray('\n📝 下次开发时提示：'));
      console.log(chalk.gray('   • 如系统提示输入密码，请输入系统账户密码'));
      console.log(chalk.gray('   • 浏览器若有安全警告，可选择“高级”→“继续访问”'));
      console.log(chalk.gray('   • 或在地址栏输入 thisisunsafe 忽略警告'));
    } catch (error) {
      console.error(chalk.red('\n❌ 证书修复失败:'), error.message);
      console.log(chalk.gray('\n🔧 可尝试手动处理：'));
      console.log(
        chalk.gray('   • 重新运行: pnpm --filter ai-translate-plugin-deploy run fix-cert'),
      );
      console.log(chalk.gray('   • 如需手动移除信任，可根据平台操作 (certutil/security 等)'));
      process.exit(1);
    }
  }

  async cleanupOldCertificates() {
    try {
      try {
        execSync("pkill -f 'vite-dev'", { stdio: 'ignore' });
      } catch (_) {}

      try {
        if (fs.existsSync(rootCAPath)) {
          removeFromTrustStores(rootCAPath);
        } else {
          removeFromTrustStores();
        }
      } catch (_) {
        console.log('   (旧证书可能已不存在)');
      }

      if (await fs.pathExists(pkgDir)) {
        console.log(`   清理目录: ${pkgDir}`);
        await fs.remove(pkgDir);
      }
    } catch (error) {
      console.warn(chalk.yellow('   警告: 清理过程出现问题:'), error.message);
    }
  }

  async reinstallCertificate() {
    const { renewed } = install({
      organization: 'AI Translate Dev CA',
      countryCode: 'CN',
      state: 'Development',
      locality: 'Development',
      validity: 7300,
      forceTrust: true,
    });
    console.log(
      renewed
        ? '   ♻️ 已生成新的根证书并写入系统信任'
        : '   🔁 现有根证书仍有效，已重新注入系统信任',
    );
  }

  async verifyInstallation() {
    if (await fs.pathExists(rootCAPath)) {
      console.log('   ✅ 根 CA 证书已生成:', rootCAPath);
    } else {
      throw new Error('根 CA 证书生成失败');
    }

    if (await fs.pathExists(rootCAKeyPath)) {
      console.log('   ✅ 根 CA 私钥已生成:', rootCAKeyPath);
    } else {
      throw new Error('根 CA 私钥生成失败');
    }

    const metadata = readCertificateMetadata(rootCAPath);
    if (metadata?.notAfter) {
      const daysLeft = Math.round(
        (metadata.notAfter.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      );
      console.log(`   📅 证书有效期至: ${metadata.notAfter.toISOString()} (~${daysLeft} 天)`);
    }
  }
}

async function main() {
  const fixer = new CertFixer();
  await fixer.run();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('💥 证书修复失败:'), error);
    process.exit(1);
  });
}

module.exports = CertFixer;
