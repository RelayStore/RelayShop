// frontend/js/screens/steam.js

import { showScreen } from '../core/navigation.js';

// =============================================
// 1. КОНФИГУРАЦИЯ
// =============================================

const DEFAULT_CURRENCIES = {
    RUB: {
        code: 'RUB',
        label: 'RU',
        symbol: '₽',
        productId: 'product_01kjp6vtkme90ba0r0dpdvkapv',
        min: 50,
        max: 30000,
        quickAmounts: [500, 1000, 2000, 5000, 15000],
        placeholder: '1 000 ₽'
    },
    KZT: {
        code: 'KZT',
        label: 'KZ',
        symbol: '₸',
        productId: 'product_01kjp6vtm9ez19ckmjwxdgy7ky',
        min: 250,
        max: 150000,
        quickAmounts: [1000, 5000, 10000, 25000, 50000],
        placeholder: '5 000 ₸'
    },
    UAH: {
        code: 'UAH',
        label: 'UA',
        symbol: '₴',
        productId: 'product_01kv84qc6tfxsbkn4t50etgbt4',
        min: 50,
        max: 13500,
        quickAmounts: [100, 300, 500, 1000, 2000],
        placeholder: '300 ₴'
    },
    USD: {
        code: 'USD',
        label: 'US',
        symbol: '$',
        productId: 'product_01kjp6vtmjf8rbbxw88719wz3b',
        min: 1,
        max: 300,
        quickAmounts: [5, 10, 25, 50, 100],
        placeholder: '10 $'
    }
};

// =============================================
// 2. СОСТОЯНИЕ
// =============================================

const state = {
    currencies: {},
    currency: 'RUB',
    login: '',
    amount: null,           // число (без пробелов), null = пусто
    isValidLogin: false,
    isValidAmount: false,
    bannerMessage: null,    // текст красной плашки
    isProcessing: false,
    infoBlockVisible: false,
    isInitialized: false
};

// =============================================
// 3. DOM-ССЫЛКИ
// =============================================

const el = {
    currencyRow: document.getElementById('currency-row'),
    loginInput: document.getElementById('steam-login-input'),
    amountInput: document.getElementById('steam-amount-input'),
    currencySymbol: document.getElementById('currency-symbol'),
    quickAmounts: document.getElementById('quick-amounts'),
    infoAmount: document.getElementById('info-amount'),
    infoTotal: document.getElementById('info-total'),
    submitBtn: document.getElementById('steam-submit-btn'),
    submitText: document.getElementById('submit-text'),
    toggleBtn: document.getElementById('toggle-info'),
    infoBlock: document.getElementById('info-block'),
    rangeHint: document.getElementById('steam-range-hint'),
    rangeMin: document.getElementById('range-min'),
    rangeMax: document.getElementById('range-max'),
    rangeCurrency: document.getElementById('range-currency'),
    errorBanner: document.getElementById('steam-error-banner'),
    errorText: document.getElementById('steam-error-text')
};

// =============================================
// 4. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =============================================

