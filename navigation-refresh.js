/* MIN WORKS navigation refresh — v54 */
(() => {
  'use strict';

  window.addEventListener('error', event => {
    window.MIN_WORKS_LAST_UI_ERROR = event.error?.stack || event.message || '';
  });

  const nav = document.getElementById('sideNav');
  const financeView = document.getElementById('financeView');
  if (!nav || !financeView) return;

  nav.innerHTML = `
    <p class="nav-section-label">WORKSPACE</p>
    <button class="nav-item active" data-view="dashboard"><span class="nav-icon material-symbols-rounded">home</span><b>홈</b></button>
    <button class="nav-item" data-view="sites"><span class="nav-icon material-symbols-rounded">apartment</span><b>현장관리</b></button>
    <button class="nav-item" data-view="daily"><span class="nav-icon material-symbols-rounded">edit_note</span><b>공사일보</b><em class="nav-new" data-unread-badge="daily" hidden>NEW</em></button>
    <button class="nav-item" data-view="risk"><span class="nav-icon material-symbols-rounded">health_and_safety</span><b>위험성평가</b><em class="nav-new" data-unread-badge="risk" hidden>NEW</em></button>
    <div class="nav-cluster" data-document-menu>
      <button class="nav-item nav-parent" data-view="documents" aria-expanded="false">
        <span class="nav-icon material-symbols-rounded">folder_open</span><b>현장서류</b><em class="nav-new" data-unread-badge="documents" hidden>NEW</em><i class="material-symbols-rounded">expand_more</i>
      </button>
      <div class="nav-submenu">
        <button class="nav-subgroup" type="button" data-doc-folder="permits" aria-expanded="true"><span class="material-symbols-rounded">description</span><b>각종허가서</b><em>6</em><i class="material-symbols-rounded">expand_more</i></button>
        <div class="permit-submenu">
          <button type="button" data-doc-item="fire">화기작업허가서</button>
          <button type="button" data-doc-item="height">고소작업허가서</button>
          <button type="button" data-doc-item="horse">말비계사용허가서</button>
          <button type="button" data-doc-item="ladder">사다리사용허가서</button>
          <button type="button" data-doc-item="bt">BT비계 사용허가서</button>
          <button type="button" data-doc-item="saw">톱다이 사용허가서</button>
        </div>
        <button class="nav-subgroup" type="button" data-doc-folder="equipment"><span class="material-symbols-rounded">precision_manufacturing</span><b>장비관리</b><i class="material-symbols-rounded">chevron_right</i></button>
        <button class="nav-subgroup" type="button" data-doc-folder="newhire"><span class="material-symbols-rounded">person_add</span><b>신규채용자서류</b><i class="material-symbols-rounded">chevron_right</i></button>
      </div>
    </div>
    <div class="nav-divider"></div>
    <button class="nav-item nav-utility" data-view="settings"><span class="nav-icon material-symbols-rounded">settings</span><b>설정</b></button>
    <button class="nav-item nav-utility" data-view="help"><span class="nav-icon material-symbols-rounded">help</span><b>사용법</b></button>
    <button class="nav-item nav-utility" data-view="patch"><span class="nav-icon material-symbols-rounded">new_releases</span><b>패치노트</b><em class="nav-new" data-unread-badge="patch" hidden>NEW</em></button>
  `;

  financeView.insertAdjacentHTML('beforebegin', `
    <section class="view" id="riskView">
      <div class="sample-page-head">
        <div><p class="eyebrow">SAFETY FIRST</p><h2>위험성평가</h2><p>작업 전 위험요인을 확인하고 조치 상태를 한눈에 관리합니다.</p></div>
        <button class="primary sample-action"><span class="material-symbols-rounded">add</span>새 평가 작성</button>
      </div>
      <div class="sample-metric-grid">
        <article><span class="material-symbols-rounded safe">verified_user</span><div><small>오늘 평가</small><b>3건</b><em>전체 확인 완료</em></div></article>
        <article><span class="material-symbols-rounded caution">warning</span><div><small>조치 필요</small><b>2건</b><em>금일 처리 예정</em></div></article>
        <article><span class="material-symbols-rounded">groups</span><div><small>참여 인원</small><b>18명</b><em>서명 완료 16명</em></div></article>
      </div>
      <section class="sample-panel">
        <header><div><small>오늘 · 연세대학교 고를샘</small><h3>천장 경량철골 및 고소작업</h3></div><span class="sample-status progress">조치 중</span></header>
        <div class="risk-row"><span class="risk-level high">높음</span><div><b>고소작업 중 추락 위험</b><small>작업발판 점검 · 안전대 체결 · 하부 통제구역 설정</small></div><em>담당 김재준</em></div>
        <div class="risk-row"><span class="risk-level medium">보통</span><div><b>자재 인양 중 낙하 위험</b><small>인양로프 점검 · 신호수 배치</small></div><em>조치 완료</em></div>
      </section>
    </section>

    <section class="view" id="documentsView">
      <div class="sample-page-head">
        <div><p class="eyebrow">SITE DOCUMENTS</p><h2>현장서류</h2><p>현장에서 자주 쓰는 서류를 종류별로 빠르게 작성합니다.</p></div>
        <span class="sample-badge"><span class="material-symbols-rounded">construction</span>준비 중</span>
      </div>
      <div class="document-category-grid">
        <button class="active" type="button" data-doc-folder="permits"><span class="material-symbols-rounded">fact_check</span><div><b>각종허가서</b><small>작업허가서 6종</small></div><i class="material-symbols-rounded">arrow_forward</i></button>
        <button type="button" data-doc-folder="equipment"><span class="material-symbols-rounded">precision_manufacturing</span><div><b>장비관리</b><small>장비 등록 및 점검</small></div><i class="material-symbols-rounded">arrow_forward</i></button>
        <button type="button" data-doc-folder="newhire"><span class="material-symbols-rounded">person_add</span><div><b>신규채용자서류</b><small>채용 시 필수서류</small></div><i class="material-symbols-rounded">arrow_forward</i></button>
      </div>
      <section class="sample-panel document-panel" data-doc-panel="permits">
        <header><div><small>PERMITS</small><h3>각종허가서</h3></div><span>총 6종</span></header>
        <div class="permit-card-grid">
          <button type="button" data-doc-item="fire"><span class="material-symbols-rounded fire">local_fire_department</span><div><b>화기작업허가서</b><small>용접·절단·그라인더 작업</small></div><i>작성</i></button>
          <button type="button" data-doc-item="height"><span class="material-symbols-rounded">height</span><div><b>고소작업허가서</b><small>2m 이상 고소작업</small></div><i>작성</i></button>
          <button type="button" data-doc-item="horse"><span class="material-symbols-rounded">table_rows</span><div><b>말비계사용허가서</b><small>말비계 설치 및 사용</small></div><i>작성</i></button>
          <button type="button" data-doc-item="ladder"><span class="material-symbols-rounded">stairs</span><div><b>사다리사용허가서</b><small>이동식 사다리 작업</small></div><i>작성</i></button>
          <button type="button" data-doc-item="bt"><span class="material-symbols-rounded">grid_view</span><div><b>BT비계 사용허가서</b><small>이동식 틀비계 작업</small></div><i>작성</i></button>
          <button type="button" data-doc-item="saw"><span class="material-symbols-rounded">carpenter</span><div><b>톱다이 사용허가서</b><small>목재 절단기 사용</small></div><i>작성</i></button>
        </div>
      </section>
      <section class="sample-panel document-panel" data-doc-panel="equipment" hidden>
        <header><div><small>EQUIPMENT</small><h3>장비관리</h3></div><button class="sample-small-button">장비 등록</button></header>
        <div class="sample-empty"><span class="material-symbols-rounded">precision_manufacturing</span><b>장비 등록 및 점검 화면</b><p>보유 장비, 반입일, 점검일과 사용 현장을 관리하는 샘플 영역입니다.</p></div>
      </section>
      <section class="sample-panel document-panel" data-doc-panel="newhire" hidden>
        <header><div><small>NEW EMPLOYEE</small><h3>신규채용자서류</h3></div><button class="sample-small-button">서류 작성</button></header>
        <div class="sample-empty"><span class="material-symbols-rounded">person_add</span><b>신규채용자 서류 화면</b><p>근로자 기본정보와 제출서류를 확인하는 샘플 영역입니다.</p></div>
      </section>
    </section>
  `);

  financeView.classList.add('legacy-test-view');
  document.querySelectorAll('.quick[data-go="finance"]').forEach(button => {
    button.dataset.go = 'risk';
    const icon = button.querySelector(':scope > span');
    const title = button.querySelector('b');
    const detail = button.querySelector('small');
    if (icon) icon.textContent = 'health_and_safety';
    if (title) title.textContent = '위험성평가';
    if (detail) detail.textContent = '오늘 작업 위험요인 확인';
  });
  document.querySelectorAll('.help-card[data-go="finance"]').forEach(button => {
    button.dataset.go = 'documents';
    const title = button.querySelector('h3');
    const detail = button.querySelector('p');
    if (title) title.textContent = '현장서류';
    if (detail) detail.textContent = '작업허가서, 장비, 신규채용자 서류를 확인합니다.';
  });

  const cluster = nav.querySelector('[data-document-menu]');
  const parent = cluster.querySelector('.nav-parent');
  const permitToggle = cluster.querySelector('[data-doc-folder="permits"]');
  parent.addEventListener('click', () => {
    const open = !cluster.classList.contains('open');
    cluster.classList.toggle('open', open);
    parent.setAttribute('aria-expanded', String(open));
  });
  permitToggle.addEventListener('click', () => {
    const open = !cluster.classList.contains('permits-open');
    cluster.classList.toggle('permits-open', open);
    permitToggle.setAttribute('aria-expanded', String(open));
    openDocumentPanel('permits');
  });

  function showDocuments() {
    if (typeof window.showView === 'function') window.showView('documents');
    else {
      document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === 'documentsView'));
      document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === 'documents'));
      const title = document.getElementById('pageTitle');
      if (title) title.textContent = '현장서류';
    }
    cluster.classList.add('open');
    parent.setAttribute('aria-expanded', 'true');
  }

  function openDocumentPanel(name) {
    showDocuments();
    document.querySelectorAll('[data-doc-panel]').forEach(panel => { panel.hidden = panel.dataset.docPanel !== name; });
    document.querySelectorAll('.document-category-grid [data-doc-folder]').forEach(button => button.classList.toggle('active', button.dataset.docFolder === name));
    document.querySelectorAll('.nav-subgroup[data-doc-folder]').forEach(button => button.classList.toggle('selected', button.dataset.docFolder === name));
  }

  document.querySelectorAll('[data-doc-folder]').forEach(button => {
    if (button === permitToggle) return;
    button.addEventListener('click', () => openDocumentPanel(button.dataset.docFolder));
  });
  document.querySelectorAll('[data-doc-item]').forEach(button => button.addEventListener('click', () => {
    openDocumentPanel('permits');
    document.querySelectorAll('[data-doc-item]').forEach(item => item.classList.remove('selected'));
    document.querySelectorAll(`[data-doc-item="${button.dataset.docItem}"]`).forEach(item => item.classList.add('selected'));
    const label = button.textContent.trim().replace(/작성$/, '').trim();
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = `${label} 작성 화면은 다음 작업에서 연결합니다.`;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2200);
    }
  }));

  document.querySelectorAll('.sample-action,.sample-small-button').forEach(button => button.addEventListener('click', () => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = '작성 기능은 다음 업데이트에서 연결됩니다.';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
  }));

  const mobileNav = document.querySelector('.mobile-nav');
  if (mobileNav) mobileNav.innerHTML = '<button class="active" data-view="dashboard"><span class="material-symbols-rounded">home</span>홈</button><button data-view="sites"><span class="material-symbols-rounded">apartment</span>현장</button><button class="fab" data-view="daily" aria-label="공사일보"><span class="material-symbols-rounded">edit_note</span><em class="mobile-new" data-unread-badge="daily" hidden>NEW</em></button><button data-view="risk"><span class="material-symbols-rounded">health_and_safety</span>위험평가<em class="mobile-new" data-unread-badge="risk" hidden>NEW</em></button><button data-view="documents"><span class="material-symbols-rounded">folder_open</span>현장서류<em class="mobile-new" data-unread-badge="documents" hidden>NEW</em></button>';
  window.MIN_WORKS_SIDEBAR_READY = true;
})();
