// =============================================
// БЛОК: ИНИЦИАЛИЗАЦИЯ СКРОЛЛЕРОВ
// =============================================

export function initScrollDrag(containerSelector) {
    const containers = document.querySelectorAll(containerSelector);
    
    containers.forEach(container => {
        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;

        container.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
            container.style.cursor = 'grabbing';
        });

        container.addEventListener('mouseleave', () => {
            isDown = false;
            container.style.cursor = 'grab';
        });

        container.addEventListener('mouseup', () => {
            isDown = false;
            container.style.cursor = 'grab';
        });

        container.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 1.5;
            container.scrollLeft = scrollLeft - walk;
        });

        let touchStartX = 0;
        let touchScrollLeft = 0;

        container.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].pageX - container.offsetLeft;
            touchScrollLeft = container.scrollLeft;
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            const x = e.touches[0].pageX - container.offsetLeft;
            const walk = (x - touchStartX) * 1.5;
            container.scrollLeft = touchScrollLeft - walk;
        }, { passive: true });
    });
}

// =============================================
// БЛОК: ИНДИКАТОР СКРОЛЛА
// =============================================

export function updateScrollIndicator(containerId, indicatorId) {
    const container = document.getElementById(containerId);
    const indicator = document.getElementById(indicatorId);
    if (!container || !indicator) return;

    if (container.scrollWidth > container.clientWidth) {
        indicator.classList.add('active');
    } else {
        indicator.classList.remove('active');
    }
}