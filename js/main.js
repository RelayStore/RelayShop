// =============================================
// БЛОК: ТОЧКА ВХОДА
// =============================================

import { AppState, els } from './core/app.js';
import { showScreen, initNavigation } from './core/navigation.js';
import { initScrollDrag, updateScrollIndicator } from './components/scroll.js';
import { renderRegions, initIndicators } from './components/regions.js';
import { renderNominals, updateTotal } from './components/nominals.js';
import { 
    openServiceDetails, 
    initGiftPayment,
    loadRegions,
    selectRegion,
    loadNominals,
    selectNominal
} from './screens/gift-cards.js';
import { 
    initSteam, 
    openSteamScreen, 
    steamState, 
    steamEl 
} from './screens/steam.js';
import { 
    openSubscription, 
    initSubscriptionHandlers,
    subState,
    subEl,
    selectSubRegion,
    selectDiscordType,
    selectSubPlanFromButton
} from './screens/subscriptions.js';

// =============================================
// ГЛОБАЛЬНЫЙ ДОСТУП ДЛЯ onclick (синхронно)
// =============================================

window.selectSubRegion = selectSubRegion;
window.selectDiscordType = selectDiscordType;
window.selectSubPlanFromButton = selectSubPlanFromButton;
window.openSubscription = openSubscription;

// =============================================
// ИНИЦИАЛИЗАЦИЯ
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Навигация
    initNavigation();
    
    // 2. Скроллеры
    setTimeout(() => {
        initScrollDrag('.scroll-container');
        initScrollDrag('.steam-quick-amounts');
    }, 100);
    
    // 3. Индикаторы
    initIndicators();
    window.addEventListener('resize', initIndicators);
    
    // 4. Gift Cards
    initGiftPayment();
    
    // 5. Steam
    if (document.getElementById('screen-steam')) {
        initSteam();
    }
    
    // 6. Подписки
    initSubscriptionHandlers();
    
    // 7. Steam Direct кнопка на главной
    const steamDirectBtn = document.getElementById('steam-direct-btn');
    if (steamDirectBtn) {
        steamDirectBtn.addEventListener('click', function() {
            openSteamScreen();
        });
    }
    
    // 8. Gift Cards иконки
    document.querySelectorAll('.gift-icon-wrapper').forEach(wrapper => {
        wrapper.addEventListener('click', function(e) {
            const service = this.dataset.service;
            if (service) {
                openServiceDetails(service);
            }
        });
    });
    
    // 9. Карточки сервисов
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', function() {
            const service = this.dataset.service;
            if (service) {
                openServiceDetails(service);
            }
        });
    });
    
    // 10. Кнопка "Показать все"
    document.querySelectorAll('.show-all-btn[data-screen="screen-services"]').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            try {
                const services = await API.getServices();
                const container = document.querySelector('.services-list');
                if (container) {
                    console.log('Сервисы загружены:', services);
                }
            } catch (error) {
                console.error('Ошибка загрузки сервисов:', error);
            }
            showScreen('screen-services');
        });
    });
    
    console.log('✅ Relay Mini App инициализирован');
    console.log('ℹ️ Данные загружаются из API');
});