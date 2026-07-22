// frontend/js/screens/steam.js

import { showScreen } from '../core/navigation.js';
import { initScrollDrag } from '../components/scroll.js';

// =============================================
// БЛОК: STEAM ПОПОЛНЕНИЕ
// =============================================

export let steamState = {
    currency: 'RUB',
    login: '',
    amount: 1000,
    productId: null,
    isProcessing: false
};

export const steamEl = {
    currencyRow: document.getElementById('currency-row'),
    loginInput: document.getElementById('steam-login-input'),
    amountInput: document.getElementById('steam-amount-input'),
    currencySymbol: document.getElementById('currency-symbol'),
    quickAmounts: document.getElementById('quick-amounts'),
    infoLogin: document.getElementById('info-login'),
    infoAmount: document.getElementById('info-amount'),
    submitBtn: document.getElementById('steam-submit-btn'),
    toggleBtn: document.getElementById('toggle-info'),
    infoBlock: document.getElementById('info-block')
};

let steamCurrencies = {};

export async function initSteam() {
    try {
        const config = await API.getSteamConfig();

        config.currencies.forEach(c => {
            steamCurrencies[c.currency] = {
                symbol: c.symbol,
                min: c.min,
                max: c.max,
                amounts: c.amounts,
                product_id: c.product_id || null
            };
        });

        // Устанавливаем productId для текущей валюты
        if (steamCurrencies[steamState.currency]) {
            steamState.productId = steamCurrencies[steamState.currency].product_id;
        }

        renderSteamCurrencies();
        renderSteamQuickAmounts();
        updateSteamInfo();
        updateSteamButton();
        updateSteamLimits();
        updateSubmitButtonLimits();
        setSteamAmount(steamState.amount);

        if (steamEl.infoBlock) {
            steamEl.infoBlock.classList.add('hidden');
            steamEl.toggleBtn.textContent = '?';
        }

        steamEl.loginInput.addEventListener('input', handleSteamLoginInput);
        steamEl.amountInput.addEventListener('input', handleSteamAmountInput);
        steamEl.toggleBtn.addEventListener('click', toggleSteamInfo);
        steamEl.submitBtn.addEventListener('click', handleSteamSubmit);

    } catch (error) {
        console.error('Ошибка загрузки Steam конфигурации:', error);
        alert('Не удалось загрузить конфигурацию Steam');
    }
}

function renderSteamCurrencies() {
    const row = steamEl.currencyRow;
    row.innerHTML = '';

    Object.keys(steamCurrencies).forEach(code => {
        const btn = document.createElement('button');
        btn.className = `steam-currency-btn${code === steamState.currency ? ' active' : ''}`;
        btn.textContent = code;
        btn.dataset.currency = code;
        btn.addEventListener('click', () => changeSteamCurrency(code));
        row.appendChild(btn);
    });
}

function changeSteamCurrency(currencyCode) {
    if (!steamCurrencies[currencyCode]) return;

    steamState.currency = currencyCode;
    steamState.productId = steamCurrencies[currencyCode].product_id;

    renderSteamCurrencies();
    renderSteamQuickAmounts();
    updateSteamSymbol();
    updateSteamInfo();
    updateSteamButton();
    updateSteamLimits();
    updateSubmitButtonLimits();

    const currency = steamCurrencies[currencyCode];
    if (steamState.amount > currency.max) {
        setSteamAmount(currency.max);
    } else if (steamState.amount < currency.min) {
        setSteamAmount(currency.min);
    } else {
        updateSteamAmountDisplay();
    }
}

