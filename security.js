(() => {
  'use strict';

  const API = window.MIN_WORKS_CONFIG?.apiBaseUrl || 'https://min-works-api.forjaejun.workers.dev';
  const TOKEN_KEY = 'minWorksSessionV1';
  let sessionToken = localStorage.getItem(TOKEN_KEY) || '';
  let currentUser = null;
  let codeTimer = null;

  document.addEventListener('DOMContentLoaded', initSecurity);

  async function initSecurity() {
    document.body.classList.add('auth-pending');
    createGate();
    try {
      if (sessionToken) {
        const session = await api('/session');
        if (session.ok) return unlock(session.user);
        clearToken();
      }
      const status = await api('/setup-status', { auth: false });
      showSignIn(Boolean(status.setupRequired));
    } catch (error) {
      showFatal('서버에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
    }
  }

  function createGate() {
    const gate = document.createElement('div');
    gate.id = 'authGate';
    gate.className = 'auth-gate';
    gate.innerHTML = `
      <section class="auth-card" aria-live="polite">
        <div class="auth-brand"><span class="auth-logo">MIN</span><div><b>MIN WORKS</b><small>사내 현장관리</small></div></div>
        <div id="authContent"><div class="auth-loading"><div class="auth-spinner"></div><p>안전하게 연결하고 있습니다.</p></div></div>
      </section>`;
    document.body.appendChild(gate);
  }

  function showSignIn(setupRequired) {
    const content = document.getElementById('authContent');
    if (setupRequired) {
      content.innerHTML = `
        <h1>관리자 최초 설정</h1>
        <p class="auth-copy">처음 한 번만 관리자 계정을 만듭니다. 이후에는 이 화면이 다시 열리지 않습니다.</p>
        <form class="auth-form" id="adminSetupForm">
          <label>서버 설정키<input name="setupKey" type="password" autocomplete="off" required placeholder="Cloudflare에 저장한 비밀키"></label>
          <label>관리자 이메일<input name="email" type="email" autocomplete="username" required placeholder="관리자 이메일"></label>
          <label>관리자 비밀번호<input name="password" type="password" autocomplete="new-password" minlength="10" required placeholder="10자 이상"></label>
          <button class="auth-submit">관리자 계정 만들기</button>
        </form>
        <p class="auth-message" id="authMessage"></p>
        <p class="auth-note">설정키는 전송 후 저장하지 않습니다. 관리자 비밀번호와 다르게 지정해도 됩니다.</p>`;
      document.getElementById('adminSetupForm').addEventListener('submit', setupAdmin);
      return;
    }

    content.innerHTML = `
      <h1>회사 계정으로 시작</h1>
      <p class="auth-copy">직원은 전달받은 5분 접속코드로 최초 등록하세요. 등록한 휴대폰에서는 자동으로 로그인됩니다.</p>
      <div class="auth-tabs"><button class="active" data-auth-tab="employee">직원 최초 등록</button><button data-auth-tab="admin">관리자 로그인</button></div>
      <form class="auth-form" id="employeeRegisterForm">
        <label>6자리 접속코드<input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required placeholder="000000"></label>
        <label>이름(실명)<input name="name" autocomplete="name" minlength="2" maxlength="30" required placeholder="홍길동"></label>
        <label>직급<input name="rank" maxlength="30" required placeholder="예: 대리, 과장, 부장"></label>
        <button class="auth-submit">이 휴대폰 등록하기</button>
      </form>
      <form class="auth-form" id="adminLoginForm" hidden>
        <label>관리자 이메일<input name="email" type="email" autocomplete="username" required></label>
        <label>비밀번호<input name="password" type="password" autocomplete="current-password" required></label>
        <button class="auth-submit">관리자로 로그인</button>
      </form>
      <p class="auth-message" id="authMessage"></p>
      <p class="auth-note">접속코드는 5분 후 자동 만료됩니다. 이미 등록한 직원은 새 코드가 없어도 계속 사용할 수 있습니다.</p>`;
    content.querySelectorAll('[data-auth-tab]').forEach(button => button.addEventListener('click', switchAuthTab));
    document.getElementById('employeeRegisterForm').addEventListener('submit', registerEmployee);
    document.getElementById('adminLoginForm').addEventListener('submit', loginAdmin);
  }

  function switchAuthTab(event) {
    const tab = event.currentTarget.dataset.authTab;
    document.querySelectorAll('[data-auth-tab]').forEach(button => button.classList.toggle('active', button.dataset.authTab === tab));
    document.getElementById('employeeRegisterForm').hidden = tab !== 'employee';
    document.getElementById('adminLoginForm').hidden = tab !== 'admin';
    setMessage('');
  }

  async function setupAdmin(event) {
    event.preventDefault();
    await submitAuth(event.currentTarget, '/admin/setup');
  }

  async function registerEmployee(event) {
    event.preventDefault();
    await submitAuth(event.currentTarget, '/employee/register');
  }

  async function loginAdmin(event) {
    event.preventDefault();
    await submitAuth(event.currentTarget, '/admin/login');
  }

  async function submitAuth(form, endpoint) {
    const button = form.querySelector('button');
    setBusy(button, true);
    setMessage('');
    try {
      const data = Object.fromEntries(new FormData(form));
      const result = await api(endpoint, { method: 'POST', body: data, auth: false });
      if (!result.ok) throw new Error(result.error || '로그인하지 못했습니다.');
      saveToken(result.token);
      unlock(result.user);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(button, false);
    }
  }

  function unlock(user) {
    currentUser = user;
    window.MIN_WORKS_USER = user;
    document.body.classList.remove('auth-pending');
    document.getElementById('authGate').hidden = true;
    if (typeof window.setMinWorksUser === 'function') window.setMinWorksUser(user);
    updateProfile(user);
    addAccountButton(user);
  }

  function updateProfile(user) {
    const profile = document.querySelector('.sidebar-profile');
    if (!profile) return;
    const name = user.role === 'admin' ? '관리자' : user.name;
    const rank = user.role === 'admin' ? '시스템 관리자' : user.rank;
    const avatar = profile.querySelector('.avatar');
    const strong = profile.querySelector('strong');
    const small = profile.querySelector('small');
    if (avatar) avatar.textContent = name.slice(0, 1);
    if (strong) strong.textContent = `${name}${user.role === 'admin' ? '' : ' ' + rank}`;
    if (small) small.textContent = rank;
  }

  function addAccountButton(user) {
    const actions = document.querySelector('.top-actions');
    if (!actions || document.getElementById('securityUserButton')) return;
    const button = document.createElement('button');
    button.id = 'securityUserButton';
    button.className = `security-user-button ${user.role === 'admin' ? 'admin' : ''}`;
    button.innerHTML = `<span class="material-symbols-rounded">${user.role === 'admin' ? 'admin_panel_settings' : 'account_circle'}</span><span>${user.role === 'admin' ? '직원 관리' : user.name}</span>`;
    button.addEventListener('click', () => user.role === 'admin' ? openAdminPanel() : confirmLogout());
    actions.appendChild(button);
  }

  async function openAdminPanel() {
    let modal = document.getElementById('adminSecurityModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'adminSecurityModal';
      modal.className = 'admin-security-modal';
      modal.innerHTML = `
        <section class="admin-panel">
          <header><div><small>MIN WORKS SECURITY</small><h2>직원 접속 관리</h2><p>신규 직원용 코드를 만들고 퇴사자의 접속을 차단합니다.</p></div><button class="admin-close" aria-label="닫기">×</button></header>
          <div class="access-code-box">
            <div><small>현재 접속코드 · 5분간 유효</small><div class="access-code-value" id="accessCodeValue">------</div><span class="access-code-timer" id="accessCodeTimer">새 코드를 발급하세요.</span></div>
            <div class="access-code-actions"><button id="copyAccessCode" disabled>복사</button><button class="generate-code" id="generateAccessCode">한 번에 새 코드 발급</button></div>
          </div>
          <section class="employee-section"><h3>등록 직원</h3><div class="employee-list" id="employeeList"><div class="admin-empty">직원 목록을 불러오는 중입니다.</div></div></section>
          <div class="admin-footer"><button id="adminLogout">관리자 로그아웃</button></div>
        </section>`;
      document.body.appendChild(modal);
      modal.querySelector('.admin-close').addEventListener('click', () => modal.hidden = true);
      modal.addEventListener('click', event => { if (event.target === modal) modal.hidden = true; });
      document.getElementById('generateAccessCode').addEventListener('click', generateAccessCode);
      document.getElementById('copyAccessCode').addEventListener('click', copyAccessCode);
      document.getElementById('adminLogout').addEventListener('click', logout);
    }
    modal.hidden = false;
    await loadEmployees();
  }

  async function generateAccessCode() {
    const button = document.getElementById('generateAccessCode');
    setBusy(button, true);
    try {
      const result = await api('/admin/access-code', { method: 'POST' });
      if (!result.ok) throw new Error(result.error);
      document.getElementById('accessCodeValue').textContent = result.code;
      document.getElementById('copyAccessCode').disabled = false;
      startCodeTimer(result.expiresAt);
    } catch (error) {
      alert(error.message || '접속코드를 만들지 못했습니다.');
    } finally {
      setBusy(button, false);
    }
  }

  function startCodeTimer(expiresAt) {
    clearInterval(codeTimer);
    const timer = document.getElementById('accessCodeTimer');
    const update = () => {
      const left = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
      const minutes = Math.floor(left / 60);
      const seconds = String(left % 60).padStart(2, '0');
      timer.textContent = left ? `${minutes}:${seconds} 후 자동 만료` : '만료됨 · 새 코드를 발급하세요.';
      if (!left) {
        clearInterval(codeTimer);
        document.getElementById('copyAccessCode').disabled = true;
      }
    };
    update();
    codeTimer = setInterval(update, 1000);
  }

  async function copyAccessCode() {
    const code = document.getElementById('accessCodeValue').textContent;
    if (!/^\d{6}$/.test(code)) return;
    await navigator.clipboard.writeText(code);
    const button = document.getElementById('copyAccessCode');
    button.textContent = '복사됨';
    setTimeout(() => { button.textContent = '복사'; }, 1200);
  }

  async function loadEmployees() {
    const list = document.getElementById('employeeList');
    try {
      const result = await api('/admin/employees');
      if (!result.ok) throw new Error(result.error);
      list.replaceChildren();
      if (!result.employees.length) {
        list.innerHTML = '<div class="admin-empty">아직 등록된 직원이 없습니다.</div>';
        return;
      }
      result.employees.forEach(employee => list.appendChild(employeeRow(employee)));
    } catch (error) {
      list.innerHTML = `<div class="admin-empty">${escapeHtml(error.message || '목록을 불러오지 못했습니다.')}</div>`;
    }
  }

  function employeeRow(employee) {
    const row = document.createElement('div');
    row.className = `employee-row ${employee.status === 'active' ? '' : 'inactive'}`;
    const info = document.createElement('div');
    const name = document.createElement('b');
    const detail = document.createElement('small');
    name.textContent = `${employee.name} · ${employee.rank}`;
    detail.textContent = `${employee.status === 'active' ? '사용 중' : '접속 중지'} · 등록 ${formatDate(employee.created_at)}`;
    info.append(name, detail);
    const actions = document.createElement('div');
    actions.className = 'employee-actions';
    const toggle = document.createElement('button');
    toggle.textContent = employee.status === 'active' ? '접속 중지' : '다시 허용';
    toggle.addEventListener('click', () => employeeAction(employee, employee.status === 'active' ? 'deactivate' : 'activate'));
    const remove = document.createElement('button');
    remove.className = 'danger';
    remove.textContent = '퇴사자 삭제';
    remove.addEventListener('click', () => employeeAction(employee, 'delete'));
    actions.append(toggle, remove);
    row.append(info, actions);
    return row;
  }

  async function employeeAction(employee, action) {
    const labels = { deactivate: '이 직원의 모든 기기 접속을 중지할까요?', activate: '이 직원의 접속을 다시 허용할까요?', delete: '퇴사자 정보를 삭제할까요? 현재 로그인된 모든 기기에서도 즉시 로그아웃됩니다.' };
    if (!confirm(`${employee.name} ${employee.rank}\n\n${labels[action]}`)) return;
    const result = await api(`/admin/employees/${encodeURIComponent(employee.id)}/${action}`, { method: 'POST' });
    if (!result.ok) return alert(result.error || '처리하지 못했습니다.');
    await loadEmployees();
  }

  function confirmLogout() {
    if (confirm('이 휴대폰에서 로그아웃할까요? 다시 로그인하려면 새 접속코드가 필요합니다.')) logout();
  }

  async function logout() {
    try { await api('/logout', { method: 'POST' }); } catch (_) {}
    clearToken();
    location.reload();
  }

  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (options.auth !== false && sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch(API + path, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('서버 응답이 늦습니다. 잠시 후 다시 연결해 주세요.');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    let result;
    try { result = await response.json(); }
    catch (_) { result = { error: '서버 응답을 확인하지 못했습니다.' }; }
    if (response.status === 401 && options.auth !== false && path !== '/session') clearToken();
    return { ...result, ok: response.ok && result.ok !== false };
  }

  function saveToken(token) {
    sessionToken = token;
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    sessionToken = '';
    localStorage.removeItem(TOKEN_KEY);
  }

  function setMessage(message) {
    const element = document.getElementById('authMessage');
    if (element) element.textContent = message;
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.disabled = busy;
    if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
    button.textContent = busy ? '처리 중…' : button.dataset.originalText;
  }

  function showFatal(message) {
    const content = document.getElementById('authContent');
    content.innerHTML = `<h1>연결 확인 필요</h1><p class="auth-copy">${escapeHtml(message)}</p><button class="auth-submit" id="retrySecurity">다시 연결</button>`;
    document.getElementById('retrySecurity').addEventListener('click', () => location.reload());
  }

  function formatDate(timestamp) {
    if (!timestamp) return '-';
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(timestamp * 1000));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  }
})();
