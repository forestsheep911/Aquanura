# i18n Module - Internationalization

This directory contains the internationalization (i18n) system for the plugin, providing centralized translation management.

## 📁 Structure

```
i18n/
├── i18n.js        # Core i18n module
├── en.json        # English translations
├── es.json        # Spanish translations
├── ja.json        # Japanese translations
├── pt-BR.json     # Portuguese (Brazil) translations
├── th.json        # Thai translations
├── zh.json        # Simplified Chinese translations
├── zh-Hant.json   # Traditional Chinese translations
└── README.md      # This file
```

## 🚀 Usage

### Basic Translation

```javascript
import { t } from '../i18n/i18n.js';

// Simple translation
const greeting = t('desktop_greeting');
// => "Hello from Aquanura Template!" (if user language is English)

// With parameters
const welcome = t('welcome_message', { name: 'John' });
// => "Welcome, John!"
```

### Get Current Language

```javascript
import { getCurrentLanguage } from '../i18n/i18n.js';

const lang = getCurrentLanguage();
console.log(lang); // => "en", "ja", "zh", "pt-BR", "es", "th", etc.
```

### Dynamic Language Switching

```javascript
import { setLanguage, t } from '../i18n/i18n.js';

// Switch to Japanese
setLanguage('ja');
const greeting = t('desktop_greeting');
// => "Aquanuraテンプレートへようこそ！"
```

## 📝 Adding New Translations

### 1. Add Keys to JSON Files

Edit all language files with the same keys:

**en.json:**
```json
{
  "my_feature_title": "My Feature",
  "my_feature_description": "This is my new feature"
}
```

**ja.json:**
```json
{
  "my_feature_title": "マイ機能",
  "my_feature_description": "これは新しい機能です"
}
```

### 2. Use in Your Code

```javascript
import { t } from '../i18n/i18n.js';

const title = t('my_feature_title');
const description = t('my_feature_description');
```

## 🌍 Supported Languages

- **English (en)** - Default fallback language
- **Japanese (ja)** - 日本語
- **Simplified Chinese (zh)** - 简体中文
- **Traditional Chinese (zh-Hant)** - 繁體中文
- **Spanish (es)** - Español
- **Portuguese (pt-BR)** - Português do Brasil
- **Thai (th)** - ภาษาไทย

## 🔧 Language Detection

The system automatically detects the user's language from Kintone:

```javascript
kintone.getLoginUser().language
```

Language codes are normalized:
- `zh-CN`, `zh-Hans` → `zh` (Simplified Chinese)
- `zh-TW`, `zh-HK`, `zh-Hant`, `zh-MO` → `zh-Hant` (Traditional Chinese)
- `pt`, `pt-BR`, `pt-br` → `pt-BR` (Portuguese - Brazil)
- Unknown languages → `en` (English fallback)

## 💡 Best Practices

### 1. Naming Convention

Use descriptive, hierarchical keys:

```javascript
// ✅ Good
"desktop_greeting"
"config_saveButton"
"error_networkTimeout"

// ❌ Bad
"greeting"
"button1"
"error"
```

### 2. Parameter Interpolation

Use placeholders for dynamic content:

```json
{
  "record_count": "Found {count} records",
  "user_welcome": "Welcome back, {username}!"
}
```

```javascript
t('record_count', { count: 42 });
// => "Found 42 records"

t('user_welcome', { username: 'Alice' });
// => "Welcome back, Alice!"
```

### 3. Keep Translations in Sync

When adding a new key, add it to **all** language files to avoid missing translations.

### 4. Use Semantic Keys

Keys should describe the content, not the location:

```javascript
// ✅ Good
t('error_invalidInput')
t('button_save')

// ❌ Bad
t('page1_text3')
t('btn_2')
```

## 🔍 Debugging

If a translation is missing, the key itself will be returned:

```javascript
t('nonexistent_key');
// => "nonexistent_key" (not translated)
```

This makes it easy to spot missing translations during development.

## 🎯 Example: Adding a New Feature

1. **Add translations to all JSON files:**

```json
// en.json
{
  "export_title": "Export Data",
  "export_button": "Export to CSV",
  "export_success": "Data exported successfully!"
}

// ja.json, zh.json, zh-Hant.json (add similar entries)
```

2. **Use in your code:**

```javascript
import { t } from '../i18n/i18n.js';

function createExportButton() {
  const button = document.createElement('button');
  button.textContent = t('export_button');
  button.onclick = () => {
    exportData();
    alert(t('export_success'));
  };
  return button;
}
```

## 📚 Related Documentation

- [Kintone Plugin Development Guide](../../../../docs/DEVELOPMENT.md)
- [Configuration Page Internationalization](../config/config.js)
- [Desktop View Internationalization](../desktop/desktop.js)

