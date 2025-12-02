# Troubleshooting Guide

Common issues and solutions when developing Kintone plugins with this template.

## Certificate Issues

### Problem: Browser shows "Not Secure" warning

**Symptoms:**
- HTTPS warning in browser
- Dev server connection fails
- Scripts don't load from localhost

**Solution:**
```bash
pnpm fix-cert
```

Then restart your browser.

**Explanation:** The dev server needs HTTPS. The `fix-cert` script generates and trusts a self-signed certificate.

### Problem: Certificate generation fails on Windows

**Symptoms:**
- "Access denied" errors
- Certificate not trusted after running fix-cert

**Solution:**
1. Run PowerShell as Administrator
2. Run: `pnpm fix-cert`
3. Restart browser

**Alternative:** Manually trust the certificate
1. Open Chrome/Edge
2. Go to `https://localhost:5173`
3. Click "Advanced" → "Proceed to localhost"

### Problem: Certificate works but scripts still don't load

**Check:**
1. Dev server is running (`pnpm dev`)
2. Port 5173 is not blocked by firewall
3. No other process using port 5173

```bash
# Windows: Check port usage
netstat -ano | findstr :5173

# If port is in use, change it in .env
VITE_PORT=3000
```

## Development Server Issues

### Problem: Dev server won't start

**Error:** `Error: listen EADDRINUSE: address already in use`

**Solution:**
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5173 | xargs kill
```

Or change the port in `.env`:
```env
VITE_PORT=3001
```

### Problem: Hot reload not working

**Symptoms:**
- Code changes don't appear
- Need to re-upload plugin after changes

**Solutions:**

1. **Check dev server is running**
   ```bash
   pnpm dev
   # Should show "Local: https://localhost:5173"
   ```

2. **Verify proxy plugin is uploaded**
   - Check Kintone System Admin → Plugins
   - Should see your plugin with dev badge

3. **Clear browser cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

4. **Check manifest.json**
   - Verify scripts point to dev server during dev mode

### Problem: "Module not found" errors

**Error:** `Cannot find module 'xxx'`

**Solutions:**

1. **Install dependencies**
   ```bash
   pnpm install
   ```
   
   **Note**: This project uses pnpm workspace. One `pnpm install` in the root installs all dependencies for:
   - Root workspace
   - `plugin/` directory
   - `logistics/plugin-deploy/` directory
   
   You never need to run install commands in subdirectories separately.

2. **Clear node_modules and reinstall**
   ```bash
   # Remove all node_modules
   rm -rf node_modules plugin/node_modules logistics/plugin-deploy/node_modules
   
   # Reinstall everything
   pnpm install
   ```

## Build Issues

### Problem: Build fails with TypeScript errors

**Solutions:**

1. **Check TypeScript files**
   - Look for syntax errors
   - Verify all imports exist

2. **Update TypeScript**
   ```bash
   cd plugin
   pnpm add -D typescript@latest
   ```

3. **Skip type checking (temporary)**
   - Add to `vite.config.js`:
   ```javascript
   export default {
     build: {
       rollupOptions: {
         onwarn: (warning, warn) => {
           if (warning.code === 'TS2307') return;
           warn(warning);
         }
       }
     }
   }
   ```

### Problem: Build succeeds but plugin doesn't work

**Check:**

1. **Console errors in Kintone**
   - Open browser DevTools
   - Look for JavaScript errors

2. **Plugin is enabled**
   - App Settings → Plugins
   - Check plugin is enabled
   - Click "Update App"

3. **Manifest is correct**
   - Verify `manifest.json` paths
   - Check version number

4. **DEV_MODE is false**
   ```env
   DEV_MODE=false
   ```
   Build again after changing.

### Problem: "private.ppk not found"

**Solution:**

Generate a new private key:

```bash
cd plugin
node -e "require('../logistics/plugin-deploy/toolkit/plugin/rsa').generatePPK('private.ppk')"
```

**Important:** Never commit `private.ppk` to version control!

## Upload Issues

### Problem: Upload fails with 401 error

**Error:** `Authentication failed`

**Solutions:**

1. **Check credentials in `.env`**
   ```env
   KINTONE_DEV_BASE_URL=https://your-domain.cybozu.com/
   KINTONE_DEV_USERNAME=your-username
   KINTONE_DEV_PASSWORD=your-password
   ```

2. **Verify URL format**
   - Must end with `/`
   - Must include `https://`

3. **Check user permissions**
   - User must have **system administrator** privileges
   - Check Kintone user settings
   - Verify the user can access System Administration panel
   
   **Note**: API Tokens cannot be used for plugin management as they are app-level permissions only.

### Problem: Upload fails with "Plugin already exists"

**Error:** `GAIA_PL18`

**This is normal!** The upload script automatically updates existing plugins.

If upload still fails:
1. Check the logs for actual error
2. Manually delete old plugin from Kintone
3. Try uploading again

### Problem: Network timeout during upload

**Solutions:**

1. **Check network connection**
   - Can you access Kintone normally?
   - Check proxy settings

2. **Increase timeout (if available)**
   - May need to modify upload script

3. **Upload manually**
   - Build: `pnpm build`
   - Upload `plugin/dist/plugin.zip` via Kintone UI

## Logging Issues

### Problem: Logs not appearing in dev.log

**Check:**

