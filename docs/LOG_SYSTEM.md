# Log System Guide

This template includes an AI-friendly logging system designed for modern debugging workflows.

## Overview

The logging system writes to local JSONL (JSON Lines) files, making it easy for both humans and AI assistants to parse and analyze logs.

### Key Features

- **Local JSONL logging** - One JSON object per line
- **Real-time writing** - Logs appear immediately in `log/dev.log`
- **AI-friendly format** - Easy for AI to parse and analyze
- **Development only** - Automatically disabled in production builds

## Quick Start

### Enable Logging

In your root `.env`:

```env
DEV_LOCAL_LOG_ENABLED=true
```

### Use the Logger

In your plugin code:

```javascript
const logger = window.PluginLogger;

// Simple message
logger.info('Button clicked');

// With data
logger.info('User action', { 
  action: 'save',
  recordId: '123'
});

// Error logging
logger.error('Save failed', { 
  error: err.message,
  code: err.code 
});
```

### View Logs

```bash
# Windows PowerShell
Get-Content -Tail 20 -Wait logistics\log\dev.log

# Mac/Linux
tail -f log/dev.log

# Or just open the file in your editor
code log/dev.log
```

## Log Format

### JSONL (JSON Lines)

Each log entry is a single line of valid JSON:

```json
{"ts":"2025-01-01T12:00:00.000Z","level":"INFO","message":"Button clicked","pluginId":"abc123","domain":"example.cybozu.com"}
{"ts":"2025-01-01T12:00:01.000Z","level":"ERROR","message":"Save failed","error":"Network timeout","pluginId":"abc123"}
```

### Why JSONL?

- **Appendable** - New logs don't break existing ones
- **Streamable** - Can process logs line-by-line
- **Human readable** - Each line is complete
- **Machine parseable** - Each line is valid JSON
- **AI friendly** - Easy for AI to analyze

### Log Entry Fields

Every log entry includes:

| Field | Description | Example |
|-------|-------------|---------|
| `ts` | ISO timestamp | `2025-01-01T12:00:00.000Z` |
| `level` | Log level | `INFO`, `WARN`, `ERROR`, `DEBUG` |
| `message` | Main message | `User clicked save button` |
| `pluginId` | Plugin identifier | `abc123...` |
| `domain` | Kintone domain | `example.cybozu.com` |
| `pluginVersion` | Plugin version | `1` |

Plus any custom fields you add.

## Logger API

### Available Methods

```javascript
const logger = window.PluginLogger;

// INFO level - general information
logger.info('Operation completed');
logger.info('User action', { action: 'save' });

// WARN level - warnings
logger.warn('Deprecated function used');
logger.warn('Rate limit approaching', { usage: 95 });

// ERROR level - errors
logger.error('Operation failed');
logger.error('API error', { status: 500, message: 'Server error' });

// DEBUG level - detailed debugging
logger.debug('Variable state', { user: userData });
```

### Logging Best Practices

**DO:**
```javascript
// Include context
logger.info('Record saved', { recordId: '123', fields: ['Name', 'Email'] });

// Log errors with details
logger.error('API call failed', { 
  endpoint: '/api/records',
  status: 500,
  message: err.message 
});

// Use appropriate levels
logger.debug('Entering function', { params });
logger.info('Operation completed');
logger.error('Critical failure');
```

**DON'T:**
```javascript
// Avoid logging sensitive data
logger.info('User logged in', { password: user.password }); // ❌

// Avoid logging huge objects
logger.info('All records', { records: allRecords }); // ❌

// Avoid generic messages
logger.info('Error'); // ❌ Not helpful
```

## Configuration

### Environment Variables

```env
# Enable/disable local logging
DEV_LOCAL_LOG_ENABLED=true

# Custom log directory (optional)
DEV_LOG_DIR=log

```

### Log Endpoint

The dev server exposes a single HTTP endpoint:

`POST http://localhost:5173/__devlog`

Writes logs to `log/dev.log`.

**Request:**
```json
{
  "level": "INFO",
  "message": "User action",
  "action": "save"
}
```

**Response:**
```json
{
  "ok": true
}
```

## Advanced Usage

### Custom Log Fields

Add custom fields to enrich your logs:

```javascript
logger.info('Record updated', {
  recordId: '123',
  updatedFields: ['Name', 'Email'],
  updatedBy: kintone.getLoginUser().code,
  duration: Date.now() - startTime
});
```

### Conditional Logging

```javascript
function debugLog(message, data) {
  if (window.location.hostname.includes('localhost')) {
    logger.debug(message, data);
  }
}
```

### Performance Logging

```javascript
const start = Date.now();
// ... your code ...
const duration = Date.now() - start;

logger.info('Operation completed', {
  operation: 'bulkUpdate',
  recordCount: 100,
  duration: duration,
  performance: duration < 1000 ? 'good' : 'slow'
});
```

### Error Tracking

```javascript
try {
  await saveRecord(data);
} catch (err) {
  logger.error('Failed to save record', {
    operation: 'save',
    recordId: data.id,
    errorMessage: err.message,
    errorStack: err.stack,
    data: JSON.stringify(data)
  });
  throw err;
}
```

## AI-Assisted Debugging

### How AI Uses Logs

The JSONL format makes it easy for AI assistants to:

1. **Parse logs** - Each line is valid JSON
2. **Find patterns** - Search for specific errors
3. **Analyze trends** - Count error frequencies
4. **Suggest fixes** - Based on error context

### Example AI Workflow

1. You encounter an error in Kintone
2. AI reads `log/dev.log`
3. AI finds relevant error entries
4. AI analyzes the context
5. AI suggests a fix

### Tips for AI-Friendly Logging

```javascript
// Include all relevant context
logger.error('API call failed', {
  endpoint: '/api/records',
  method: 'POST',
  statusCode: 500,
  responseBody: response.data,
  requestBody: requestData,
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent
});
```

## Production Considerations

### Automatic Cleanup

In production builds (`DEV_MODE=false`):
- Logger code is removed
- `__devlog` endpoint is not available
- All logging calls are no-ops

### Log Rotation

For long-running development:

```bash
# Archive old logs
mv log/dev.log log/dev.log.old

# Or just delete
rm log/dev.log
```

### Disk Space

Monitor log file size:

```bash
# Windows
(Get-Item logistics\log\dev.log).length / 1MB

# Mac/Linux
du -h log/dev.log
```

Clean up regularly during development.

## Troubleshooting

### Logs Not Appearing

**Check:**
1. `DEV_LOCAL_LOG_ENABLED=true` in `.env`
2. Dev server is running
3. Logger is loaded: `console.log(window.PluginLogger)`
4. No JavaScript errors blocking execution

### Log File Permissions

If you can't write logs:

```bash
# Windows
icacls logistics\log /grant Everyone:F /T

# Mac/Linux
chmod -R 755 log
```

### Finding Specific Logs

Use text search or jq:

```bash
# Find all errors
grep '"level":"ERROR"' log/dev.log

# Parse with jq
cat log/dev.log | jq 'select(.level == "ERROR")'
```

## Next Steps

- Read [DEVELOPMENT.md](DEVELOPMENT.md) for development workflow
- Read [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- Customize the logger for your needs

