# HTTPS Certificate Management

This template automatically manages HTTPS certificates for local development.

## Why HTTPS?

Kintone plugins must be served over HTTPS, even in development. The template uses self-signed certificates to provide secure local development.

## Automatic Management

### First Time Setup

When you run `pnpm dev` for the first time, the system:

1. **Generates a root CA** (Certificate Authority)
2. **Trusts the CA** in your system's trust store
3. **Creates certificates** for localhost and common local IPs
4. **Starts the dev server** with HTTPS enabled

You may be prompted to enter your system password to trust the certificate.

## Custom Domains

### Default Domains

The certificate automatically includes:
- `localhost`
- `localhost.localdomain`
- `127.0.0.1`
- `0.0.0.0`
- `::1`

### Adding Extra Domains

If you need to access the dev server through other domains:

```env
# In your root .env
DEV_HTTPS_DOMAINS=dev.local,192.168.1.100,myapp.test
```

**Use Cases:**
- **Custom local domains**: Set up `dev.local` in your `/etc/hosts` file
- **LAN access**: Access from another device on your network (e.g., mobile testing)
- **VM/Container development**: Access from host machine to container

### Example: LAN Access

1. Find your computer's local IP:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. Add to `.env`:
   ```env
   DEV_HTTPS_DOMAINS=192.168.1.100
   ```

3. Access from another device:
   ```
   https://192.168.1.100:5173
   ```

## Troubleshooting

### Certificate Not Trusted

**Symptoms:**
- Browser shows "Not Secure" or "Your connection is not private"
- Scripts fail to load from localhost

**Solution:**

```bash
pnpm fix-cert
```

This script:
1. Stops the dev server
2. Removes old certificates from trust stores
3. Deletes certificate files
4. Generates fresh certificates
5. Installs them to trust stores
6. Verifies installation

### Certificate Expired

Certificates are valid for **20 years** (7300 days) by default. If somehow expired:

```bash
pnpm fix-cert
```

### Platform-Specific Issues

#### Windows

**Issue**: "Access Denied" when trusting certificate

**Solution**: Run PowerShell as Administrator:
```powershell
# Run as Administrator
pnpm fix-cert
```

#### macOS

**Issue**: Password prompt not appearing

**Solution**: 
```bash
# Manual trust
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain logistics/plugin-deploy/toolkit/cert/ca.crt
```

#### Linux

**Issue**: Certificate not trusted in Chrome/Chromium

**Solution**:
```bash
# Ubuntu/Debian
sudo cp logistics/plugin-deploy/toolkit/cert/ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates

# Fedora/RHEL
sudo cp logistics/plugin-deploy/toolkit/cert/ca.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust
```

### Still Having Issues?

1. **Restart your browser** completely (close all windows)
2. **Clear browser cache** and SSL state
3. **Check firewall** isn't blocking localhost:5173
4. **Try incognito/private mode** to rule out extensions

## Certificate Files

Certificates are stored in:
```
logistics/plugin-deploy/toolkit/cert/
├── ca.crt          # Root CA certificate (public)
├── ca.key          # Root CA private key
├── cert.crt        # Server certificate (public)
└── cert.key        # Server private key
```

**⚠️ Security Note**: These files are git-ignored and should **never** be committed. Each developer generates their own local certificates.

## Advanced Configuration

### Custom Certificate Validity

Edit `logistics/plugin-deploy/toolkit/cert/index.js`:

```javascript
function certificateFor(requestedDomains = []) {
  const validity = 365; // Change to desired days
  // ...
}
```

### Manual Certificate Generation

```bash
cd logistics/plugin-deploy
node -e "require('./toolkit/cert').gen(['custom.local'], '.', 'cert.pem', 'key.pem')"
```

This creates `cert.pem` and `key.pem` in the current directory.

## How It Works

### Certificate Generation

1. **Root CA Creation**: A self-signed certificate authority is created
2. **CA Trust**: The CA is added to system trust stores (Keychain, certutil, etc.)
3. **Server Certificate**: A certificate signed by the CA is generated for specified domains
4. **Vite Configuration**: Vite server uses the server certificate

### Trust Store Management

The system automatically manages platform-specific trust stores:

- **Windows**: `certutil` command
- **macOS**: Keychain via `security` command
- **Linux**: System-wide CA directory

### Development Flow

```
pnpm dev
    ↓
Check if CA exists
    ↓ (no)
Generate CA → Trust CA → Generate Cert
    ↓ (yes)
Load existing Cert
    ↓
Start Vite with HTTPS
```

## Security Considerations

### Local Development Only

These certificates are for **local development only**:
- Self-signed, not trusted by external systems
- Private keys stored locally
- Not suitable for production
- Each developer has unique certificates

### What's Safe to Share

✅ **Safe to share**:
- Code that references certificates
- Configuration examples
- This documentation

❌ **Never share**:
- Certificate files (`*.crt`, `*.key`)
- Private keys
- Trust store modifications on shared systems

### Automatic Cleanup

The `.gitignore` file ensures certificates aren't committed:

```gitignore
logistics/plugin-deploy/toolkit/cert/ca.crt
logistics/plugin-deploy/toolkit/cert/ca.key
logistics/plugin-deploy/toolkit/cert/cert.crt
logistics/plugin-deploy/toolkit/cert/cert.key
```

## Further Reading

- [Let's Encrypt - How HTTPS Works](https://howhttps.works/)
- [MDN Web Docs - Certificate Authorities](https://developer.mozilla.org/en-US/docs/Glossary/Certificate_authority)
- [Vite HTTPS Configuration](https://vitejs.dev/config/server-options.html#server-https)

