// =============================================
// БЛОК: ГЛОБАЛЬНОЕ СОСТОЯНИЕ
// =============================================

export const AppState = {
    // Для Gift Cards
    currentServiceSlug: null,
    currentRegionSlug: null,
    currentNominal: null,
    allRegions: []
};

// =============================================
// БЛОК: DOM ССЫЛКИ ДЛЯ GIFT CARDS
// =============================================

export const els = {
    detailIcon: document.getElementById('service-detail-icon'),
    detailName: document.getElementById('service-detail-name'),
    detailSubtitle: document.querySelector('.service-detail-subtitle'),
    instructionText: document.getElementById('instruction-text'),
    regionScroll: document.getElementById('region-scroll'),
    nominalScroll: document.getElementById('nominal-scroll'),
    totalPrice: document.getElementById('total-price'),
    payBtn: document.getElementById('pay-btn'),
    regionIndicator: document.getElementById('region-indicator'),
    nominalIndicator: document.getElementById('nominal-indicator')
};