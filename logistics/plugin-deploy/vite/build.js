#!/usr/bin/env node
const path = require('node:path');
const fs = require('fs-extra');
const chalk = require('chalk');
const { build } = require('vite');
const react = require('@vitejs/plugin-react');
const { transformSync } = require('esbuild');
const { buildPlugin, buildDevPlugin } = require('../toolkit/plugin');
const { loadEnv } = require('../toolkit/runtime/env');
const {
  resolveEnvFilePath,
  findRepoRoot,
  resolvePluginRoot,
  resolvePluginManifestPath,
  resolvePluginDistDir,
  resolvePluginZipPath,
} = require('../toolkit/runtime/paths');

const reactPlugin = react({
  jsxRuntime: 'classic',
  include: [/\.(jsx|tsx|js)$/],
});

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
  loadEnv({ path: resolveEnvFilePath('.env') });

  const repoRoot = findRepoRoot();
  const pluginRoot = resolvePluginRoot({ repoRoot });
  const manifestPath = resolvePluginManifestPath({ repoRoot, pluginRoot });
  const manifest = await fs.readJSON(manifestPath);

  const outDir = resolvePluginDistDir({ repoRoot, pluginRoot });
  const logLevel = process.env.VITE_LOG_LEVEL || 'info';
  const devModeEnv = String(process.env.DEV_MODE ?? '')
    .trim()
    .toLowerCase();
  const isDevMode = devModeEnv === '' ? false : !['false', '0', 'off', 'no'].includes(devModeEnv);

  if (!isDevMode) {
    const stripDevScripts = (section) => {
      if (!section || !Array.isArray(section.js)) return;
      // Filter out development-only scripts (live-reload)
      section.js = section.js.filter((item) => item && !/dev\/live-reload\.js$/.test(item));
    };
    stripDevScripts(manifest.desktop);
    stripDevScripts(manifest.mobile);
    stripDevScripts(manifest.config);
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

  console.log(
    `[vite-build] 开发模式检测: DEV_MODE=${process.env.DEV_MODE}, NODE_ENV=${process.env.NODE_ENV}, isDevMode=${isDevMode}`,
  );

  // 在开发模式下为图标添加徽章
  if (isDevMode && manifest.icon) {
    console.log('[vite-build] 为插件图标添加开发徽章');
    try {
      const { addDevBadge } = require('../toolkit/plugin/manifest');
      const originalIcon = manifest.icon;
      const iconPath = path.join(path.dirname(manifestPath), originalIcon);

      if (await fs.pathExists(iconPath)) {
        const devIconBuffer = await addDevBadge(iconPath);

        // 将处理后的图标保存到临时位置
        const tempIconPath = path.join(outDir, 'temp_icon.png');
        await fs.outputFile(tempIconPath, devIconBuffer);

        // 临时修改manifest中的图标路径
        manifest.icon = path.relative(path.dirname(manifestPath), tempIconPath);
        console.log('[vite-build] 开发徽章已添加到插件图标');
      } else {
        console.warn(`[vite-build] 找不到图标文件: ${iconPath}`);
      }
    } catch (error) {
      console.warn('[vite-build] 添加开发徽章失败:', error.message);
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
  });

  const defaultZip = path.join(outDir, 'plugin.zip');
  await fs.outputFile(defaultZip, zip);

  const finalZip = resolvePluginZipPath({ repoRoot, pluginRoot });

  if (finalZip !== defaultZip) {
    await fs.copy(defaultZip, finalZip);
  }

  if (process.env.QUIET !== 'true') {
    console.log(`[vite-build] 已生成 ${finalZip}`);
    console.log('[vite-build] 提示：使用 pnpm upload:dev 或 pnpm upload:prod 上传插件');
  }
})();
