# README for AI Assistants

> This guide targets IDE / CLI copilots. It gives machines the context they need to operate safely inside this repo—covering architecture, scripts, env vars, and common playbooks. Humans should keep reading `README.md`; assistants should start here.

## 1. Mental Model & TL;DR

- **Purpose**: A modern Kintone plugin development template powered by Vite (hot reload, HTTPS dev server, auto deploy, AI-friendly logging).
- **Workspace**: pnpm monorepo with three packages—root tooling, `plugin/` (actual plugin), and `logistics/plugin-deploy/` (toolchain).
- **Command surface**: Always run scripts from the repo root. Root `package.json` proxies everything into `kintone-plugin-deploy`.
- **Secrets**: `plugin/private.ppk` and any `.env` files must never be committed. Copilots must keep them private and avoid printing them.
- **Debug artifacts**: `log/dev.log` (JSONL) + browser console; both are key to AI troubleshooting.

| Topic | Entry point | Notes |
| --- | --- | --- |
| Hot reload | `pnpm dev` | Runs `logistics/plugin-deploy/vite/dev.js` → HTTPS Vite + proxy plugin builder + optional auto-upload |
| Build & sign | `pnpm build` | Runs `vite/build.js` → bundles, strips dev code, signs, outputs `plugin/dist/plugin.zip` |
| Upload | `pnpm upload:dev` / `pnpm upload:prod` | Uses `.env` Kintone credentials (sys-admin username/password) |
| Certificates | `pnpm fix-cert` | Rebuilds root CA, trusts it, cleans leftovers |
| Logs | `log/dev.log` | Dev server writes JSON lines via `/__devlog` endpoint |
| Manifest | `plugin/src/manifest.json` | Declares JS/CSS entries, config page assets, multilingual strings |

## 2. Repository Anatomy

| Path | Role | Details |
| --- | --- | --- |
| `package.json` | Root scripts + Biome | `pnpm check/format` run Biome; dev/build/upload scripts forward to logistics package |
| `plugin/` | Plugin source (React/Vite) | `src/logic`, `src/css`, `src/html`; `private.ppk` lives here (ignored) |
| `logistics/plugin-deploy/` | Build & deploy tooling | `vite/` scripts, `upload-*.js`, `fix-cert.js`, `.env(.example)` |
| `logistics/plugin-deploy/toolkit/` | Shared helpers | `cert/`, `plugin/` (signing/zip/badge), `kintone/` (REST client), `runtime/` utilities |
| `docs/` | Human-facing docs | DEVELOPMENT / DEPLOYMENT / CERTIFICATE / I18N / LOG_SYSTEM / TROUBLESHOOTING |
| `log/` | Runtime logs | Default `dev.log`; can be redirected via env |
| `quotes/`, `scripts/` | Ancillary resources | Not part of the main build, consult when needed |

## 3. Toolchain, Packages & Scripts

### Versions & dependencies

- Node.js 18+, pnpm 9+
- Root dev dependency: `@biomejs/biome`
- `plugin/`: pre-installs `react@18`, `react-dom@18`, `@types/react*`
- `logistics/plugin-deploy/`: depends on `vite@5`, `esbuild`, `fs-extra`, `chalk`, `@kintone/rest-api-client`, `sharp`, `ws`, etc.

### Root scripts

| Command | Delegates to | Outcome |
| --- | --- | --- |
| `pnpm install` | workspace install | Installs dependencies for root, plugin, logistics |
| `pnpm dev` | `kintone-plugin-deploy run dev` | Launches hot reload dev server and proxy plugin pipeline |
| `pnpm build` | `kintone-plugin-deploy run build` | Produces production zip & signature |
| `pnpm upload:dev` / `pnpm upload:prod` | `upload-dev.js` / `upload-prod.js` | Uploads `plugin/dist/plugin.zip` using selected creds |
| `pnpm fix-cert` | `kintone-plugin-deploy run fix-cert` | Recreates dev certificates and trusts them |
| `pnpm check` / `pnpm format` | Biome | Repo-wide lint/format |

### Logistics package scripts

