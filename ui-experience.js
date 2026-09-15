/* test61 experience sample: splash, concise headers, and unread-only NEW badges */
(() => {
  'use strict';


  const splash = document.getElementById('mwSplash');
  const openingPreferenceKey = 'minWorksOpeningEnabledV1';
  const openingToggle = document.getElementById('openingToggle');
  const openingEnabled = localStorage.getItem(openingPreferenceKey) !== 'false';
  if (openingToggle) {
    openingToggle.checked = openingEnabled;
    openingToggle.addEventListener('change', () => {
      localStorage.setItem(openingPreferenceKey, String(openingToggle.checked));
    });
  }
  const splashWord = document.querySelector('.mw-splash-word');
  if (splashWord) {
    const letters = [...splashWord.textContent];
    splashWord.textContent = '';
    letters.forEach((letter, index) => {
      const span = document.createElement('span');
      span.textContent = letter === ' ' ? '\u00a0' : letter;
      span.style.setProperty('--letter-index', index);
      span.setAttribute('aria-hidden', 'true');
      splashWord.appendChild(span);
    });
  }
  let splashFinished = false;
  const finishSplash = () => {
    if (!splash || splashFinished) return;
    splashFinished = true;
    splash.classList.add('leaving');
    window.setTimeout(() => splash.remove(), 480);
  };
  if (!openingEnabled) {
    splash?.remove();
  } else {
    const start = performance.now();
    const afterLoad = () => window.setTimeout(finishSplash, Math.max(0, 2800 - (performance.now() - start)));
    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
    window.setTimeout(finishSplash, 4800);
  }

  const syncCurrentView = () => {
    const active = document.querySelector('.view.active');
    if (!active?.id) return;
    document.body.dataset.uiView = active.id.replace(/View$/, '');
    const ownTitle = active.querySelector('.section-title h2, .sample-page-head h2, .help-hero h2');
    document.body.classList.toggle('ui-view-has-title', Boolean(ownTitle?.textContent.trim()));
  };
  document.querySelectorAll('.view').forEach(view => {
    new MutationObserver(syncCurrentView).observe(view, { attributes: true, attributeFilter: ['class'] });
  });
  syncCurrentView();

  const unreadKey = 'minWorksUnreadV1';
  const latestPatch = 'v55';
  const readUnread = () => {
    try { return JSON.parse(localStorage.getItem(unreadKey) || '{}'); }
    catch { return {}; }
  };
  let unread = readUnread();
  const renderUnread = () => {
    document.querySelectorAll('[data-unread-badge]').forEach(badge => {
      badge.hidden = !(Number(unread[badge.dataset.unreadBadge]) > 0);
    });
  };
  const saveUnread = () => {
    localStorage.setItem(unreadKey, JSON.stringify(unread));
    renderUnread();
  };
  const markUnread = (view, count = 1) => {
    if (!view || document.getElementById(`${view}View`)?.classList.contains('active')) return;
    unread[view] = Math.max(Number(unread[view]) || 0, Number(count) || 1);
    saveUnread();
  };
  const clearUnread = view => {
    if (!view || !unread[view]) return;
    delete unread[view];
    if (view === 'patch') localStorage.setItem('minWorksSeenPatchV1', latestPatch);
    saveUnread();
  };
  window.MIN_WORKS_TEST_UNREAD = Object.freeze({ mark: markUnread, clear: clearUnread });
  window.addEventListener('minworks:new-content', event => markUnread(event.detail?.view, event.detail?.count));

  if (localStorage.getItem('minWorksSeenPatchV1') !== latestPatch) markUnread('patch');
  renderUnread();

  document.querySelectorAll('[data-view]').forEach(button => {
    button.addEventListener('click', () => window.setTimeout(() => {
      syncCurrentView();
      clearUnread(button.dataset.view);
    }, 0));
  });
  document.querySelectorAll('[data-go]').forEach(button => {
    button.addEventListener('click', () => window.setTimeout(() => {
      syncCurrentView();
      clearUnread(button.dataset.go);
    }, 0));
  });

  const watchNewCards = (selector, view) => {
    const root = document.querySelector(selector);
    if (!root) return;
    new MutationObserver(records => {
      const added = records.reduce((total, record) => total + [...record.addedNodes].filter(node => node.nodeType === 1).length, 0);
      if (added) markUnread(view, added);
    }).observe(root, { childList: true });
  };
  watchNewCards('#dailyListScreen', 'daily');
  watchNewCards('#riskView', 'risk');
  watchNewCards('#documentsView', 'documents');
})();
