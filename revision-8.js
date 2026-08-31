(() => {
  'use strict';

  const CALENDAR_KEY = 'minWorksCompanyCalendarV1';
  const kstToday = getKstDate();
  let calendarMonth = new Date(kstToday.getFullYear(), kstToday.getMonth(), 1);
  let selectedDate = dateKey(kstToday);
  let calendarEvents = loadCalendarEvents();
  let activeCalendarFilter = 'all';

  enableBackNavigation();
  makeBrandHomeButton();
  connectBriefingCards();
  connectSiteStatusFilters();
  connectPhotoShortcut();
  connectFinanceMonthButtons();
  initializeInternalCalendar();

  function enableBackNavigation() {
    const originalShowView = showView;
    let restoringHistory = false;
    const visibleView = () => document.querySelector('.view.active')?.id.replace(/View$/, '') || 'dashboard';
    const initialView = visibleView();
    history.replaceState({ minWorks: true, view: initialView }, '', location.href);

    window.showView = function(name) {
      originalShowView(name);
      if (!restoringHistory && history.state?.view !== name) {
        history.pushState({ minWorks: true, view: name }, '', `#${name}`);
      }
    };

    window.addEventListener('popstate', event => {
      closeTopLayer();
      const view = event.state?.minWorks ? event.state.view : 'dashboard';
      restoringHistory = true;
      originalShowView(view || 'dashboard');
      restoringHistory = false;
    });
  }

  function closeTopLayer() {
    document.querySelectorAll('.show').forEach(element => {
      if (element.classList.contains('view')) return;
      element.classList.remove('show');
    });
    document.querySelectorAll('.admin-security-modal').forEach(element => element.hidden = true);
  }

  function makeBrandHomeButton() {
    const brand = document.querySelector('.brand');
    if (!brand) return;
    brand.tabIndex = 0;
    brand.setAttribute('role', 'button');
    brand.setAttribute('aria-label', '홈으로 이동');
    brand.title = '홈으로 이동';
    const goHome = () => {
      showView('dashboard');
      document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === 'dashboard'));
    };
    brand.addEventListener('click', goHome);
    brand.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        goHome();
      }
    });
  }

  function connectBriefingCards() {
    document.querySelectorAll('.briefing-item').forEach(button => {
      button.addEventListener('click', () => {
        const site = button.querySelector('b')?.textContent.trim();
        showView('sites');
        document.querySelectorAll('.site-table-row').forEach(row => row.classList.toggle('focused-site', row.dataset.siteRow === site));
        document.querySelector(`[data-site-row="${cssEscape(site)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        notify(`${site} 현장으로 이동했습니다.`);
      });
    });
  }

  function connectSiteStatusFilters() {
    const buttons = [...document.querySelectorAll('.filter-row .filter')];
    const table = document.querySelector('.site-table');
    if (!buttons.length || !table) return;
    const keys = ['active','scheduled','complete'];
    const sampleDates = [
      ['2026-07-01','2026-09-30'],
      ['2026-08-01','2026-09-15'],
      ['2026-08-15','2027-02-28'],
      ['2026-08-05','2026-10-31']
    ];
    document.querySelectorAll('.site-table-row').forEach((row,index) => {
      row.dataset.startDate ||= sampleDates[index]?.[0] || '';
      row.dataset.endDate ||= sampleDates[index]?.[1] || '';
    });
    buttons.forEach((button,index) => button.dataset.siteStatus = keys[index]);
    let empty = document.createElement('div');
    empty.className = 'site-filter-empty';
    empty.hidden = true;
    table.appendChild(empty);
    let activeKey = buttons.find(button => button.classList.contains('active'))?.dataset.siteStatus || 'active';
    const classify = row => {
      const today = dateKey(kstToday);
      if (row.dataset.startDate && row.dataset.startDate > today) return 'scheduled';
      if (row.dataset.endDate && row.dataset.endDate < today) return 'complete';
      return 'active';
    };
    const render = () => {
      const rows = [...document.querySelectorAll('.site-table-row')];
      const counts = { active:0, scheduled:0, complete:0 };
      rows.forEach(row => {
        row.dataset.projectStatus = classify(row);
        counts[row.dataset.projectStatus] += 1;
      });
      buttons.forEach(button => {
        const key = button.dataset.siteStatus;
        const label = key === 'active' ? '진행 중' : key === 'scheduled' ? '착공 예정' : '완료';
        button.textContent = `${label} ${counts[key]}`;
        button.classList.toggle('active', key === activeKey);
      });
      let visible = 0;
      rows.forEach(row => {
        const show = row.dataset.projectStatus === activeKey;
        row.hidden = !show;
        if (show) visible += 1;
      });
      empty.hidden = visible > 0;
      empty.textContent = activeKey === 'scheduled' ? '등록된 착공 예정 현장이 없습니다.' : activeKey === 'complete' ? '준공일이 지난 현장이 없습니다.' : '진행 중인 현장이 없습니다.';
    };
    buttons.forEach(button => button.addEventListener('click', () => {
      activeKey = button.dataset.siteStatus;
      render();
    }));
    window.refreshProjectStatuses = render;
    render();
  }

  function connectPhotoShortcut() {
    const oldButton = document.getElementById('photoBtn');
    if (!oldButton) return;
    const button = oldButton.cloneNode(true);
    oldButton.replaceWith(button);
    button.addEventListener('click', () => {
      showView('daily');
      openDailyEditor();
      if (typeof reportStep !== 'undefined') {
        reportStep = 1;
        if (typeof renderReportStep === 'function') renderReportStep();
      }
      setTimeout(() => document.querySelector('.photo-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      notify('공사일보의 현장사진 등록 화면을 열었습니다.');
    });
  }

  function connectFinanceMonthButtons() {
    const period = document.querySelector('.finance-period');
    if (!period) return;
    const label = period.querySelector('b');
    const buttons = period.querySelectorAll('button');
    let shown = new Date(kstToday.getFullYear(), kstToday.getMonth(), 1);
    const render = () => label.textContent = `${shown.getFullYear()}년 ${shown.getMonth() + 1}월`;
    buttons[0]?.addEventListener('click', () => { shown = new Date(shown.getFullYear(), shown.getMonth() - 1, 1); render(); notify('선택한 달의 자금 내역을 표시했습니다.'); });
    buttons[1]?.addEventListener('click', () => { shown = new Date(shown.getFullYear(), shown.getMonth() + 1, 1); render(); notify('선택한 달의 자금 내역을 표시했습니다.'); });
    render();
  }

  function initializeInternalCalendar() {
    const view = document.getElementById('calendarView');
    if (!view) return;
    view.querySelector('.section-title .eyebrow').textContent = 'MIN WORKS CALENDAR';
    const account = view.querySelector('.google-account-bar');
    if (account) {
      account.classList.add('internal-calendar-bar');
      account.querySelector('.google-g').textContent = 'MIN';
      account.querySelector('b').textContent = 'MIN WORKS 회사 일정';
      account.querySelector('small').textContent = '회사 내부 일정 · 오늘 이후 자동 표시';
      account.querySelector('span').innerHTML = '<i></i>사용 중';
    }

    const month = view.querySelector('.mini-month');
    const header = month.querySelector('header');
    const originalButtons = header.querySelectorAll('button');
    originalButtons[0].id = 'calendarPrevMonth';
    originalButtons[1].id = 'calendarNextMonth';
    const todayButton = document.createElement('button');
    todayButton.id = 'calendarToday';
    todayButton.className = 'calendar-today-button';
    todayButton.textContent = '오늘';
    header.insertBefore(todayButton, originalButtons[1]);

    document.getElementById('calendarPrevMonth').addEventListener('click', () => changeCalendarMonth(-1));
    document.getElementById('calendarNextMonth').addEventListener('click', () => changeCalendarMonth(1));
    todayButton.addEventListener('click', () => {
      calendarMonth = new Date(kstToday.getFullYear(), kstToday.getMonth(), 1);
      selectedDate = dateKey(kstToday);
      renderCalendar();
    });

    const oldNewButton = document.getElementById('newCalendarEvent');
    const newButton = oldNewButton.cloneNode(true);
    oldNewButton.replaceWith(newButton);
    newButton.addEventListener('click', openCalendarForm);
    createCalendarForm();

    document.querySelectorAll('[data-calendar-filter]').forEach(button => {
      button.addEventListener('click', () => {
        activeCalendarFilter = button.dataset.calendarFilter;
        renderCalendarAgenda();
      });
    });
    renderCalendar();
  }

  function changeCalendarMonth(amount) {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + amount, 1);
    selectedDate = '';
    renderCalendar();
  }

  function renderCalendar() {
    const title = document.querySelector('.mini-month header h3');
    const grid = document.querySelector('.mini-month .month-grid');
    if (!title || !grid) return;
    title.textContent = `${calendarMonth.getFullYear()}년 ${calendarMonth.getMonth() + 1}월`;
    grid.replaceChildren();
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let index = 0; index < firstDay; index++) grid.appendChild(document.createElement('i'));
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const key = dateKey(date);
      const events = calendarEvents.filter(event => event.date === key);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'calendar-day';
      cell.textContent = day;
      cell.dataset.date = key;
      if (key === dateKey(kstToday)) cell.classList.add('today');
      if (key === selectedDate) cell.classList.add('selected');
      if (events.some(event => event.type === 'business')) cell.classList.add('has-business');
      if (events.some(event => event.type === 'attendance')) cell.classList.add('has-attendance');
      if (events.some(event => event.type === 'business') && events.some(event => event.type === 'attendance')) cell.classList.add('has-both');
      cell.addEventListener('click', () => {
        selectedDate = key;
        document.querySelectorAll('.calendar-day').forEach(item => item.classList.toggle('selected', item.dataset.date === key));
        renderCalendarAgenda();
      });
      grid.appendChild(cell);
    }
    renderCalendarAgenda();
  }

  function renderCalendarAgenda() {
    const panel = document.querySelector('.calendar-agenda');
    if (!panel) return;
    panel.querySelectorAll('.agenda-date,.calendar-empty').forEach(item => item.remove());
    const todayKey = dateKey(kstToday);
    let events = calendarEvents.filter(event => event.date >= todayKey);
    if (selectedDate) events = events.filter(event => event.date === selectedDate || !isCurrentCalendarMonthSelected());
    if (activeCalendarFilter !== 'all') events = events.filter(event => event.type === activeCalendarFilter);
    events.sort((a, b) => `${a.date} ${a.time || '00:00'}`.localeCompare(`${b.date} ${b.time || '00:00'}`));
    if (!events.length) {
      const empty = document.createElement('div');
      empty.className = 'calendar-empty';
      empty.innerHTML = `<span class="material-symbols-rounded">event_available</span><b>${selectedDate ? formatDateHeading(selectedDate) : '다가오는 일정'}이 없습니다.</b><small>‘일정 등록’을 눌러 회사 일정을 추가할 수 있습니다.</small>`;
      panel.appendChild(empty);
      renderHomeCalendar();
      return;
    }
    const grouped = Map.groupBy ? Map.groupBy(events, event => event.date) : groupEvents(events);
    for (const [date, items] of grouped) {
      const group = document.createElement('div');
      group.className = 'agenda-date';
      const heading = document.createElement('h4');
      heading.textContent = formatDateHeading(date);
      group.appendChild(heading);
      items.forEach(event => group.appendChild(createAgendaEvent(event)));
      panel.appendChild(group);
    }
    renderHomeCalendar();
  }

  function createAgendaEvent(event) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `agenda-event ${event.type}`;
    item.dataset.source = event.type;
    item.innerHTML = `<i></i><time>${escapeHtml(event.time || '종일')}</time><div><b>${escapeHtml(event.title)}</b><small>${event.type === 'attendance' ? '근태 관리' : '회사 주요 일정'}${event.memo ? ' · ' + escapeHtml(event.memo) : ''}</small></div><span class="material-symbols-rounded">chevron_right</span>`;
    item.addEventListener('click', () => openCalendarForm(event));
    return item;
  }

  function createCalendarForm() {
    const modal = document.createElement('div');
    modal.id = 'calendarEventModal';
    modal.className = 'calendar-event-modal';
    modal.innerHTML = `<div class="calendar-event-backdrop"></div><section><header><div><p class="eyebrow">COMPANY SCHEDULE</p><h2 id="calendarFormTitle">회사 일정 등록</h2></div><button type="button" id="closeCalendarForm">×</button></header><form id="calendarEventForm"><input type="hidden" name="id"><label>일정명<input name="title" required maxlength="60" placeholder="예: 현장 준공, 직원 연차"></label><div class="calendar-form-grid"><label>날짜<input name="date" type="date" required></label><label>시간<input name="time" type="time"></label><label>구분<select name="type"><option value="business">회사 주요 일정</option><option value="attendance">근태 관리</option></select></label></div><label>메모<input name="memo" maxlength="100" placeholder="필요한 내용을 간단히 입력"></label><div class="calendar-form-actions"><button type="button" class="calendar-delete" id="deleteCalendarEvent" hidden>삭제</button><button type="submit" class="primary">저장</button></div></form></section>`;
    document.body.appendChild(modal);
    modal.querySelector('.calendar-event-backdrop').addEventListener('click', closeCalendarForm);
    document.getElementById('closeCalendarForm').addEventListener('click', closeCalendarForm);
    document.getElementById('calendarEventForm').addEventListener('submit', saveCalendarEvent);
    document.getElementById('deleteCalendarEvent').addEventListener('click', deleteCalendarEvent);
  }

  function openCalendarForm(existing) {
    const form = document.getElementById('calendarEventForm');
    form.reset();
    form.elements.id.value = existing?.id || '';
    form.elements.title.value = existing?.title || '';
    form.elements.date.value = existing?.date || selectedDate || dateKey(kstToday);
    form.elements.time.value = existing?.time || '';
    form.elements.type.value = existing?.type || 'business';
    form.elements.memo.value = existing?.memo || '';
    document.getElementById('calendarFormTitle').textContent = existing?.id ? '회사 일정 수정' : '회사 일정 등록';
    document.getElementById('deleteCalendarEvent').hidden = !existing?.id;
    document.getElementById('calendarEventModal').classList.add('show');
    setTimeout(() => form.elements.title.focus(), 50);
  }

  function closeCalendarForm() {
    document.getElementById('calendarEventModal').classList.remove('show');
  }

  function saveCalendarEvent(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const record = { id: data.id || crypto.randomUUID(), title: data.title.trim(), date: data.date, time: data.time, type: data.type, memo: data.memo.trim() };
    if (!record.title || !record.date) return;
    const index = calendarEvents.findIndex(item => item.id === record.id);
    if (index >= 0) calendarEvents[index] = record; else calendarEvents.push(record);
    persistCalendarEvents();
    calendarMonth = new Date(`${record.date}T00:00:00`);
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    selectedDate = record.date;
    closeCalendarForm();
    renderCalendar();
    notify(index >= 0 ? '회사 일정을 수정했습니다.' : '회사 일정을 등록했습니다.');
  }

  function deleteCalendarEvent() {
    const id = document.getElementById('calendarEventForm').elements.id.value;
    if (!id || !confirm('이 일정을 삭제할까요?')) return;
    calendarEvents = calendarEvents.filter(event => event.id !== id);
    persistCalendarEvents();
    closeCalendarForm();
    renderCalendar();
    notify('회사 일정을 삭제했습니다.');
  }

  function renderHomeCalendar() {
    const list = document.querySelector('.home-event-list');
    if (!list) return;
    const todayKey = dateKey(kstToday);
    const events = calendarEvents.filter(event => event.date >= todayKey).sort((a,b) => a.date.localeCompare(b.date)).slice(0,3);
    list.replaceChildren();
    if (!events.length) {
      const empty = document.createElement('button');
      empty.className = 'home-calendar-empty';
      empty.innerHTML = '<span class="material-symbols-rounded">event_available</span><b>다가오는 회사 일정이 없습니다.</b><small>일정 탭에서 새 일정을 등록하세요.</small>';
      empty.addEventListener('click', () => showView('calendar'));
      list.appendChild(empty);
      return;
    }
    events.forEach(event => {
      const date = new Date(`${event.date}T00:00:00`);
      const item = document.createElement('button');
      item.className = 'home-event';
      item.innerHTML = `<time><b>${date.getDate()}</b><small>${date.getMonth()+1}월</small></time><div><span class="event-type ${event.type === 'attendance' ? 'leave' : 'site'}">${event.type === 'attendance' ? '근태' : '회사'}</span><b>${escapeHtml(event.title)}</b></div><em>${relativeDay(event.date)}</em>`;
      item.addEventListener('click', () => { selectedDate = event.date; calendarMonth = new Date(date.getFullYear(), date.getMonth(), 1); showView('calendar'); renderCalendar(); });
      list.appendChild(item);
    });
  }

  function loadCalendarEvents() {
    try {
      const saved = JSON.parse(localStorage.getItem(CALENDAR_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(event => event.id && event.title && event.date) : [];
    } catch (_) {
      return [];
    }
  }

  function persistCalendarEvents() {
    localStorage.setItem(CALENDAR_KEY, JSON.stringify(calendarEvents));
  }

  function getKstDate() {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return new Date(Number(values.year), Number(values.month) - 1, Number(values.day));
  }

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function formatDateHeading(key) {
    const date = new Date(`${key}T00:00:00`);
    return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(date);
  }

  function relativeDay(key) {
    const date = new Date(`${key}T00:00:00`);
    const diff = Math.round((date - kstToday) / 86400000);
    return diff === 0 ? '오늘' : diff === 1 ? '내일' : `D-${diff}`;
  }

  function groupEvents(events) {
    const groups = new Map();
    events.forEach(event => {
      if (!groups.has(event.date)) groups.set(event.date, []);
      groups.get(event.date).push(event);
    });
    return groups;
  }

  function isCurrentCalendarMonthSelected() {
    if (!selectedDate) return false;
    const date = new Date(`${selectedDate}T00:00:00`);
    return date.getFullYear() === calendarMonth.getFullYear() && date.getMonth() === calendarMonth.getMonth();
  }

  function cssEscape(value) {
    return window.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, '\\$&');
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]);
  }
})();
