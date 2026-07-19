import { showScreen } from '../core/navigation.js';
import { initScrollDrag, updateScrollIndicator } from '../components/scroll.js';


// =============================================
// БЛОК: ПОДПИСКИ (ОТДЕЛЬНЫЙ ЭКРАН)
// =============================================

const SUBSCRIPTION_TYPES = {
    'discord': 'discord',
    'netflix': 'subscription_gift',
    'spotify': 'subscription_plan'
};

const SERVICE_KEYWORDS = {
    'netflix': ['netflix'],
    'spotify': ['spotify'],
    'discord': ['discord']
};

export let subState = {
    currentService: null,
    currentRegion: null,
    currentPlan: null,
    currentDiscordType: null,
    allProducts: [],
    regions: [],
    plans: [],
    isProcessing: false
};

export const subEl = {
    content: document.getElementById('sub-content'),
    headerIcons: document.getElementById('sub-header-icons'),
    backBtn: document.querySelector('#screen-subscriptions .back-btn')
};

// =============================================
// ОТКРЫТИЕ ЭКРАНА ПОДПИСОК
// =============================================

export async function openSubscription(serviceSlug) {
    try {
        subState.currentService = serviceSlug;
        subState.currentRegion = null;
        subState.currentPlan = null;
        subState.currentDiscordType = null;
        subState.allProducts = [];
        subState.regions = [];
        subState.plans = [];
        
        activateSubHeaderIcon(serviceSlug);
        await loadSubscriptionData(serviceSlug);
        showScreen('screen-subscriptions');
        
    } catch (error) {
        console.error('Ошибка открытия подписки:', error);
        alert('Не удалось загрузить данные. Попробуйте позже.');
    }
}

function activateSubHeaderIcon(serviceSlug) {
    const wrappers = subEl.headerIcons.querySelectorAll('.sub-header-icon-wrapper');
    wrappers.forEach(w => {
        w.classList.toggle('active', w.dataset.service === serviceSlug);
    });
}

async function loadSubscriptionData(serviceSlug) {
    const service = await getServiceConfig(serviceSlug);
    if (!service) {
        console.error(`Сервис ${serviceSlug} не найден`);
        return;
    }
    
    const searchQuery = service.search_query || serviceSlug;
    let products = await API.searchProducts(searchQuery, 100);
    
    products = filterProductsByService(products, serviceSlug);
    
    subState.allProducts = products;
    
    if (!products || products.length === 0) {
        subEl.content.innerHTML = '<div style="padding:40px;text-align:center;color:rgba(255,255,255,0.3);">Нет доступных товаров</div>';
        return;
    }
    
    const type = SUBSCRIPTION_TYPES[serviceSlug] || 'subscription_gift';
    
    if (type === 'discord') {
        renderDiscordContent(products);
    } else if (type === 'subscription_plan') {
        renderSubscriptionPlanContent(products);
    } else {
        renderGiftContent(products);
    }
}

async function getServiceConfig(slug) {
    const services = await API.getServices();
    return services.find(s => s.slug === slug);
}

function renderGiftContent(products) {
    const regions = extractRegions(products);
    subState.regions = regions;
    
    if (regions.length === 0) {
        subEl.content.innerHTML = '<div style="padding:40px;text-align:center;color:rgba(255,255,255,0.3);">Нет доступных регионов</div>';
        return;
    }
    
    const plansByRegion = groupProductsByRegion(products);
    
    let html = `
        <div class="selection-block">
            <div class="block-label">🌍 Регион:</div>
            <div class="scroll-wrapper">
                <div class="scroll-container" id="sub-region-scroll">
    `;
    
    regions.forEach((region, index) => {
        const flag = getFlagEmoji(region.country_code);
        html += `
            <button class="region-btn ${index === 0 ? 'active' : ''}" 
                    data-region="${region.country_code}"
                    onclick="selectSubRegion('${region.country_code}')">
                ${flag} ${region.name}
            </button>
        `;
    });
    
    html += `
                </div>
            </div>
            <div class="scroll-indicator" id="sub-region-indicator"></div>
        </div>
        <div class="selection-block">
            <div class="block-label">💰 Номинал:</div>
            <div class="scroll-wrapper">
                <div class="scroll-container" id="sub-plan-scroll">
    `;
    
    const firstRegion = regions[0];
    const firstPlans = deduplicatePlans(plansByRegion[firstRegion.country_code] || []);
    html += renderPlanButtons(firstPlans);
    
    html += `
                </div>
            </div>
            <div class="scroll-indicator" id="sub-plan-indicator"></div>
        </div>
        <div class="total-block">
            <div class="total-price" id="sub-total-price">Итого: 0 руб</div>
            <button class="pay-btn disabled" id="sub-pay-btn">Оплатить</button>
        </div>
        <div class="instruction-block">
            <div class="instruction-title">📖 Инструкция по активации</div>
            <div class="instruction-text" id="sub-instruction-text">
                После оплаты вы получите код для пополнения баланса Netflix.
            </div>
        </div>
    `;
    
    subEl.content.innerHTML = html;
    
    if (firstPlans.length > 0) {
        selectSubPlan(firstPlans[0]);
    }
    
    setTimeout(() => {
        initScrollDrag('#sub-region-scroll');
        initScrollDrag('#sub-plan-scroll');
        updateScrollIndicator('sub-region-scroll', 'sub-region-indicator');
        updateScrollIndicator('sub-plan-scroll', 'sub-plan-indicator');
    }, 100);
}

