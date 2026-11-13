(() => {
  const form = document.querySelector('.training-context');
  const siteName = form.querySelector('[data-training-site]');
  const manager = form.querySelector('[data-training-manager]');
  const printValue = document.createElement('span');
  printValue.className = 'training-manager-print';
  manager.after(printValue);

  const context = parent === window ? null : parent.MIN_WORKS_DOCUMENT_CONTEXT;
  const key = 'minworks-training-manager-v1:' + location.pathname;
  let currentSite = '';
  let overrides = {};
  try { overrides = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch {}

  function mirror() {
    printValue.textContent = manager.value || '________________';
  }

  function applyContext(site) {
    const siteKey = site?.id || site?.name || '';
    currentSite = siteKey;
    siteName.textContent = site?.name || '________________';
    manager.value = Object.hasOwn(overrides, siteKey) ? overrides[siteKey] : site?.manager || '';
    mirror();
  }

  manager.addEventListener('input', () => {
    overrides = { ...overrides, [currentSite]: manager.value };
    try { localStorage.setItem(key, JSON.stringify(overrides)); } catch {}
    mirror();
  });
  window.addEventListener('beforeprint', mirror);
  window.MIN_WORKS_PRINT_FORM = { applyContext };
  applyContext(context?.current?.());
})();
