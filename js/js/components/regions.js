import { AppState, els } from '../core/app.js';
import { selectRegion } from '../screens/gift-cards.js';
import { updateScrollIndicator } from './scroll.js';

// =============================================
// БЛОК: КАРТА ФЛАГОВ
// =============================================

export const flagMap = {
    'TR': '\u{1F1F9}\u{1F1F7}',
    'IN': '\u{1F1EE}\u{1F1F3}',
    'US': '\u{1F1FA}\u{1F1F8}',
    'GB': '\u{1F1EC}\u{1F1E7}',
    'DE': '\u{1F1E9}\u{1F1EA}',
    'FR': '\u{1F1EB}\u{1F1F7}',
    'IT': '\u{1F1EE}\u{1F1F9}',
    'ES': '\u{1F1EA}\u{1F1F8}',
    'CA': '\u{1F1E8}\u{1F1E6}',
    'AU': '\u{1F1E6}\u{1F1FA}',
    'BR': '\u{1F1E7}\u{1F1F7}',
    'JP': '\u{1F1EF}\u{1F1F5}',
    'AE': '\u{1F1E6}\u{1F1EA}',
    'RU': '\u{1F1F7}\u{1F1FA}',
    'KZ': '\u{1F1F0}\u{1F1FF}',
    'UA': '\u{1F1FA}\u{1F1E6}',
    'EU': '\u{1F1EA}\u{1F1FA}',
    'AT': '\u{1F1E6}\u{1F1F9}',
    'BE': '\u{1F1E7}\u{1F1EA}',
    'BG': '\u{1F1E7}\u{1F1EC}',
    'HR': '\u{1F1ED}\u{1F1F7}',
    'CY': '\u{1F1E8}\u{1F1FE}',
    'CZ': '\u{1F1E8}\u{1F1FF}',
    'DK': '\u{1F1E9}\u{1F1F0}',
    'EE': '\u{1F1EA}\u{1F1EA}',
    'FI': '\u{1F1EB}\u{1F1EE}',
    'GR': '\u{1F1EC}\u{1F1F7}',
    'HU': '\u{1F1ED}\u{1F1FA}',
    'IE': '\u{1F1EE}\u{1F1EA}',
    'LV': '\u{1F1F1}\u{1F1FB}',
    'LT': '\u{1F1F1}\u{1F1F9}',
    'LU': '\u{1F1F1}\u{1F1FA}',
    'MT': '\u{1F1F2}\u{1F1F9}',
    'NL': '\u{1F1F3}\u{1F1F1}',
    'PL': '\u{1F1F5}\u{1F1F1}',
    'PT': '\u{1F1F5}\u{1F1F9}',
    'RO': '\u{1F1F7}\u{1F1F4}',
    'SK': '\u{1F1F8}\u{1F1F0}',
    'SI': '\u{1F1F8}\u{1F1EE}',
    'SE': '\u{1F1F8}\u{1F1EA}',
    'CH': '\u{1F1E8}\u{1F1ED}',
    'NO': '\u{1F1F3}\u{1F1F4}',
    'NZ': '\u{1F1F3}\u{1F1FF}',
    'SG': '\u{1F1F8}\u{1F1EC}',
    'MY': '\u{1F1F2}\u{1F1FE}',
    'ID': '\u{1F1EE}\u{1F1E9}',
    'PH': '\u{1F1F5}\u{1F1ED}',
    'TH': '\u{1F1F9}\u{1F1ED}',
    'VN': '\u{1F1FB}\u{1F1F3}',
    'KR': '\u{1F1F0}\u{1F1F7}',
    'SA': '\u{1F1F8}\u{1F1E6}',
    'QA': '\u{1F1F6}\u{1F1E6}',
    'KW': '\u{1F1F0}\u{1F1FC}',
    'LB': '\u{1F1F1}\u{1F1E7}',
    'OM': '\u{1F1F4}\u{1F1F2}',
    'BH': '\u{1F1E7}\u{1F1ED}',
    'ZA': '\u{1F1FF}\u{1F1E6}',
    'MX': '\u{1F1F2}\u{1F1FD}',
    'AR': '\u{1F1E6}\u{1F1F7}',
    'CL': '\u{1F1E8}\u{1F1F1}',
    'CO': '\u{1F1E8}\u{1F1F4}',
    'PE': '\u{1F1F5}\u{1F1EA}',
    'VE': '\u{1F1FB}\u{1F1EA}',
    'EG': '\u{1F1EA}\u{1F1EC}',
    'NG': '\u{1F1F3}\u{1F1EC}',
    'KE': '\u{1F1F0}\u{1F1EA}',
    'IL': '\u{1F1EE}\u{1F1F1}',
    'PK': '\u{1F1F5}\u{1F1F0}',
    'BD': '\u{1F1E7}\u{1F1E9}',
    'WW': '🌍',
};

// =============================================
// БЛОК: РЕНДЕРИНГ РЕГИОНОВ
// =============================================

export function renderRegions(regions) {
    const container = els.regionScroll;
    container.innerHTML = '';

    regions.forEach((region, index) => {
        const btn = document.createElement('button');
        btn.className = `region-btn${index === 0 ? ' active' : ''}`;
        const flag = flagMap[region.country_code] || '🌍';
        btn.textContent = `${flag} ${region.name}`;
        btn.dataset.slug = region.slug;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.region-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectRegion(region.slug);
        });
        container.appendChild(btn);
    });

    updateScrollIndicator('region-scroll', 'region-indicator');
}

// =============================================
// БЛОК: ИНИЦИАЛИЗАЦИЯ ИНДИКАТОРОВ
// =============================================

export function initIndicators() {
    updateScrollIndicator('region-scroll', 'region-indicator');
    updateScrollIndicator('nominal-scroll', 'nominal-indicator');
}