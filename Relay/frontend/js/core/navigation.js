// =============================================
// БЛОК: УПРАВЛЕНИЕ ЭКРАНАМИ
// =============================================

export function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

// =============================================
// БЛОК: НАВИГАЦИЯ ПО data-screen
// =============================================

export function initNavigation() {
    document.querySelectorAll('[data-screen]').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const screenId = this.getAttribute('data-screen');
            if (screenId) {
                showScreen(screenId);
            }
        });
    });
}