import { useState, useEffect } from 'react';

// Kintone supported languages: ja, en, zh, zh-TW, es, pt-BR, th
type Language = 'ja' | 'en' | 'zh' | 'zh-TW' | 'es' | 'pt-BR' | 'th';

const messages: Record<Language, Record<string, string>> = {
    en: {
        title: 'Aquanura Environment',
        badge: 'Dev Mode',
        description: 'System is active and monitoring.',
        counter: 'Interaction count:',
        button: 'Verify Response'
    },
    ja: {
        title: 'Aquanura 開発環境',
        badge: '開発モード',
        description: 'システムは正常に稼働し、監視を行っています。',
        counter: 'インタラクション回数:',
        button: '応答確認'
    },
    zh: {
        title: 'Aquanura 开发环境',
        badge: '开发模式',
        description: '系统运行正常，监控中。',
        counter: '交互次数:',
        button: '验证响应'
    },
    'zh-TW': {
        title: 'Aquanura 開發環境',
        badge: '開發模式',
        description: '系統運作正常，監控中。',
        counter: '交互次數:',
        button: '驗證響應'
    },
    es: {
        title: 'Entorno Aquanura',
        badge: 'Modo Dev',
        description: 'El sistema está activo y monitoreando.',
        counter: 'Recuento de interacciones:',
        button: 'Verificar Respuesta'
    },
    'pt-BR': {
        title: 'Ambiente Aquanura',
        badge: 'Modo Dev',
        description: 'O sistema está ativo e monitorando.',
        counter: 'Contagem de interações:',
        button: 'Verificar Resposta'
    },
    th: {
        title: 'สภาพแวดล้อม Aquanura',
        badge: 'โหมดนักพัฒนา',
        description: 'ระบบกำลังทำงานและตรวจสอบอยู่',
        counter: 'จำนวนการโต้ตอบ:',
        button: 'ตรวจสอบการตอบสนอง'
    }
};

export const useI18n = () => {
    const [language, setLanguage] = useState<Language>('en');

    useEffect(() => {
        try {
            // Kintone's user language setting
            const user = kintone.getLoginUser();
            const lang = user.language as string;

            // Check exact match first
            if (lang in messages) {
                setLanguage(lang as Language);
            }
            // Handle cases where 'zh' might be returned for 'zh-CN' etc if Kintone changes spec, 
            // but currently Kintone returns precise codes.
        } catch (e) {
            console.warn('Failed to detect Kintone language, falling back to English.');
        }
    }, []);

    const t = (key: keyof typeof messages['en']) => {
        // Fallback to English if translation missing
        return messages[language]?.[key] || messages['en'][key];
    };

    return { t, language };
};
