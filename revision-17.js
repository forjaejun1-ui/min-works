(() => {
  'use strict';
  const topbar = document.querySelector('.topbar');
  if (!topbar || topbar.querySelector('.mobile-header-shortcuts')) return;
  const shortcuts = document.createElement('nav');
  shortcuts.className = 'mobile-header-shortcuts';
  shortcuts.setAttribute('aria-label', '모바일 빠른 이동');
  shortcuts.innerHTML = `<button type="button" data-mobile-go="dashboard"><span class="material-symbols-rounded">home</span><b>MIN WORKS</b></button><button type="button" data-mobile-go="calendar"><span class="material-symbols-rounded">calendar_month</span><b>일정</b><small>Google 연결</small></button>`;
  topbar.prepend(shortcuts);
  shortcuts.querySelectorAll('[data-mobile-go]').forEach(button => button.addEventListener('click', () => {
    const view = button.dataset.mobileGo;
    window.showView(view);
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item.dataset.view === view));
  }));
})();