- `vite/dev.js`: custom Vite launcher (HTTPS, structured logging endpoints, static proxy, optional auto-upload)
- `vite/build.js`: production bundler + manifest rewrite + dev badge + signing
- `upload-dev.js` / `upload-prod.js`: upload pipelines; infer plugin ID from `private.ppk` if env vars absent
- `fix-cert.js`: cross-platform certificate cleanup/reinstall
- `toolkit/__tests__`: executed via `pnpm --filter kintone-plugin-deploy test`

## 4. Configuration Surfaces

### 4.1 `.env` (project root)

Copy from `.env.example`. Key groups:

- **Runtime flags**: `NODE_ENV`, `DEV_MODE` (instant|lazy), `DEV_LAZY_WINDOW`, `QUIET`
- **Vite**: `VITE_HOST`, `VITE_PORT`, `VITE_LOG_LEVEL`
- **HTTPS**: `DEV_HTTPS_DOMAINS` (extra SANs)
- **Auto-upload**: `DEV_UPLOAD` (default true; needs DEV credentials)
- **Logging**: `DEV_LOCAL_LOG_ENABLED`, `DEV_LOG_DIR`
- **Plugin paths**: `PLUGIN_ROOT`, `PLUGIN_FILE_PATH`, `PLUGIN_ZIP`
- **Kintone creds**: `KINTONE_DEV_*`, `KINTONE_PROD_*` (URLs must include `https://` and trailing `/`)

Whenever a new variable is introduced, update both `.env.example` and relevant docs. Copilots editing `.env` should warn users not to commit it.

### 4.2 Manifest (`plugin/src/manifest.json`)

- Contains `manifest_version`, `version`, `type`, multilingual `name`/`description`
- Entry points: `desktop`, `mobile`, `config`; JS/CSS paths are relative to `plugin/src/`
- Config page uses dedicated HTML/JS/CSS, icon at `image/icon.png`
- During dev, `pnpm dev` rewrites script URLs to point at Vite’s `__static` assets

### 4.3 Private key

- `plugin/private.ppk`; generated automatically if missing
- Signing helpers live under `toolkit/plugin/`

## 5. Development Flow (`pnpm dev`)

`logistics/plugin-deploy/vite/dev.js` pipeline (keep this intact when editing):

1. Load env via `loadEnv(resolveEnvFilePath('.env'))`
2. Resolve repo root, plugin root, dist dir, manifest path
3. Initialize logging:
   - Determine `DEV_LOG_DIR` (default `log`)
   - Ensure directory, set `dev.log`, queue writes to avoid contention
4. Configure Vite:
   - Apply `force-jsx-loader` so `.js` can contain JSX
   - Add React plugin
   - Inject compile-time globals (`__DEV_LOG_ENDPOINT__`, `__PLUGIN_VERSION__`, etc.)
5. HTTPS:
   - `certificateFor` generates or reuses certs with `DEV_HTTPS_DOMAINS`
   - Auto-fallback when port conflicts arise
6. Middlewares:
   - `/__devlog`: accepts JSON, appends to `dev.log`, auto-injects `pluginId`
   - `/__live` (REST/SSE/WS): pushes timestamps for live reload
   - `/__static`: serves built JS/CSS from `.dev-build` for proxy plugin
7. Dev plugin build:
   - Calls `buildDevPlugin` with `baseUrl=https://127.0.0.1:<port>/__static/js`
   - Outputs `plugin-dist/plugin-dev.zip`, logs pluginId
8. Auto-upload:
   - If `DEV_UPLOAD=true`, `maybeUpload` infers `pluginId` (env overrides > private.ppk)
   - Uses DEV credentials to upload via Kintone REST client
9. Console output stays minimal; detailed diagnostics funnel into `dev.log`

When adding middleware or changing build order, preserve this flow to keep auto-upload and live reload reliable.

### 5.1 Rebuild Scheduler & Hotkeys

