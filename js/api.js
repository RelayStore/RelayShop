// =============================================
// БЛОК: API ЗАПРОСЫ К BACKEND
// =============================================

// Базовый URL для API (меняй под свой сервер)
const API_BASE_URL = 'https://fallibly-dutiful-squid.cloudpub.ru/api'

// =============================================
// БЛОК: БАЗОВЫЙ ЗАПРОС
// =============================================

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || `Ошибка ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`❌ API Error [${endpoint}]:`, error);
        throw error;
    }
}

// =============================================
// БЛОК: СЕРВИСЫ
// =============================================

/**
 * Получить список всех сервисов
 */
function getServices() {
    return apiRequest('/services');
}

// =============================================
// БЛОК: СОЗДАНИЕ ЗАКАЗА (НОВЫЙ FLOW)
// =============================================

function createOrder(data) {
    return apiRequest('/orders/create', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

function getTelegramUserId() {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        return window.Telegram.WebApp.initDataUnsafe.user.id;
    }
    return null;
}

// =============================================
// БЛОК: РЕГИОНЫ И НОМИНАЛЫ
// =============================================

/**
 * Получить регионы для сервиса
 * @param {string} serviceSlug - slug сервиса (playstation, xbox, etc.)
 */
function getRegions(serviceSlug) {
    return apiRequest(`/services/${serviceSlug}/regions`);
}

/**
 * Получить номиналы для региона
 * @param {string} serviceSlug - slug сервиса
 * @param {string} regionSlug - slug региона
 */
function getNominals(serviceSlug, regionSlug) {
    return apiRequest(`/services/${serviceSlug}/regions/${regionSlug}/nominals`);
}
// =============================================
// БЛОК: ПОИСК ТОВАРОВ (ДЛЯ ПОДПИСОК)
// =============================================

/**
 * Поиск товаров по запросу
 * @param {string} query - поисковый запрос
 * @param {number} limit - лимит результатов
 */
function searchProducts(query, limit = 50) {
    return apiRequest(`/products/search?query=${encodeURIComponent(query)}&limit=${limit}&withStockOnly=true`);
}
/**
 * Получить актуальную цену и остаток для номинала
 * @param {string} productId - ID товара
 */
function getNominalDetails(productId) {
    return apiRequest(`/nominals/${productId}`);
}

// =============================================
// БЛОК: ЗАКАЗЫ
// =============================================

/**
 * Создать заказ на gift-карту
 * @param {string} productId - ID товара
 * @param {number} quantity - количество
 */
function createGiftOrder(productId, quantity = 1, note = null, totalPrice = null) {
    const body = { product_id: productId, quantity };
    if (note) body.note = note;
    if (totalPrice) body.total_price = totalPrice;
    
    return apiRequest('/orders/gift', {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

/**
 * Создать заказ на Steam Direct
 * @param {string} productId - ID товара
 * @param {number} quantity - сумма пополнения
 * @param {string} login - логин Steam
 */
function createSteamOrder(currency, login, amount) {
    return apiRequest('/steam/order', {
        method: 'POST',
        body: JSON.stringify({ currency, login, amount })
    });
}

/**
 * Получить статус заказа
 * @param {string} orderId - ID заказа
 */
function getOrderStatus(orderId) {
    return apiRequest(`/orders/${orderId}`);
}

// =============================================
// БЛОК: БАЛАНС
// =============================================

/**
 * Получить баланс пользователя
 */
function getBalance() {
    return apiRequest('/balance');
}

function searchProducts(query, limit = 50) {
    return apiRequest(`/products/search?query=${encodeURIComponent(query)}&limit=${limit}&withStockOnly=true`);
}
// =============================================
// БЛОК: STEAM API
// =============================================

/**
 * Получить конфигурацию Steam (валюты, лимиты, быстрые суммы)
 */
function getSteamConfig() {
    return apiRequest('/steam/config');
}
/**
 * Получить цену Steam Direct
 * @param {string} productId - ID товара
 * @param {number} quantity - сумма в валюте
 * @returns {Promise<{price_rub: number, price_usd: number}>}
 */
function getSteamPrice(productId, quantity) {
    return apiRequest(`/steam/price?product_id=${productId}&quantity=${quantity}`);
}
/**
 * Создать заказ на пополнение Steam
 * @param {string} currency - валюта (RUB, KZT, UAH, USD)
 * @param {string} login - логин Steam
 * @param {number} amount - сумма пополнения
 */
function createSteamOrder(currency, login, amount) {
    return apiRequest('/steam/order', {
        method: 'POST',
        body: JSON.stringify({ currency, login, amount })
    });
}

// =============================================
// БЛОК: ОБНОВЛЯЕМ window.API
// =============================================

window.API = {
    getServices,
    getRegions,
    getSteamPrice,
    getNominals,
    getNominalDetails,
    searchProducts,
    createGiftOrder,
    createSteamOrder,
    getSteamConfig,
    getOrderStatus,
    getBalance,
    createOrder,
    getTelegramUserId
};

console.log('✅ API клиент инициализирован');