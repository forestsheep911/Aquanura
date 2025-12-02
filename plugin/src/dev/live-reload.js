/**
 * Live Reload Client
 *
 * Automatically reloads the page when source files change during development.
 * Based on: AI-Translate-Plugin live-reload system
 *
 * Connection fallback chain: WebSocket -> SSE -> Polling
 */

(() => {
  const MAX_WS_ATTEMPTS = 1;
  const WS_RETRY_DELAY = 800;
  const POLL_INTERVAL = 800;

  // Enable debug logs with: localStorage.setItem('pluginLiveReloadDebug', 'true')
  const debugEnabled =
    typeof window !== 'undefined' &&
    window.localStorage &&
    window.localStorage.getItem('pluginLiveReloadDebug') === 'true';

  const debugLog = (...args) => {
    if (!debugEnabled) return;
    try {
      console.log('[live-reload]', ...args);
    } catch (_error) {
      /* noop */
    }
  };

  const warnLog = (...args) => {
    if (!debugEnabled) return;
    try {
      console.warn('[live-reload]', ...args);
    } catch (_error) {
      /* noop */
    }
  };

  /**
   * Infer development server URLs from loaded scripts
   */
  function inferLiveUrls() {
    const result = { ws: null, sse: null, poll: null };
    const normalize = (url) => url.replace(/^https?:\/\//, '');

    try {
      // Look for __DEV_LIVE_ENDPOINT__ constant
      if (typeof __DEV_LIVE_ENDPOINT__ !== 'undefined') {
        const endpointPath = String(__DEV_LIVE_ENDPOINT__);
        const scripts = document.scripts || [];
        for (let i = 0; i < scripts.length; i += 1) {
          const src = scripts[i].src || '';
          if (
            src.includes('/__static/') &&
            (src.includes('localhost') || src.includes('127.0.0.1'))
          ) {
            const match = src.match(/^(https?:\/\/[^/]+)/);
            if (match) {
              const devOrigin = match[1];
              const host = normalize(devOrigin);
              const wsScheme = devOrigin.startsWith('https') ? 'wss:' : 'ws:';
              const httpScheme = devOrigin.startsWith('https') ? 'https:' : 'http:';
              result.ws = `${wsScheme}//${host}${endpointPath}/ws`;
              result.sse = `${httpScheme}//${host}${endpointPath}/sse`;
              result.poll = `${httpScheme}//${host}${endpointPath}`;
              return result;
            }
          }
        }
      }
    } catch {
      /* noop */
    }

    // Fallback: infer from current script
    try {
      let src = document.currentScript?.src || '';
      if (!src) {
        const nodes = Array.from(document.scripts || []);
        for (let i = 0; i < nodes.length; i += 1) {
          const nodeSrc = nodes[i]?.src || '';
          if (/__static\/.+live-reload\.js/.test(nodeSrc)) {
            src = nodeSrc;
            break;
          }
        }
      }
      if (!src) return result;
      const match = src.match(/^(https?):\/\/([^/]+)/i);
      if (!match) return result;
      const scheme = match[1];
      const hostPort = match[2];
      const wsScheme = scheme === 'https' ? 'wss:' : 'ws:';
      const httpScheme = scheme === 'https' ? 'https:' : 'http:';
      result.ws = `${wsScheme}//${hostPort}/__live/ws`;
      result.sse = `${httpScheme}//${hostPort}/__live/sse`;
      result.poll = `${httpScheme}//${hostPort}/__live`;
    } catch {
      /* noop */
    }

    return result;
  }

  /**
   * Handle timestamp update and trigger reload
   */
  function handleTimestamp(state, ts) {
    if (typeof ts !== 'number') return;
    const previous = state.last || 0;
    if (previous && ts <= previous) {
      state.last = ts;
      return;
    }
    state.last = ts;
    if (previous === 0) return; // First connection
    if (state.reloading) return; // Already reloading
    state.reloading = true;
    debugLog('🔄 Source changed, reloading page...');
    location.reload();
  }

  /**
   * Fallback: Polling mode
   */
  function startPolling(state, pollUrl) {
    if (!pollUrl) return;
    if (state.pollTimer) return;
    warnLog('fallback to polling mode');
    state.channel = 'poll';
    state.pollTimer = setInterval(async () => {
      try {
        const resp = await fetch(pollUrl, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'omit',
        });
        if (!resp.ok) return;
        const data = await resp.json();
        handleTimestamp(state, data?.ts);
      } catch {
        /* noop */
      }
    }, POLL_INTERVAL);
  }

  /**
   * Fallback: Server-Sent Events mode
   */
  function startSSE(state, urls) {
    if (!urls.sse || state.channel === 'sse' || typeof EventSource === 'undefined') {
      startPolling(state, urls.poll);
      return;
    }
    try {
      warnLog('fallback to SSE mode');
      const source = new EventSource(urls.sse);
      state.channel = 'sse';
      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data || '{}');
          handleTimestamp(state, data?.ts);
        } catch {
          /* noop */
        }
      };
      source.onerror = () => {
        try {
          source.close();
        } catch {
          /* noop */
        }
        startPolling(state, urls.poll);
      };
    } catch (error) {
      warnLog('SSE init error:', error?.message || error);
      startPolling(state, urls.poll);
    }
  }

  /**
   * Primary mode: WebSocket connection
   */
  function startWebSocket(state, urls) {
    if (!urls.ws) {
      warnLog('Unable to infer WebSocket endpoint');
      startSSE(state, urls);
      return;
    }
    debugLog('connect ->', urls.ws);
    let attempts = 0;

    function connect() {
      attempts += 1;
      try {
        const ws = new WebSocket(urls.ws);
        state.channel = 'ws';

        ws.onopen = () => {
          debugLog('WebSocket connected');
          attempts = 0;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data || '{}');
            handleTimestamp(state, data?.ts);
          } catch (error) {
            warnLog('parse error:', error?.message || error);
          }
        };

        const handleClose = () => {
          if (state.channel !== 'ws') return;
          try {
            ws.close();
          } catch {
            /* noop */
          }
          if (attempts >= MAX_WS_ATTEMPTS) {
            startSSE(state, urls);
            return;
          }
          warnLog('WebSocket closed, retrying...');
          setTimeout(connect, WS_RETRY_DELAY);
        };

        ws.onclose = handleClose;
        ws.onerror = handleClose;
      } catch (error) {
        if (attempts >= MAX_WS_ATTEMPTS) {
          startSSE(state, urls);
          return;
        }
        warnLog('connect error, retrying:', error?.message || error);
        setTimeout(connect, WS_RETRY_DELAY);
      }
    }

    connect();
  }

  // Initialize live reload
  const urls = inferLiveUrls();
  const state = {
    channel: null,
    last: 0,
    reloading: false,
    pollTimer: null,
  };

  startWebSocket(state, urls);
})();
