# Plugin Deploy Tool Architecture

## 🎯 Design Philosophy

The `logistics/plugin-deploy` directory is the project's **logistics center**, managing all tools and scripts related to plugin building and deployment. This project uses a Vite-based development pipeline with certificate management, packaging, and upload logic centralized here.

**Key advantages:**
1. **Separation of concerns**: Plugin code focuses on business logic, tools focus on build/deploy
2. **Security isolation**: Dangerous deployment operations separated from safe compilation checks
3. **Unified management**: All build/deploy tools in one place
4. **Ease of use**: Root-level shortcuts, no need to remember complex paths

## 📁 Directory Structure

```
logistics/plugin-deploy/
├── package.json          # Tool dependencies and scripts
├── fix-cert.js           # 🔐 Certificate fix utility
├── upload-dev.js         # ⬆️ Upload to dev environment
├── upload-prod.js        # ⬆️ Upload to prod environment
├── vite/
│   ├── dev.js            # 🔥 Vite dev server + auto-upload
│   ├── build.js          # 🏗️ Vite build + plugin packaging
│   ├── build-worker.js   # 👷 Child process builder (memory optimization)
│   └── deploy-watch.js   # 👀 Continuous deployment mode
└── toolkit/              # 🧰 Core utilities (cert/pack/sign/upload)
```

## 🔧 Script Categories

### Development Scripts
- `vite/dev.js` - Hot reload dev mode with HTTPS and auto-upload
- `vite/deploy-watch.js` - Watch mode for mobile debugging

### Build Scripts
- `vite/build.js` - Production build with plugin packaging
- `vite/build-worker.js` - Child process builder to avoid memory leaks

### Upload Scripts
- `upload-dev.js` - Upload to development environment
- `upload-prod.js` - Upload to production environment

## 🎯 Usage

### From root directory (recommended)

```bash
# Development
pnpm dev               # Start dev server with hot reload
pnpm deploy:watch      # Continuous deployment for mobile testing

# Build
pnpm build             # Production build
pnpm build:dev         # Development build

# Deploy
pnpm deploy:dev        # Build + upload to dev
pnpm deploy:prod       # Build + upload to prod
```

## 💡 Design Advantages

1. **Memory optimization**: Child process builds prevent memory leaks during long dev sessions
2. **Flexible deployment**: Multiple deployment modes for different scenarios
3. **Maintainability**: Centralized tool management
4. **User friendly**: Simple root-level commands

## 🔄 Relationship with Plugin Directory

```
project-root/
├── .env                      # Unified environment config
├── plugin/                   # Plugin business code
│   ├── src/                  # Source code
│   ├── dist/                 # Build output
│   └── package.json          # Plugin dependencies
└── logistics/plugin-deploy/  # Logistics tools
    ├── vite/                 # Build/dev tools
    └── toolkit/              # Core utilities
```

**Design principles:**
- **Separation**: Plugin directory for pure business code
- **Unified config**: All env settings in root `.env`
- **Isolation**: No deployment logic in plugin code