function renderSteamQuickAmounts() {
    const container = steamEl.quickAmounts;
    container.innerHTML = '';

    const currency = steamCurrencies[steamState.currency];
    if (!currency) return;

    currency.amounts.forEach(amount => {
        const btn = document.createElement('button');
        btn.className = `steam-quick-btn${amount === steamState.amount ? ' active' : ''}`;
        btn.textContent = amount;
        btn.dataset.amount = amount;
        btn.addEventListener('click', () => {
            setSteamAmount(amount);
            container.querySelectorAll('.steam-quick-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
        container.appendChild(btn);
    });
}

function updateSteamSymbol() {
    const currency = steamCurrencies[steamState.currency];
    steamEl.currencySymbol.textContent = currency ? currency.symbol : '₽';
}

function updateSteamLimits() {
    const currency = steamCurrencies[steamState.currency];
    if (!currency) return;

    const minEl = document.getElementById('range-min');
    const maxEl = document.getElementById('range-max');
    const currencyEl = document.getElementById('range-currency');
    const rangeHint = document.getElementById('steam-range-hint');

    if (minEl) minEl.textContent = currency.min;
    if (maxEl) maxEl.textContent = currency.max;
    if (currencyEl) currencyEl.textContent = steamState.currency;

    if (rangeHint) {
        const hasAmount = steamState.amount > 0;
        const isInRange = hasAmount &&
            steamState.amount >= currency.min &&
            steamState.amount <= currency.max;

        if (isInRange) {
            rangeHint.classList.add('active');
            rangeHint.style.color = 'rgba(255, 255, 255, 0.6)';
        } else if (hasAmount) {
            rangeHint.classList.remove('active');
            rangeHint.style.color = 'rgba(255, 100, 100, 0.5)';
        } else {
            rangeHint.classList.remove('active');
            rangeHint.style.color = 'rgba(255, 255, 255, 0.35)';
        }
    }

    updateSteamButton();
}

function updateSubmitButtonLimits() {
    const currency = steamCurrencies[steamState.currency];
    const limitsEl = document.getElementById('submit-limits');
    const submitBtn = document.getElementById('steam-submit-btn');

    if (!limitsEl || !currency) return;

    if (submitBtn && submitBtn.disabled) {
        limitsEl.textContent = `${currency.min}–${currency.max} ${steamState.currency}`;
        limitsEl.style.display = 'block';
    } else {
        limitsEl.style.display = 'none';
    }
}

function setSteamAmount(value) {
    const num = Number(value);
    if (!isNaN(num) && num > 0) {
        steamState.amount = num;
    } else {
        steamState.amount = 0;
    }
    updateSteamAmountDisplay();
    updateSteamInfo();
    updateSteamButton();
    updateSteamQuickButtons();
}

function updateSteamAmountDisplay() {
    const displayValue = steamState.amount > 0 ? steamState.amount : '';
    steamEl.amountInput.value = displayValue;
    updateSteamSymbol();
}

function updateSteamInfo() {
    steamEl.infoLogin.textContent = steamState.login || '—';
    const currency = steamCurrencies[steamState.currency];
    const symbol = currency ? currency.symbol : '₽';
    const amount = steamState.amount > 0 ? steamState.amount : 0;
    steamEl.infoAmount.textContent = `${symbol} ${amount}`;
}

function updateSteamButton() {
    const btn = steamEl.submitBtn;
    const textEl = document.getElementById('submit-text');
    const limitsEl = document.getElementById('submit-limits');

    const hasLogin = steamState.login.trim().length >= 3;
    const hasAmount = steamState.amount > 0;

    const currency = steamCurrencies[steamState.currency];
    const rangeText = currency ? `${currency.min}–${currency.max} ${steamState.currency}` : '';

    let isAmountValid = false;
    if (currency && hasAmount) {
        if (steamState.amount >= currency.min && steamState.amount <= currency.max) {
            isAmountValid = true;
        }
    }

    if (steamState.isProcessing) {
        btn.classList.remove('active');
        btn.disabled = true;
        if (textEl) textEl.textContent = '⏳ Обработка...';
        if (limitsEl) limitsEl.style.display = 'none';
        return;
    }

    if (!hasLogin) {
        btn.classList.remove('active');
        btn.disabled = true;
        if (textEl) textEl.textContent = 'Укажите логин Steam';
        if (limitsEl) limitsEl.style.display = 'none';
        return;
    }

    if (!hasAmount) {
        btn.classList.remove('active');
        btn.disabled = true;
        if (textEl) textEl.textContent = rangeText || 'Введите сумму';
        if (limitsEl) limitsEl.style.display = 'none';
        return;
    }

    if (isAmountValid) {
        btn.classList.add('active');
        btn.disabled = false;
        if (textEl) textEl.textContent = 'Продолжить';
        if (limitsEl) limitsEl.style.display = 'none';
        return;
    }

    btn.classList.remove('active');
    btn.disabled = true;
    if (textEl) textEl.textContent = rangeText || 'Недопустимая сумма';
    if (limitsEl) limitsEl.style.display = 'none';
}

function updateSteamQuickButtons() {
    const btns = steamEl.quickAmounts.querySelectorAll('.steam-quick-btn');
    btns.forEach(btn => {
        const val = Number(btn.dataset.amount);
        btn.classList.toggle('active', val === steamState.amount);
    });
}

function handleSteamLoginInput(e) {
    const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
    e.target.value = value;
    steamState.login = value;
    updateSteamInfo();
    updateSteamButton();
}

function handleSteamAmountInput(e) {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    e.target.value = raw;

    const num = Number(raw);
    if (!isNaN(num) && num > 0) {
        steamState.amount = num;
    } else if (raw === '') {
        steamState.amount = 0;
    }

    updateSteamInfo();
    updateSteamButton();
    updateSteamQuickButtons();
}

function toggleSteamInfo() {
    const isHidden = steamEl.infoBlock.classList.toggle('hidden');
    steamEl.toggleBtn.textContent = isHidden ? '?' : '✕';
}

// =============================================
// ОСНОВНАЯ ФУНКЦИЯ ОПЛАТЫ STEAM (ЕДИНАЯ ЛОГИКА)
// =============================================

async function handleSteamSubmit() {
    // Проверяем логин (минимум 3 символа)
    const login = steamState.login.trim();
    if (login.length < 3) {
        alert('❌ Логин Steam должен содержать минимум 3 символа');
        return;
    }

    // Проверяем сумму
    if (steamState.amount <= 0) {
        alert('❌ Введите сумму пополнения');
        return;
    }

    const currency = steamCurrencies[steamState.currency];
    if (!currency) {
        alert('❌ Ошибка: выберите валюту');
        return;
    }

    if (steamState.amount < currency.min) {
        alert(`❌ Минимальная сумма пополнения: ${currency.min} ${steamState.currency}`);
        return;
    }

    if (steamState.amount > currency.max) {
        alert(`❌ Максимальная сумма пополнения: ${currency.max} ${steamState.currency}`);
        return;
    }

    // Получаем user_id
    let userId = null;
    if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        userId = window.Telegram.WebApp.initDataUnsafe.user.id;
    }

    if (!userId) {
        alert('❌ Ошибка: не удалось определить пользователя');
        return;
    }

    steamState.isProcessing = true;
    updateSteamButton();

    try {
        const orderData = {
            user_id: userId,
            product_id: steamState.productId,
            product_name: `Steam пополнение ${steamState.amount} ${steamState.currency}`,
            product_slug: 'steam',
            region_slug: 'direct',
            quantity: steamState.amount,  // ← СУММА, а не 1
            amount: Math.round(steamState.amount * 0.0141 * 100) / 100,
            currency: 'rub',
            note: { login: login, amount: steamState.amount, currency: steamState.currency }
        };

        console.log('📦 Steam order data:', orderData);

        const result = await API.createOrder(orderData);

        console.log('✅ Steam заказ создан:', result);

        showToast('✅ Заказ успешно создан!');

        setTimeout(() => {
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.close();
            } else {
                window.location.href = 'about:blank';
            }
        }, 500);

    } catch (error) {
        console.error('Ошибка Steam заказа:', error);
        alert(`❌ Ошибка: ${error.message || 'Не удалось выполнить пополнение'}`);
    } finally {
        steamState.isProcessing = false;
        updateSteamButton();
    }
}

export function openSteamScreen() {
    steamState.currency = 'RUB';
    steamState.login = '';
    steamState.amount = 1000;
    steamState.isProcessing = false;

    // Устанавливаем productId для текущей валюты
    if (steamCurrencies[steamState.currency]) {
        steamState.productId = steamCurrencies[steamState.currency].product_id;
    }

    steamEl.loginInput.value = '';
    setSteamAmount(1000);
    renderSteamCurrencies();
    renderSteamQuickAmounts();
    updateSteamInfo();
    updateSteamButton();
    updateSteamLimits();

    if (steamEl.infoBlock) {
        steamEl.infoBlock.classList.add('hidden');
        steamEl.toggleBtn.textContent = '?';
    }

    showScreen('screen-steam');
}

// Инициализация Steam при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('screen-steam')) {
        initSteam();
    }
});