// =============================================
// МОДУЛЬ: АДАПТАЦИЯ ДЛЯ TELEGRAM MINI APP
// =============================================
// Отвечает за:
// - Корректную высоту вьюпорта (решение проблемы с 100vh)
// - Безопасные отступы (safe areas)
// - Обработку изменений размера (клавиатура, поворот)
// - Интеграцию с Telegram WebView API
// =============================================

/**
 * Инициализация адаптера для Telegram Mini App
 * Вызывается один раз при загрузке приложения
 */
export function initTelegramAdapter() {
  // 1. Устанавливаем корректную высоту вьюпорта
  setViewportHeight();
  
  // 2. Применяем отступы для безопасных зон
  applySafeAreas();
  
  // 3. ПРИНУДИТЕЛЬНО РАСШИРЯЕМ ПРИЛОЖЕНИЕ (НОВОЕ!)
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.expand();
  }
  
  // 4. Подписываемся на изменения размера окна
  window.addEventListener('resize', handleResize);
  
  // 5. Подписываемся на события Telegram WebView
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.onEvent('viewportChanged', handleViewportChange);
    applyTelegramTheme();
  }
  
  console.log('[Telegram Adapter] Инициализация завершена');
}

/**
 * Устанавливает CSS-переменную --vh с реальной высотой окна
 * Решает проблему с некорректным 100vh в Telegram
 */
function setViewportHeight() {
  // Получаем реальную высоту видимой области
  const vh = window.innerHeight * 0.01;
  
  // Устанавливаем CSS-переменную на корневой элемент
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  
  // Дополнительно: для старых браузеров
  document.documentElement.style.setProperty('--window-height', `${window.innerHeight}px`);
}

/**
 * Применяет безопасные отступы Telegram к html и body
 * Использует CSS-переменные от Telegram
 */
function applySafeAreas() {
  const webApp = window.Telegram?.WebApp;
  
  if (!webApp) {
    // Если Telegram WebApp не доступен, используем стандартные safe areas
    document.documentElement.style.setProperty('--tg-safe-area-inset-top', '0px');
    document.documentElement.style.setProperty('--tg-safe-area-inset-bottom', '0px');
    document.documentElement.style.setProperty('--tg-safe-area-inset-left', '0px');
    document.documentElement.style.setProperty('--tg-safe-area-inset-right', '0px');
    return;
  }
  
  // Если Telegram доступен, применяем его отступы
  // (Telegram сам устанавливает эти переменные через CSS)
  // Нам просто нужно убедиться, что они есть
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --tg-safe-area-inset-top: env(safe-area-inset-top, 0px);
      --tg-safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
      --tg-safe-area-inset-left: env(safe-area-inset-left, 0px);
      --tg-safe-area-inset-right: env(safe-area-inset-right, 0px);
      --tg-content-safe-area-inset-top: env(safe-area-inset-top, 0px);
      --tg-content-safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
    }
  `;
  document.head.appendChild(style);
}

/**
 * Обработчик изменения размера окна
 * Обновляет высоту вьюпорта
 */
function handleViewportChange() {
  setViewportHeight();
  
  if (window.Telegram?.WebApp) {
    // Принудительно расширяем при каждом изменении вьюпорта
    window.Telegram.WebApp.expand();
  }
}

/**
 * Применяет тему Telegram к приложению
 * Опционально: можно использовать для тёмной/светлой темы
 */
function applyTelegramTheme() {
  const theme = window.Telegram?.WebApp?.themeParams;
  
  if (!theme) return;
  
  // Применяем цвета темы Telegram
  const root = document.documentElement;
  
  // Фоновые цвета
  if (theme.bg_color) {
    root.style.setProperty('--tg-bg-color', theme.bg_color);
  }
  if (theme.secondary_bg_color) {
    root.style.setProperty('--tg-secondary-bg-color', theme.secondary_bg_color);
  }
  
  // Цвета текста
  if (theme.text_color) {
    root.style.setProperty('--tg-text-color', theme.text_color);
  }
  if (theme.hint_color) {
    root.style.setProperty('--tg-hint-color', theme.hint_color);
  }
  
  // Кнопки
  if (theme.button_color) {
    root.style.setProperty('--tg-button-color', theme.button_color);
  }
  if (theme.button_text_color) {
    root.style.setProperty('--tg-button-text-color', theme.button_text_color);
  }
  
  console.log('[Telegram Adapter] Тема применена:', theme);
}

/**
 * Вспомогательная функция: получить текущую высоту вьюпорта
 * Может использоваться в других модулях
 */
export function getViewportHeight() {
  return window.innerHeight;
}

/**
 * Вспомогательная функция: получить текущую ширину вьюпорта
 * Может использоваться в других модулях
 */
export function getViewportWidth() {
  return window.innerWidth;
}

/**
 * Вспомогательная функция: проверить, открыта ли клавиатура
 */
export function isKeyboardOpen() {
  // В Telegram Mini App клавиатура считается открытой,
  // если высота вьюпорта меньше, чем обычно
  const vh = window.innerHeight;
  // Если высота меньше 60% от ширины * 1.5 (примерно) - вероятно клавиатура открыта
  // Это эвристика, но для Telegram работает
  return vh < window.innerWidth * 0.6;
}

// =============================================
// АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ (если нужно)
// =============================================

// Если вы хотите, чтобы адаптер инициализировался автоматически
// при импорте, можно добавить:
// initTelegramAdapter();
// 
// Но лучше вызывать его явно из main.js