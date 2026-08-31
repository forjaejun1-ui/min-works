(() => {
  'use strict';

  const GOOGLE_KEY = 'minWorksPersonalGoogleCalendarV1';
  setupMobileNavigation();
  setupHomeGoogleCalendar();
  setupReportDownloads();

  function setupMobileNavigation() {
    const shortcuts = document.querySelector('.mobile-header-shortcuts');
    if (shortcuts) {
      shortcuts.innerHTML = `<button type="button" data-mobile-action="home"><span class="material-symbols-rounded">home</span><b>MIN WORKS 홈</b></button><button type="button" data-mobile-action="menu"><span class="material-symbols-rounded">apps</span><b>전체 메뉴</b></button>`;
      shortcuts.querySelector('[data-mobile-action="home"]').addEventListener('click', () => goView('dashboard'));
      shortcuts.querySelector('[data-mobile-action="menu"]').addEventListener('click', openMenu);
    }
    const sheet = document.createElement('div');
    sheet.className = 'mobile-all-menu';
    sheet.innerHTML = `<div class="mobile-menu-backdrop"></div><section><header><div><p class="eyebrow">ALL MENU</p><h2>전체 메뉴</h2></div><button class="mobile-menu-close" aria-label="닫기">×</button></header><div class="mobile-menu-grid"><button data-menu-view="dashboard"><span class="material-symbols-rounded">home</span><b>홈</b></button><button data-menu-view="sites"><span class="material-symbols-rounded">construction</span><b>현장</b></button><button data-menu-view="daily"><span class="material-symbols-rounded">description</span><b>공사일보</b></button><button data-menu-view="finance"><span class="material-symbols-rounded">payments</span><b>자금 현황</b></button><button data-menu-view="issues"><span class="material-symbols-rounded">report_problem</span><b>이슈</b></button><button data-menu-view="settings"><span class="material-symbols-rounded">settings</span><b>설정</b></button><button data-menu-view="help"><span class="material-symbols-rounded">help</span><b>사용법</b></button></div></section>`;
    document.body.appendChild(sheet);
    sheet.querySelector('.mobile-menu-close').addEventListener('click', closeMenu);
    sheet.querySelector('.mobile-menu-backdrop').addEventListener('click', closeMenu);
    sheet.querySelectorAll('[data-menu-view]').forEach(button => button.addEventListener('click', () => { closeMenu(); goView(button.dataset.menuView); }));
    function openMenu() { sheet.classList.add('show'); }
    function closeMenu() { sheet.classList.remove('show'); }
  }

  function goView(view) {
    window.showView(view);
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item.dataset.view === view));
  }

  function setupHomeGoogleCalendar() {
    const panel = document.querySelector('.home-calendar-panel');
    if (!panel) return;
    const render = () => {
      const connected = localStorage.getItem(GOOGLE_KEY) === 'connected';
      panel.innerHTML = `<div class="panel-head"><div><p class="eyebrow">PERSONAL GOOGLE CALENDAR</p><h2>다가오는 일정</h2></div><button class="google-home-action ${connected ? 'connected' : ''}">${connected ? '자세히 보기' : 'Google 캘린더 연동하기'}</button></div><div class="google-home-state ${connected ? 'connected' : ''}"><span class="material-symbols-rounded">${connected ? 'event_available' : 'calendar_add_on'}</span><div><b>${connected ? '개인 Google 캘린더가 연결되어 있습니다.' : 'Google 캘린더를 연결하면 여기에 일정이 표시됩니다.'}</b><p>${connected ? '개인 일정은 본인에게만 보이며 회사 직원에게 공유되지 않습니다.' : '연결은 선택 사항이며, 연결 전에 개인정보 안내를 확인합니다.'}</p></div></div>`;
      panel.querySelector('.google-home-action').addEventListener('click', () => {
        if (connected) {
          window.open('https://calendar.google.com/calendar/u/0/r/agenda', '_blank', 'noopener');
          return;
        }
        const connect = document.querySelector('.google-connect');
        if (connect) connect.click();
        else notify('Google 연결 화면을 준비하지 못했습니다. 새로고침 후 다시 시도해주세요.');
      });
    };
    document.querySelector('.google-consent-confirm')?.addEventListener('click', () => setTimeout(render, 0));
    document.addEventListener('click', event => { if (event.target.closest('.google-disconnect')) setTimeout(render, 0); });
    render();
  }

  function setupReportDownloads() {
    const modal = document.createElement('div');
    modal.className = 'report-download-modal';
    modal.innerHTML = `<div class="report-download-backdrop"></div><section><button class="report-download-close" aria-label="닫기">×</button><p class="eyebrow">PDF DOWNLOAD</p><h2>공사일보 저장</h2><p class="report-download-subtitle">저장 방식을 선택하세요.</p><label class="report-site-select" hidden>현장 선택<select></select></label><div class="report-download-summary"><span><b id="pdfReportCount">1</b><small>일보</small></span><span><b id="pdfPhotoCount">0</b><small>사진</small></span><span><b id="pdfPageCount">1</b><small>예상 페이지</small></span></div><div class="report-download-options"><button data-pdf-photos="include"><span class="material-symbols-rounded">photo_library</span><div><b>사진 포함 PDF</b><small>일보 아래에 등록 사진을 함께 배치</small></div><em>추천</em></button><button data-pdf-photos="exclude"><span class="material-symbols-rounded">description</span><div><b>사진 제외 PDF</b><small>작업 내용과 확인 기록만 저장</small></div></button></div><p class="report-download-note"><span class="material-symbols-rounded">info</span>휴대폰에서는 인쇄 화면에서 ‘PDF로 저장’을 선택하세요.</p></section>`;
    document.body.appendChild(modal);
    let selectedCards = [];
    let bulkMode = false;
    const siteSelect = modal.querySelector('select');
    const close = () => modal.classList.remove('show');
    modal.querySelector('.report-download-close').addEventListener('click', close);
    modal.querySelector('.report-download-backdrop').addEventListener('click', close);

    const reportCards = () => [...document.querySelectorAll('.report-card')];
    const getPhotos = card => typeof window.reportPhotos === 'function' ? window.reportPhotos(card) : (Array.isArray(card.reportPhotos) ? card.reportPhotos : []);
    const statedPhotoCount = card => Number(card.querySelector('p')?.textContent.match(/사진\s*(\d+)장/)?.[1] || getPhotos(card).length);
    const refreshSummary = () => {
      if (bulkMode) selectedCards = reportCards().filter(card => card.dataset.site === siteSelect.value || card.dataset.site.includes(siteSelect.value));
      const photoCount = selectedCards.reduce((sum,card) => sum + statedPhotoCount(card), 0);
      document.getElementById('pdfReportCount').textContent = selectedCards.length;
      document.getElementById('pdfPhotoCount').textContent = photoCount;
      document.getElementById('pdfPageCount').textContent = selectedCards.length + Math.ceil(photoCount / 2);
    };
    siteSelect.addEventListener('change', refreshSummary);

    function openDialog(card = null) {
      bulkMode = !card;
      const selectLabel = modal.querySelector('.report-site-select');
      selectLabel.hidden = !bulkMode;
      if (bulkMode) {
        const sites = [...new Set(reportCards().map(item => item.dataset.site))];
        siteSelect.replaceChildren(...sites.map(site => { const option = document.createElement('option'); option.value = site; option.textContent = site; return option; }));
        selectedCards = sites.length ? reportCards().filter(item => item.dataset.site === sites[0]) : [];
        modal.querySelector('h2').textContent = '현장 전체 공사일보 저장';
      } else {
        selectedCards = [card];
        modal.querySelector('h2').textContent = '공사일보 PDF 저장';
      }
      refreshSummary();
      modal.classList.add('show');
    }

    reportCards().forEach(card => addCardDownload(card));
    const list = document.getElementById('todayReports');
    if (list) new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node.matches?.('.report-card')) addCardDownload(node); }))).observe(list,{childList:true});
    function addCardDownload(card) {
      if (card.querySelector('.report-pdf-action')) return;
      const action = document.createElement('span');
      action.className = 'report-pdf-action material-symbols-rounded';
      action.textContent = 'download';
      action.title = '이 일보 PDF 저장';
      action.tabIndex = 0;
      action.setAttribute('role','button');
      const activate = event => { event.preventDefault(); event.stopPropagation(); openDialog(card); };
      action.addEventListener('click', activate);
      action.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') activate(event); });
      card.appendChild(action);
    }

    const allButton = document.createElement('button');
    allButton.className = 'export-site-btn all-reports-pdf';
    allButton.innerHTML = '<span class="material-symbols-rounded">picture_as_pdf</span>현장 전체 PDF';
    allButton.addEventListener('click', () => openDialog());
    document.querySelector('#dailyView .title-actions')?.prepend(allButton);

    const viewerButton = document.createElement('button');
    viewerButton.className = 'viewer-pdf-button';
    viewerButton.innerHTML = '<span class="material-symbols-rounded">download</span>PDF 저장';
    viewerButton.addEventListener('click', () => {
      const card = reportCards().find(item => item.dataset.site === window.activeReportSite) || reportCards().find(item => item.dataset.site === document.getElementById('viewerSite')?.textContent);
      if (card) openDialog(card); else notify('선택한 일보를 찾지 못했습니다.');
    });
    document.querySelector('#reportViewer .viewer-actions')?.prepend(viewerButton);

    modal.querySelectorAll('[data-pdf-photos]').forEach(button => button.addEventListener('click', () => {
      if (!selectedCards.length) { notify('저장할 공사일보가 없습니다.'); return; }
      printReports(selectedCards, button.dataset.pdfPhotos === 'include');
      close();
    }));

    function printReports(cards, includePhotos) {
      const popup = window.open('', '_blank');
      if (!popup) { notify('팝업을 허용한 뒤 다시 시도해주세요.'); return; }
      const reports = cards.map(card => {
        const site = escapeText(card.dataset.site);
        const title = escapeText(card.querySelector('div>b')?.textContent || '공사일보');
        const summary = escapeText(card.querySelector('div>p')?.textContent || '작업 내용');
        const author = escapeText(card.querySelector('.report-author b')?.textContent || '작성자 미상');
        const photos = includePhotos ? getPhotos(card) : [];
        return `<article class="pdf-report"><header><p>MIN WORKS</p><h1>${site}</h1><h2>${title}</h2></header><dl><div><dt>작성자</dt><dd>${author}</dd></div><div><dt>작업 요약</dt><dd>${summary}</dd></div><div><dt>확인 기록</dt><dd>앱 등록 기록 기준</dd></div></dl><section><h3>공정별 작업 내용</h3><table><thead><tr><th>공정</th><th>인원</th><th>작업내용</th></tr></thead><tbody><tr><td>등록 공정</td><td>-</td><td>${summary}</td></tr></tbody></table></section>${includePhotos ? `<section class="pdf-photos"><h3>현장사진 ${photos.length}장</h3>${photos.length ? `<div>${photos.map((photo,index) => `<figure><img src="${photo.src}" alt="현장사진 ${index+1}"><figcaption>${escapeText(photo.type || '현장사진')} ${index+1}</figcaption></figure>`).join('')}</div>` : '<p>이 일보에 저장된 사진 원본이 없습니다.</p>'}</section>` : ''}</article>`;
      }).join('');
      popup.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>MIN WORKS 공사일보</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#181818;font-family:Arial,"Noto Sans KR",sans-serif}.pdf-report{page-break-after:always}.pdf-report:last-child{page-break-after:auto}header{border-top:5px solid #7fbc03;padding:16px 0 12px}header p{margin:0;color:#689900;font-weight:800;font-size:11px}h1{margin:7px 0 2px;font-size:23px}h2{margin:0;color:#666;font-size:14px}dl{display:grid;grid-template-columns:1fr 2fr 1fr;margin:12px 0;border:1px solid #ddd}dl div{padding:10px;border-right:1px solid #ddd}dl div:last-child{border:0}dt{color:#777;font-size:10px}dd{margin:4px 0 0;font-size:12px;font-weight:700}h3{margin:18px 0 8px;font-size:14px}table{width:100%;border-collapse:collapse}th,td{padding:9px;border:1px solid #ddd;font-size:11px;text-align:left}th{background:#f4f6f1}.pdf-photos>div{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pdf-photos figure{margin:0;page-break-inside:avoid}.pdf-photos img{width:100%;height:240px;object-fit:contain;background:#eee}.pdf-photos figcaption{padding:5px;color:#666;font-size:10px;text-align:center}</style></head><body>${reports}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),350));<\/script></body></html>`);
      popup.document.close();
    }
  }

  function escapeText(value) {
    return String(value || '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  }
})();