function renderSubscriptionPlanContent(products) {
    const regions = extractRegions(products);
    subState.regions = regions;
    
    if (regions.length === 0) {
        subEl.content.innerHTML = '<div style="padding:40px;text-align:center;color:rgba(255,255,255,0.3);">Нет доступных регионов</div>';
        return;
    }
    
    const plansByRegion = groupProductsByRegion(products);
    
    let html = `
        <div class="selection-block">
            <div class="block-label">🌍 Регион:</div>
            <div class="scroll-wrapper">
                <div class="scroll-container" id="sub-region-scroll">
    `;
    
    regions.forEach((region, index) => {
        const flag = getFlagEmoji(region.country_code);
        html += `
            <button class="region-btn ${index === 0 ? 'active' : ''}" 
                    data-region="${region.country_code}"
                    onclick="selectSubRegion('${region.country_code}')">
                ${flag} ${region.name}
            </button>
        `;
    });
    
    html += `
                </div>
            </div>
            <div class="scroll-indicator" id="sub-region-indicator"></div>
        </div>
        <div class="selection-block">
            <div class="block-label">📅 Срок подписки:</div>
            <div class="scroll-wrapper">
                <div class="scroll-container" id="sub-plan-scroll">
    `;
    
    const firstRegion = regions[0];
    const firstPlans = deduplicatePlans(plansByRegion[firstRegion.country_code] || []);
    html += renderPlanButtons(firstPlans, true);
    
    html += `
                </div>
            </div>
            <div class="scroll-indicator" id="sub-plan-indicator"></div>
        </div>
        <div class="total-block">
            <div class="total-price" id="sub-total-price">Итого: 0 руб</div>
            <button class="pay-btn disabled" id="sub-pay-btn">Оплатить</button>
        </div>
        <div class="instruction-block">
            <div class="instruction-title">📖 Инструкция по активации</div>
            <div class="instruction-text" id="sub-instruction-text">
                После оплаты вы получите код для активации Spotify Premium.
            </div>
        </div>
    `;
    
    subEl.content.innerHTML = html;
    
    if (firstPlans.length > 0) {
        selectSubPlan(firstPlans[0]);
    }
    
    setTimeout(() => {
        initScrollDrag('#sub-region-scroll');
        initScrollDrag('#sub-plan-scroll');
        updateScrollIndicator('sub-region-scroll', 'sub-region-indicator');
        updateScrollIndicator('sub-plan-scroll', 'sub-plan-indicator');
    }, 100);
}

