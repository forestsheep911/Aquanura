/**
 * Kintone Plugin Template - Desktop View
 *
 * This is a simple example showing how to:
 * - Get plugin configuration
 * - Use the logger
 * - Manipulate the Kintone UI
 * - Use i18n for multi-language support
 */

import { t } from '../i18n/i18n.js';

((PLUGIN_ID) => {
  // Import logger if available
  const logger = window.PluginLogger || {
    info: (msg) => console.log('[Plugin]', msg),
    error: (msg) => console.error('[Plugin]', msg),
    file: () => {}, // Silent fallback for file-only logging
  };

  /**
   * Initialize plugin on record detail page
   */
  kintone.events.on(['app.record.detail.show'], (event) => {
    const config = kintone.plugin.app.getConfig(PLUGIN_ID);

    // Get the header space element
    const header = kintone.app.record.getHeaderMenuSpaceElement();

    if (!header) {
      logger.error('Header space element not found');
      return event;
    }

    // Create a simple text display
    const container = document.createElement('div');
    container.className = 'plugin-template-container';

    // Build the message: "Plugin running, your saved message is: xxxx"
    const statusText = t('desktop_pluginRunning');
    const messageText = config.message
      ? `${t('desktop_savedMessage')}${config.message}`
      : t('desktop_noMessage');

    container.innerHTML = `
      <div class="plugin-template-message">
        ${statusText}，${messageText}
      </div>
    `;

    header.appendChild(container);

    return event;
  });

  /**
   * Initialize plugin on record list page
   */
  kintone.events.on(['app.record.index.show'], (event) => {
    const config = kintone.plugin.app.getConfig(PLUGIN_ID);

    // Get the header space element for list view
    const header = kintone.app.getHeaderSpaceElement();

    if (!header) {
      logger.error('Header space element not found on list page');
      return event;
    }

    // Create a simple text display
    const container = document.createElement('div');
    container.className = 'plugin-template-container';

    // Build the message: "Plugin running, your saved message is: xxxx"
    const statusText = t('desktop_pluginRunning');
    const messageText = config.message
      ? `${t('desktop_savedMessage')}${config.message}`
      : t('desktop_noMessage');

    container.innerHTML = `
      <div class="plugin-template-message">
        ${statusText}，${messageText}
      </div>
    `;

    header.appendChild(container);

    return event;
  });

  // Log script load to local file only (with source file info)
  logger.file('Plugin script loaded successfully', { source: 'logic/desktop/desktop.js' });
})(kintone.$PLUGIN_ID);