function formatNumber(n) {
    if (n === null || n === undefined || isNaN(n)) return '';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function unformatNumber(str) {
    if (!str) return null;
    const cleaned = str.replace(/\s/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
}

function validateLogin(login) {
    if (!login || login.trim().length === 0) return false;
    const trimmed = login.trim();
    const regex = /^[A-Za-z0-9_]{3,64}$/;
    return regex.test(trimmed);
}

function getCurrency() {
    return state.currencies[state.currency] || DEFAULT_CURRENCIES[state.currency];
}

function isAmountValid(amount, currency) {
    if (amount === null || amount === undefined || isNaN(amount)) return false;
    if (amount <= 0) return false;
    if (amount < currency.min) return false;
    if (amount > currency.max) return false;
    return true;
}

// =============================================
// 5. РЕНДЕРИНГ
// =============================================

function renderCurrencies() {
    const row = el.currencyRow;
    row.innerHTML = '';

    const currencyCodes = Object.keys(state.currencies);
    if (currencyCodes.length === 0) {
        Object.keys(DEFAULT_CURRENCIES).forEach(code => {
            state.currencies[code] = { ...DEFAULT_CURRENCIES[code] };
        });
    }

    Object.keys(state.currencies).forEach(code => {
        const btn = document.createElement('button');
        btn.className = `steam-currency-btn${code === state.currency ? ' active' : ''}`;
        btn.textContent = code;
        btn.dataset.currency = code;
        btn.addEventListener('click', () => handleCurrencyChange(code));
        row.appendChild(btn);
    });
}

function renderQuickAmounts() {
    const container = el.quickAmounts;
    container.innerHTML = '';

    const currency = getCurrency();
    if (!currency) return;

    currency.quickAmounts.forEach(amount => {
        const btn = document.createElement('button');
        btn.className = 'steam-quick-btn';
        btn.textContent = `${formatNumber(amount)}${currency.symbol}`;
        btn.dataset.amount = amount;
        btn.addEventListener('click', () => {
            setAmount(amount);
            container.querySelectorAll('.steam-quick-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
        container.appendChild(btn);
    });
}

// =============================================
// 6. ОБНОВЛЕНИЕ UI
// =============================================

function updateSymbol() {
    const currency = getCurrency();
    el.currencySymbol.textContent = currency ? currency.symbol : '₽';
}

function updatePlaceholder() {
    const currency = getCurrency();
    el.amountInput.placeholder = currency ? currency.placeholder : '1 000 ₽';
}

function updateLimits() {
    const currency = getCurrency();
    if (!currency) return;

    el.rangeMin.textContent = formatNumber(currency.min);
    el.rangeMax.textContent = formatNumber(currency.max);
    el.rangeCurrency.textContent = currency.code;

    const amount = state.amount;
    const isValid = isAmountValid(amount, currency);

    if (amount !== null && !isNaN(amount) && amount > 0 && !isValid) {
        el.rangeHint.classList.remove('hidden');
        el.rangeHint.classList.add('error');
    } else {
        el.rangeHint.classList.add('hidden');
        el.rangeHint.classList.remove('error');
    }
}

function updateInfo() {
    const currency = getCurrency();
    const amount = state.amount;
    const symbol = currency ? currency.symbol : '₽';

    // Зачисление — всегда показываем, если есть сумма
    if (amount !== null && !isNaN(amount) && amount > 0) {
        el.infoAmount.textContent = `${symbol} ${formatNumber(amount)}`;
        el.infoAmount.className = 'steam-info-value';
    } else {
        el.infoAmount.textContent = '—';
        el.infoAmount.className = 'steam-info-value placeholder';
    }

    // Итого — всегда показываем ту же сумму, если есть сумма
    if (amount !== null && !isNaN(amount) && amount > 0) {
        el.infoTotal.textContent = `${symbol} ${formatNumber(amount)}`;
        el.infoTotal.className = 'steam-total-value';
    } else {
        el.infoTotal.textContent = '—';
        el.infoTotal.className = 'steam-total-value placeholder';
    }
}

function updateButtonState() {
    const btn = el.submitBtn;
    const text = el.submitText;

    if (state.isProcessing) {
        btn.classList.remove('active');
        btn.disabled = true;
        text.textContent = '⏳ Обработка...';
        return;
    }

    // Состояние 1: логин невалиден
    if (!state.isValidLogin) {
        btn.classList.remove('active');
        btn.disabled = true;
        text.textContent = '→ Укажите логин Steam';
        return;
    }

    // Состояние 2: логин валиден, сумма невалидна
    const currency = getCurrency();
    const amount = state.amount;
    const isValidAmount = isAmountValid(amount, currency);

    if (!isValidAmount) {
        btn.classList.remove('active');
        btn.disabled = true;
        text.textContent = `→ Сумма: ${formatNumber(currency.min)}–${formatNumber(currency.max)} ${currency.code}`;
        return;
    }

    // Состояние 3: всё валидно
    btn.classList.add('active');
    btn.disabled = false;
    text.textContent = 'ПОПОЛНИТЬ';
}

function updateBanner() {
    const banner = el.errorBanner;
    const text = el.errorText;

    if (state.bannerMessage) {
        banner.classList.remove('hidden');
        text.textContent = state.bannerMessage;
    } else {
        banner.classList.add('hidden');
        text.textContent = '';
    }
}

function updateQuickButtons() {
    const btns = el.quickAmounts.querySelectorAll('.steam-quick-btn');
    const currentAmount = state.amount;
    btns.forEach(btn => {
        const val = Number(btn.dataset.amount);
        btn.classList.toggle('active', val === currentAmount);
    });
}

function updateLoginInput() {
    if (state.isValidLogin) {
        el.loginInput.classList.remove('invalid');
        el.loginInput.classList.add('valid');
    } else {
        el.loginInput.classList.remove('valid');
        if (state.login.length > 0) {
            el.loginInput.classList.add('invalid');
        } else {
            el.loginInput.classList.remove('invalid');
        }
    }
}

function updateAll() {
    updateSymbol();
    updatePlaceholder();
    updateLimits();
    updateInfo();
    updateButtonState();
    updateBanner();
    updateQuickButtons();
    updateLoginInput();
}

// =============================================
// 7. УПРАВЛЕНИЕ СУММОЙ
// =============================================

function setAmount(value) {
    const num = Number(value);
    if (!isNaN(num) && num >= 0) {
        state.amount = num > 0 ? num : null;
    } else {
        state.amount = null;
    }

    // Обновляем поле ввода с форматированием
    if (state.amount !== null) {
        el.amountInput.value = formatNumber(state.amount);
    } else {
        el.amountInput.value = '';
    }

    // Проверяем валидность
    const currency = getCurrency();
    state.isValidAmount = isAmountValid(state.amount, currency);

    // Если сумма стала валидной — убираем баннер (если он был про сумму)
    if (state.isValidAmount && state.isValidLogin) {
        state.bannerMessage = null;
    }

    updateAll();
}

// =============================================
// 8. ОБРАБОТЧИКИ
// =============================================

function handleLoginInput(e) {
    let value = e.target.value;

    // Автоматический trim
    value = value.trim();

    // Проверяем только допустимые символы (латиница, цифры, _)
    const filtered = value.replace(/[^A-Za-z0-9_]/g, '');
    if (filtered !== value) {
        e.target.value = filtered;
        value = filtered;
    }

    state.login = value;
    state.isValidLogin = validateLogin(value);

    // Если логин стал валидным и сумма валидна — убираем баннер
    if (state.isValidLogin && state.isValidAmount) {
        state.bannerMessage = null;
    }

    // Если логин стал невалидным — убираем баннер, если он был про логин
    if (!state.isValidLogin && state.bannerMessage === 'Введите логин Steam') {
        state.bannerMessage = null;
    }

    updateAll();

    // Если логин стал валидным и есть сумма — обновляем кнопку
    if (state.isValidLogin && state.amount !== null && state.amount > 0) {
        updateAll();
    }
}

function handleAmountInput(e) {
    // Убираем всё, кроме цифр
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const num = raw ? Number(raw) : null;

    state.amount = (num !== null && num > 0) ? num : null;

    const currency = getCurrency();
    state.isValidAmount = isAmountValid(state.amount, currency);

    // Если сумма стала валидной и логин валиден — убираем баннер
    if (state.isValidAmount && state.isValidLogin) {
        state.bannerMessage = null;
    }

    // Если сумма невалидна — убираем баннер, если он был про сумму
    if (!state.isValidAmount && state.bannerMessage && state.bannerMessage.includes('Сумма:')) {
        state.bannerMessage = null;
    }

    // Обновляем поле с форматированием
    if (state.amount !== null) {
        e.target.value = formatNumber(state.amount);
    } else {
        e.target.value = '';
    }

    updateAll();
}

function handleCurrencyChange(currencyCode) {
    if (currencyCode === state.currency) return;
    if (!state.currencies[currencyCode]) return;

    state.currency = currencyCode;
    state.amount = null;
    state.isValidAmount = false;
    state.bannerMessage = null;

    // Очищаем поле ввода
    el.amountInput.value = '';

    // Перерисовываем быстрые кнопки
    renderQuickAmounts();

    updateAll();

    // Снимаем активность со всех быстрых кнопок
    el.quickAmounts.querySelectorAll('.steam-quick-btn').forEach(b => b.classList.remove('active'));
}

function handleToggleInfo() {
    state.infoBlockVisible = !state.infoBlockVisible;

    if (state.infoBlockVisible) {
        el.infoBlock.classList.remove('hidden');
        el.toggleBtn.textContent = '×';
    } else {
        el.infoBlock.classList.add('hidden');
        el.toggleBtn.textContent = '?';
    }
}

function handleSubmitClick() {
    const btn = el.submitBtn;

    // Если кнопка неактивна — показываем баннер
    if (btn.disabled) {
        const currency = getCurrency();

        if (!state.isValidLogin) {
            state.bannerMessage = 'Введите логин Steam';
        } else if (!state.isValidAmount) {
            const amount = state.amount;
            if (amount !== null && !isNaN(amount) && amount > 0) {
                state.bannerMessage = `Сумма: ${formatNumber(currency.min)}–${formatNumber(currency.max)} ${currency.code}`;
            } else {
                state.bannerMessage = `Сумма: ${formatNumber(currency.min)}–${formatNumber(currency.max)} ${currency.code}`;
            }
        } else {
            state.bannerMessage = 'Заполните все поля';
        }

        updateAll();
        return;
    }

    // Если кнопка активна — запускаем оплату
    handleSubmit();
}

// =============================================
// 9. ОСНОВНАЯ ФУНКЦИЯ ОПЛАТЫ
// =============================================

async function handleSubmit() {
    const login = state.login.trim();
    if (!validateLogin(login)) {
        state.bannerMessage = 'Введите корректный логин Steam';
        updateAll();
        return;
    }

    const currency = getCurrency();
    const amount = state.amount;

    if (amount === null || amount <= 0) {
        state.bannerMessage = `Сумма: ${formatNumber(currency.min)}–${formatNumber(currency.max)} ${currency.code}`;
        updateAll();
        return;
    }

    if (!isAmountValid(amount, currency)) {
        state.bannerMessage = `Сумма: ${formatNumber(currency.min)}–${formatNumber(currency.max)} ${currency.code}`;
        updateAll();
        return;
    }

    let userId = null;
    if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        userId = window.Telegram.WebApp.initDataUnsafe.user.id;
    }

    if (!userId) {
        alert('❌ Ошибка: не удалось определить пользователя');
        return;
    }

    state.isProcessing = true;
    updateAll();

    try {
        const result = await API.createOrder({
            user_id: userId,
            product_id: currency.productId,
            product_name: `Steam пополнение ${formatNumber(amount)} ${currency.code}`,
            product_slug: 'steam',
            region_slug: 'direct',
            quantity: amount,
            amount: amount,
            currency: currency.code.toLowerCase(),
            note: { login: login }
        });

        console.log('✅ Steam заказ создан:', result);

        if (window.showToast) {
            window.showToast('✅ Заказ успешно создан!');
        }

        setTimeout(() => {
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.close();
            } else {
                window.location.href = 'about:blank';
            }
        }, 500);

    } catch (error) {
        console.error('Ошибка Steam заказа:', error);
        state.bannerMessage = `❌ Ошибка: ${error.message || 'Не удалось выполнить пополнение'}`;
        updateAll();
    } finally {
        state.isProcessing = false;
        updateAll();
    }
}

// =============================================
// 10. ИНИЦИАЛИЗАЦИЯ
// =============================================

export async function initSteam() {
    if (state.isInitialized) return;

    try {
        const config = await API.getSteamConfig();

        if (config && config.currencies) {
            config.currencies.forEach(c => {
                const defaultData = DEFAULT_CURRENCIES[c.currency];
                state.currencies[c.currency] = {
                    code: c.currency,
                    label: c.currency,
                    symbol: c.symbol || defaultData?.symbol || '₽',
                    productId: c.product_id || defaultData?.productId,
                    min: c.min || defaultData?.min || 0,
                    max: c.max || defaultData?.max || 0,
                    quickAmounts: defaultData?.quickAmounts || [100, 500, 1000, 2000, 5000],
                    placeholder: defaultData?.placeholder || '1000 ₽'
                };
            });
        }

        if (Object.keys(state.currencies).length === 0) {
            Object.keys(DEFAULT_CURRENCIES).forEach(code => {
                state.currencies[code] = { ...DEFAULT_CURRENCIES[code] };
            });
        }

        if (!state.currencies[state.currency]) {
            state.currency = Object.keys(state.currencies)[0] || 'RUB';
        }

        renderCurrencies();
        renderQuickAmounts();

        state.amount = null;
        state.login = '';
        state.isValidLogin = false;
        state.isValidAmount = false;
        state.bannerMessage = null;
        state.isProcessing = false;

        el.loginInput.value = '';
        el.amountInput.value = '';

        updateAll();

        el.loginInput.addEventListener('input', handleLoginInput);
        el.amountInput.addEventListener('input', handleAmountInput);
        el.toggleBtn.addEventListener('click', handleToggleInfo);
        el.submitBtn.addEventListener('click', handleSubmitClick);

        el.infoBlock.classList.add('hidden');
        el.toggleBtn.textContent = '?';
        state.infoBlockVisible = false;

        state.isInitialized = true;
        console.log('✅ Steam инициализирован');

    } catch (error) {
        console.error('Ошибка инициализации Steam:', error);
        Object.keys(DEFAULT_CURRENCIES).forEach(code => {
            state.currencies[code] = { ...DEFAULT_CURRENCIES[code] };
        });
        renderCurrencies();
        renderQuickAmounts();
        updateAll();
        state.isInitialized = true;
    }
}

// =============================================
// 11. ОТКРЫТИЕ ЭКРАНА
// =============================================

export function openSteamScreen() {
    state.currency = 'RUB';
    state.login = '';
    state.amount = null;
    state.isValidLogin = false;
    state.isValidAmount = false;
    state.bannerMessage = null;
    state.isProcessing = false;
    state.infoBlockVisible = false;

    el.loginInput.value = '';
    el.amountInput.value = '';
    el.infoBlock.classList.add('hidden');
    el.toggleBtn.textContent = '?';

    if (!state.currencies[state.currency]) {
        const keys = Object.keys(state.currencies);
        state.currency = keys.length > 0 ? keys[0] : 'RUB';
    }

    renderCurrencies();
    renderQuickAmounts();
    updateAll();

    showScreen('screen-steam');
}

// =============================================
// 12. АВТОЗАПУСК
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('screen-steam')) {
        initSteam();
    }
});