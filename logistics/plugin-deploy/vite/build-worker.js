#!/usr/bin/env node
/**
 * Build worker process
 * Execute Vite build in a child process to avoid memory leaks in the main process
 */
const path = require('node:path');

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

        // Parallel builds for speed
        await Promise.all(
            indicesToBuild.map(async (entryIndex) => {
                const info = entryInfos[entryIndex];

                await viteBuild({
                    root: pluginRoot,
                    configFile: path.join(pluginRoot, 'vite.config.js'),
                    logLevel: logLevel,
                    define: {
                        __DEV_LOG_ENDPOINT__: JSON.stringify('/__devlog'),
                        __DEV_LIVE_ENDPOINT__: JSON.stringify('/__live'),
                        __PLUGIN_VERSION__: JSON.stringify(manifestVersion),
                        __DEV_LOG_LEVEL__: JSON.stringify(devLogLevel),
                        __DEV_LOCAL_LOG_ENABLED__: JSON.stringify(localLogEnabled),
                        __DEV_SERVER_ORIGIN__: JSON.stringify(`https://localhost:${actualPort}`),
                    },
                    build: {
                        outDir: tempOut,
                        // ⚠️ Must be false for parallel builds to avoid race conditions
                        emptyOutDir: false,
                        cssCodeSplit: true,
                        chunkSizeWarningLimit: 4096,
                        rollupOptions: {
                            input: info.absPath,
                            onwarn: (warning, warn) => {
                                if (
                                    warning &&
                                    (warning.code === 'MODULE_LEVEL_DIRECTIVE' || warning.code === 'CHUNK_SIZE_LIMIT')
                                )
                                    return;
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
            }),
        );

        // Build successful
        process.exit(0);
    } catch (e) {
        console.error('[build-worker] Build failed:', e.message || e);
        process.exit(1);
    }
})();
