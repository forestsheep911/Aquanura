/**
 * Live Reload Client
 *
 * Automatically reloads the page when source files change during development.
 * Based on: AI-Translate-Plugin live-reload system
 *
 * Connection fallback chain: WebSocket -> Polling (skip SSE due to auto-reconnect issues)
 */

(() => {
  const MAX_WS_ATTEMPTS = 1;
  const WS_RETRY_DELAY = 800;

  // Backoff configuration for connection failures
  const MAX_CONSECUTIVE_FAILURES = 8; // Stop retrying after this many failures
  const INITIAL_POLL_INTERVAL = 1000; // Start with 1 second
  const MAX_BACKOFF_INTERVAL = 60000; // Max 60 seconds between retries
  const BACKOFF_MULTIPLIER = 2; // Exponential backoff factor

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
    const result = { ws: null, poll: null };
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
   * Calculate backoff interval with exponential growth
   */
  function calculateBackoffInterval(failures) {
    const interval = INITIAL_POLL_INTERVAL * Math.pow(BACKOFF_MULTIPLIER, failures);
    return Math.min(interval, MAX_BACKOFF_INTERVAL);
  }

  /**
   * Stop all live reload activity
   */
  function stopLiveReload(state, reason) {
    state.stopped = true;
    if (state.pollTimer) {
      clearTimeout(state.pollTimer);
      state.pollTimer = null;
    }
    // Only log once when stopping
    if (!state.stoppedLogged) {
      state.stoppedLogged = true;
      console.info(
        `[live-reload] ${reason} Live reload disabled. Refresh the page after restarting the dev server.`
      );
    }
  }

  /**
   * Silent fetch that suppresses network errors from appearing in console
   */
  async function silentFetch(url, options) {
    try {
      return await fetch(url, options);
    } catch {
      // Silently swallow network errors to prevent console spam
      return null;
    }
  }

  /**
   * Fallback: Polling mode with exponential backoff
   */
  function startPolling(state, pollUrl) {
    if (!pollUrl) {
      stopLiveReload(state, 'No poll URL available.');
      return;
    }
    if (state.stopped) return;
    if (state.pollingActive) return; // Prevent multiple polling loops

    warnLog('fallback to polling mode');
    state.channel = 'poll';
    state.pollingActive = true;

    async function poll() {
      if (state.stopped) return;

      const resp = await silentFetch(pollUrl, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
      });

      if (resp && resp.ok) {
        // Success - reset failure counter and use normal interval
        state.consecutiveFailures = 0;
        try {
          const data = await resp.json();
          handleTimestamp(state, data?.ts);
        } catch {
          /* ignore parse errors */
        }
        if (!state.stopped) {
          state.pollTimer = setTimeout(poll, INITIAL_POLL_INTERVAL);
        }
      } else {
        // Connection failed or no response - apply backoff
        state.consecutiveFailures += 1;

        if (state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          stopLiveReload(
            state,
            `Dev server offline (${state.consecutiveFailures} failed attempts).`
          );
          return;
        }

        // Schedule next poll with exponential backoff
        const nextInterval = calculateBackoffInterval(state.consecutiveFailures);
        debugLog(
          `Poll failed (${state.consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}), ` +
            `next retry in ${Math.round(nextInterval / 1000)}s`
        );

        if (!state.stopped) {
          state.pollTimer = setTimeout(poll, nextInterval);
        }
      }
    }

    // Start polling
    poll();
  }

  /**
   * Primary mode: WebSocket connection
   * Note: We skip SSE entirely because EventSource has auto-reconnect behavior
   * that cannot be disabled and causes console spam when server is down.
   */
  function startWebSocket(state, urls) {
    if (state.stopped) return;
    if (!urls.ws) {
      warnLog('Unable to infer WebSocket endpoint');
      startPolling(state, urls.poll);
      return;
    }
    debugLog('connect ->', urls.ws);
    let attempts = 0;

    function connect() {
      if (state.stopped) return;
      attempts += 1;
      try {
        const ws = new WebSocket(urls.ws);
        state.channel = 'ws';

        ws.onopen = () => {
          debugLog('WebSocket connected');
          attempts = 0;
          state.consecutiveFailures = 0; // Reset global failure count on success
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
          if (state.stopped) return;
          try {
            ws.close();
          } catch {
            /* noop */
          }

          state.consecutiveFailures += 1;

          if (attempts >= MAX_WS_ATTEMPTS) {
            // Fallback directly to polling (skip SSE)
            startPolling(state, urls.poll);
            return;
          }
          warnLog('WebSocket closed, retrying...');
          setTimeout(connect, WS_RETRY_DELAY);
        };

        ws.onclose = handleClose;
        ws.onerror = handleClose;
      } catch (error) {
        state.consecutiveFailures += 1;
        if (attempts >= MAX_WS_ATTEMPTS) {
          startPolling(state, urls.poll);
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
    consecutiveFailures: 0,
    stopped: false,
    stoppedLogged: false,
    pollingActive: false,
  };

  startWebSocket(state, urls);
})();