function renderDiscordContent(products) {
    const basicPlans = products.filter(p => 
        p.attributes && p.attributes.subscription_plan === 'basic'
    );
    const nitroPlans = products.filter(p => 
        p.attributes && p.attributes.subscription_plan === 'nitro'
    );
    
    basicPlans.sort((a, b) => (a.attributes?.amount || 0) - (b.attributes?.amount || 0));
    nitroPlans.sort((a, b) => (a.attributes?.amount || 0) - (b.attributes?.amount || 0));
    
    let defaultType = 'basic';
    if (basicPlans.length === 0 && nitroPlans.length > 0) {
        defaultType = 'nitro';
    } else if (basicPlans.length === 0 && nitroPlans.length === 0) {
        subEl.content.innerHTML = '<div style="padding:40px;text-align:center;color:rgba(255,255,255,0.3);">Нет доступных подписок Discord</div>';
        return;
    }
    
    subState.currentDiscordType = defaultType;
    const currentPlans = defaultType === 'basic' ? basicPlans : nitroPlans;
    subState.plans = currentPlans;
    
    let html = `
        <div class="selection-block">
            <div class="block-label">💎 Тип подписки:</div>
            <div class="scroll-wrapper">
                <div class="scroll-container" id="sub-discord-type-scroll">
    `;
    
    if (basicPlans.length > 0) {
        html += `
            <button class="discord-type-btn ${defaultType === 'basic' ? 'active' : ''}" 
                    onclick="selectDiscordType('basic')">
                Basic
            </button>
        `;
    }
    
    if (nitroPlans.length > 0) {
        html += `
            <button class="discord-type-btn ${defaultType === 'nitro' ? 'active' : ''}" 
                    onclick="selectDiscordType('nitro')">
                Nitro
            </button>
        `;
    }
    
    html += `
                </div>
            </div>
            <div class="scroll-indicator" id="sub-discord-type-indicator"></div>
        </div>
        <div class="selection-block">
            <div class="block-label">📅 Срок:</div>
            <div class="scroll-wrapper">
                <div class="scroll-container" id="sub-plan-scroll">
    `;
    
    html += renderPlanButtons(currentPlans, true);
    
    html += `
                </div>
            </div>
            <div class="scroll-indicator" id="sub-plan-indicator"></div>
        </div>
        <div class="total-block">
            <div class="total-price" id="sub-total-price">Итого: 0 руб</div>
            <button class="pay-btn disabled" id="sub-pay-btn">Оплатить</button>
        </div>
        <div class="instruction-block">
            <div class="instruction-title">📖 Инструкция по активации</div>
            <div class="instruction-text" id="sub-instruction-text">
                После оплаты вы получите код для активации Discord ${defaultType === 'basic' ? 'Basic' : 'Nitro'}.
            </div>
        </div>
    `;
    
    subEl.content.innerHTML = html;
    
    if (currentPlans.length > 0) {
        selectSubPlan(currentPlans[0]);
    }
    
    setTimeout(() => {
        initScrollDrag('#sub-discord-type-scroll');
        initScrollDrag('#sub-plan-scroll');
        updateScrollIndicator('sub-discord-type-scroll', 'sub-discord-type-indicator');
        updateScrollIndicator('sub-plan-scroll', 'sub-plan-indicator');
    }, 100);
}

// =============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =============================================

function extractRegions(products) {
    const regionMap = {};
    products.forEach(p => {
        const code = p.attributes?.country_code;
        if (code && !regionMap[code]) {
            regionMap[code] = {
                country_code: code,
                name: getRegionName(code)
            };
        }
    });
    return Object.values(regionMap);
}

function getRegionName(code) {
    const names = {
        'BR': 'Бразилия',
        'US': 'США',
        'EU': 'Европа',
        'FR': 'Франция',
        'AE': 'ОАЭ',
        'GB': 'Великобритания',
        'MX': 'Мексика',
        'ES': 'Испания',
        'IN': 'Индия',
        'WW': 'Global',
        'SK': 'Словакия',
        'SA': 'Саудовская Аравия',
        'CH': 'Швейцария',
        'PL': 'Польша',
        'SE': 'Швеция',
        'NO': 'Норвегия',
        'DK': 'Дания',
        'FI': 'Финляндия',
        'CZ': 'Чехия',
        'HU': 'Венгрия',
        'RO': 'Румыния',
        'BG': 'Болгария',
        'GR': 'Греция',
        'PT': 'Португалия',
        'NL': 'Нидерланды',
        'BE': 'Бельгия',
        'AT': 'Австрия',
        'IE': 'Ирландия',
        'NZ': 'Новая Зеландия',
        'AU': 'Австралия',
        'JP': 'Япония',
        'KR': 'Южная Корея',
        'SG': 'Сингапур',
        'MY': 'Малайзия',
        'PH': 'Филиппины',
        'TH': 'Таиланд',
        'VN': 'Вьетнам',
        'ID': 'Индонезия',
        'TR': 'Турция',
        'IL': 'Израиль',
        'ZA': 'Южная Африка',
        'AR': 'Аргентина',
        'CL': 'Чили',
        'CO': 'Колумбия',
        'PE': 'Перу',
        'VE': 'Венесуэла'
    };
    return names[code] || code;
}

