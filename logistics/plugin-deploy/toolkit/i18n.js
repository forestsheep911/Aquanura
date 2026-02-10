const os = require('node:os');

const RESOURCES = {
    en: {
        'vite.building': '[vite] 🔨 Building entry: {path}',
        'vite.packaging': '[vite] 📦 Packaging plugin...',
        'vite.manifest_valid': '[vite-dev] ✅ Manifest validation passed',
        'vite.hot_reload': '[vite-dev] 🔄 Hot reload enabled (WebSocket: wss://localhost:{port}/__live/ws)',
        'vite.port_ok': '[vite-dev] ✅ Port {port} available, starting normally',
        'vite.port_conflict_title': '[vite-dev] ⚠️  Port conflict detected:',
        'vite.port_conflict_expected': '[vite-dev] 🎯 Expected port: {port} (already in use)',
        'vite.port_conflict_switch': '[vite-dev] 🔄 Auto-switched to: {port}',
        'vite.port_conflict_ok': '[vite-dev] ✅ Plugin will automatically adapt to new port and re-upload to Kintone',
        'vite.spinner_building': 'Building plugin for you, please wait...',
        'vite.spinner_success': 'Build complete!',
        'vite.spinner_failed': 'Build failed...',
        'vite.server_info_title': '[vite-dev] 🌐 Dev server info:',
        'vite.server_https': '[vite-dev] 📡 HTTP/HTTPS: https://localhost:{port}',
        'vite.server_ws': '[vite-dev] 🔗 WebSocket: wss://localhost:{port}/__live/ws',
        'vite.server_log': '[vite-dev] 📝 Log endpoint: https://localhost:{port}/__devlog',
        'vite.server_static': '[vite-dev] 📁 Static assets: https://localhost:{port}/__static/',
        'vite.server_port_status': '[vite-dev] 🔧 Port status: {port} ({status})',
        'vite.server_port_ok': 'configured port available',
        'vite.server_port_fallback': 'auto-switched from {expected}',
        'vite.mode_lazy': '[vite-dev] 🐢 Lazy compilation mode enabled, quiet window {window} ({source})',
        'vite.mode_instant': '[vite-dev] ⚡ Instant compilation mode ({source})',
        'vite.lazy_hint': '[vite-dev] 💡 Tip: Press r to manually skip quiet window and rebuild immediately',
        'vite.manifest_reload_title': '[vite-dev] 📋 Manifest smart reload enabled:',
        'vite.manifest_reload_code': '[vite-dev]    Code change → Incremental build + hot update',
        'vite.manifest_reload_manifest': '[vite-dev]    manifest.json change → Repackage + auto-upload',
        'vite.instructions_full': '[vite-dev] 🔁 Press r to rebuild, m to re-upload manifest, q to quit, Ctrl+C also works',
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
        'vite.manifest_valid': '[vite-dev] ✅ Manifest 验证通过',
        'vite.hot_reload': '[vite-dev] 🔄 热重载已启用 (WebSocket: wss://localhost:{port}/__live/ws)',
        'vite.port_ok': '[vite-dev] ✅ 端口 {port} 可用，正常启动',
        'vite.port_conflict_title': '[vite-dev] ⚠️  端口冲突检测:',
        'vite.port_conflict_expected': '[vite-dev] 🎯 期望端口: {port} (已被占用)',
        'vite.port_conflict_switch': '[vite-dev] 🔄 自动切换到: {port}',
        'vite.port_conflict_ok': '[vite-dev] ✅ 插件将自动适配新端口并重新上传到Kintone',
        'vite.spinner_building': '正在为您构建插件，请稍候...',
        'vite.spinner_success': '构建完成！',
        'vite.spinner_failed': '构建遭遇了一些困难...',
        'vite.server_info_title': '[vite-dev] 🌐 开发服务器信息:',
        'vite.server_https': '[vite-dev] 📡 HTTP/HTTPS: https://localhost:{port}',
        'vite.server_ws': '[vite-dev] 🔗 WebSocket: wss://localhost:{port}/__live/ws',
        'vite.server_log': '[vite-dev] 📝 日志端点: https://localhost:{port}/__devlog',
        'vite.server_static': '[vite-dev] 📁 静态资源: https://localhost:{port}/__static/',
        'vite.server_port_status': '[vite-dev] 🔧 端口状态: {port} ({status})',
        'vite.server_port_ok': '配置端口可用',
        'vite.server_port_fallback': '从 {expected} 自动切换',
        'vite.mode_lazy': '[vite-dev] 🐢 懒编译模式已启用，静默窗口 {window} ({source})',
        'vite.mode_instant': '[vite-dev] ⚡ 即时编译模式 ({source})',
        'vite.lazy_hint': '[vite-dev] 💡 提示：按 r 可手动跳过静默期立即重建',
        'vite.manifest_reload_title': '[vite-dev] 📋 Manifest 智能重载已启用:',
        'vite.manifest_reload_code': '[vite-dev]    普通代码变化 → 增量编译 + 热更新',
        'vite.manifest_reload_manifest': '[vite-dev]    manifest.json 变化 → 重新打包 + 自动上传',
        'vite.instructions_full': '[vite-dev] 🔁 按 r 立即重建，按 m 重新上传 manifest，按 q 退出，Ctrl+C 也可中断',
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
        'vite.manifest_valid': '[vite-dev] ✅ Manifest 驗證通過',
        'vite.hot_reload': '[vite-dev] 🔄 熱重載已啟用 (WebSocket: wss://localhost:{port}/__live/ws)',
        'vite.port_ok': '[vite-dev] ✅ 埠號 {port} 可用，正常啟動',
        'vite.port_conflict_title': '[vite-dev] ⚠️  埠號衝突偵測:',
        'vite.port_conflict_expected': '[vite-dev] 🎯 期望埠號: {port} (已被佔用)',
        'vite.port_conflict_switch': '[vite-dev] 🔄 自動切換到: {port}',
        'vite.port_conflict_ok': '[vite-dev] ✅ 外掛將自動適配新埠號並重新上傳到Kintone',
        'vite.spinner_building': '正在為您建置外掛，請稍候...',
        'vite.spinner_success': '建置完成！',
        'vite.spinner_failed': '建置遭遇了一些困難...',
        'vite.server_info_title': '[vite-dev] 🌐 開發伺服器資訊:',
        'vite.server_https': '[vite-dev] 📡 HTTP/HTTPS: https://localhost:{port}',
        'vite.server_ws': '[vite-dev] 🔗 WebSocket: wss://localhost:{port}/__live/ws',
        'vite.server_log': '[vite-dev] 📝 日誌端點: https://localhost:{port}/__devlog',
        'vite.server_static': '[vite-dev] 📁 靜態資源: https://localhost:{port}/__static/',
        'vite.server_port_status': '[vite-dev] 🔧 埠號狀態: {port} ({status})',
        'vite.server_port_ok': '設定埠號可用',
        'vite.server_port_fallback': '從 {expected} 自動切換',
        'vite.mode_lazy': '[vite-dev] 🐢 懶編譯模式已啟用，靜默視窗 {window} ({source})',
        'vite.mode_instant': '[vite-dev] ⚡ 即時編譯模式 ({source})',
        'vite.lazy_hint': '[vite-dev] 💡 提示：按 r 可手動跳過靜默期立即重建',
        'vite.manifest_reload_title': '[vite-dev] 📋 Manifest 智慧重載已啟用:',
        'vite.manifest_reload_code': '[vite-dev]    一般代碼變化 → 增量編譯 + 熱更新',
        'vite.manifest_reload_manifest': '[vite-dev]    manifest.json 變化 → 重新打包 + 自動上傳',
        'vite.instructions_full': '[vite-dev] 🔁 按 r 立即重建，按 m 重新上傳 manifest，按 q 退出，Ctrl+C 也可中斷',
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
        'vite.manifest_valid': '[vite-dev] ✅ Manifest検証に合格しました',
        'vite.hot_reload': '[vite-dev] 🔄 ホットリロード有効 (WebSocket: wss://localhost:{port}/__live/ws)',
        'vite.port_ok': '[vite-dev] ✅ ポート {port} 使用可能、正常に起動します',
        'vite.port_conflict_title': '[vite-dev] ⚠️  ポート競合を検知:',
        'vite.port_conflict_expected': '[vite-dev] 🎯 期待ポート: {port} (使用中)',
        'vite.port_conflict_switch': '[vite-dev] 🔄 自動切替: {port}',
        'vite.port_conflict_ok': '[vite-dev] ✅ プラグインは新しいポートに自動適応し、Kintoneに再アップロードします',
        'vite.spinner_building': 'プラグインをビルド中です。お待ちください...',
        'vite.spinner_success': 'ビルド完了！',
        'vite.spinner_failed': 'ビルド中にエラーが発生しました...',
        'vite.server_info_title': '[vite-dev] 🌐 開発サーバー情報:',
        'vite.server_https': '[vite-dev] 📡 HTTP/HTTPS: https://localhost:{port}',
        'vite.server_ws': '[vite-dev] 🔗 WebSocket: wss://localhost:{port}/__live/ws',
        'vite.server_log': '[vite-dev] 📝 ログエンドポイント: https://localhost:{port}/__devlog',
        'vite.server_static': '[vite-dev] 📁 静的アセット: https://localhost:{port}/__static/',
        'vite.server_port_status': '[vite-dev] 🔧 ポート状態: {port} ({status})',
        'vite.server_port_ok': '設定ポート使用可能',
        'vite.server_port_fallback': '{expected} から自動切替',
        'vite.mode_lazy': '[vite-dev] 🐢 遅延コンパイルモード有効、静默ウィンドウ {window} ({source})',
        'vite.mode_instant': '[vite-dev] ⚡ 即時コンパイルモード ({source})',
        'vite.lazy_hint': '[vite-dev] 💡 ヒント：rキーを押すと静默期間をスキップして即座に再ビルドできます',
        'vite.manifest_reload_title': '[vite-dev] 📋 Manifestスマートリロード有効:',
        'vite.manifest_reload_code': '[vite-dev]    コード変更 → インクリメンタルビルド + ホット更新',
        'vite.manifest_reload_manifest': '[vite-dev]    manifest.json変更 → 再パッケージ + 自動アップロード',
        'vite.instructions_full': '[vite-dev] 🔁 r: 再ビルド, m: Manifest再アップロード, q: 終了, Ctrl+Cも可',
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
