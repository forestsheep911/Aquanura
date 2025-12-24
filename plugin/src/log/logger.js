/**
 * Plugin Logger
 *
 * Sends logs to the development server for AI-friendly debugging.
 * In production, this logger is stripped out by the build process.
 *
 * Based on: AI-Translate-Plugin log system
 */

(() => {
  // Check if we're in development mode
  const isDev = typeof __DEV_LOCAL_LOG_ENABLED__ !== 'undefined' && __DEV_LOCAL_LOG_ENABLED__;
  const devLogEndpoint =
    typeof __DEV_LOG_ENDPOINT__ !== 'undefined' ? __DEV_LOG_ENDPOINT__ : '/__devlog';
  const pluginVersion = typeof __PLUGIN_VERSION__ !== 'undefined' ? __PLUGIN_VERSION__ : 'unknown';

  /**
   * Get plugin ID from current page
   */
  function getPluginId() {
    try {
      const scripts = document.querySelectorAll('script[src*="/plug-in/"]');
      for (const script of scripts) {
        const match = script.src.match(/\/plug-in\/([a-z0-9]+)\//);
        if (match) return match[1];
      }
    } catch (e) {
      // Ignore
    }
    return 'unknown';
  }

  /**
   * Get current domain
   */
  function getDomain() {
    return window.location.hostname;
  }

  /**
   * Send log to development server
   */
  function sendLog(level, message, additionalData = {}) {
    if (!isDev) return;

    // Extract source from additionalData for prominent placement
    const { source, ...restData } = additionalData;

    const logData = {
      level: level,
      source: source || 'unknown', // Source file path for tracing
      message: typeof message === 'string' ? message : JSON.stringify(message),
      pluginId: getPluginId(),
      domain: getDomain(),
      pluginVersion: pluginVersion,
      timestamp: new Date().toISOString(),
      ...restData,
    };

    // Try to get dev server origin
    let devServerOrigin = '';
    try {
      // In development, scripts are loaded from localhost
      const scripts = document.querySelectorAll('script[src*="localhost"]');
      if (scripts.length > 0) {
        const url = new URL(scripts[0].src);
        devServerOrigin = url.origin;
      }
    } catch (e) {
      // If we can't determine the dev server origin, skip logging
      return;
    }

    if (!devServerOrigin) return;

    // Send to dev server
    fetch(devServerOrigin + devLogEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logData),
    }).catch((error) => {
      // Silently fail in production
      console.warn('Failed to send log:', error);
    });
  }

  /**
   * Logger API
   */
  const logger = {
    /**
     * Log to console AND local file
     */
    info: (message, data) => {
      console.log('[Plugin]', message, data || '');
      sendLog('INFO', message, data);
    },
    warn: (message, data) => {
      console.warn('[Plugin]', message, data || '');
      sendLog('WARN', message, data);
    },
    error: (message, data) => {
      console.error('[Plugin]', message, data || '');
      sendLog('ERROR', message, data);
    },
    debug: (message, data) => {
      console.debug('[Plugin]', message, data || '');
      sendLog('DEBUG', message, data);
    },
    /**
     * Log to local file ONLY (silent, no console output)
     * Use this for verbose/detailed logs to keep console clean
     */
    file: (message, data) => {
      sendLog('INFO', message, data);
    },
    fileWarn: (message, data) => {
      sendLog('WARN', message, data);
    },
    fileError: (message, data) => {
      sendLog('ERROR', message, data);
    },
    fileDebug: (message, data) => {
      sendLog('DEBUG', message, data);
    },
  };

  // Export to global scope
  window.PluginLogger = logger;

  // Show a friendly tip about local file logging in development mode
  if (isDev) {
    console.log(
      '%c💡 Tip: Logs are being saved to local file (logistics/log/dev.log). ' +
        'Consider reducing console output and reviewing the log file for a cleaner debugging experience.',
      'color: #4CAF50; font-style: italic;'
    );
  }
})();
