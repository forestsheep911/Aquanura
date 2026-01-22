# Kintone Plugin Deploy Tools

Development and deployment tools for Kintone plugin, based on Vite build system.

## 📁 Directory Structure
- `toolkit/` — Core toolset (Kintone API wrapper, certificate management, plugin signing)
- `vite/` — Vite build and dev server scripts
- `upload-dev.js` / `upload-prod.js` — Dev/Prod environment upload scripts
- `fix-cert.js` — HTTPS certificate trust tool

## 🚀 Quick Start

### 1. Build Plugin
```bash
pnpm --filter kintone-plugin-deploy run build
```
Generates `plugin/dist/plugin.zip`

### 2. Development Mode
```bash
pnpm --filter kintone-plugin-deploy run dev
```
Starts Vite dev server with HTTPS and hot reload

- Default **instant** mode rebuilds ~200 ms after file changes.
- To enable **lazy** mode (batch rebuild), pass `--mode lazy 45s` or set `DEV_MODE=lazy` / `DEV_LAZY_WINDOW=45s` in `.env`.
- While running, press `r` to force an immediate rebuild, `q` or `Ctrl+C` to stop the server gracefully.

### 3. Upload to Kintone
```bash
# Development environment
pnpm upload:dev

# Production environment
pnpm upload:prod
```

## 📋 Available Commands
| Command | Description |
|---------|-------------|
| `build` | Build plugin with Vite and package |
| `dev` | Start dev server (HTTPS + hot reload) |
| `upload-dev` | Upload to development environment |
| `upload-prod` | Upload to production environment |
| `fix-cert` | Fix HTTPS certificate trust |

## 🧪 Testing

```bash
pnpm --filter kintone-plugin-deploy test
```

Runs the Node.js test runner for the toolkit helpers (path/env resolution, manifest transforms,
Kintone uploader, certificate lifecycle). Execute it after modifying the helper layer to ensure
cross-platform behaviour stays correct.

## ⚙️ Environment Configuration

### First Time Setup
1. Copy environment template (from project root):
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` file with your settings:
   ```env
   # Vite Dev Server
   VITE_PORT=5173
   
   # Kintone Development Environment
   KINTONE_DEV_BASE_URL=https://your-domain.cybozu.com
   KINTONE_DEV_USERNAME=your-username
   KINTONE_DEV_PASSWORD=your-password
   ```

   **Note**: Plugin upload requires system administrator privileges. You must use username and password authentication. Kintone's API Tokens are app-level and cannot be used for plugin management.

3. Trust HTTPS certificate (first run or when expired):
   ```bash
   pnpm --filter kintone-plugin-deploy run fix-cert
   ```

### Rebuild Scheduling Options

- `DEV_MODE=instant|lazy` — controls rebuild behavior (default instant).
- `DEV_LAZY_WINDOW=60s` — quiet window for lazy mode (accepts `ms`, `s`, `m`, `h` suffixes).
- CLI override: `pnpm --filter kintone-plugin-deploy run dev -- --mode lazy 45s`.
- Regardless of mode, press `r` during dev server runtime to trigger a manual rebuild.

### Auto-Upload Configuration
Development mode supports auto-upload to Kintone:
- Set `DEV_UPLOAD=true` in `.env`
- Configure dev environment credentials (username and password required)
- Plugin will auto-upload once when dev server starts
- Plugin ID will be automatically inferred from `plugin/private.ppk`

**Important**: Plugin upload requires system administrator privileges and must use username/password authentication.

### Certificate Trust
- Dev server uses HTTPS by default
- First-time users should run `fix-cert` command
- `fix-cert` cleans old certificates, regenerates and trusts local CA

## 📦 Production Deployment

1. **Build Plugin**
   ```bash
   pnpm --filter kintone-plugin-deploy run build
   ```

2. **Configure Production Credentials** (in `.env`)
   ```env
   KINTONE_PROD_BASE_URL=https://prod-domain.cybozu.com
   KINTONE_PROD_USERNAME=your-prod-username
   KINTONE_PROD_PASSWORD=your-prod-password
   ```

3. **Upload to Production**
   ```bash
   pnpm --filter kintone-plugin-deploy run upload-prod
   ```

4. **Confirm upload success in Kintone admin panel**

## 📝 Logging Configuration

### Local Logging (Development)
- Dev server exposes `POST /__devlog`, appends to `log/dev.log` in JSON Lines format
- Enabled only when `NODE_ENV !== 'production'` and `DEV_LOCAL_LOG_ENABLED !== 'false'`
- Use `DEV_LOG_DIR` to override log directory (default `log/`)

### Production Notes
- Production builds don't write local files
- Clean up development log files regularly to save disk space

## 🔧 Troubleshooting

### HTTPS Certificate Issues
```bash
pnpm --filter kintone-plugin-deploy run fix-cert
```

### Upload Failures
1. Check network connection
2. Verify Kintone credentials
3. Confirm user has plugin management permissions
4. Check log files for detailed errors

### Build Failures
1. Ensure dependencies are installed: `pnpm install`
2. Clear cache: delete `node_modules/.vite` directory
3. Check for code errors in `plugin/src`

## 📚 More Information

See the main documentation in the `docs/` directory for detailed guides.

