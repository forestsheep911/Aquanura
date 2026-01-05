import { createRoot } from 'react-dom/client';
import { App } from './App';

import { logger } from './logger';



const mountApp = () => {
    const headerSpace = kintone.app.getHeaderSpaceElement();
    if (!headerSpace) {
        // Not on a view with header space, or too early
        return;
    }

    if (!headerSpace.classList.contains('aquanura-mounted')) {
        logger.log('[Aquanura] Mounting React App...');
        headerSpace.classList.add('aquanura-mounted');
        try {
            const root = createRoot(headerSpace);
            root.render(<App />);
            logger.log('[Aquanura] React App mounted successfully');
        } catch (error) {
            logger.error('[Aquanura] Failed to mount React App:', error);
        }
    } else {
        logger.log('[Aquanura] React App already mounted');
    }
};

// 1. Listen for the event (standard flow)
kintone.events.on('app.record.index.show', (event) => {
    logger.log('[Aquanura] app.record.index.show event fired');
    mountApp();
    return event;
});

// 2. Initial check (in case script loads AFTER event fired)
// We add a small delay or check immediately?
// kintone.app.getHeaderSpaceElement() returns null if called before the page is ready.
// But if we are loaded late, it should ensure we catch it.
mountApp();
