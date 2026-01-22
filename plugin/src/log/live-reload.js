(function () {
    function inferWSUrl() {
        try {
            // Prefer compile-time injected Server Origin (supports Upload mode)
            if (typeof __DEV_SERVER_ORIGIN__ !== 'undefined') {
                const origin = String(__DEV_SERVER_ORIGIN__);
                const wsOrigin = origin.replace(/^http/, 'ws');
                const endpoint =
                    typeof __DEV_LIVE_ENDPOINT__ !== 'undefined' ? String(__DEV_LIVE_ENDPOINT__) : '/__live';
                return `${wsOrigin}${endpoint}/ws`;
            }

            // Prefer compile-time constants
            if (typeof __DEV_LIVE_ENDPOINT__ !== 'undefined') {
                const endpointPath = String(__DEV_LIVE_ENDPOINT__);
                // Check if in development environment (by script source URL)
                const scripts = document.scripts || [];
                for (let i = 0; i < scripts.length; i++) {
                    const src = scripts[i].src || '';
                    if (src.includes('/__static/') && src.includes('localhost')) {
                        const match = src.match(/^(https?:\/\/[^/]+)/);
                        if (match) {
                            const devOrigin = match[1];
                            const proto = devOrigin.startsWith('https') ? 'wss:' : 'ws:';
                            return `${proto}//${devOrigin.replace(/^https?:\/\//, '')}${endpointPath}/ws`;
                        }
                    }
                }
            }
        } catch { }
        try {
            let src = document.currentScript?.src || '';
            if (!src) {
                const nodes = Array.from(document.scripts || []);
                for (let i = 0; i < nodes.length; i++) {
                    if (nodes[i]?.src && /__static\/.+live-reload\.js/.test(nodes[i].src)) {
                        src = nodes[i].src;
                        break;
                    }
                }
            }
            if (!src) return null;
            const m = src.match(/^(https?):\/\/([^/]+)\//i); // Capture protocol and host:port
            if (!m) return null;
            const scheme = m[1];
            const hostPort = m[2];
            // Only attempt WebSocket connection when script is from localhost
            // If loaded from kintone server (e.g., deploy:watch upload mode), don't attempt connection
            if (!hostPort.startsWith('localhost') && !hostPort.startsWith('127.0.0.1')) {
                return null;
            }
            const wsScheme = scheme === 'https' ? 'wss:' : 'ws:';
            return `${wsScheme}//${hostPort}/__live/ws`;
        } catch { }
        return null;
    }

    const wsUrl = inferWSUrl();
    if (!wsUrl) {
        // In non-dev-server mode (e.g., deploy:watch upload mode), silently skip
        // Only show warning in debug mode
        if (
            typeof __DEV_SERVER_ORIGIN__ !== 'undefined' ||
            typeof __DEV_LIVE_ENDPOINT__ !== 'undefined'
        ) {
            console.warn('[live-reload] Could not infer WS endpoint');
        }
        return;
    }
    console.log('[live-reload] connect ->', wsUrl);

    let last = 0;
    let retryCount = 0;
    const MAX_RETRIES = 20; // Retries for consecutive failures

    /* Exponential backoff strategy:
       retry 0: 1000ms
       retry 1: 2000ms
       retry 2: 3000ms
       retry 3: 5000ms
       retry 4: 8000ms
       ...
       max: 60000ms
    */
    function getBackoffDelay(attempt) {
        if (attempt > 15) return 60000;
        // Simple fibonacci simulation: 1, 2, 3, 5, 8, ... * 1000
        let a = 1;
        let b = 1;
        for (let i = 0; i < attempt; i++) {
            const temp = a + b;
            a = b;
            b = temp;
        }
        return Math.min(b * 1000, 60000);
    }

    function connect() {
        try {
            if (retryCount >= MAX_RETRIES) {
                console.warn('[live-reload] Max retries reached, stopping connection attempts');
                return;
            }
            const ws = new WebSocket(wsUrl);
            window.__liveChannel = 'ws';

            ws.onopen = function () {
                console.log('[live-reload] ws open');
                retryCount = 0; // Connection successful, reset retry count
            };

            ws.onmessage = function (ev) {
                try {
                    const data = JSON.parse(ev.data || '{}');
                    if (data && typeof data.ts === 'number') {
                        console.log('[live-reload] ts:', data.ts, 'last:', last);
                        if (last && data.ts > last) {
                            location.reload();
                            return;
                        }
                        last = data.ts;
                    }
                } catch (e) {
                    console.warn('[live-reload] parse error:', e?.message || e);
                }
            };

            const handleClose = function () {
                try {
                    ws.close();
                } catch { }

                const delay = getBackoffDelay(retryCount);
                console.warn(
                    `[live-reload] ws closed/error, retry in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`,
                );
                retryCount++;
                setTimeout(connect, delay);
            };

            ws.onclose = handleClose;
            ws.onerror = function (e) {
                // onerror usually followed by onclose, handle retry in onclose to avoid duplicate triggers
                // Only log error here
                console.warn('[live-reload] ws error:', e);
            };
        } catch (e) {
            const delay = getBackoffDelay(retryCount);
            console.warn(`[live-reload] connect exception, retry in ${delay}ms:`, e?.message || e);
            retryCount++;
            setTimeout(connect, delay);
        }
    }
    connect();
})();
