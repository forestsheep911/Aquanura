#!/usr/bin/env node
/**
 * Continuous deployment script - Monitor file changes and auto build + upload
 * For mobile device debugging and other scenarios where local dev server is not available
 *
 * Usage:
 *   pnpm deploy:watch              # Default 5s debounce
 *   pnpm deploy:watch 10s          # 10s debounce
 *   pnpm deploy:watch --immediate  # No debounce, deploy immediately
 */
const path = require('node:path');
const fs = require('fs-extra');
const dotenv = require('dotenv');
const chalk = require('chalk');
const { exec } = require('node:child_process');
const { promisify } = require('node:util');
const execAsync = promisify(exec);

// Duration parsing utilities
const durationMultipliers = { ms: 1, s: 1000, m: 60 * 1000, h: 60 * 60 * 1000 };
const parseDurationMs = (value, defaultUnit = 's') => {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim().toLowerCase();
    if (!trimmed) return null;
    const match = trimmed.match(/^(\d+(?:\.\d+)?)(ms|s|m|h)?$/);
    if (!match) return null;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount)) return null;
    const unit = match[2] || defaultUnit;
    const multiplier = durationMultipliers[unit];
    if (!multiplier) return null;
    const result = amount * multiplier;
    if (!Number.isFinite(result) || result <= 0) return null;
    return Math.round(result);
};

const formatDuration = (ms) => {
    if (!Number.isFinite(ms) || ms <= 0) return `${ms}ms`;
    if (ms % durationMultipliers.h === 0) return `${ms / durationMultipliers.h}h`;
    if (ms % durationMultipliers.m === 0) return `${ms / durationMultipliers.m}m`;
    if (ms % durationMultipliers.s === 0) return `${ms / durationMultipliers.s}s`;
    return `${ms}ms`;
};