- `DEV_MODE` controls rebuild mode: `instant` (default) triggers after ~200 ms; `lazy` waits for a quiet window (`DEV_LAZY_WINDOW`, default `60s`) before running `buildEntries`.
- CLI override: `pnpm dev -- --mode lazy 45s`. The optional second argument sets the quiet window. Without it, the env var or default is used.
- Implementation details: file watcher marks `pendingChanges`, `scheduleRebuild` tracks `quietDeadline`, and `planRebuildCheck` debounces builds to minimize churn.
- Manual control: the dev process places `stdin` in raw mode. Press `r`/`R` to force an immediate rebuild (ignores quiet period), `q`/`Q` to exit gracefully, or `Ctrl+C` to interrupt.
- Document these behaviors when editing logging or watcher code; AI assistants should avoid breaking the scheduler or raw-mode input handling.

## 6. Build & Signing Flow (`pnpm build`)

`logistics/plugin-deploy/vite/build.js` steps:

1. Load env, resolve paths, read manifest
2. Respect `DEV_MODE`:
   - Remove development-only scripts (e.g., `log/live-reload.js`) when `DEV_MODE=false`
3. Configure Vite builds:
   - Iterate every manifest entry (desktop/mobile/config)
   - Emit IIFE bundles into `plugin/dist/js`
   - Merge `build.manifest.json` fragments
4. Dev badge:
   - If `DEV_MODE=true` and icon exists, `addDevBadge` overlays a “D” badge and stores a temporary PNG
5. `buildPlugin`:
   - Remap manifest URLs to the generated bundles
   - Create `contents.zip`
   - Sign with `private.ppk` → produce `plugin.zip`
6. Final output: `plugin/dist/plugin.zip` (or `PLUGIN_ZIP` if overridden)

When editing this script:
- Ensure new entry points end up in the manifest
- Preserve signing (`createPluginZip` needs `contents.zip`, `PUBKEY`, `SIGNATURE`)
- Update manifest merge logic if new asset types are introduced

## 7. Deployment Automation

### Commands

- `pnpm upload:dev` → `upload-dev.js`
- `pnpm upload:prod` → `upload-prod.js`

Shared flow:

1. `loadEnv`, resolve paths
2. `ensurePluginZip` reads `resolvePluginZipPath` (defaults to `plugin/dist/plugin.zip`)
3. `inferPluginId`:
   - Prefers env vars (`KINTONE_DEV_PLUGIN_ID`, `KINTONE_PLUGIN_ID`, `KINTONE_PROD_PLUGIN_ID`)
   - Falls back to `private.ppk` → `getPublicKeyDer` → `generatePluginId`
4. `uploadPlugin` uses `@kintone/rest-api-client`; server updates existing plugins automatically (HTTP `GAIA_PL18` is expected)

Credential rules:

- `KINTONE_*_BASE_URL` must end with `/`
- Must be **system administrator username + password**; API tokens cannot manage plugins

After upload:
- Operators still need to enable/update the plugin in each app
- CI/CD can follow the GitHub Actions example in `docs/DEPLOYMENT.md`

## 8. Plugin Code Surfaces

| File | Purpose |
| --- | --- |
| `plugin/src/logic/desktop/desktop.js` | Sample desktop logic: i18n, logger usage, Kintone events, DOM injection |
| `plugin/src/logic/config/config.js` | Config page logic: i18n, DOM binding, `kintone.plugin.app.setConfig` |
| `plugin/src/html/config.html` | Base config UI; uses `data-i18n` attributes |
| `plugin/src/css/*.css` | Styling for desktop/config |
| `plugin/src/log/logger.js` (if present) | Browser logger client that posts to `/__devlog` |
| `plugin/src/image/icon.png` | Base icon; dev badge overlays here |

Typical assistant tasks:

1. **Add feature logic**: create files under `plugin/src/logic/{desktop|config|mobile}/`, update manifest, ensure Vite can bundle them (JS or JSX).
2. **Add dependencies**: `cd plugin && pnpm add <pkg>`; workspace links automatically. Check bundle size/compatibility.
3. **Extend config UI**: edit `config.html`, wire events in `config.js`, persist via `kintone.plugin.app.setConfig`.
4. **Use the logger**: call `window.PluginLogger` (available only in dev). Production builds strip logger code.

## 9. Logging & Telemetry

