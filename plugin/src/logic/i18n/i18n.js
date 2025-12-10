/**
 * i18n Module - Internationalization Support
 *
 * Provides centralized translation management for the plugin.
 * Based on: AI-Translate-Plugin i18n system
 */

import en from './en.json';
import es from './es.json';
import ja from './ja.json';
import ptBR from './pt-BR.json';
import th from './th.json';
import zhHant from './zh-Hant.json';
import zh from './zh.json';

const languageResources = {
  en,
  es,
  ja,
  'pt-BR': ptBR,
  th,
  zh,
  'zh-Hant': zhHant,
};

/**
 * Get Kintone current user's language setting
 */
function getUserLanguage() {
  const user = kintone.getLoginUser();
  return user.language || 'en';
}

/**
 * Normalize language code to match available resources
 */
function normalizeLanguage(lang = 'en') {
  const lower = String(lang).toLowerCase();

  // Handle Chinese variants
  if (lower.startsWith('zh')) {
    if (
      lower.includes('hant') ||
      lower.includes('tw') ||
      lower.includes('hk') ||
      lower.includes('mo')
    ) {
      return 'zh-Hant';
    }
    return 'zh';
  }

  if (lower.startsWith('pt')) {
    if (lower.includes('br')) {
      return 'pt-BR';
    }
    return 'pt-BR';
  }

  // Exact match
  if (languageResources[lower]) {
    return lower;
  }

  // Try base language (e.g., 'en-US' -> 'en')
  const base = lower.split('-')[0];
  if (languageResources[base]) {
    return base;
  }

  // Fallback to English
  return 'en';
}

/**
 * Get translation dictionary for a language
 */
function getDictionary(lang) {
  const normalizedLang = normalizeLanguage(lang);
  return languageResources[normalizedLang] || languageResources.en;
}

// Initialize with current user's language
const currentLang = getUserLanguage();
let dict = getDictionary(currentLang);

/**
 * Translation function
 * @param {string} key - Translation key
 * @param {Object} params - Optional parameters for interpolation
 * @returns {string} Translated text
 *
 * @example
 * t('greeting') // "Hello!"
 * t('welcome', { name: 'John' }) // "Welcome, John!"
 */
export function t(key, params) {
  let str = dict[key] || key;

  // Parameter interpolation
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`{${k}}`, 'g'), v);
    }
  }

  return str;
}

/**
 * Dynamically switch language
 * @param {string} lang - Language code
 * @returns {string} Previous language
 */
export function setLanguage(lang) {
  const prevLang = currentLang;
  dict = getDictionary(lang);
  return prevLang;
}

/**
 * Get current language
 * @returns {string} Current language code
 */
export function getCurrentLanguage() {
  return currentLang;
}
