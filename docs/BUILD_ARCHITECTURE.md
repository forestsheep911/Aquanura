# Build Architecture Notes

## Current: In-Process Build

The dev server (`logistics/plugin-deploy/vite/dev.js`) currently executes `viteBuild()` **directly in the main process**. This is the simplest approach and works well for most use cases.

```
Main Process
├── Vite Dev Server (HTTPS + WebSocket)
├── File Watcher
├── viteBuild()  ← runs here directly
└── Plugin Packaging
```

### Trade-off

During long dev sessions with frequent hot rebuilds (e.g., dozens or hundreds of rebuilds), V8's garbage collector may not fully reclaim all memory allocated by Vite/Rollup/esbuild (AST, module graph, chunk caches, etc.). This can lead to gradual memory growth over time.

For most projects and typical development workflows, this is unlikely to cause problems.

## Alternative: Child Process Build

If you experience memory issues during prolonged development, consider refactoring the build step to run in a **spawned child process**. The idea is:

1. Create a `build-worker.js` that receives build config via CLI args and calls `viteBuild()`.
2. In `dev.js`, use `child_process.spawn()` to run the worker for each rebuild.
3. When the child process exits, the OS reclaims **all** of its memory — no GC fragmentation.

```
Main Process                     Child Process (per build)
├── Vite Dev Server              └── viteBuild()
├── File Watcher                     exit(0) → OS reclaims all memory
├── spawn('build-worker.js') ──→
└── Plugin Packaging
```

### Implementation Tips

- Use `stdio: ["ignore", "pipe", "pipe"]` instead of `"inherit"` to prevent child process stderr (e.g., Vite's CJS deprecation warning) from interfering with any spinner/progress animation in the parent process.
- Consume `child.stdout` (e.g., `.resume()`) to prevent pipe backpressure from blocking the child.
- Collect `child.stderr` and only display it when the build fails, to keep the terminal clean.
- Remember to track and kill the child process on `SIGINT`/`SIGTERM` for clean shutdown.

### Example

```javascript
const { spawn } = require("node:child_process");

function runBuildInWorker(config) {
    return new Promise((resolve, reject) => {
        const child = spawn(
            process.execPath,
            ["--max-old-space-size=4096", "build-worker.js", JSON.stringify(config)],
            {
                stdio: ["ignore", "pipe", "pipe"],
                cwd: repoRoot,
            },
        );

        const stderrChunks = [];
        child.stdout.resume();
        child.stderr.on("data", (chunk) => stderrChunks.push(chunk));

        child.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                const stderr = Buffer.concat(stderrChunks).toString().trim();
                if (stderr) console.error(stderr);
                reject(new Error(`Build worker exited with code: ${code}`));
            }
        });

        child.on("error", reject);
    });
}
```

Projects that have adopted this pattern:
- [AI-Import-Assistant-Plugin](../../../AI-Import-Assistant-Plugin)
- [AI-Search](../../../AI-Search)
