/**
 * Kintone Plugin Template - Configuration Page
 *
 * This page allows users to configure the plugin settings with i18n support.
 */

import { t } from '../i18n/i18n.js';

((PLUGIN_ID) => {
  const config = kintone.plugin.app.getConfig(PLUGIN_ID);

  /**
   * Apply i18n to page
   */
  function applyI18n() {
    for (const el of document.querySelectorAll('[data-i18n]')) {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    }

    for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    }
  }

  /**
   * Initialize configuration page
   */
  function init() {
    // Apply i18n
    applyI18n();

    // Set current values
    document.getElementById('message').value = config.message || '';

    // Setup event handlers
    document.getElementById('submit').addEventListener('click', saveConfig);
    document.getElementById('cancel').addEventListener('click', cancel);
  }

  /**
   * Save configuration
   */
  function saveConfig() {
    const message = document.getElementById('message').value;

    const newConfig = {
      message,
    };

    kintone.plugin.app.setConfig(newConfig, () => {
      alert(t('config_saveSuccess'));
      window.location.href = `/k/admin/app/flow?app=${kintone.app.getId()}`;
    });
  }

  /**
   * Cancel configuration
   */
  function cancel() {
    window.location.href = `/k/admin/app/${kintone.app.getId()}/plugin/`;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(kintone.$PLUGIN_ID);
