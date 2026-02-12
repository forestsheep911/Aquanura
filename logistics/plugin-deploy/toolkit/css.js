const path = require('node:path');
const { createRequire } = require('node:module');
const fse = require('fs-extra');

const MANIFEST_TYPES = ['desktop', 'mobile', 'config'];

function collectCssEntries(manifest) {
  const entries = [];
  for (const type of MANIFEST_TYPES) {
    const cssFiles = manifest[type]?.css || [];
    for (const cssFile of cssFiles) {
      if (!/^https?:\/\//.test(cssFile)) {
        entries.push(cssFile);
      }
    }
  }
  return entries;
}

function createPostCssProcessor(pluginRoot, onWarning) {
  try {
    const localRequire = createRequire(path.join(pluginRoot, 'package.json'));
    const postcss = localRequire('postcss');
    const tailwindcss = localRequire('tailwindcss');
    const autoprefixer = localRequire('autoprefixer');
    const tailwindConfigPath = path.join(pluginRoot, 'tailwind.config.cjs');
    const tailwindOptions = fse.existsSync(tailwindConfigPath)
      ? { config: tailwindConfigPath }
      : undefined;
    return postcss([tailwindcss(tailwindOptions), autoprefixer()]);
  } catch (error) {
    onWarning?.(
      `[vite-build] CSS compiler dependencies not ready, fallback to raw CSS files (${error?.message || error})`,
    );
    return null;
  }
}

async function compileCss(manifest, pluginRoot, { onWarning } = {}) {
  const cssEntries = collectCssEntries(manifest);
  if (cssEntries.length === 0) return {};

  const processor = createPostCssProcessor(pluginRoot, onWarning);
  if (!processor) return {};

  const compiled = {};
  for (const relPath of cssEntries) {
    const absPath = path.join(pluginRoot, 'src', relPath);
    try {
      const source = await fse.readFile(absPath, 'utf8');
      const result = await processor.process(source, { from: absPath });
      compiled[relPath] = result.css;
    } catch (error) {
      onWarning?.(
        `[vite-build] Failed to compile CSS ${relPath}, fallback to raw file (${error?.message || error})`,
      );
    }
  }

  return compiled;
}

module.exports = {
  collectCssEntries,
  compileCss,
};
