(() => {
  'use strict';
  document.querySelector('[data-bottom-menu]')?.addEventListener('click', () => {
    document.querySelector('[data-mobile-action="menu"]')?.click();
  });
})();
