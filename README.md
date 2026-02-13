# Kintone Plugin Development Template

A modern, full-featured template for building Kintone plugins with Vite, featuring hot reload, HTTPS development server, AI-friendly logging, and automated deployment.

> 🤖 Working with an IDE/CLI AI agent? We maintain an exhaustive [README for AI](README.for.AI.md) that explains every script, env var, and workflow so assistants can reason about the repo safely.

## ✨ Features

### 🚀 Development Experience
- **Hot Module Replacement (HMR)** - Code changes reload instantly, no re-upload needed
- **HTTPS Development Server** - Automatic certificate management
- **Development Badge** - Visual indicator for dev vs production builds
- **Configurable Rebuild Modes** - Instant, lazy, and manual rebuild hotkeys
- **Monorepo Structure** - Clean separation of plugin code and tooling

### 📝 AI-Friendly Logging
- **Local JSONL Logging** - Logs written to `log/dev.log` for AI analysis
- **Real-time Log Streaming** - Watch logs as your plugin runs
- **Structured JSON Format** - Easy for both humans and AI to parse

### 🔧 Build & Deploy
- **Vite-Powered Builds** - Fast, modern bundling
- **Automated Deployment** - Upload to dev/prod with one command
- **Plugin Signing** - Automatic RSA signing with your private key
- **Development vs Production** - Different builds for different environments

### 🔐 Certificate Management
- **Auto-Generated Certificates** - Self-signed CA for HTTPS
- **Fix Script** - One command to fix certificate issues: `pnpm fix-cert`
- **Cross-Platform** - Works on Windows, Mac, and Linux

## 🏗️ Project Structure

```
.
├── plugin/                    # Plugin source code
│   ├── src/
│   │   ├── manifest.json     # Plugin manifest
│   │   ├── logic/            # JavaScript logic
│   │   │   ├── desktop/      # Desktop view
│   │   │   └── config/       # Configuration page
│   │   ├── log/              # Logging client
│   │   ├── css/              # Stylesheets
│   │   ├── html/             # HTML templates
│   │   └── image/            # Assets
│   ├── dist/                 # Build output
│   ├── package.json
│   └── private.ppk           # RSA private key (git-ignored)
│
├── logistics/                 # Development tooling
│   ├── plugin-deploy/        # Build and deployment scripts
│   │   ├── toolkit/          # Core utilities
│   │   │   ├── cert/         # Certificate management
│   │   │   ├── kintone/      # Kintone API client
│   │   │   └── plugin/       # Plugin signing & packaging
│   │   ├── vite/             # Vite build scripts
│   │   │   ├── build.js      # Production build
│   │   │   └── dev.js        # Development server
│   │   ├── upload-dev.js     # Upload to dev environment
│   │   ├── upload-prod.js    # Upload to production
│   │   ├── fix-cert.js       # Certificate fix script
│   │   └── .env.example      # Environment template
│   └── log/                  # Runtime logs
│       └── dev.log           # Development logs (JSONL)
│
├── docs/                      # Documentation
│   ├── DEVELOPMENT.md        # Development guide
│   ├── DEPLOYMENT.md         # Deployment guide
│   ├── LOG_SYSTEM.md         # Logging system guide
│   └── TROUBLESHOOTING.md    # Common issues & solutions
│
├── pnpm-workspace.yaml       # Monorepo configuration
├── package.json              # Root package
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+
- A Kintone development environment

### 1. Install Dependencies

```bash
pnpm install
```

**Note**: This single command installs all dependencies for the entire project (root, plugin, and logistics). Thanks to pnpm workspace, you don't need to install dependencies in subdirectories separately.

### 2. Fix Certificates (First Time Only)

```bash
pnpm fix-cert
```

This generates and trusts a self-signed certificate for HTTPS development.

### 3. Configure Environment

```bash
cd logistics/plugin-deploy
cp .env.example .env
# Edit .env with your Kintone credentials
```

Minimal required configuration:

```env
KINTONE_DEV_BASE_URL=https://your-dev-domain.cybozu.com/
KINTONE_DEV_USERNAME=your-username
KINTONE_DEV_PASSWORD=your-password
```

**Important**: Plugin upload requires system administrator privileges and must use username/password authentication. Kintone's API Tokens are app-level and cannot be used for plugin management.

### 4. Start Development

```bash
pnpm dev
```

This starts the Vite dev server at `https://localhost:3000` with hot reload enabled.

The first time you run this:
1. A proxy plugin is generated and can be uploaded to Kintone
2. All your code changes will be served from localhost
3. Just refresh the Kintone page to see changes - no re-upload needed!

### 4.1 Rebuild Modes & Hotkeys

The dev server can rebuild in two ways:

