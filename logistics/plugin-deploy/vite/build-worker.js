#!/usr/bin/env node
/**
 * Build worker process
 * Execute Vite build in a child process to avoid memory leaks in the main process
 */
const path = require('node:path');
const fs = require('fs-extra');
const { transformSync } = require('esbuild');

const RESULT_MARKER = '[build-worker:result]';

const forceJsxPlugin = {
    name: 'force-jsx-loader',
    enforce: 'pre',
    transform(code, id) {
        if (!id.endsWith('.js')) return null;
        if (id.includes('node_modules')) return null;
        const result = transformSync(code, {
            loader: 'jsx',
            jsxFactory: 'React.createElement',
            jsxFragment: 'React.Fragment',
        });
        return { code: result.code, map: null };
    },
};

async function createReactPlugin() {
    const mod = await import('@vitejs/plugin-react');
    const react = mod?.default;
    if (typeof react !== 'function') {
        throw new TypeError('Invalid @vitejs/plugin-react export: expected a default function.');
    }
    return react({
        jsxRuntime: 'classic',
        include: [/\.(jsx|tsx|js)$/],
    });
}

// Get build config from command line arguments
const configJson = process.argv[2];
if (!configJson) {
    console.error('[build-worker] Missing build config parameter');
    process.exit(1);
}

let config;
try {
    config = JSON.parse(configJson);
} catch (e) {
    console.error('[build-worker] Failed to parse config:', e.message);
    process.exit(1);
}

const {
    pluginRoot,
    tempOut,
    entryInfos,
    indicesToBuild,
    emptyOutDir,
    manifestVersion,
    actualPort,
    logLevel,
    devLogLevel,
    localLogEnabled,
} = config;

(async () => {
    try {
        const { build: viteBuild } = require('vite');
        const reactPlugin = await createReactPlugin();
        if (emptyOutDir) {
            await fs.emptyDir(tempOut);
        }

        const devServerOrigin = Number.isFinite(actualPort) && actualPort > 0
            ? `https://127.0.0.1:${actualPort}`
            : null;
        const dependencies = [];

        for (const entryIndex of indicesToBuild) {
            const info = entryInfos[entryIndex];
            if (!info || !info.absPath || !info.rel) {
                throw new Error(`Invalid entry index: ${entryIndex}`);
            }

            const define = {
                __DEV_LOG_ENDPOINT__: JSON.stringify('/__devlog'),
                __DEV_LIVE_ENDPOINT__: JSON.stringify('/__live'),
                __PLUGIN_VERSION__: JSON.stringify(manifestVersion),
                __DEV_LOG_LEVEL__: JSON.stringify(devLogLevel),
                __DEV_LOCAL_LOG_ENABLED__: JSON.stringify(localLogEnabled),
            };
            if (devServerOrigin) {
                define.__DEV_SERVER_ORIGIN__ = JSON.stringify(devServerOrigin);
            }

            const result = await viteBuild({
                root: pluginRoot,
                plugins: [forceJsxPlugin, reactPlugin],
                logLevel,
                esbuild: {
                    loader: 'jsx',
                    include: /\.js$/,
                    exclude: [],
                },
                define,
                build: {
                    outDir: tempOut,
                    emptyOutDir: false,
                    write: false,
                    cssCodeSplit: true,
                    chunkSizeWarningLimit: 4096,
                    rollupOptions: {
                        input: info.absPath,
                        onwarn: (warning, warn) => {
                            if (
                                warning &&
                                (warning.code === 'MODULE_LEVEL_DIRECTIVE' || warning.code === 'CHUNK_SIZE_LIMIT')
                            ) {
                                return;
                            }
                            warn(warning);
                        },
                        output: {
                            format: 'iife',
                            entryFileNames: 'js/[name].js',
                            assetFileNames: (assetInfo) => {
                                const ext = path.extname(assetInfo.name || '');
                                if (ext === '.css') return 'css/[name][extname]';
                                return 'assets/[name][extname]';
                            },
                        },
                    },
                },
            });

            const outputs = Array.isArray(result)
                ? result.flatMap((item) => item?.output || [])
                : result?.output || [];
            const modulePaths = [];

            for (const chunk of outputs) {
                if (chunk?.type === 'chunk' && chunk.isEntry) {
                    modulePaths.push(...Object.keys(chunk.modules || {}));
                }
            }
            dependencies.push({ entryRel: info.rel, modulePaths });

            for (const chunk of outputs) {
                if (!chunk || typeof chunk.fileName !== 'string') continue;
                const outputPath = path.join(tempOut, chunk.fileName);
                await fs.ensureDir(path.dirname(outputPath));
                if (chunk.type === 'chunk') {
                    await fs.writeFile(outputPath, chunk.code);
                } else if (chunk.type === 'asset') {
                    await fs.writeFile(outputPath, chunk.source);
                }
            }
        }

        process.stdout.write(`${RESULT_MARKER}${JSON.stringify({ dependencies })}\n`);
        process.exit(0);
    } catch (e) {
        console.error('[build-worker] Build failed:', e.message || e);
        process.exit(1);
    }
})();
