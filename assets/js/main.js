document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.querySelector('.menu-btn');
    const navMenu = document.querySelector('.nav-menu');

    if (menuBtn && navMenu) {
        menuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('is-active');
            menuBtn.classList.toggle('is-active');

            // Оновлюємо доступність для скрінрідерів
            const isExpanded = menuBtn.classList.contains('is-active');
            menuBtn.setAttribute('aria-expanded', isExpanded);
        });
    }
});