(async () => {
    const envPath = path.resolve(__dirname, '..', '..', '..', '.env');
    dotenv.config({ path: envPath });

    const repoRoot = path.resolve(__dirname, '../../..');
    const envPluginRoot = process.env.PLUGIN_ROOT;
    const pluginRoot = envPluginRoot
        ? path.isAbsolute(envPluginRoot)
            ? envPluginRoot
            : path.join(repoRoot, envPluginRoot)
        : path.join(repoRoot, 'plugin');
    const srcDir = path.join(pluginRoot, 'src');

    // Parse command line arguments
    const argv = process.argv.slice(2);

    if (argv.includes('--help') || argv.includes('-h')) {
        console.log(`Usage: pnpm deploy:watch [options] [debounce]

Continuous deployment - Monitor file changes and auto build:dev + upload:dev
For mobile device debugging and other scenarios where local dev server is not available

Options:
  --help, -h      Show this help message
  --immediate     No debounce, deploy immediately after change detected
  --target dev|prod  Deploy target (default: dev)

Arguments:
  debounce        Debounce time (e.g. 5s, 10s, 1m), default 5s

Examples:
  pnpm deploy:watch              # Default 5s debounce, deploy to dev
  pnpm deploy:watch 10s          # 10s debounce
  pnpm deploy:watch --immediate  # No debounce, deploy immediately
  pnpm deploy:watch --target prod  # Deploy to production
`);
        process.exit(0);
    }

    // Parse debounce time
    const isImmediate = argv.includes('--immediate');
    let debounceMs = 5000; // Default 5s
    for (const arg of argv) {
        if (arg.startsWith('--')) continue;
        const parsed = parseDurationMs(arg);
        if (parsed) {
            debounceMs = parsed;
            break;
        }
    }
    if (isImmediate) debounceMs = 0;

    // Parse deploy target
    const targetIndex = argv.indexOf('--target');
    const target = targetIndex >= 0 && argv[targetIndex + 1] ? argv[targetIndex + 1] : 'dev';
    const buildCmd = target === 'prod' ? 'build' : 'build:dev';
    const uploadCmd = target === 'prod' ? 'upload:prod' : 'upload:dev';

    console.log(chalk.cyan('[deploy-watch] 🚀 Continuous deployment mode started'));
    console.log(chalk.gray(`[deploy-watch] 📁 Watching directory: ${srcDir}`));
    console.log(
        chalk.gray(
            `[deploy-watch] ⏱️  Debounce time: ${debounceMs === 0 ? 'None (immediate)' : formatDuration(debounceMs)}`,
        ),
    );
    console.log(chalk.gray(`[deploy-watch] 🎯 Deploy target: ${target}`));
    console.log(chalk.gray(`[deploy-watch] 📋 Commands: pnpm ${buildCmd} && pnpm ${uploadCmd}`));
    console.log('');

    // State variables
    let debounceTimer = null;
    let isDeploying = false;
    let pendingDeploy = false;
    let lastDeployTime = Date.now();
    let changeCount = 0;

    // Initial deployment
    console.log(chalk.yellow('[deploy-watch] 📦 Running initial deployment...'));
    try {
        await runDeploy();
        console.log(chalk.green('[deploy-watch] ✅ Initial deployment complete'));
    } catch (e) {
        console.error(chalk.red('[deploy-watch] ❌ Initial deployment failed:'), e.message);
    }
    console.log('');
    console.log(chalk.cyan('[deploy-watch] 👀 Watching for file changes...'));
    console.log(chalk.gray('[deploy-watch] 💡 Press Ctrl+C to exit'));
    console.log('');

    // Deploy function
    async function runDeploy() {
        const startTime = Date.now();
        console.log(chalk.yellow('[deploy-watch] 🔨 Building...'));

        try {
            // Build
            const { stdout: buildOut, stderr: buildErr } = await execAsync(`pnpm ${buildCmd}`, {
                cwd: repoRoot,
            });
            if (buildErr && !buildErr.includes('warning')) {
                console.error(chalk.yellow('[deploy-watch] Build warning:'), buildErr);
            }

            // Upload
            console.log(chalk.yellow('[deploy-watch] 📤 Uploading to Kintone...'));
            const { stdout: uploadOut, stderr: uploadErr } = await execAsync(`pnpm ${uploadCmd}`, {
                cwd: repoRoot,
            });
            if (uploadErr && !uploadErr.includes('warning')) {
                console.error(chalk.yellow('[deploy-watch] Upload warning:'), uploadErr);
            }

            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(chalk.green(`[deploy-watch] ✅ Deployment complete (${duration}s)`));
            lastDeployTime = Date.now();
        } catch (e) {
            const errorMsg = e.stderr || e.stdout || e.message;
            throw new Error(errorMsg);
        }
    }

    // Schedule deployment
    function scheduleDeploy(reason) {
        changeCount++;

        if (isDeploying) {
            pendingDeploy = true;
            console.log(chalk.gray(`[deploy-watch] ⏳ Deployment in progress, will retry... (${reason})`));
            return;
        }

        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        if (debounceMs === 0) {
            console.log(chalk.blue(`[deploy-watch] 📝 Change detected: ${reason}`));
            executeDeploy();
        } else {
            console.log(
                chalk.blue(
                    `[deploy-watch] 📝 Change detected: ${reason}, deploying in ${formatDuration(debounceMs)}...`,
                ),
            );
            debounceTimer = setTimeout(() => {
                debounceTimer = null;
                executeDeploy();
            }, debounceMs);
        }
    }

    // Execute deployment
    async function executeDeploy() {
        if (isDeploying) return;

        isDeploying = true;
        pendingDeploy = false;

        try {
            await runDeploy();
        } catch (e) {
            console.error(chalk.red('[deploy-watch] ❌ Deployment failed:'), e.message);
        } finally {
            isDeploying = false;

            // If there are pending deployments, reschedule
            if (pendingDeploy) {
                console.log(chalk.gray('[deploy-watch] 🔄 Processing pending changes...'));
                scheduleDeploy('pending changes');
            }
        }
    }

    // Use chokidar to watch file changes
    let chokidar;
    try {
        // Try to load from plugin directory
        const chokidarPath = path.join(pluginRoot, 'node_modules', 'chokidar');
        chokidar = require(chokidarPath);
    } catch {
        try {
            // Fallback to global lookup
            chokidar = require('chokidar');
        } catch {
            console.error(chalk.red('[deploy-watch] ❌ chokidar is required'));
            console.error(chalk.gray('  Run in plugin directory: pnpm add -D chokidar'));
            process.exit(1);
        }
    }

    const watcher = chokidar.watch(srcDir, {
        ignored: [
            /(^|[/\\])\./, // Hidden files
            /node_modules/,
            /\.log$/,
            /\.tmp$/,
            /~$/,
        ],
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 50,
        },
    });

    const rel = (p) => path.relative(srcDir, p);

    watcher
        .on('add', (file) => scheduleDeploy(`added: ${rel(file)}`))
        .on('change', (file) => scheduleDeploy(`modified: ${rel(file)}`))
        .on('unlink', (file) => scheduleDeploy(`deleted: ${rel(file)}`));

    // Graceful exit
    process.on('SIGINT', () => {
        console.log('');
        console.log(chalk.cyan('[deploy-watch] 👋 Shutting down...'));
        watcher.close();
        if (debounceTimer) clearTimeout(debounceTimer);
        console.log(chalk.gray(`[deploy-watch] 📊 Detected ${changeCount} changes in this session`));
        process.exit(0);
    });
})().catch((e) => {
    console.error(chalk.red('[deploy-watch] Fatal error:'), e);
    process.exit(1);
});