1. **Logging is enabled**
   ```env
   DEV_LOCAL_LOG_ENABLED=true
   ```

2. **Dev server is running**
   ```bash
   pnpm dev
   ```

3. **Logger is loaded**
   - Open browser console
   - Type: `window.PluginLogger`
   - Should show an object

4. **Log directory exists**
   ```bash
   mkdir -p logistics/log
   ```

### Problem: Can't read log file

**Windows Permission Issues:**

```powershell
icacls logistics\log /grant Everyone:F /T
```

**Mac/Linux Permission Issues:**

```bash
chmod -R 755 logistics/log
```

### Problem: Log file too large

**Solution:**

```bash
# Archive old logs
mv logistics/log/dev.log logistics/log/dev.log.old

# Or delete
rm logistics/log/dev.log
```

## Plugin Runtime Issues

### Problem: Plugin doesn't appear in Kintone

**Check:**

1. **Plugin is uploaded**
   - System Admin → Plugins
   - Should see your plugin

2. **Plugin is enabled for app**
   - App Settings → Plugins
   - Enable your plugin
   - Click "Update App"

3. **Manifest targets correct views**
   ```json
   {
     "desktop": {
       "js": ["logic/desktop/desktop.js"]
     }
   }
   ```

### Problem: Plugin loads but doesn't work

**Debug steps:**

1. **Check browser console**
   - Press F12
   - Look for errors

2. **Check logs**
   ```bash
   tail -f logistics/log/dev.log
   ```

3. **Verify kintone events**
   ```javascript
   kintone.events.on('app.record.detail.show', function(event) {
     console.log('Event fired!', event);
     return event;
   });
   ```

4. **Test plugin ID**
   ```javascript
   console.log('Plugin ID:', kintone.$PLUGIN_ID);
   ```

### Problem: "kintone is not defined"

**Cause:** Script loaded before Kintone is ready

**Solution:** Wrap code properly:

```javascript
(function(PLUGIN_ID) {
  'use strict';
  
  kintone.events.on('app.record.detail.show', function(event) {
    // Your code here
    return event;
  });
  
})(kintone.$PLUGIN_ID);
```

## Performance Issues

### Problem: Plugin is slow

**Optimize:**

1. **Minimize DOM operations**
   ```javascript
   // Bad
   for (let i = 0; i < 100; i++) {
     element.appendChild(createNode());
   }
   
   // Good
   const fragment = document.createFragment();
   for (let i = 0; i < 100; i++) {
     fragment.appendChild(createNode());
   }
   element.appendChild(fragment);
   ```

2. **Use event delegation**
   ```javascript
   // Bad: Many listeners
   buttons.forEach(btn => btn.addEventListener('click', handler));
   
   // Good: One listener
   container.addEventListener('click', function(e) {
     if (e.target.matches('button')) handler(e);
   });
   ```

3. **Lazy load heavy libraries**
   ```javascript
   let library = null;
   async function getLibrary() {
     if (!library) {
       library = await import('heavy-library');
     }
     return library;
   }
   ```

## Common Errors

### "Cannot read property of undefined"

**Cause:** Trying to access property on null/undefined

**Debug:**
```javascript
console.log('Value:', someValue); // Check if it's defined
console.log('Type:', typeof someValue);
```

**Fix:** Add null checks
```javascript
if (someValue && someValue.property) {
  // Safe to access
}
```

### "CORS policy" errors

**Cause:** Making requests to external APIs

**Solutions:**
1. Use Kintone proxy:
   ```javascript
   kintone.proxy(url, method, headers, data, callback);
   ```

2. Or configure CORS on the API side

### "Script error"

**Cause:** Error from cross-origin script

**Debug:**
1. Check browser console for actual error
2. Add error handlers:
   ```javascript
   window.addEventListener('error', function(e) {
     logger.error('Global error', {
       message: e.message,
       filename: e.filename,
       lineno: e.lineno
     });
   });
   ```

## Getting Help

### Before Asking for Help

1. **Check logs**
   - Browser console
   - `logistics/log/dev.log`

2. **Try clean install**
   ```bash
   rm -rf node_modules
   pnpm install
   ```

3. **Search existing issues**
   - Check GitHub issues
   - Search Stack Overflow

### When Asking for Help

Include:
- Operating system and version
- Node.js version (`node --version`)
- pnpm version (`pnpm --version`)
- Error messages (full text)
- Steps to reproduce
- What you've tried already

### Useful Commands

```bash
# Check versions
node --version
pnpm --version

# Check environment
cd logistics/plugin-deploy
cat .env

# Check logs
tail -n 50 logistics/log/dev.log

# Check running processes
# Windows
netstat -ano | findstr :5173

# Mac/Linux
lsof -i:5173
```

## Still Stuck?

1. Read other docs:
   - [DEVELOPMENT.md](DEVELOPMENT.md)
   - [DEPLOYMENT.md](DEPLOYMENT.md)
   - [LOG_SYSTEM.md](LOG_SYSTEM.md)

2. Check Kintone documentation:
   - [Kintone Developer Network](https://developer.cybozu.io/hc/en-us)

3. Ask the community:
   - Kintone Developer Community
   - Stack Overflow (tag: kintone)

4. Use AI assistance:
   - Share your `dev.log` file
   - Describe the problem clearly
   - Include error messages

