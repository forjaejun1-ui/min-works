/* Print-only construction schedule. No application data is persisted. */
(() => {
  function init() {
    const view = document.querySelector('#documentsView');
    if (!view || document.querySelector('#schedulePanel')) return;
    const icon = '<span class="safety-doc-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M8 9h10M11 13h7M9 17h6"/></svg></span>';
    const panel = document.createElement('section');
    panel.id = 'schedulePanel';
    panel.dataset.docPanel = 'schedule';
    panel.hidden = true;
    panel.innerHTML = '<button type="button" class="safety-back" data-schedule-back>← 서류 목록</button><iframe title="공정표 작성" style="display:block;width:100%;height:1400px;border:0;margin-top:16px;border-radius:16px"></iframe>';
    view.append(panel);
    const frame = panel.querySelector('iframe');
    new MutationObserver(() => {
      if (panel.hidden) document.querySelectorAll('[data-schedule-open]').forEach(b => b.classList.remove('selected'));
    }).observe(panel, {attributes:true, attributeFilter:['hidden']});
    function open() {
      window.showView('documents');
      view.querySelectorAll('[data-doc-panel]').forEach(p => p.hidden = p !== panel);
      view.querySelector('.safety-library').hidden = true;
      view.querySelector('.sample-page-head').hidden = true;
      document.querySelector('.nav-cluster')?.classList.add('open');
      document.querySelector('.nav-parent[data-view="documents"]')?.setAttribute('aria-expanded', 'true');
      document.querySelectorAll('[data-safety-doc]').forEach(b => b.classList.remove('selected'));
      document.querySelectorAll('[data-schedule-open]').forEach(b => b.classList.add('selected'));
      if (!frame.getAttribute('src')) frame.src = 'schedule-tool.html?v=schedule1';
    }
    const nav = document.querySelector('.safety-primary-nav [data-safety-doc="tbm-minutes"]');
    const card = document.querySelector('.safety-document-grid [data-safety-doc="tbm-minutes"]');
    for (const [anchor, isNav] of [[nav, true], [card, false]]) {
      if (!anchor) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.scheduleOpen = '';
      if (isNav) button.className = 'nav-subgroup';
      button.innerHTML = isNav ? icon + '<b>공정표 작성</b>' : icon + '<div><b>공정표 작성</b><small>A3 · A4 인쇄 / PDF</small></div><span class="safety-card-arrow" aria-hidden="true">→</span>';
      button.addEventListener('click', open);
      anchor.after(button);
    }
    const caption = document.querySelector('.safety-daily-section > p');
    if (caption) caption.textContent = 'TBM 일지 · 공정표 작성 · 현장 사진대지 제작';
    document.addEventListener('click', event => {
      if (event.target.closest('[data-safety-doc], [data-safety-back], .nav-parent[data-view="documents"]')) {
        document.querySelectorAll('[data-schedule-open]').forEach(b => b.classList.remove('selected'));
      }
    });
    panel.querySelector('[data-schedule-back]').addEventListener('click', () => {
      panel.hidden = true;
      view.querySelector('.safety-library').hidden = false;
      view.querySelector('.sample-page-head').hidden = false;
      document.querySelectorAll('[data-schedule-open]').forEach(b => b.classList.remove('selected'));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
