/* Keep issue assignees tied to the signed-in staff and the live employee roster. */
(() => {
  'use strict';
  const owner = document.getElementById('issueOwner');
  const site = document.getElementById('issueSite');
  const open = document.getElementById('newIssue');
  if (!owner || !site || !open) return;

  const other = document.createElement('input');
  other.id = 'issueOwnerOther';
  other.placeholder = '담당자 이름과 직급 입력';
  other.maxLength = 50;
  other.hidden = true;
  owner.after(other);
  owner.required = true;
  const updateOther = () => {
    other.hidden = owner.value !== '__other__';
    other.required = !other.hidden;
    if (!other.hidden) other.focus();
  };
  owner.addEventListener('change', updateOther);

  const label = employee => [employee?.name, employee?.rank].filter(Boolean).join(' ').trim();
  async function people() {
    const user = window.MIN_WORKS_USER;
    const staff = new Map();
    const add = employee => {
      const name = label(employee);
      if (name && employee?.status !== 'inactive' && employee?.status !== 'pending') staff.set(name, name);
    };
    (window.MIN_WORKS_EMPLOYEES || []).forEach(add);
    if (user?.role === 'employee') add(user);
    if (user?.role === 'admin' && !window.MIN_WORKS_TEST) {
      try {
        const token = localStorage.getItem('minWorksSessionV1');
        const response = await fetch('https://min-works-api.forjaejun.workers.dev/admin/employees', {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store'
        });
        if (response.ok) (await response.json()).employees?.forEach(add);
      } catch { /* Keep the signed-in user and site managers available. */ }
    }
    // Site managers are already linked to current site records and help non-admin staff.
    if (!staff.size || user?.role !== 'admin') {
      document.querySelectorAll('.site-table-row').forEach(row => {
        const name = row.querySelector('.site-manager')?.textContent?.trim();
        if (name && name !== '미등록') add({ name });
      });
    }
    return [...staff.values()];
  }

  async function refresh(preferManager = false) {
    const previous = owner.value;
    owner.replaceChildren(new Option('담당자 선택', ''));
    const names = await people();
    names.forEach(name => owner.add(new Option(name, name)));
    owner.add(new Option('직접 입력', '__other__'));
    const manager = [...document.querySelectorAll('.site-table-row')]
      .find(row => row.dataset.siteRow === site.value)?.querySelector('.site-manager')?.textContent?.trim();
    const me = label(window.MIN_WORKS_USER);
    const suggested = names.find(name => manager && (name === manager || name.startsWith(manager + ' ')))
      || names.find(name => me && name === me) || '';
    owner.value = !preferManager && names.includes(previous) ? previous : suggested;
    updateOther();
  }

  open.addEventListener('click', () => {
    const due = document.getElementById('issueDue');
    if (due && !due.value) {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      due.value = today;
    }
    refresh();
  });
  site.addEventListener('change', () => refresh(true));
  document.addEventListener('minworks:user-ready', refresh);
  refresh();

  // Existing issues may have been saved with an old sample assignee.
  const peek = document.getElementById('issuePeek');
  const peekOwner = document.getElementById('peekOwner');
  if (peek && peekOwner) {
    const change = document.createElement('button');
    change.type = 'button';
    change.id = 'changeIssueOwner';
    change.textContent = '담당 변경';
    change.style.marginLeft = '8px';
    peekOwner.after(change);
    change.addEventListener('click', async () => {
      const card = [...document.querySelectorAll('.issue-detail-card')].find(item =>
        item.dataset.issueCard === document.getElementById('peekSite')?.textContent &&
        item.querySelector('h3')?.textContent === document.getElementById('peekTitle')?.textContent);
      if (!card) return;
      const user = window.MIN_WORKS_USER;
      const current = card.dataset.issueOwner || card.querySelector('.issue-meta span')?.textContent?.replace(/^person\s*담당\s*/, '').trim() || '';
      if (user?.role !== 'admin' && !current.startsWith(user?.name + ' ')) return;
      const names = await people();
      const picker = document.createElement('select');
      picker.id = 'changeIssueOwnerSelect';
      picker.add(new Option('담당자 선택', ''));
      names.forEach(name => picker.add(new Option(name, name)));
      picker.add(new Option('직접 입력', '__other__'));
      if (names.includes(current)) picker.value = current;
      const save = document.createElement('button');
      save.type = 'button';
      save.id = 'saveIssueOwnerChange';
      save.textContent = '저장';
      const controls = document.createElement('span');
      controls.id = 'issueOwnerControls';
      controls.append(picker, save);
      document.getElementById('issueOwnerControls')?.remove();
      change.after(controls);
      save.addEventListener('click', () => {
        const next = picker.value === '__other__' ? prompt('담당자 이름과 직급을 입력하세요.')?.trim() : picker.value;
        if (!next) return;
        card.dataset.issueOwner = next;
        const meta = card.querySelector('.issue-meta span');
        meta.replaceChildren();
        const icon = document.createElement('i');
        icon.className = 'material-symbols-rounded';
        icon.textContent = 'person';
        meta.append(icon, document.createTextNode('담당 ' + next));
        peekOwner.textContent = '담당 ' + next;
        controls.remove();
        window.refreshMinWorksHomeExtras?.();
      });
    });
  }
})();
