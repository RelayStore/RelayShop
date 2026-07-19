/**
 * =============================================
 * БЛОК: ИНТЕГРАЦИЯ С TELEGRAM WEBAPP
 * =============================================
 */

export const TelegramApp = {
    tg: null,
    isAvailable: false,
    isInitialized: false
};

/**
 * Инициализация Telegram WebApp
 */
export function initTelegram() {
    try {
        if (typeof window.Telegram === 'undefined' || !window.Telegram.WebApp) {
            console.warn('⚠️ Telegram WebApp SDK не загружен. Работаем в режиме браузера.');
            TelegramApp.isAvailable = false;
            TelegramApp.isInitialized = true;
            return;
        }

        const tg = window.Telegram.WebApp;
        TelegramApp.tg = tg;
        TelegramApp.isAvailable = true;

        tg.ready();
        tg.expand();

        updateViewportHeight(tg);

        tg.onEvent('viewportChanged', function() {
            updateViewportHeight(tg);
        });

        applyTheme(tg);

        console.log('✅ Telegram WebApp инициализирован');
        TelegramApp.isInitialized = true;
    } catch (error) {
        console.error('❌ Ошибка инициализации Telegram:', error);
        TelegramApp.isAvailable = false;
        TelegramApp.isInitialized = true;
    }
}

function updateViewportHeight(tg) {
    const root = document.documentElement;
    if (tg.viewportHeight) {
        root.style.setProperty('--tg-viewport-height', tg.viewportHeight + 'px');
    }
    if (tg.viewportStableHeight) {
        root.style.setProperty('--tg-stable-height', tg.viewportStableHeight + 'px');
    }
}

function applyTheme(tg) {
    if (!tg.themeParams) return;
    const root = document.documentElement;
    const p = tg.themeParams;

    if (p.bg_color) {
        root.style.setProperty('--tg-bg', p.bg_color);
        const app = document.getElementById('app');
        if (app) {
            app.style.background = `radial-gradient(circle at 30% 10%, ${adjustColor(p.bg_color, 20)}, ${p.bg_color} 80%)`;
        }
    }
    if (p.text_color) {
        root.style.setProperty('--tg-text', p.text_color);
    }
    if (p.hint_color) {
        root.style.setProperty('--tg-text-secondary', p.hint_color);
    }
    if (p.secondary_bg_color) {
        root.style.setProperty('--tg-card', p.secondary_bg_color);
    }
}

function adjustColor(color, percent) {
    if (!color) return color;
    if (color.startsWith('#')) {
        let r = parseInt(color.slice(1, 3), 16);
        let g = parseInt(color.slice(3, 5), 16);
        let b = parseInt(color.slice(5, 7), 16);
        r = Math.min(255, Math.max(0, r + percent));
        g = Math.min(255, Math.max(0, g + percent));
        b = Math.min(255, Math.max(0, b + percent));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    return color;
}

/**
 * Показать уведомление через Telegram или alert
 */
export function showTelegramAlert(message, callback) {
    if (TelegramApp.isAvailable && TelegramApp.tg.showAlert) {
        TelegramApp.tg.showAlert(message, callback);
    } else {
        alert(message);
        if (callback) callback();
    }
}

/**
 * Показать подтверждение через Telegram или confirm
 */
export function showTelegramConfirm(message, callback) {
    if (TelegramApp.isAvailable && TelegramApp.tg.showConfirm) {
        TelegramApp.tg.showConfirm(message, callback);
    } else {
        const result = confirm(message);
        if (callback) callback(result);
    }
}

/**
 * Показать главную кнопку Telegram
 */
export function showMainButton(text, callback) {
    if (!TelegramApp.isAvailable || !TelegramApp.tg.MainButton) return;
    const btn = TelegramApp.tg.MainButton;
    btn.setText(text);
    btn.onClick(callback);
    btn.show();
}

/**
 * Скрыть главную кнопку Telegram
 */
export function hideMainButton() {
    if (!TelegramApp.isAvailable || !TelegramApp.tg.MainButton) return;
    TelegramApp.tg.MainButton.hide();
}

// Автоинициализация
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTelegram);
} else {
    initTelegram();
}