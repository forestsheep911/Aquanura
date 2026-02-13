# Build Architecture Notes

## Current: Child Process Build

The dev server (`logistics/plugin-deploy/vite/dev.js`) executes Vite rebuilds through a spawned worker (`logistics/plugin-deploy/vite/build-worker.js`) instead of running `viteBuild()` in the main process.

```
Main Process                         Child Process (per rebuild)
├── Vite Dev Server                  └── viteBuild()
├── File Watcher                         └── exit(0) / exit(1)
├── spawn('build-worker.js') ──────→
└── Plugin Packaging
```

### Why This Is Used

During long dev sessions with frequent rebuilds, V8 may not immediately reclaim all memory allocated by Vite/Rollup/esbuild in the main process. Running each build in a child process ensures memory is reclaimed when that worker exits.

### Notes

- Use `stdio: ["ignore", "pipe", "pipe"]` instead of `"inherit"` to prevent child process stderr (e.g., Vite's CJS deprecation warning) from interfering with any spinner/progress animation in the parent process.
- Collect `child.stderr` and print it only on build failure to keep normal output clean.
- Kill any running build worker on `SIGINT`/`SIGTERM` during shutdown.
- The worker returns per-entry dependency data so `dev.js` can keep incremental rebuild targeting.

Projects that have adopted this pattern:
- [AI-Import-Assistant-Plugin](../../../AI-Import-Assistant-Plugin)
- [AI-Search](../../../AI-Search)
