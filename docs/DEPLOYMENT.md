# Deployment Guide

This guide covers deploying your Kintone plugin to development and production environments.

## Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All features tested locally
- [ ] Code reviewed and cleaned up
- [ ] No console.log statements (build removes them automatically)
- [ ] Manifest version updated
- [ ] CHANGELOG updated (if applicable)
- [ ] `.env` configured for target environment

## Building the Plugin

### Production Build

```bash
pnpm build
```

This command:
1. Sets `NODE_ENV=production` and `DEV_MODE=false`
2. Builds with Vite (optimized, minified)
3. Removes development code (logger, debug statements)
4. Signs the plugin with your `private.ppk`
5. Creates `plugin/dist/plugin.zip`

Output: `plugin/dist/plugin.zip` (ready for upload)

### Development Build

```bash
# Set DEV_MODE=true in .env first
pnpm build
```

This keeps development features (logger, dev badge) in the build.

## Deployment Methods

### Method 1: Automatic Upload (Recommended)

Configure your target environment in `.env`:

```env
# Development Environment
KINTONE_DEV_BASE_URL=https://dev.cybozu.com/
KINTONE_DEV_USERNAME=your-username
KINTONE_DEV_PASSWORD=your-password
```

Then upload:

```bash
# To development environment
pnpm upload:dev

# To production environment  
pnpm upload:prod
```

### Method 2: Manual Upload

1. Build the plugin: `pnpm build`
2. Get `plugin/dist/plugin.zip`
3. Go to Kintone System Administration
4. Navigate to "Plugins"
5. Click "Import Plugin"
6. Select the zip file
7. Click "Import"

## Environment Configuration

### Development Environment

```env
KINTONE_DEV_BASE_URL=https://your-dev.cybozu.com/
KINTONE_DEV_USERNAME=dev-user
KINTONE_DEV_PASSWORD=dev-password
```

**Note**: Plugin upload requires system administrator privileges. You must use username and password authentication.

### Production Environment

```env
KINTONE_PROD_BASE_URL=https://your-prod.cybozu.com/
KINTONE_PROD_USERNAME=prod-user
KINTONE_PROD_PASSWORD=prod-password
```

### Authentication

Plugin upload requires **system administrator privileges** and must use username and password authentication.

**Why not API Tokens?**
- Kintone's API Tokens are **app-level** permissions
- They cannot access system administration functions like plugin management
- You must use a user account with administrator privileges

## Deployment Workflow

### Development → Production

1. **Develop locally**
   ```bash
   pnpm dev
   ```

2. **Test in development environment**
   ```bash
   pnpm build
   pnpm upload:dev
   ```

3. **QA testing**
   - Test all features in dev environment
   - Fix any issues
   - Repeat steps 1-2

4. **Deploy to production**
   ```bash
   pnpm build
   pnpm upload:prod
   ```

5. **Activate plugin**
   - Go to your Kintone app settings
   - Enable the plugin
   - Configure plugin settings
   - Update app

## Version Management

### Updating Plugin Version

Edit `plugin/src/manifest.json`:

```json
{
  "version": 2
}
```

Version must be an integer. Increment for each release.

### Updating Existing Plugin

When uploading a new version:

1. The upload script automatically detects existing plugins
2. It updates the plugin instead of creating a new one
3. Apps using the plugin need to be updated manually

## Rollback Strategy

### If Something Goes Wrong

1. **Have backup ready**
   - Keep previous `plugin.zip` versions
   - Tag releases in git

2. **Quick rollback**
   - Upload previous version's zip file
   - Update affected apps

3. **Debug in dev environment**
   - Don't debug in production
   - Use dev environment to fix issues

## Security Considerations

### Private Key Security

**NEVER** commit `plugin/private.ppk`:
- It's in `.gitignore` by default
- If exposed, anyone can impersonate your plugin
- Generate a new key if compromised

### Credentials Security

**NEVER** commit `.env` files:
- Contains sensitive credentials (usernames and passwords)
- Use environment-specific `.env` files
- Store credentials securely (e.g., password managers)
- Use separate accounts for dev and production if possible

### Build Verification

After building:
- Check `plugin.zip` size (should be reasonable)
- Test in isolated environment first
- Verify no sensitive data in bundle

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build
      - name: Upload to production
        env:
          # Plugin upload requires a system administrator account.
          # API Tokens are app-level and cannot be used for plugin management.
          KINTONE_PROD_BASE_URL: ${{ secrets.KINTONE_PROD_BASE_URL }}
          KINTONE_PROD_USERNAME: ${{ secrets.KINTONE_PROD_USERNAME }}
          KINTONE_PROD_PASSWORD: ${{ secrets.KINTONE_PROD_PASSWORD }}
        run: pnpm upload:prod
```

Store credentials in GitHub Secrets (base URL, username, password).

## Troubleshooting Deployment

### Upload Fails with 401 Error

**Problem**: Authentication failed

**Solutions**:
- Verify credentials in `.env`
- Ensure user has **system administrator** privileges
- Check username and password are correct
- Verify the user can access Kintone System Administration panel

### Upload Fails with GAIA_PL18

**Problem**: Plugin ID already exists

**Solution**: This is expected! The script updates the existing plugin automatically.

### Build Succeeds but Upload Fails

**Problem**: Network or permission issue

**Solutions**:
1. Check network connection
2. Verify Kintone URL is correct
3. Check firewall/proxy settings
4. Manually upload the zip as a test

### Plugin Doesn't Work After Upload

**Problem**: App not updated or configuration issue

**Solutions**:
1. Update the app (Settings → Update App)
2. Check plugin configuration
3. Check browser console for errors
4. Verify plugin is enabled for the app

## Post-Deployment

### Monitoring

- Check Kintone system logs
- Monitor user feedback
- Watch for error reports

### Documentation

- Update release notes
- Document configuration changes
- Update user guides if needed

## Best Practices

1. **Always test in dev first** - Never deploy directly to production
2. **Use version numbers** - Track what's deployed where
3. **Keep backups** - Store previous working versions
4. **Document changes** - Maintain a CHANGELOG
5. **Automate when possible** - Use CI/CD for consistent deployments

## Next Steps

- Read [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common deployment issues
- Set up CI/CD for automated deployments
- Create a release checklist for your team
