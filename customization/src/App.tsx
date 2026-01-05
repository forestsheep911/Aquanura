import { useState } from 'react';
import './App.css';
import { useI18n } from './i18n';

export const App = () => {
    const [count, setCount] = useState(0);
    const { t } = useI18n();

    return (
        <div className="aquanura-card">
            <div className="aquanura-status-indicator"></div>
            <div className="aquanura-content">
                <div className="aquanura-header">
                    <h2 className="aquanura-title">{t('title')}</h2>
                    <span className="aquanura-badge">{t('badge')}</span>
                </div>
                <p className="aquanura-description">
                    {t('description')} <br />
                    {t('counter')} <span className="aquanura-counter">{count}</span>
                </p>
            </div>
            <button
                className="aquanura-action-btn"
                onClick={() => setCount((c) => c + 1)}
            >
                {t('button')}
            </button>
        </div>
    );
};
