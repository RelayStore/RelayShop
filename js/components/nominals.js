import { AppState, els } from '../core/app.js';
import { selectNominal } from '../screens/gift-cards.js';
import { updateScrollIndicator } from './scroll.js';

// =============================================
// БЛОК: РЕНДЕРИНГ НОМИНАЛОВ
// =============================================

export function renderNominals(nominals) {
    const container = els.nominalScroll;
    container.innerHTML = '';

    const firstAvailableIndex = nominals.findIndex(n => n.stock > 0);

    nominals.forEach((nominal, index) => {
        const isOutOfStock = nominal.stock === 0;
        const isActive = !isOutOfStock && index === firstAvailableIndex;

        const btn = document.createElement('button');
        btn.className = `nominal-btn${isActive ? ' active' : ''}${isOutOfStock ? ' out-of-stock' : ''}`;

        const stockText = isOutOfStock ? '❌ нет в наличии' : `осталось: ${nominal.stock}`;

        btn.innerHTML = `
            <span class="nominal-amount">${nominal.amount} ${nominal.currency}</span>
            <span class="nominal-stock${isOutOfStock ? ' out-of-stock-text' : ''}">${stockText}</span>
        `;

        btn.dataset.id = nominal.id;
        btn.dataset.nominal = JSON.stringify(nominal);

        if (!isOutOfStock) {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.nominal-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectNominal(nominal);
            });
        }

        container.appendChild(btn);
    });

    if (firstAvailableIndex !== -1) {
        selectNominal(nominals[firstAvailableIndex]);
    } else {
        updateTotal(null);
    }

    updateScrollIndicator('nominal-scroll', 'nominal-indicator');
}

// =============================================
// БЛОК: ОБНОВЛЕНИЕ ИТОГО
// =============================================

export function updateTotal(nominal) {
    if (!nominal || nominal.stock === 0) {
        els.totalPrice.textContent = 'Итого: 0 руб';
        els.payBtn.classList.add('disabled');
        return;
    }

    els.totalPrice.textContent = `Итого: ${nominal.price} руб`;
    els.payBtn.classList.remove('disabled');
}