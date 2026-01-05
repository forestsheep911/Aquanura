#!/usr/bin/env node
const { createServer } = require('vite');
const path = require('node:path');
const { KintoneRestAPIClient } = require('@kintone/rest-api-client');
const dotenv = require('dotenv');
const chalk = require('chalk');
const fs = require('fs-extra');

// Load env
const rootDir = path.resolve(__dirname, '../../../');
const envPath = path.join(rootDir, '.env');
dotenv.config({ path: envPath });

// Prepare Log File
const logDir = path.join(rootDir, 'logistics/log');
fs.ensureDirSync(logDir);
const logFile = path.join(logDir, 'dev.log');

async function updateKintoneCustomizeUrl(devUrl) {
    const baseUrl = process.env.KINTONE_BASE_URL_DEV || process.env.KINTONE_BASE_URL;
    const username = process.env.KINTONE_USERNAME_DEV || process.env.KINTONE_USERNAME;
    const password = process.env.KINTONE_PASSWORD_DEV || process.env.KINTONE_PASSWORD;
    const appId = process.env.KINTONE_CUSTOMIZATION_APP_ID_DEV;

    if (!baseUrl || !username || !password || !appId) {
        console.error(chalk.red('Missing Kintone Dev credentials. Cannot auto-update customization URL.'));
        return;
    }

    const client = new KintoneRestAPIClient({
        baseUrl,
        auth: { username, password }
    });

    try {
        console.log(chalk.cyan(`Updating App ${appId} settings to use Dev URL: ${devUrl}`));

        await client.app.updateAppCustomize({
            app: appId,
            scope: 'ALL',
            desktop: {
                js: [
                    { type: 'URL', url: devUrl }
                ]
            }
        });

        console.log(chalk.green('✔ Kintone App settings updated. Refresh your Kintone App page!'));

        // We also need to deploy the settings (make them live)
        await client.app.deployApp({ apps: [{ app: appId }] });
        console.log(chalk.green('✔ Settings deployed to production env of the App.'));

    } catch (error) {
        console.error(chalk.red('Failed to update Kintone settings:'), error.message);
    }
}

(async () => {
    const customDir = path.join(rootDir, 'customization');

    const kintoneDevPlugin = {
        name: 'kintone-dev-plugin',
        configureServer(server) {
            // Middleware for HMR Loader
            server.middlewares.use((req, res, next) => {
                if (req.url === '/loader.js') {
                    const protocol = server.config.server.https ? 'https' : 'http';
                    const host = '127.0.0.1'; // Force 127.0.0.1 for cert matching
                    const port = server.config.server.port || 5173;
                    const origin = `${protocol}://${host}:${port}`;

                    const loaderScript = `
(function() {
  console.log('[Aquanura] Connecting to Vite Dev Server at ${origin}...');

  // 1. Inject React Refresh Preamble (Required for @vitejs/plugin-react HMR)
  const script = document.createElement('script');
  script.type = 'module';
  script.innerHTML = \`
    import RefreshRuntime from "${origin}/@react-refresh";
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
  \`;
  document.head.appendChild(script);

  // 2. Load Vite Client and Entry
  const injectScript = (src) => {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = src;
    document.head.appendChild(s);
  };
  injectScript('${origin}/@vite/client');
  injectScript('${origin}/src/index.tsx');
})();
`;
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/javascript');
                    res.end(loaderScript);
                    return;
                }
                next();
            });

            // Middleware for Logging
            server.middlewares.use((req, res, next) => {
                if (req.url === '/log') {
                    // Handle CORS Preflight
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
                    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

                    if (req.method === 'OPTIONS') {
                        res.statusCode = 204;
                        res.end();
                        return;
                    }

                    if (req.method === 'POST') {
                        let body = '';
                        req.on('data', chunk => { body += chunk.toString(); });
                        req.on('end', async () => {
                            try {
                                const { level, args } = JSON.parse(body);
                                const timestamp = new Date().toISOString();
                                const logEntry = `[${timestamp}] [${level}] ${args.join(' ')}\n`;
                                await fs.appendFile(logFile, logEntry);
                                res.statusCode = 200;
                                res.end();
                            } catch (e) {
                                console.error('Failed to write log:', e);
                                res.statusCode = 500;
                                res.end();
                            }
                        });
                        return;
                    }
                }
                next();
            });
        }
    };

    const server = await createServer({
        root: customDir,
        server: {
            port: 5173,
            https: true,
            host: true,
            cors: { origin: '*' }, // Force allow CORS
        },
        plugins: [
            (await import('@vitejs/plugin-react')).default(),
            (await import('vite-plugin-mkcert')).default(),
            kintoneDevPlugin
        ]
    });

    await server.listen();

    const address = server.httpServer.address();
    const port = address.port;
    const loaderUrl = `https://127.0.0.1:${port}/loader.js`;

    console.log(chalk.cyan(`Dev server listening. Loader available at: ${loaderUrl}`));

    // Only update if not previously successful or if needed (here we always do to be safe)
    await updateKintoneCustomizeUrl(loaderUrl);

    server.printUrls();
})();