- Browser usage:
  ```js
  const logger = window.PluginLogger;
  logger.info('User clicked button', { recordId: event.recordId });
  ```
- Dev server writes:
  ```json
  {"ts":"2025-01-01T12:00:00.000Z","level":"INFO","message":"...", "pluginId":"xxx"}
  ```
- File: `log/dev.log` (override via `DEV_LOG_DIR`)
- Consumption patterns:
  - `tail -f log/dev.log`
  - `rg '"level":"ERROR"' log/dev.log`
  - AI parsing JSONL directly

Troubleshooting workflow for assistants:
1. Request the latest `dev.log` snippet (after redacting secrets)
2. Filter by `level`, `pluginId`, or custom fields
3. Suggest fixes and, if appropriate, patch `desktop.js` / `config.js`

## 10. Certificates & Networking

- Certificates live under `logistics/plugin-deploy/toolkit/cert/` (git-ignored)
- `pnpm fix-cert` pipeline:
  1. Kill `vite-dev` processes
  2. `removeFromTrustStores` to delete prior CA entries
  3. Remove `toolkit/cert` directory
  4. `install()` generates a new root CA (default 7300 days) and trusts it
  5. Print metadata (expiry, paths)
- Dev server always uses the latest certificate; includes `DEV_HTTPS_DOMAINS`
- On port conflicts, dev server switches ports, rebuilds proxy plugin, and re-uploads (if enabled)

## 11. AI Playbooks (Common Scenarios)

1. **Explain “how to start developing”**:
   - `pnpm install` → `pnpm fix-cert` → copy `.env` → fill DEV creds → `pnpm dev`
   - Mention that the first run generates `plugin-dev.zip` and can auto-upload it
2. **Add business logic**:
   - Create module in `plugin/src/logic/desktop/`
   - Reference it in manifest
   - Share utilities via `plugin/src/logic/common/` if needed
3. **Customize logging**:
   - Toggle `DEV_LOCAL_LOG_ENABLED` / `DEV_LOG_DIR`
   - Include structured payloads (record ID, user, params)
4. **Change host/port domains**:
   - Adjust `VITE_HOST`, `VITE_PORT`, `DEV_HTTPS_DOMAINS`
   - Rerun `pnpm dev`; if trust fails, rerun `pnpm fix-cert`
5. **Debug upload failures**:
   - Verify `.env` credentials and URL format
   - Quote `docs/DEPLOYMENT.md` & `docs/TROUBLESHOOTING.md` sections
6. **Generate or rotate private key**:
   - Call `toolkit/plugin/rsa.generatePPK('private.ppk')`
   - Remind users to back up and never commit it

## 12. Observability & Troubleshooting Hooks

- `log/dev.log`: main structured log
- `pnpm dev` console: minimal by default; set `QUIET=false` to increase verbosity
- Browser console: verify `PluginLogger` presence, HTTP errors, DOM issues
- `docs/TROUBLESHOOTING.md`: catalog of certificate, HMR, build, upload fixes
- `logistics/plugin-deploy/toolkit/__tests__`: run with `pnpm --filter kintone-plugin-deploy test` if regression tests are needed

## 13. Documentation Map

| Doc | Contents | How AI should use it |
| --- | --- | --- |
| `README.md` | Human overview, quick start | Point users here first; mention this AI guide |
| `docs/DEVELOPMENT.md` | Day-to-day workflow, hot reload | Quote when explaining dev steps |
| `docs/DEPLOYMENT.md` | Build/upload instructions, CI/CD | Reference for deployment or permissions issues |
| `docs/CERTIFICATE.md` | HTTPS certificate setup/fixes | Use when browsers mistrust localhost |
| `docs/LOG_SYSTEM.md` | JSONL logging design | Copy patterns for structured logging tasks |
| `docs/TROUBLESHOOTING.md` | Common problems/solutions | Rapid response to frequent errors |
| `docs/I18N.md` | Internationalization guidance | Use when extending language support |

---

When enhancing this file, keep section numbering stable so copilots can deep-link easily. For any new workflows (e.g., additional CLI commands, telemetry backends), add a new section here and mention it in `README.md`.