function getFlagEmoji(code) {
    const flags = {
        'BR': '🇧🇷',
        'US': '🇺🇸',
        'EU': '🇪🇺',
        'FR': '🇫🇷',
        'AE': '🇦🇪',
        'GB': '🇬🇧',
        'MX': '🇲🇽',
        'ES': '🇪🇸',
        'IN': '🇮🇳',
        'WW': '🌍',
        'SK': '🇸🇰',
        'SA': '🇸🇦',
        'CH': '🇨🇭',
        'PL': '🇵🇱',
        'SE': '🇸🇪',
        'NO': '🇳🇴',
        'DK': '🇩🇰',
        'FI': '🇫🇮',
        'CZ': '🇨🇿',
        'HU': '🇭🇺',
        'RO': '🇷🇴',
        'BG': '🇧🇬',
        'GR': '🇬🇷',
        'PT': '🇵🇹',
        'NL': '🇳🇱',
        'BE': '🇧🇪',
        'AT': '🇦🇹',
        'IE': '🇮🇪',
        'NZ': '🇳🇿',
        'AU': '🇦🇺',
        'JP': '🇯🇵',
        'KR': '🇰🇷',
        'SG': '🇸🇬',
        'MY': '🇲🇾',
        'PH': '🇵🇭',
        'TH': '🇹🇭',
        'VN': '🇻🇳',
        'ID': '🇮🇩',
        'TR': '🇹🇷',
        'IL': '🇮🇱',
        'ZA': '🇿🇦',
        'AR': '🇦🇷',
        'CL': '🇨🇱',
        'CO': '🇨🇴',
        'PE': '🇵🇪',
        'VE': '🇻🇪'
    };
    return flags[code] || '🌍';
}

function groupProductsByRegion(products) {
    const grouped = {};
    products.forEach(p => {
        const code = p.attributes?.country_code || 'WW';
        if (!grouped[code]) grouped[code] = [];
        grouped[code].push(p);
    });
    Object.keys(grouped).forEach(key => {
        grouped[key].sort((a, b) => (a.attributes?.amount || 0) - (b.attributes?.amount || 0));
    });
    return grouped;
}

function renderPlanButtons(plans, isSubscription = false) {
    if (!plans || plans.length === 0) {
        return '<div style="padding:20px;color:rgba(255,255,255,0.3);">Нет доступных вариантов</div>';
    }
    
    let html = '';
    plans.forEach((plan, index) => {
        const amount = plan.attributes?.amount || 0;
        const currency = plan.attributes?.currency || '';
        const price = parseFloat(plan.price || 0);
        const stock = plan.quantity || 0;
        const isOutOfStock = stock === 0;
        
        let label = '';
        if (isSubscription) {
            label = `${amount} ${getMonthLabel(amount)}`;
        } else {
            label = `${amount} ${currency}`;
        }
        
        html += `
            <button class="sub-plan-btn ${index === 0 ? 'active' : ''} ${isOutOfStock ? 'out-of-stock' : ''}"
                    data-plan-id="${plan.id}"
                    data-plan='${JSON.stringify(plan)}'
                    onclick="selectSubPlanFromButton(this, '${plan.id}')"
                    ${isOutOfStock ? 'disabled' : ''}>
                <span class="plan-name">${label}</span>
                <span class="plan-desc">${isOutOfStock ? '❌ нет в наличии' : `${price} руб`}</span>
            </button>
        `;
    });
    return html;
}

function getMonthLabel(months) {
    const labels = {
        1: 'месяц',
        2: 'месяца',
        3: 'месяца',
        4: 'месяца',
        5: 'месяцев',
        6: 'месяцев',
        12: 'месяцев'
    };
    return labels[months] || 'мес.';
}

function filterProductsByService(products, serviceSlug) {
    const keywords = SERVICE_KEYWORDS[serviceSlug] || [serviceSlug];
    return products.filter(p => {
        const name = p.name.toLowerCase();
        return keywords.some(w => name.includes(w));
    });
}

