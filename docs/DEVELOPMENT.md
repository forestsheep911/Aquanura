# Development Guide

This guide will help you develop Kintone plugins using this template.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- A Kintone development environment

### Initial Setup

1. **Install Dependencies**
   ```bash
   pnpm install
   ```
   
   This project uses **pnpm workspace** to manage multiple packages:
   - Root workspace (dev tools like Biome)
   - `plugin/` - The actual Kintone plugin code
   - `logistics/plugin-deploy/` - Build and deployment tools
   
   One `pnpm install` command in the root directory installs dependencies for all packages. You never need to run install commands in subdirectories.

2. **Fix Certificates** (first time only)
   ```bash
   pnpm fix-cert
   ```
   This will generate and trust a self-signed certificate for HTTPS development.

3. **Configure Environment**
   ```bash
   cd logistics/plugin-deploy
   cp .env.example .env
   # Edit .env with your Kintone credentials
   ```

4. **Start Development Server**
   ```bash
   cd ../..
   pnpm dev
   ```

## Development Workflow

### Hot Reload Development

When you run `pnpm dev`, the template starts a Vite development server with:

- **HTTPS enabled** - Required for Kintone plugin development
- **Hot Module Replacement** - Code changes reload instantly
- **Local logging** - All logs written to `logistics/log/dev.log`
- **Proxy plugin technique** - No need to re-upload after code changes

### How Hot Reload Works

1. Development server rewrites `manifest.json` to load scripts from `https://localhost:5173`
2. A proxy plugin is uploaded to Kintone once
3. All subsequent code changes are served from the local dev server
4. Simply refresh the Kintone page to see changes

### Development Badge

When `DEV_MODE=true` in your `.env`, the plugin icon will show a "D" badge to distinguish development builds from production.

## Project Structure

```
plugin/src/
├── manifest.json          # Plugin configuration
├── logic/
│   ├── desktop/          # Desktop view logic
│   │   └── desktop.js
│   └── config/           # Configuration page
│       └── config.js
├── log/
│   └── logger.js         # Logging client
├── css/                  # Styles
├── html/                 # HTML templates
└── image/                # Assets
```

## Working with the Logger

The template includes an AI-friendly logging system:

```javascript
// In your plugin code
const logger = window.PluginLogger;

logger.info('User clicked button');
logger.info({ action: 'button_click', userId: '123' });
logger.error('Failed to save', { error: err.message });
```

Logs are automatically sent to the dev server and written to `logistics/log/dev.log` in JSONL format.

## Customizing the Plugin

### Update Manifest

Edit `plugin/src/manifest.json` to configure:
- Plugin name and description (multilingual)
- Version number
- JavaScript and CSS files to load
- Required permissions

### Add New Scripts

1. Create your script in `plugin/src/logic/`
2. Add it to `manifest.json`:
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
3. Hot reload will pick it up automatically

### Add Dependencies

If you need external libraries:

```bash
cd plugin
pnpm add your-library
```

Then import in your code:
```javascript
import yourLibrary from 'your-library';
```

Vite will bundle everything automatically.

## Building for Production

```bash
pnpm build
```

This will:
1. Build all scripts with Vite
2. Remove development code (logger, console.logs)
3. Sign the plugin with your private key
4. Package everything into `plugin/dist/plugin.zip`

## Testing

### Manual Testing

1. Start dev server: `pnpm dev`
2. Open your Kintone app
3. Check browser console for logs
4. Check `logistics/log/dev.log` for detailed logs

### Integration Testing

Before production release:

1. Build plugin: `pnpm build`
2. Manually upload `plugin/dist/plugin.zip` to a test environment
3. Test all functionality
4. Check for console errors

## Debugging Tips

### Check Logs

Logs are in `logistics/log/dev.log`:

```bash
# Windows PowerShell
Get-Content -Tail 20 -Wait logistics\log\dev.log

# Mac/Linux
tail -f logistics/log/dev.log
```

### Common Issues

**Hot reload not working?**
- Check if dev server is running
- Verify certificate is trusted
- Check browser console for connection errors

**Build failing?**
- Run `pnpm install` in the project root (installs all workspace dependencies)
- Clear Vite cache: delete `plugin/node_modules/.vite`
- Check for syntax errors in your code

**Certificate errors?**
- Run `pnpm fix-cert` again
- Restart your browser
- On Windows, run PowerShell as Administrator

## Best Practices

### Code Organization

- Keep desktop/mobile/config logic separate
- Use the logger for debugging
- Add comments for complex logic
- Use TypeScript for better IDE support

### Performance

- Minimize DOM manipulations
- Use event delegation when possible
- Lazy load heavy libraries
- Test with large datasets

### Security

- Never commit `.env` files
- Never commit `private.ppk` to public repos
- Validate all user inputs
- Use Kintone's built-in XSS protection

## Next Steps

- Read [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- Read [LOG_SYSTEM.md](LOG_SYSTEM.md) for advanced logging
- Read [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues

