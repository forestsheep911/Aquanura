export const logger = {
    log: (...args: any[]) => sendLog('INFO', args),
    warn: (...args: any[]) => sendLog('WARN', args),
    error: (...args: any[]) => sendLog('ERROR', args),
};

// We need to know the dev server URL. 
// Since this is injected by loader.js, we can infer it or hardcode it for dev mode.
// In the loader, we know the origin.
// Let's rely on the fact that for dev mode, we connect to localhost:5173 (or 127.0.0.1).
// But better: we can store the origin in a global variable in loader.js?
// Or just try 127.0.0.1:5173.

// Derive server URL from the current module's URL to handle dynamic ports (e.g. 5174)
const currentScriptUrl = new URL(import.meta.url);
const DEV_SERVER_URL = `${currentScriptUrl.protocol}//${currentScriptUrl.hostname}:${currentScriptUrl.port}/log`;

function sendLog(level: string, args: any[]) {
    // Always log to console
    console[level.toLowerCase() as 'log' | 'warn' | 'error'](...args);

    // Send to local server
    try {
        fetch(DEV_SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                level,
                args: args.map(arg => {
                    if (typeof arg === 'object') {
                        try {
                            return JSON.stringify(arg);
                        } catch {
                            return String(arg);
                        }
                    }
                    return String(arg);
                })
            })
        }).catch(() => {
            // Ignore errors if dev server is not reachable
        });
    } catch {
        // ignore
    }
}
