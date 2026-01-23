const os = require('node:os');

const RESOURCES = {
    en: {
        'vite.building': '[vite] 🔨 Building entry: {path}',
        'vite.packaging': '[vite] 📦 Packaging plugin...',
        'vite.started': '[vite-dev] ✅ Dev server started (port: {port}, log file: {logFile})',
        'vite.mode': '[vite-dev] Current compilation mode: {mode}',
        'vite.instructions': '[vite-dev] 🔁 Press r to rebuild JS, u to full build & upload, q to quit',
        'vite.rebuild_manual_js': '[vite-dev] 🔁 Rebuild JS triggered...',
        'vite.rebuild_manual_full': '[vite-dev] 📋 Full rebuild & upload triggered...',
        'vite.shutdown': '\n[vite-dev] Shutting down dev server...',
        'vite.manifest_change': '[vite-dev] 📋 Manifest change detected: {path}',
        'kintone.uploading': 'Uploading {name}...',
        'kintone.success': 'Plugin update successful:',
        'kintone.success_install': 'Plugin install successful:',
        'kintone.id': '- ID: {id}',
        'kintone.version': '- Version: {version}',
    },
    'zh-CN': {
        'vite.building': '[vite] 🔨 正在构建入口: {path}',
        'vite.packaging': '[vite] 📦 正在打包插件...',
        'vite.started': '[vite-dev] ✅ 开发服务器已启动 (端口: {port}, 日志: {logFile})',
        'vite.mode': '[vite-dev] 当前编译模式: {mode}',
        'vite.instructions': '[vite-dev] 🔁 按 r 重建 JS，按 u 全量构建并上传，按 q 退出',
        'vite.rebuild_manual_js': '[vite-dev] 🔁 已触发 JS 重建...',
        'vite.rebuild_manual_full': '[vite-dev] 📋 已触发全量构建与上传...',
        'vite.shutdown': '\n[vite-dev] 正在关闭开发服务器...',
        'vite.manifest_change': '[vite-dev] 📋 检测到 Manifest 变更: {path}',
        'kintone.uploading': '正在上传 {name}...',
        'kintone.success': '插件更新成功:',
        'kintone.success_install': '插件安装成功:',
        'kintone.id': '- ID: {id}',
        'kintone.version': '- 版本: {version}',
    },
    'zh-TW': {
        'vite.building': '[vite] 🔨 正在建置入口: {path}',
        'vite.packaging': '[vite] 📦 正在打包插件...',
        'vite.started': '[vite-dev] ✅ 開發伺服器已啟動 (埠號: {port}, 日誌: {logFile})',
        'vite.mode': '[vite-dev] 當前編譯模式: {mode}',
        'vite.instructions': '[vite-dev] 🔁 按 r 重建 JS，按 u 全量建置並上傳，按 q 退出',
        'vite.rebuild_manual_js': '[vite-dev] 🔁 已觸發 JS 重建...',
        'vite.rebuild_manual_full': '[vite-dev] 📋 已觸發全量建置與上傳...',
        'vite.shutdown': '\n[vite-dev] 正在關閉開發伺服器...',
        'vite.manifest_change': '[vite-dev] 📋 偵測到 Manifest 變更: {path}',
        'kintone.uploading': '正在上傳 {name}...',
        'kintone.success': '插件更新成功:',
        'kintone.success_install': '插件安裝成功:',
        'kintone.id': '- ID: {id}',
        'kintone.version': '- 版本: {version}',
    },
    'ja': {
        'vite.building': '[vite] 🔨 エントリーをビルド中: {path}',
        'vite.packaging': '[vite] 📦 プラグインをパッケージ化中...',
        'vite.started': '[vite-dev] ✅ 開発サーバーが起動しました (ポート: {port}, ログ: {logFile})',
        'vite.mode': '[vite-dev] 現在のコンパイルモード: {mode}',
        'vite.instructions': '[vite-dev] 🔁 r: JS再ビルド, u: 完全ビルド＆アップロード, q: 終了',
        'vite.rebuild_manual_js': '[vite-dev] 🔁 JS再ビルドを開始します...',
        'vite.rebuild_manual_full': '[vite-dev] 📋 完全ビルド＆アップロードを開始します...',
        'vite.shutdown': '\n[vite-dev] 開発サーバーを終了します...',
        'vite.manifest_change': '[vite-dev] 📋 Manifestの変更を検知しました: {path}',
        'kintone.uploading': '{name} をアップロード中...',
        'kintone.success': 'プラグインを更新しました:',
        'kintone.success_install': 'プラグインをインストールしました:',
        'kintone.id': '- ID: {id}',
        'kintone.version': '- バージョン: {version}',
    }
};

function detectLanguage() {
    // 1. CLI Argument --lang=xx
    const argv = process.argv;
    for (const arg of argv) {
        if (arg.startsWith('--lang=')) {
            return arg.split('=')[1];
        }
    }

    // 2. Env Var
    if (process.env.DEV_LANG) {
        return process.env.DEV_LANG;
    }

    // 3. System Locale
    try {
        const sysLocale = Intl.DateTimeFormat().resolvedOptions().locale;
        if (sysLocale) return sysLocale;
    } catch (e) { }

    if (process.env.LANG) {
        return process.env.LANG.split('.')[0].replace('_', '-');
    }

    return 'en';
}

function normalizeLang(lang) {
    const l = String(lang).toLowerCase();
    if (l.startsWith('zh')) {
        if (l.includes('tw') || l.includes('hk') || l.includes('hant')) return 'zh-TW';
        return 'zh-CN';
    }
    if (l.startsWith('ja') || l === 'jp') return 'ja';
    return 'en';
}

class I18n {
    constructor() {
        this.lang = normalizeLang(detectLanguage());
        this.resources = RESOURCES;
    }

    t(key, params = {}) {
        const dict = this.resources[this.lang] || this.resources['en'];
        let str = dict[key] || this.resources['en'][key] || key;

        for (const [k, v] of Object.entries(params)) {
            str = str.replace(`{${k}}`, v);
        }
        return str;
    }
}

module.exports = new I18n();
