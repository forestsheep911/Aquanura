#!/usr/bin/env node
const path = require('node:path');
const fs = require('fs-extra');
const { execSync } = require('node:child_process');
const dotenv = require('dotenv');
const chalk = require('chalk');

// Load env from root
const rootDir = path.resolve(__dirname, '../../../');
const envPath = path.join(rootDir, '.env');
dotenv.config({ path: envPath });

const MANIFEST_TEMPLATE = path.join(__dirname, 'customize-manifest.json');
const TEMP_MANIFEST = path.join(__dirname, 'customize-manifest.prod.json');

(async () => {
    const baseUrl = process.env.KINTONE_BASE_URL;
    const username = process.env.KINTONE_USERNAME;
    const password = process.env.KINTONE_PASSWORD;
    const appId = process.env.KINTONE_CUSTOMIZATION_APP_ID_PROD;

    if (!baseUrl || !username || !password || !appId) {
        console.error(chalk.red('Missing required environment variables.'));
        console.error('Ensure KINTONE_BASE_URL, KINTONE_USERNAME, KINTONE_PASSWORD, and KINTONE_CUSTOMIZATION_APP_ID_PROD are set in .env');
        process.exit(1);
    }

    try {
        const manifest = await fs.readJson(MANIFEST_TEMPLATE);
        manifest.app = appId;

        // Adjust paths in manifest to be relative to where we run uploader?
        // See upload-dev.js for logic.
        manifest.desktop.js = manifest.desktop.js.map(p => path.join('../../', p));
        // Only include css if it exists
        const cssPath = path.join(rootDir, 'customization/dist/style.css');
        if (fs.existsSync(cssPath)) {
            console.log(chalk.gray('Found style.css, adding to manifest...'));
            manifest.desktop.css = ['../../customization/dist/style.css'];
        } else {
            manifest.desktop.css = [];
        }

        manifest.mobile.js = manifest.mobile.js.map(p => path.join('../../', p));
        manifest.mobile.css = [];

        await fs.writeJson(TEMP_MANIFEST, manifest, { spaces: 2 });

        console.log(chalk.cyan(`Uploading to App ID: ${appId} on ${baseUrl} (PRODUCTION)...`));

        // Construct command
        const uploaderBin = path.resolve(__dirname, 'node_modules/.bin/kintone-customize-uploader');
        const cmd = `"${uploaderBin}" --base-url "${baseUrl}" --username "${username}" --password "${password}" "${TEMP_MANIFEST}"`;

        execSync(cmd, { stdio: 'inherit', cwd: __dirname });

        console.log(chalk.green('Upload successful!'));

    } catch (error) {
        console.error(chalk.red('Upload failed:'), error);
        process.exit(1);
    } finally {
        if (fs.existsSync(TEMP_MANIFEST)) {
            fs.removeSync(TEMP_MANIFEST);
        }
    }
})();