- **Instant (default)** – rebuild ~200 ms after every change.
- **Lazy** – wait for a quiet window (`DEV_LAZY_WINDOW`, default 10 s) before rebuilding, ideal for batch edits. Enable via:
  - CLI: `pnpm dev -- --mode lazy 45s`
  - `.env`: `DEV_MODE=lazy` and optional `DEV_LAZY_WINDOW=45s`

While the dev server is running:

- Press `r` to force an immediate rebuild (skips the lazy timer).
- Press `m` to repackage/re-upload `manifest.json` changes only (fast path).
- Press `u` to force a full rebuild + manifest repackage/re-upload.
- Press `q` (or `Ctrl+C`) to stop the server gracefully.

### 5. Build for Production

```bash
pnpm build
```

Output: `plugin/dist/plugin.zip`

### 6. Deploy

```bash
# To development environment
pnpm upload:dev

# To production environment
pnpm upload:prod
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm install:all` | Install all dependencies (compatibility alias) |
| `pnpm dev` | Start dev server with hot reload |
| `pnpm build` | Build production plugin |
| `pnpm upload:dev` | Upload to dev environment |
| `pnpm upload:prod` | Upload to production |
| `pnpm fix-cert` | Fix HTTPS certificate issues |
| `pnpm lint` | Run Biome checks without writing fixes |
| `pnpm format` | Format files with Biome |

## 📖 Documentation

- **[Development Guide](docs/DEVELOPMENT.md)** - Learn how to develop plugins
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Deploy to dev/prod
- **[Certificate Management](docs/CERTIFICATE.md)** - HTTPS certificate setup & troubleshooting
- **[Internationalization (i18n)](docs/I18N.md)** - Multi-language support guide
- **[Log System Guide](docs/LOG_SYSTEM.md)** - AI-friendly logging
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues & solutions
- **[README for AI](README.for.AI.md)** - Deep dive reference designed for AI copilots

## 🔍 Key Concepts

### Hot Reload Development

The template uses a "proxy plugin" technique:

1. During `pnpm dev`, manifest.json is rewritten to load scripts from `https://localhost:3000`
2. A development plugin package is generated and uploaded once
3. All subsequent code changes are served from the local dev server
4. Simply refresh Kintone to see changes - no re-upload!

### Development Badge

When `DEV_MODE=true`, the plugin icon shows a "D" badge to distinguish development builds from production.

### AI-Friendly Logging

Logs are written in JSONL (JSON Lines) format to `log/dev.log`:

```javascript
const logger = window.PluginLogger;

logger.info('User clicked button', { userId: '123' });
logger.error('Save failed', { error: err.message });
```

Each line is valid JSON, making it easy for AI assistants to parse and analyze.

### Certificate Management

The dev server requires HTTPS. The `fix-cert` script:
1. Cleans up old certificates
2. Generates a new self-signed CA
3. Trusts it in your system
4. Verifies the installation

## 🎯 Example Plugin

The template includes a working example plugin that demonstrates:

- ✅ Kintone event handling
- ✅ Plugin configuration page
- ✅ Logger usage
- ✅ Modern CSS styling
- ✅ Proper code organization

Try it out by following the Quick Start guide above!

## 🛠️ Customization

### Update Plugin Info

Edit `plugin/src/manifest.json`:

```json
{
  "name": {
    "en": "Your Plugin Name"
  },
  "description": {
    "en": "Your plugin description"
  },
  "version": 1
}
```

### Add New Scripts

1. Create your script in `plugin/src/logic/`
2. Add to manifest:
   ```json
   {
     "desktop": {
       "js": [
         "logic/desktop/desktop.js",
         "logic/my-feature/feature.js"
       ]
     }
   }
   ```
3. Hot reload picks it up automatically!

### Add Dependencies

```bash
cd plugin
pnpm add your-library
```

Import in your code:

```javascript
import yourLibrary from 'your-library';
```

Vite bundles everything automatically.

## 🔒 Security

### Important Files to NEVER Commit

- `plugin/private.ppk` - Your plugin's private key
- `.env` - Contains sensitive credentials
- `log/*.log` - May contain sensitive runtime data

These are already in `.gitignore`, but double-check before committing!

### Administrator Account Required

Plugin upload requires a user account with **system administrator privileges**. Username and password authentication is mandatory because:

- Kintone's API Tokens are **app-level** permissions only
- They cannot access system administration functions
- Plugin management is a system-level operation

## 🤝 Contributing

This is a template repository. Feel free to:

1. Fork it
2. Customize for your needs
3. Share improvements back!

## 📝 License

MIT

## 🙋 Need Help?

1. Check [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
2. Read other [documentation](docs/)
3. Check Kintone Developer Network
4. Ask your AI assistant (share your `dev.log`!)
