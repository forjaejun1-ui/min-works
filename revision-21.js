(() => {
  'use strict';
  const config = window.MIN_WORKS_CONFIG || {};
  let googleToken = '';
  let googleTokenClient = null;

  cleanInterface();
  setupReportDateGroups();
  setupLiveSummary();
  setupDynamicReportFilters();
  setupHelpGuide();
  setupRealGoogleCalendar();
  setupLiveWelcome();

  function cleanInterface() {
    document.getElementById('newSiteBtn')?.classList.add('removed-control');
    document.getElementById('exportSiteBtn')?.classList.add('removed-control');
    document.querySelector('.quick-panel .panel-head small')?.remove();
    document.querySelector('.nav-item[data-view="calendar"]')?.remove();
    document.getElementById('calendarView')?.remove();
    document.querySelectorAll('.site-table-row > span:first-child > small').forEach(item => item.remove());
    const pending = [...document.querySelectorAll('.summary-card')].find(card => card.querySelector('span')?.textContent.includes('확인 대기'));
    pending?.remove();
    const allPdf = document.querySelector('.all-reports-pdf');
    if (allPdf) allPdf.innerHTML = '<span class="material-symbols-rounded">picture_as_pdf</span>현장별 통합 PDF 내보내기';
  }

  function navigate(view, status) {
    window.showView?.(view);
    if (view === 'sites' && status) document.querySelector(`[data-site-status="${status}"]`)?.click();
  }

  function setupLiveSummary() {
    const cards = [...document.querySelectorAll('.summary-grid .summary-card')];
    cards.forEach(card => { card.tabIndex = 0; card.setAttribute('role', 'button'); });
    cards[0]?.addEventListener('click', () => navigate('sites', 'active'));
    cards[1]?.addEventListener('click', () => navigate('daily'));
    cards[2]?.addEventListener('click', () => navigate('issues'));
    cards.forEach(card => card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); card.click(); } }));

    const refresh = () => {
      window.refreshProjectStatuses?.();
      const rows = [...document.querySelectorAll('.site-table-row')];
      const activeRows = rows.filter(row => (row.dataset.projectStatus || 'active') === 'active');
      const activeNames = new Set(activeRows.map(row => row.dataset.siteRow));
      const todayKey = localDateKey(new Date());
      const todaySites = new Set([...document.querySelectorAll('.report-card')]
        .filter(card => reportDateKey(card) === todayKey)
        .map(card => card.dataset.site)
        .filter(site => activeNames.has(site)));
      const issues = [...document.querySelectorAll('.issue-detail-card')].filter(card => card.dataset.status !== 'complete');
      const urgent = issues.filter(card => card.querySelector('.issue-label:not(.normal)')).length;
      const liveCards = [...document.querySelectorAll('.summary-grid .summary-card')];
      if (liveCards[0]) { liveCards[0].querySelector('strong').textContent = activeRows.length; liveCards[0].dataset.target = 'sites'; }
      if (liveCards[1]) { liveCards[1].querySelector('strong').innerHTML = `${todaySites.size}<small>/ ${activeRows.length}</small>`; liveCards[1].querySelector('em').textContent = `${todaySites.size}개 현장 보고 완료`; liveCards[1].dataset.target = 'daily'; }
      if (liveCards[2]) { liveCards[2].querySelector('strong').innerHTML = `${issues.length}<small>건</small>`; liveCards[2].querySelector('em').textContent = urgent ? `긴급 ${urgent}건` : '긴급 이슈 없음'; liveCards[2].dataset.target = 'issues'; }
      const focus = document.querySelector('.mobile-focus');
      if (focus) {
        const now = new Date();
        focus.querySelector('.today-label').textContent = `오늘 · ${new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',timeZone:'Asia/Seoul'}).format(now)}`;
        focus.querySelector('h2').textContent = `${activeRows.length}개 현장 운영 중`;
        focus.querySelector('p').textContent = `현장 보고 ${todaySites.size}/${activeRows.length} · 미처리 이슈 ${issues.length}건`;
      }
    };
    window.refreshMinWorksSummary = refresh;
    new MutationObserver(refresh).observe(document.querySelector('.site-table'), { childList: true, subtree: true });
    new MutationObserver(refresh).observe(document.querySelector('#dailyView'), { childList: true, subtree: true });
    new MutationObserver(refresh).observe(document.querySelector('#issuesView'), { childList: true, subtree: true });
    setTimeout(refresh, 0);
  }

  function shortName(name) {
    return name.replace(/\s+(고를샘|AK분당점|시설개선|아산 커뮤니티)$/,'').replace(/대학교$/,'대');
  }

  function setupReportDateGroups() {
    const screen = document.getElementById('dailyListScreen');
    if (!screen) return;
    const groups = () => [...screen.querySelectorAll('.date-group')];
    groups().forEach(group => {
      const firstCard = group.querySelector('.report-card');
      const key = firstCard ? reportDateKey(firstCard) : '';
      if (key) {
        group.dataset.reportDate = key;
        group.querySelectorAll('.report-card').forEach(card => { if (!card.dataset.reportDate) card.dataset.reportDate = key; });
        const date = new Date(`${key}T00:00:00+09:00`);
        const today = key === localDateKey(new Date());
        group.querySelector('h3').innerHTML = `${new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Seoul'}).format(date)}${today?' <em>오늘</em>':''}`;
      }
    });
    const place = card => {
      const key = card.dataset.reportDate;
      if (!key) return;
      let group = groups().find(item => item.dataset.reportDate === key);
      if (!group) {
        group = document.createElement('div');
        group.className = 'date-group';
        group.dataset.reportDate = key;
        const date = new Date(`${key}T00:00:00+09:00`);
        const today = key === localDateKey(new Date());
        group.innerHTML = `<h3>${new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Seoul'}).format(date)}${today?' <em>오늘</em>':''}</h3><div class="completed-reports"></div>`;
        const before = groups().find(item => (item.dataset.reportDate || '') < key);
        if (before) before.before(group); else screen.appendChild(group);
      }
      const target = group.querySelector('.completed-reports');
      if (card.parentElement !== target) target.prepend(card);
    };
    screen.querySelectorAll('.report-card').forEach(place);
    new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node.matches?.('.report-card')) place(node);
    }))).observe(screen, {childList:true,subtree:true});
  }

  function localDateKey(date) {
    const parts = new Intl.DateTimeFormat('en-CA', { year:'numeric', month:'2-digit', day:'2-digit', timeZone:'Asia/Seoul' }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function reportDateKey(card) {
    if (card.dataset.reportDate) return card.dataset.reportDate;
    if (card.dataset.createdAt) return localDateKey(new Date(card.dataset.createdAt));
    const label = card.closest('.date-group')?.querySelector('h3')?.textContent || '';
    const match = label.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (!match) return '';
    return `${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;
  }

  function setupDynamicReportFilters() {
    const filter = document.querySelector('.daily-filter');
    if (!filter) return;
    let active = 'all';
    const renderCards = () => {
      document.querySelectorAll('.report-card').forEach(card => card.style.display = active === 'all' || card.dataset.site === active ? '' : 'none');
      document.querySelectorAll('.date-group').forEach(group => group.hidden = ![...group.querySelectorAll('.report-card')].some(card => card.style.display !== 'none'));
    };
    const rebuild = () => {
      const names = [...new Set([...document.querySelectorAll('.site-table-row')].map(row => row.dataset.siteRow).filter(Boolean))];
      if (active !== 'all' && !names.includes(active)) active = 'all';
      filter.replaceChildren();
      [{ value:'all', label:'전체 현장' }, ...names.map(name => ({ value:name, label:shortName(name) }))].forEach(item => {
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = item.label; button.title = item.value === 'all' ? '' : item.value;
        button.classList.toggle('active', item.value === active);
        button.addEventListener('click', () => { active = item.value; rebuild(); renderCards(); });
        filter.appendChild(button);
      });
      renderCards();
    };
    new MutationObserver(rebuild).observe(document.querySelector('.site-table'), { childList:true });
    new MutationObserver(rebuild).observe(document.querySelector('#todayReports'), { childList:true });
    rebuild();
  }

  function setupHelpGuide() {
    const start = document.querySelector('.help-start');
    start?.querySelector('button')?.remove();
    const grid = document.querySelector('.help-grid');
    if (grid) grid.innerHTML = [
      ['home','홈','진행 현장·오늘 보고·미처리 이슈를 확인합니다. 요약 카드를 누르면 해당 업무로 이동합니다.'],
      ['construction','현장','착공일 전은 착공 예정, 공사 기간은 진행 중, 준공일이 지나면 완료로 자동 분류됩니다.'],
      ['description','공사일보','현장과 날짜, 공정·인원, 사진·특이사항을 입력합니다. 개별 또는 현장별 통합 PDF로 저장할 수 있습니다.'],
      ['payments','자금 현황','현장 지출·기성과 거래처 수금 예정 내역을 등록하고 처리 상태를 확인합니다.'],
      ['report_problem','이슈','현장 문제를 긴급도와 담당자 기준으로 등록하고 미처리 항목을 확인합니다.'],
      ['settings','설정','글자 크기, 화면 밀도, 강조색과 알림 방식을 내 기기에 맞게 저장합니다.'],
      ['apps','전체메뉴','모바일 하단 전체메뉴에서 설정과 사용법을 포함한 모든 기능을 열 수 있습니다.']
    ].map((item,index) => `<article class="help-card static"><span class="material-symbols-rounded">${item[0]}</span><div><small>${String(index+1).padStart(2,'0')}</small><h3>${item[1]}</h3><p>${item[2]}</p></div></article>`).join('');
    const details = document.querySelector('.help-details');
    if (details) details.innerHTML = `<div class="panel-head"><div><p class="eyebrow">FAQ</p><h2>자주 묻는 사용법</h2></div></div>${faqItems().map((item,index) => `<details ${index===0?'open':''}><summary><span>${index+1}</span>${item[0]}<i class="material-symbols-rounded">expand_more</i></summary><div><p>${item[1]}</p></div></details>`).join('')}`;
  }

  function faqItems() { return [
    ['새 현장이 공사일보 필터에 안 보여요.','현장을 개설하면 공사일보 상단 필터가 즉시 갱신됩니다. 보이지 않으면 전체 현장을 누른 뒤 다시 확인하세요.'],
    ['공사일보는 어떻게 작성하나요?','공사일보 탭의 작성 버튼을 누르고 현장·날짜 → 공정·인원 → 사진·특이사항 순서로 등록합니다.'],
    ['사진을 포함해 PDF로 저장하려면?','일보 오른쪽 다운로드 또는 현장별 통합 PDF 내보내기를 누른 뒤 사진 포함 PDF를 선택합니다.'],
    ['현장 담당자는 어떻게 바뀌나요?','해당 현장에 가장 최근 공사일보를 등록한 직원 이름으로 자동 갱신됩니다.'],
    ['현장 상태는 언제 바뀌나요?','착공일 전에는 착공 예정, 착공일부터 준공일까지 진행 중, 준공일 다음 날부터 완료입니다.'],
    ['Google 일정이 보이지 않아요.','설정된 Google OAuth로 연결을 완료한 본인에게만 향후 일정이 표시됩니다. 미연결 또는 권한 오류 상태를 먼저 확인하세요.'],
    ['앱은 어떻게 설치하나요?','모바일 상단 MIN WORKS 설치를 누르거나 브라우저 메뉴에서 홈 화면에 추가를 선택합니다.'],
    ['폴드 화면이 깨져 보여요.','상단 기기 보기에서 갤럭시 폴드를 선택하고 접힘·펼침 상태에 맞춰 화면을 다시 불러오세요.'],
    ['뒤로가기는 어떻게 하나요?','휴대폰 또는 브라우저 뒤로가기를 누르면 직전에 보던 앱 화면으로 돌아갑니다. 로고를 누르면 홈으로 이동합니다.'],
    ['다른 직원과 데이터가 다르게 보여요.','서버 동기화 상태를 확인하세요. 서버 미연결 상태의 임시 데이터는 현재 기기에만 저장됩니다.'],
    ['접속코드가 만료됐어요.','활성 접속코드는 5분 동안만 유효합니다. 기존 직원 또는 관리자가 새 코드를 발급해야 합니다.'],
    ['퇴사자는 어떻게 처리하나요?','관리자 계정의 직원 관리에서 해당 직원의 접속을 중지하거나 계정을 삭제합니다.']
  ]; }

  function setupRealGoogleCalendar() {
    localStorage.removeItem('minWorksPersonalGoogleCalendarV1');
    const panel = document.querySelector('.home-calendar-panel');
    const connection = document.querySelector('[data-settings-panel="data"] .connection-card');
    const renderState = (state, events = []) => {
      if (!panel) return;
      if (state === 'connected') {
        panel.innerHTML = `<div class="panel-head"><div><p class="eyebrow">PERSONAL GOOGLE CALENDAR</p><h2>다가오는 일정</h2></div><button class="google-real-disconnect">연결 해제</button></div><div class="real-calendar-events">${events.length ? events.map(event => `<a href="${event.htmlLink || 'https://calendar.google.com/calendar/u/0/r/agenda'}" target="_blank" rel="noopener"><time>${formatEventDate(event.start)}</time><div><b>${escapeHtml(event.summary || '제목 없는 일정')}</b><small>${escapeHtml(event.location || '개인 Google 캘린더')}</small></div><span class="material-symbols-rounded">open_in_new</span></a>`).join('') : '<p>오늘 이후 등록된 일정이 없습니다.</p>'}</div>`;
        panel.querySelector('.google-real-disconnect').addEventListener('click', disconnectGoogle);
      } else {
        const configured = Boolean(config.googleOAuthClientId);
        panel.innerHTML = `<div class="panel-head"><div><p class="eyebrow">PERSONAL GOOGLE CALENDAR</p><h2>다가오는 일정</h2></div><button class="google-real-connect">Google 캘린더 연동하기</button></div><div class="google-home-state"><span class="material-symbols-rounded">${configured?'calendar_add_on':'link_off'}</span><div><b>${configured?'개인 Google 캘린더는 아직 연결되지 않았습니다.':'Google OAuth 설정이 필요합니다.'}</b><p>${configured?'읽기 전용 권한으로 본인의 오늘 이후 일정만 표시합니다.':'가짜 연결 상태는 제거했습니다. 관리자 설정 후 실제 연결할 수 있습니다.'}</p></div></div>`;
        panel.querySelector('.google-real-connect').addEventListener('click', connectGoogle);
      }
      if (connection) {
        connection.querySelector('small').textContent = state === 'connected' ? '개인 Calendar 읽기 전용 연결' : 'Google OAuth 미연결';
        connection.querySelector('em').textContent = state === 'connected' ? '연결됨' : '미연결';
        connection.querySelector('em').classList.toggle('waiting', state !== 'connected');
      }
    };
    async function connectGoogle() {
      if (!config.googleOAuthClientId) { notify('Google OAuth 클라이언트 ID를 먼저 설정해야 합니다.'); return; }
      try {
        await loadGoogleIdentity();
        googleTokenClient ||= google.accounts.oauth2.initTokenClient({ client_id:config.googleOAuthClientId, scope:'https://www.googleapis.com/auth/calendar.readonly', callback:async response => {
          if (response.error || !response.access_token) { renderState('disconnected'); notify('Google 캘린더 연결에 실패했습니다.'); return; }
          googleToken = response.access_token;
          const events = await fetchGoogleEvents(googleToken);
          renderState('connected', events);
        }});
        googleTokenClient.requestAccessToken({ prompt:'consent' });
      } catch { renderState('disconnected'); notify('Google 연결 모듈을 불러오지 못했습니다.'); }
    }
    function disconnectGoogle() {
      if (googleToken && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(googleToken, () => {});
      googleToken = ''; renderState('disconnected');
    }
    renderState('disconnected');
  }

  function loadGoogleIdentity() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    return new Promise((resolve,reject) => { const script=document.createElement('script'); script.src='https://accounts.google.com/gsi/client'; script.async=true; script.onload=resolve; script.onerror=reject; document.head.appendChild(script); });
  }
  async function fetchGoogleEvents(token) {
    const params = new URLSearchParams({ timeMin:new Date().toISOString(), singleEvents:'true', orderBy:'startTime', maxResults:'8', timeZone:'Asia/Seoul' });
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, { headers:{ Authorization:`Bearer ${token}` } });
    if (!response.ok) throw new Error('calendar');
    return (await response.json()).items || [];
  }
  function formatEventDate(start) { const raw=start?.dateTime || start?.date; if (!raw) return '일정'; return new Intl.DateTimeFormat('ko-KR',{month:'short',day:'numeric',hour:start.dateTime?'2-digit':undefined,minute:start.dateTime?'2-digit':undefined,timeZone:'Asia/Seoul'}).format(new Date(raw)); }
  function escapeHtml(value) { const node=document.createElement('span'); node.textContent=value || ''; return node.innerHTML; }

  function setupLiveWelcome() {
    const greeting = document.querySelector('.greeting-wrap');
    if (!greeting) return;
    const live = document.createElement('p'); live.className='live-user-welcome'; live.textContent='접속자 정보를 확인 중입니다.'; greeting.appendChild(live);
    const original = window.setMinWorksUser;
    window.setMinWorksUser = user => {
      original?.(user);
      const name = user?.role === 'admin' ? '관리자' : user?.name;
      live.textContent = name ? `${name} 님, MIN WORKS에 오신 것을 환영합니다.` : '로그인 정보가 없습니다.';
      live.classList.toggle('ready', Boolean(name));
    };
    if (window.MIN_WORKS_USER) window.setMinWorksUser(window.MIN_WORKS_USER);
  }
})();