function deduplicatePlans(plans) {
    const seen = new Set();
    return plans.filter(p => {
        const key = `${p.attributes?.amount || 0}_${p.attributes?.currency || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// =============================================
// ОБРАБОТЧИКИ ВЫБОРА
// =============================================

function selectSubRegion(regionCode) {
    subState.currentRegion = regionCode;
    
    const btns = document.querySelectorAll('#sub-region-scroll .region-btn');
    btns.forEach(b => {
        b.classList.toggle('active', b.dataset.region === regionCode);
    });
    
    const allPlans = subState.allProducts;
    const regionPlans = deduplicatePlans(
        allPlans.filter(p => p.attributes?.country_code === regionCode)
    );
    regionPlans.sort((a, b) => (a.attributes?.amount || 0) - (b.attributes?.amount || 0));
    subState.plans = regionPlans;
    
    const scrollContainer = document.getElementById('sub-plan-scroll');
    if (scrollContainer) {
        const isSubscription = subState.currentService === 'spotify';
        scrollContainer.innerHTML = renderPlanButtons(regionPlans, isSubscription);
        
        if (regionPlans.length > 0) {
            selectSubPlan(regionPlans[0]);
        }
        
        setTimeout(() => {
            initScrollDrag('#sub-plan-scroll');
            updateScrollIndicator('sub-plan-scroll', 'sub-plan-indicator');
        }, 50);
    }
}

function selectDiscordType(type) {
    subState.currentDiscordType = type;
    
    const btns = document.querySelectorAll('#sub-discord-type-scroll .discord-type-btn');
    btns.forEach(b => {
        b.classList.toggle('active', b.textContent.toLowerCase() === type);
    });
    
    const allPlans = subState.allProducts;
    const filtered = deduplicatePlans(
        allPlans.filter(p => {
            const plan = p.attributes?.subscription_plan;
            return plan === type;
        })
    );
    
    filtered.sort((a, b) => (a.attributes?.amount || 0) - (b.attributes?.amount || 0));
    subState.plans = filtered;
    
    const scrollContainer = document.getElementById('sub-plan-scroll');
    if (scrollContainer) {
        scrollContainer.innerHTML = renderPlanButtons(filtered, true);
        
        if (filtered.length > 0) {
            selectSubPlan(filtered[0]);
        } else {
            updateSubTotal(null);
        }
        
        setTimeout(() => {
            initScrollDrag('#sub-plan-scroll');
            updateScrollIndicator('sub-plan-scroll', 'sub-plan-indicator');
        }, 50);
    }
    
    const instText = document.getElementById('sub-instruction-text');
    if (instText) {
        instText.textContent = `После оплаты вы получите код для активации Discord ${type === 'basic' ? 'Basic' : 'Nitro'}.`;
    }
}

function selectSubPlanFromButton(btn, planId) {
    const allBtns = btn.closest('.scroll-container').querySelectorAll('.sub-plan-btn');
    allBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const planData = JSON.parse(btn.dataset.plan);
    selectSubPlan(planData);
}

function selectSubPlan(plan) {
    subState.currentPlan = plan;
    updateSubTotal(plan);
}

function updateSubTotal(plan) {
    const priceEl = document.getElementById('sub-total-price');
    const payBtn = document.getElementById('sub-pay-btn');
    
    if (!plan || plan.quantity === 0) {
        if (priceEl) priceEl.textContent = 'Итого: 0 руб';
        if (payBtn) {
            payBtn.classList.add('disabled');
            payBtn.disabled = true;
        }
        return;
    }
    
    const price = parseFloat(plan.price || 0);
    if (priceEl) priceEl.textContent = `Итого: ${price} руб`;
    if (payBtn) {
        payBtn.classList.remove('disabled');
        payBtn.disabled = false;
    }
}

// =============================================
// ОБРАБОТЧИК ОПЛАТЫ ДЛЯ ПОДПИСОК
// =============================================

document.addEventListener('click', async function(e) {
    if (e.target.id === 'sub-pay-btn' && !e.target.classList.contains('disabled')) {
        if (!subState.currentPlan) return;
        
        const btn = e.target;
        btn.textContent = 'Обработка...';
        btn.disabled = true;
        
        try {
            const order = await API.createGiftOrder(subState.currentPlan.id, 1);
            console.log('✅ Заказ подписки создан:', order);
            alert(`✅ Заказ #${order.order_id} создан!\nСумма: ${order.price} руб\nСтатус: ${order.status}`);
        } catch (error) {
            console.error('Ошибка оплаты подписки:', error);
            alert('❌ Ошибка при создании заказа: ' + error.message);
        } finally {
            btn.textContent = 'Оплатить';
            btn.disabled = false;
        }
    }
});

// =============================================
// ОБРАБОТЧИКИ НАВИГАЦИИ
// =============================================

export function initSubscriptionHandlers() {
    document.querySelectorAll('.subscription-icon-wrapper').forEach(wrapper => {
        wrapper.addEventListener('click', function(e) {
            const service = this.dataset.service;
            if (service) {
                openSubscription(service);
            }
        });
    });

    document.addEventListener('click', function(e) {
        const wrapper = e.target.closest('.sub-header-icon-wrapper');
        if (wrapper && document.getElementById('screen-subscriptions').classList.contains('active')) {
            const service = wrapper.dataset.service;
            if (service && service !== subState.currentService) {
                openSubscription(service);
            }
        }
    });

    if (subEl.backBtn) {
        subEl.backBtn.addEventListener('click', function() {
            showScreen('screen-main');
        });
    }
}
export {
    selectSubRegion,
    selectDiscordType,
    selectSubPlanFromButton
};