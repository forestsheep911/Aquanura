#!/usr/bin/env node
const { execSync } = require('node:child_process');
const fs = require('fs-extra');
const chalk = require('chalk');
const { install, readCertificateMetadata } = require('./toolkit/cert');
const { rootCAPath, rootCAKeyPath, pkgDir } = require('./toolkit/cert/constants');
const { removeFromTrustStores } = require('./toolkit/cert/platforms').platform;

class CertFixer {
  async run() {
    console.log(chalk.cyan('🔧 Fixing dev certificate trust issues\n'));

    try {
      await this.cleanupOldCertificates();
      await this.reinstallCertificate();
      await this.verifyInstallation();

      console.log(chalk.green('\n🎉 Certificate fix completed!'));
      console.log(chalk.gray('\n📝 Tips for next development session:'));
      console.log(chalk.gray('   • If system prompts for password, enter your system account password'));
      console.log(chalk.gray('   • If browser shows security warning, choose "Advanced" → "Proceed"'));
      console.log(chalk.gray('   • Or type thisisunsafe in address bar to ignore warning'));
    } catch (error) {
      console.error(chalk.red('\n❌ Certificate fix failed:'), error.message);
      console.log(chalk.gray('\n🔧 You can try manual handling:'));
      console.log(
        chalk.gray('   • Re-run: pnpm --filter ai-translate-plugin-deploy run fix-cert'),
      );
      console.log(chalk.gray('   • For manual trust removal, follow platform-specific steps (certutil/security etc.)'));
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
        console.log('   (Old certificate may not exist)');
      }

      if (await fs.pathExists(pkgDir)) {
        console.log(`   Cleaning directory: ${pkgDir}`);
        await fs.remove(pkgDir);
      }
    } catch (error) {
      console.warn(chalk.yellow('   Warning: Issue during cleanup:'), error.message);
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
        ? '   ♻️ New root certificate generated and written to system trust'
        : '   🔁 Existing root certificate still valid, re-injected into system trust',
    );
  }

  async verifyInstallation() {
    if (await fs.pathExists(rootCAPath)) {
      console.log('   ✅ Root CA certificate generated:', rootCAPath);
    } else {
      throw new Error('Root CA certificate generation failed');
    }

    if (await fs.pathExists(rootCAKeyPath)) {
      console.log('   ✅ Root CA private key generated:', rootCAKeyPath);
    } else {
      throw new Error('Root CA private key generation failed');
    }

    const metadata = readCertificateMetadata(rootCAPath);
    if (metadata?.notAfter) {
      const daysLeft = Math.round(
        (metadata.notAfter.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      );
      console.log(`   📅 Certificate valid until: ${metadata.notAfter.toISOString()} (~${daysLeft} days)`);
    }
  }
}

async function main() {
  const fixer = new CertFixer();
  await fixer.run();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('💥 Certificate fix failed:'), error);
    process.exit(1);
  });
}

module.exports = CertFixer;
