#!/usr/bin/env node
const path = require('node:path');
const fs = require('fs-extra');
const chalk = require('chalk');
const { transformSync } = require('esbuild');
const { buildPlugin, buildDevPlugin } = require('../toolkit/plugin');
const { collectCssEntries, compileCss } = require('../toolkit/css');
const {
  getManifestValidateMode,
  validateManifest,
  formatValidationResult,
} = require('../toolkit/plugin/manifest-validate');
const { loadEnv } = require('../toolkit/runtime/env');
const {
  findRepoRoot,
  resolvePluginRoot,
  resolvePluginManifestPath,
  resolvePluginDistDir,
  resolvePluginZipPath,
} = require('../toolkit/runtime/paths');

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

(async () => {
  const repoRoot = findRepoRoot();
  loadEnv({ path: path.join(repoRoot, '.env') });
  // Use ESM import to avoid Vite's deprecated CJS Node API warning.
  const { build } = await import('vite');
  const reactPlugin = await createReactPlugin();

  const pluginRoot = resolvePluginRoot({ repoRoot });
  const manifestPath = resolvePluginManifestPath({ repoRoot, pluginRoot });
  const manifest = await fs.readJSON(manifestPath);
  const localCssEntries = collectCssEntries(manifest);
  const manifestValidateMode = getManifestValidateMode();
  if (manifestValidateMode !== 'off') {
    const pluginDir = path.dirname(manifestPath);
    const validation = validateManifest({ manifest, pluginDir });
    const { warnings, errors } = formatValidationResult(validation);

    if (warnings.length > 0) {
      console.warn(chalk.yellow(`[vite-build] Manifest validation warnings (${warnings.length}):`));
      for (const warning of warnings) {
        console.warn(chalk.yellow(`- ${warning}`));
      }
    }

    if (!validation.valid) {
      console.error(chalk.red(`[vite-build] Manifest validation failed: ${manifestPath}`));
      console.error(chalk.red('Invalid manifest.json:'));
      for (const error of errors) {
        console.error(chalk.red(`- ${error}`));
      }
      if (manifestValidateMode === 'strict') {
        console.error(chalk.gray('Fix the manifest and re-run `pnpm build`.'));
        process.exit(1);
      }
    }
  }

  const outDir = resolvePluginDistDir({ repoRoot, pluginRoot });
  const logLevel = process.env.VITE_LOG_LEVEL || 'info';

  // Check build mode: support both --dev flag and DEV_MODE environment variable
  const hasDevFlag = process.argv.includes('--dev');
  const devModeEnv = String(process.env.DEV_MODE ?? '')
    .trim()
    .toLowerCase();

  let isDevMode;
  if (hasDevFlag) {
    isDevMode = true;
  } else if (devModeEnv === '') {
    isDevMode = false; // Default to production mode
  } else {
    isDevMode = !['false', '0', 'off', 'no'].includes(devModeEnv);
  }

  // Strip development-only scripts in production mode
  if (!isDevMode) {
    const stripDevScripts = (section) => {
      if (!section || !Array.isArray(section.js)) return;
      // Filter out development-only scripts (live-reload and logger)
      section.js = section.js.filter(
        (item) =>
          item &&
          !/dev\/live-reload\.js$/.test(item) &&
          !/log\/live-reload\.js$/.test(item) &&
          !/log\/logger\.js$/.test(item)
      );
    };
    stripDevScripts(manifest.desktop);
    stripDevScripts(manifest.mobile);
    stripDevScripts(manifest.config);
    console.log(chalk.green('[vite-build] Build mode: PRODUCTION - Development scripts stripped'));
  } else {
    console.log(chalk.yellow('[vite-build] Build mode: DEVELOPMENT - Development features retained'));
  }

  const esbuildOptions = {
    loader: 'jsx',
    include: /\.js$/,
    exclude: [],
  };

  if (!isDevMode) {
    esbuildOptions.pure = ['console.log', 'console.info', 'console.debug', 'console.trace'];
  }

  const commonViteOptions = {
    root: pluginRoot,
    plugins: [forceJsxPlugin, reactPlugin],
    logLevel,
    esbuild: esbuildOptions,
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
  };

  await fs.emptyDir(outDir);

  const entries = new Set();
  for (const type of ['desktop', 'mobile', 'config']) {
    const jsFiles = manifest[type]?.js || [];
    for (const rel of jsFiles.filter((r) => !/^https?:\/\//.test(r))) {
      entries.add(path.resolve(pluginRoot, 'src', rel));
    }
  }

  if (entries.size === 0) {
    throw new Error('No JavaScript entries defined in manifest.json');
  }

  const quietOnWarn = (warning, warn) => {
    if (!warning) return;
    if (['MODULE_LEVEL_DIRECTIVE', 'CHUNK_SIZE_LIMIT'].includes(warning.code)) {
      return;
    }
    warn(warning);
  };

  let mergedManifest = {};
  const entryArray = Array.from(entries);
  for (let index = 0; index < entryArray.length; index += 1) {
    const entry = entryArray[index];
    await build({
      ...commonViteOptions,
      build: {
        outDir,
        manifest: 'build.manifest.json',
        emptyOutDir: index === 0,
        chunkSizeWarningLimit: 4096,
        rollupOptions: {
          input: entry,
          onwarn: quietOnWarn,
          output: {
            format: 'iife',
            entryFileNames: 'js/[name].js',
            assetFileNames: 'assets/[name][extname]',
          },
        },
      },
    });

    const chunkManifestPath = path.join(outDir, 'build.manifest.json');
    const chunkManifest = await fs.readJSON(chunkManifestPath);
    mergedManifest = { ...mergedManifest, ...chunkManifest };
  }

  await fs.writeJSON(path.join(outDir, 'build.manifest.json'), mergedManifest, {
    spaces: 2,
  });

  const compiledCss = localCssEntries.length
    ? await compileCss(manifest, pluginRoot, {
        onWarning: (message) => console.warn(chalk.yellow(message)),
      })
    : {};
  const cssBuffers = {};
  for (const [relPath, css] of Object.entries(compiledCss)) {
    cssBuffers[relPath] = Buffer.from(css);
  }

  // Debug log for dev mode detection (only in verbose mode)
  if (logLevel === 'debug') {
    console.log(
      `[vite-build] Dev mode detection: --dev=${hasDevFlag}, DEV_MODE=${process.env.DEV_MODE}, isDevMode=${isDevMode}`,
    );
  }

  // Add badge to icon in dev mode
  if (isDevMode && manifest.icon) {
    console.log('[vite-build] Adding dev badge to plugin icon');
    try {
      const { addDevBadge } = require('../toolkit/plugin/manifest');
      const originalIcon = manifest.icon;
      const iconPath = path.join(path.dirname(manifestPath), originalIcon);

      if (await fs.pathExists(iconPath)) {
        const devIconBuffer = await addDevBadge(iconPath);

        // Save processed icon to temporary location
        const tempIconPath = path.join(outDir, 'temp_icon.png');
        await fs.outputFile(tempIconPath, devIconBuffer);

        // Temporarily modify icon path in manifest
        manifest.icon = path.relative(path.dirname(manifestPath), tempIconPath);
        console.log('[vite-build] Dev badge added to plugin icon');
      } else {
        console.warn(`[vite-build] Icon file not found: ${iconPath}`);
      }
    } catch (error) {
      console.warn('[vite-build] Failed to add dev badge:', error.message);
    }
  }

  const { zip } = buildPlugin({
    dirname: path.dirname(manifestPath),
    manifest,
    ppk: path.join(pluginRoot, 'private.ppk'),
    vite: {
      manifestJson: mergedManifest,
      outDirAbsolutePath: outDir,
      manifestDirRelativeToProjectRoot: path.basename(path.dirname(manifestPath)),
    },
    extraAssets: cssBuffers,
  });

  const defaultZip = path.join(outDir, 'plugin.zip');
  await fs.outputFile(defaultZip, zip);

  const finalZip = resolvePluginZipPath({ repoRoot, pluginRoot });

  if (finalZip !== defaultZip) {
    await fs.copy(defaultZip, finalZip);
  }

  if (process.env.QUIET !== 'true') {
    console.log(`[vite-build] Generated ${finalZip}`);
    console.log('[vite-build] Tip: Use pnpm upload:dev or pnpm upload:prod to upload plugin');
  }
})();
