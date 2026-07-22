import { AppState, els } from '../core/app.js';
import { showScreen } from '../core/navigation.js';
import { renderRegions, initIndicators } from '../components/regions.js';
import { renderNominals, updateTotal } from '../components/nominals.js';
import { initScrollDrag } from '../components/scroll.js';

// =============================================
// БЛОК: ОТКРЫТИЕ ДЕТАЛЕЙ СЕРВИСА
// =============================================

export async function openServiceDetails(serviceSlug) {
    try {
        AppState.currentServiceSlug = serviceSlug;
        AppState.currentRegionSlug = null;
        AppState.currentNominal = null;

        const services = await API.getServices();
        const service = services.find(s => s.slug === serviceSlug);
        if (!service) {
            console.error(`Сервис ${serviceSlug} не найден`);
            return;
        }

        els.detailIcon.src = `assets/icons/${service.icon}`;
        els.detailIcon.alt = service.name;
        els.detailName.textContent = service.name;
        els.instructionText.textContent = service.instruction || 'Инструкция по активации появится позже.';

        await loadRegions(serviceSlug);
        showScreen('screen-service-details');

    } catch (error) {
        console.error('Ошибка открытия сервиса:', error);
        alert('Не удалось загрузить данные сервиса. Попробуйте позже.');
    }
}

// =============================================
// БЛОК: ЗАГРУЗКА РЕГИОНОВ
// =============================================

export async function loadRegions(serviceSlug) {
    try {
        const regions = await API.getRegions(serviceSlug);
        AppState.allRegions = regions;

        if (!regions || regions.length === 0) {
            els.regionScroll.innerHTML = '<div style="padding:20px;color:rgba(255,255,255,0.3);font-size:18px;">Нет доступных регионов</div>';
            return;
        }

        renderRegions(regions);

        const firstRegion = regions[0];
        await selectRegion(firstRegion.slug);

    } catch (error) {
        console.error('Ошибка загрузки регионов:', error);
        els.regionScroll.innerHTML = '<div style="padding:20px;color:rgba(255,255,255,0.3);font-size:18px;">Ошибка загрузки регионов</div>';
    }
}

// =============================================
// БЛОК: ВЫБОР РЕГИОНА
// =============================================

export async function selectRegion(regionSlug) {
    try {
        AppState.currentRegionSlug = regionSlug;
        await loadNominals(AppState.currentServiceSlug, regionSlug);
    } catch (error) {
        console.error('Ошибка выбора региона:', error);
    }
}

// =============================================
// БЛОК: ЗАГРУЗКА НОМИНАЛОВ
// =============================================

export async function loadNominals(serviceSlug, regionSlug) {
    try {
        const nominals = await API.getNominals(serviceSlug, regionSlug);

        if (!nominals || nominals.length === 0) {
            els.nominalScroll.innerHTML = '<div style="padding:20px;color:rgba(255,255,255,0.3);font-size:18px;">Нет доступных номиналов</div>';
            updateTotal(null);
            return;
        }

        renderNominals(nominals);

    } catch (error) {
        console.error('Ошибка загрузки номиналов:', error);
        els.nominalScroll.innerHTML = '<div style="padding:20px;color:rgba(255,255,255,0.3);font-size:18px;">Ошибка загрузки номиналов</div>';
    }
}

// =============================================
// БЛОК: ВЫБОР НОМИНАЛА
// =============================================

export function selectNominal(nominal) {
    AppState.currentNominal = nominal;
    updateTotal(nominal);
}

// =============================================
// БЛОК: ОБРАБОТЧИК ОПЛАТЫ
// =============================================

export function initGiftPayment() {
    els.payBtn.addEventListener('click', async function() {
        if (this.classList.contains('disabled') || !AppState.currentNominal) return;

        let userId = null;
        if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
            userId = window.Telegram.WebApp.initDataUnsafe.user.id;
        }

        if (!userId) {
            alert('❌ Ошибка: не удалось определить пользователя');
            return;
        }

        try {
            this.textContent = 'Создание заказа...';
            this.disabled = true;

            const result = await API.createOrder({
                user_id: userId,
                product_id: AppState.currentNominal.id,
                product_name: `${AppState.currentNominal.amount} ${AppState.currentNominal.currency} - ${AppState.currentServiceSlug}`,
                product_slug: AppState.currentServiceSlug,
                region_slug: AppState.currentRegionSlug,
                quantity: 1,
                amount: AppState.currentNominal.price,
                currency: AppState.currentNominal.currency,
                note: {}
            });

            showToast('✅ Заказ успешно создан!');

            setTimeout(() => {
                if (window.Telegram?.WebApp) {
                    window.Telegram.WebApp.close();
                } else {
                    window.location.href = 'about:blank';
                }
            }, 500);

        } catch (error) {
            alert('❌ Ошибка: ' + error.message);
        } finally {
            this.textContent = 'Оплатить';
            this.disabled = false;
        }
    });
}