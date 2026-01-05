#!/usr/bin/env node
const path = require('node:path');
const fs = require('fs-extra');
const { build } = require('vite');

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

(async () => {
    const rootDir = path.resolve(__dirname, '../../../');
    const customDir = path.join(rootDir, 'customization');
    const outDir = path.join(customDir, 'dist');
    const entry = path.join(customDir, 'src/index.ts');

    if (!fs.existsSync(entry)) {
        console.error(`Entry file not found: ${entry}`);
        process.exit(1);
    }

    const cssInjectedByJsPlugin = await import('vite-plugin-css-injected-by-js').then(m => m.default());
    const isSeparateCss = process.argv.includes('--separate-css');
    // We treat everything as "production" for Vite to effectively minify and bundle, 
    // but the user distinguishes "dev" vs "prod" via watch mode or specific commands.
    // However, our script naming is "dev:custom" which calls "vite build --watch".
    // This script `build.js` specifically runs the build API.

    // If we are in "watch" mode (usually passed by calling vite directly, but here we invoke build logic manually)
    // Actually the user runs `vite build --watch` for dev, which bypasses this script? 
    // Wait, package.json says `"dev:custom": "cd customization && vite build --watch"`.
    // That means `dev:custom` uses the default vite config in the package, OR we need to pass a config.
    // The previous setup relied on `customization/vite.config.ts` if it existed, or default.
    // BUT we didn't create a vite.config.ts in customization!
    // AND this `logistics/customization-deploy/vite/build.js` is only used for `pnpm build:custom`.

    // Correction: I should update `dev:custom` to ALSO use this script or a similar config 
    // to ensure consistency (like the plugin side does).
    // For now, let's focus on `build:custom` behavior.

    const reactPlugin = await createReactPlugin();
    const plugins = [reactPlugin];
    if (!isSeparateCss) {
        plugins.push(cssInjectedByJsPlugin);
    }

    const isWatch = process.argv.includes('--watch');

    console.log(`Building customization...`);
    console.log(`Entry: ${entry}`);
    console.log(`Output: ${outDir}`);
    console.log(`CSS Strategy: ${isSeparateCss ? 'Separate File' : 'Injected into JS'}`);
    if (isWatch) console.log('Watch mode enabled');

    await fs.emptyDir(outDir);

    await build({
        root: customDir,
        plugins: plugins,
        build: {
            watch: isWatch ? {} : null,
            outDir,
            emptyOutDir: true,
            cssCodeSplit: isSeparateCss, // If false, vite tries to inline or put in one file? 
            // Actually `cssCodeSplit` true means "keep CSS separate from JS". 
            // If we use the injection plugin, it takes that CSS and puts it in JS.
            // So we generally leave cssCodeSplit default (true), and let the plugin handle the valid output.

            rollupOptions: {
                input: entry,
                output: {
                    format: 'iife',
                    entryFileNames: 'index.js',
                    assetFileNames: (assetInfo) => {
                        if (assetInfo.name && assetInfo.name.endsWith('.css')) {
                            return 'style.css';
                        }
                        return 'assets/[name][extname]';
                    },
                    name: 'MyCustomization',
                }
            }
        }
    });

    console.log('Build complete.');
})();
