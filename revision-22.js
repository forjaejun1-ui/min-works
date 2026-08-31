(() => {
  'use strict';
  const PAYMENT_KEY = 'minWorksPlannedPaymentsV2';
  const RECEIVABLE_KEY = 'minWorksReceivablesV2';
  const roles = ['담당자', '공무부', '관리부', '대표', '이사'];
  let payments = read(PAYMENT_KEY);
  let receivables = read(RECEIVABLE_KEY);

  document.querySelector('.approval-panel')?.remove();
  rebuildFinance();

  function rebuildFinance() {
    const view = document.getElementById('financeView');
    if (!view) return;
    view.innerHTML = `
      <div class="section-title mw-finance-title"><div><p class="eyebrow">CASH FLOW</p><h2>현장 자금 현황</h2><small>예정 지출과 거래처 수금을 자동 합산합니다.</small></div></div>
      <div class="mw-finance-summary">
        <article class="monthly"><span>월기성 예정</span><b id="mwMonthlyTotal">₩0</b><small id="mwMonthlyCount">0건</small></article>
        <article class="urgent"><span>긴급지출 예정</span><b id="mwUrgentTotal">₩0</b><small id="mwUrgentCount">0건</small></article>
        <article class="receivable"><span>이번 달 수금 예정</span><b id="mwReceivableTotal">₩0</b><small id="mwReceivableCount">0건</small></article>
      </div>
      <div class="mw-finance-tabs"><button class="active" data-mw-finance="payment">예정 지출서</button><button data-mw-finance="receivable">거래처 수금 예정</button></div>
      <section class="mw-money-panel active" data-mw-panel="payment">
        <div class="mw-panel-head"><div><p class="eyebrow">PLANNED PAYMENT</p><h2>예정 지출서</h2><small>월기성과 긴급지출은 색상으로 구분됩니다.</small></div><button class="mw-write-button" id="mwOpenPayment"><span class="material-symbols-rounded">edit_square</span>예정 지출서 작성</button></div>
        <div class="mw-payment-list" id="mwPaymentList"></div>
      </section>
      <section class="mw-money-panel" data-mw-panel="receivable">
        <div class="mw-panel-head"><div><p class="eyebrow">RECEIVABLE</p><h2>거래처 수금 예정</h2></div><button class="mw-write-button" id="mwOpenReceivable"><span class="material-symbols-rounded">edit_square</span>수금 예정 작성</button></div>
        <div class="mw-receivable-table"><div class="mw-receivable-head"><span>현장명·공사기간</span><span>계약금액</span><span>입금금액</span><span>대갑 기성률</span><span>잔금</span><span>입금 예정일</span></div><div id="mwReceivableList"></div></div>
      </section>`;

    buildPaymentModal();
    buildReceivableModal();
    view.querySelectorAll('[data-mw-finance]').forEach(button => button.addEventListener('click', () => {
      view.querySelectorAll('[data-mw-finance]').forEach(item => item.classList.toggle('active', item === button));
      view.querySelectorAll('[data-mw-panel]').forEach(item => item.classList.toggle('active', item.dataset.mwPanel === button.dataset.mwFinance));
    }));
    document.getElementById('mwOpenPayment').addEventListener('click', () => openModal('paymentFormModal'));
    document.getElementById('mwOpenReceivable').addEventListener('click', () => openModal('receivableFormModal'));
    renderAll();
  }

  function buildPaymentModal() {
    const modal = document.getElementById('paymentFormModal');
    if (!modal) return;
    modal.innerHTML = `<div class="money-modal-backdrop"></div><section><header><div><p class="eyebrow">PLANNED PAYMENT</p><h2>예정 지출서 작성</h2><small>금액을 입력하면 금회까지 기성률이 자동 계산됩니다.</small></div><button type="button" data-mw-close>×</button></header><div class="money-form-grid">
      <label>현장명<select id="mwPaymentSite"></select></label><label>작성자<input id="mwPaymentAuthor" readonly></label>
      <label>구분<select id="mwPaymentType"><option value="monthly">월기성</option><option value="urgent">긴급지출</option></select></label><label>공정명<input id="mwProcessName" placeholder="작성자가 공정명을 입력"></label>
      <label>공정별 공사금액<input id="mwProcessTotal" type="number" min="0" placeholder="예: 50000000"></label><label>지출 예정금액<input id="mwPlannedAmount" type="number" min="0" placeholder="예: 10000000"></label>
      <label>금회까지 기성률<input id="mwProgressRate" readonly value="0%"></label><label>지급 요청 예정일<input id="mwRequestDate" type="date"></label>
    </div><button class="primary full" id="mwSavePayment">예정 지출서 저장</button></section>`;
    modal.querySelector('[data-mw-close]').addEventListener('click', () => closeModal(modal));
    modal.querySelector('.money-modal-backdrop').addEventListener('click', () => closeModal(modal));
    ['mwProcessName','mwProcessTotal','mwPlannedAmount'].forEach(id => document.getElementById(id).addEventListener('input', updatePaymentRate));
    document.getElementById('mwPaymentSite').addEventListener('change', updatePaymentRate);
    document.getElementById('mwSavePayment').addEventListener('click', savePayment);
  }

  function buildReceivableModal() {
    const modal = document.getElementById('receivableFormModal');
    if (!modal) return;
    modal.innerHTML = `<div class="money-modal-backdrop"></div><section><header><div><p class="eyebrow">RECEIVABLE</p><h2>거래처 수금 예정 작성</h2></div><button type="button" data-mw-close>×</button></header><div class="money-form-grid">
      <label>현장명<select id="mwReceivableSite"></select></label><label>공사기간<input id="mwSitePeriod" readonly></label>
      <label>계약금액<input id="mwContractAmount" type="number" min="0" placeholder="예: 100000000"></label><label>입금금액<input id="mwReceivedAmount" type="number" min="0" placeholder="예: 30000000"></label>
      <label>대갑 기성률<input id="mwReceivableRate" readonly value="0%"></label><label>잔금<input id="mwBalance" readonly value="₩0"></label>
      <label>입금 예정일<input id="mwDueDate" type="date"></label>
    </div><button class="primary full" id="mwSaveReceivable">수금 예정 저장</button></section>`;
    modal.querySelector('[data-mw-close]').addEventListener('click', () => closeModal(modal));
    modal.querySelector('.money-modal-backdrop').addEventListener('click', () => closeModal(modal));
    document.getElementById('mwReceivableSite').addEventListener('change', updateSitePeriod);
    ['mwContractAmount','mwReceivedAmount'].forEach(id => document.getElementById(id).addEventListener('input', updateReceivableMath));
    document.getElementById('mwSaveReceivable').addEventListener('click', saveReceivable);
  }

  function openModal(id) {
    refreshSites();
    const modal = document.getElementById(id);
    if (id === 'paymentFormModal') {
      document.getElementById('mwPaymentAuthor').value = currentName();
      document.getElementById('mwRequestDate').value ||= todayKey();
      updatePaymentRate();
    } else {
      document.getElementById('mwDueDate').value ||= todayKey();
      updateSitePeriod(); updateReceivableMath();
    }
    modal.classList.add('show');
  }
  function closeModal(modal) { modal.classList.remove('show'); }

  function refreshSites() {
    const sites = [...document.querySelectorAll('.site-table-row')].map(row => row.dataset.siteRow).filter(Boolean);
    ['mwPaymentSite','mwReceivableSite'].forEach(id => {
      const select = document.getElementById(id); const current = select.value;
      select.replaceChildren(...sites.map(site => { const option=document.createElement('option'); option.value=site; option.textContent=site; return option; }));
      if (sites.includes(current)) select.value = current;
    });
  }

  function updatePaymentRate() {
    const total = number('mwProcessTotal'), planned = number('mwPlannedAmount');
    const site=value('mwPaymentSite'), process=value('mwProcessName').trim();
    const previous=payments.filter(item=>item.site===site&&item.process===process).reduce((sum,item)=>sum+item.amount,0);
    document.getElementById('mwProgressRate').value = `${percent(previous+planned,total)}%`;
  }
  function updateReceivableMath() {
    const contract = number('mwContractAmount'), received = number('mwReceivedAmount');
    document.getElementById('mwReceivableRate').value = `${percent(received,contract)}%`;
    document.getElementById('mwBalance').value = won(Math.max(0, contract-received));
  }
  function updateSitePeriod() {
    const site = document.getElementById('mwReceivableSite').value;
    const row = [...document.querySelectorAll('.site-table-row')].find(item => item.dataset.siteRow === site);
    const start = row?.dataset.startDate || '미등록', end = row?.dataset.endDate || '미등록';
    document.getElementById('mwSitePeriod').value = `${start} ~ ${end}`;
  }

  function savePayment() {
    const item = { id:crypto.randomUUID(), site:value('mwPaymentSite'), author:currentName(), type:value('mwPaymentType'), process:value('mwProcessName').trim(), processTotal:number('mwProcessTotal'), amount:number('mwPlannedAmount'), requestDate:value('mwRequestDate'), confirmations:{}, createdAt:new Date().toISOString() };
    if (!item.site || !item.process || !item.processTotal || !item.amount || !item.requestDate) return notify('현장·공정·금액·예정일을 모두 입력해주세요.');
    payments.unshift(item); persist(PAYMENT_KEY,payments); closeModal(document.getElementById('paymentFormModal')); clearPaymentForm(); renderAll(); notify('예정 지출서를 저장했습니다.');
  }
  function saveReceivable() {
    const item = { id:crypto.randomUUID(), site:value('mwReceivableSite'), period:value('mwSitePeriod'), contract:number('mwContractAmount'), received:number('mwReceivedAmount'), dueDate:value('mwDueDate'), createdAt:new Date().toISOString() };
    if (!item.site || !item.contract || !item.dueDate) return notify('현장·계약금액·입금 예정일을 입력해주세요.');
    receivables.unshift(item); persist(RECEIVABLE_KEY,receivables); closeModal(document.getElementById('receivableFormModal')); clearReceivableForm(); renderAll(); notify('수금 예정 내역을 저장했습니다.');
  }

  function renderAll() { renderPayments(); renderReceivables(); renderSummary(); }
  function renderPayments() {
    const list = document.getElementById('mwPaymentList'); list.replaceChildren();
    if (!payments.length) return list.append(empty('아직 작성된 예정 지출서가 없습니다.'));
    payments.forEach(item => {
      const card=document.createElement('article'); card.className=`mw-payment-card ${item.type}`;
      const cumulative=payments.filter(entry=>entry.site===item.site&&entry.process===item.process&&entry.createdAt<=item.createdAt).reduce((sum,entry)=>sum+entry.amount,0);
      card.innerHTML=`<header><div><span>${item.type==='urgent'?'긴급지출':'월기성'}</span><h3>${escapeHtml(item.site)}</h3><small>작성자 ${escapeHtml(item.author)}</small></div><time>${dateLabel(item.requestDate)} 지급 요청</time></header><div class="mw-payment-values"><div><small>공정명</small><b>${escapeHtml(item.process)}</b></div><div><small>공정별 공사금액</small><b>${won(item.processTotal)}</b></div><div><small>지출 예정금액</small><b>${won(item.amount)}</b></div><div><small>금회까지 기성률</small><b>${percent(cumulative,item.processTotal)}%</b></div></div><div class="mw-confirm-row">${roles.map(role => confirmButton(item,role)).join('')}</div>`;
      card.querySelectorAll('[data-confirm-role]').forEach(button => button.addEventListener('click', () => confirmPayment(item.id,button.dataset.confirmRole)));
      list.appendChild(card);
    });
  }
  function confirmButton(item,role) {
    const person=item.confirmations?.[role];
    return `<button class="${person?'checked':''}" data-confirm-role="${role}"><span class="material-symbols-rounded">${person?'check_circle':'radio_button_unchecked'}</span><b>${role}</b><small>${person?escapeHtml(person):'확인 전'}</small></button>`;
  }
  function confirmPayment(id,role) {
    const item=payments.find(entry=>entry.id===id); if(!item)return;
    item.confirmations ||= {}; item.confirmations[role]=currentName(); persist(PAYMENT_KEY,payments); renderAll(); notify(`${role} 확인을 기록했습니다.`);
  }
  function renderReceivables() {
    const list=document.getElementById('mwReceivableList'); list.replaceChildren();
    if(!receivables.length)return list.append(empty('아직 등록된 거래처 수금 예정이 없습니다.'));
    receivables.forEach(item=>{const row=document.createElement('article');row.className='mw-receivable-row';row.innerHTML=`<div><b>${escapeHtml(item.site)}</b><small>${escapeHtml(item.period)}</small></div><b>${won(item.contract)}</b><b>${won(item.received)}</b><b>${percent(item.received,item.contract)}%</b><b>${won(Math.max(0,item.contract-item.received))}</b><time>${dateLabel(item.dueDate)}</time>`;list.appendChild(row)});
  }
  function renderSummary() {
    const monthly=payments.filter(item=>item.type==='monthly'),urgent=payments.filter(item=>item.type==='urgent');
    const month=todayKey().slice(0,7); const due=receivables.filter(item=>item.dueDate?.startsWith(month));
    setText('mwMonthlyTotal',won(sum(monthly,'amount')));setText('mwMonthlyCount',`${monthly.length}건`);
    setText('mwUrgentTotal',won(sum(urgent,'amount')));setText('mwUrgentCount',`${urgent.length}건`);
    setText('mwReceivableTotal',won(due.reduce((total,item)=>total+Math.max(0,item.contract-item.received),0)));setText('mwReceivableCount',`${due.length}건`);
  }

  function clearPaymentForm(){['mwProcessName','mwProcessTotal','mwPlannedAmount'].forEach(id=>document.getElementById(id).value='');updatePaymentRate()}
  function clearReceivableForm(){['mwContractAmount','mwReceivedAmount'].forEach(id=>document.getElementById(id).value='');updateReceivableMath()}
  function currentName(){const user=window.MIN_WORKS_USER;return user?.role==='admin'?'관리자':user?.name||'접속 직원'}
  function value(id){return document.getElementById(id)?.value||''} function number(id){return Number(value(id))||0}
  function percent(value,total){return total?Math.min(100,Math.round(value/total*1000)/10):0}
  function sum(items,key){return items.reduce((total,item)=>total+(Number(item[key])||0),0)}
  function won(amount){return `₩${Math.round(Number(amount)||0).toLocaleString('ko-KR')}`}
  function todayKey(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date())}
  function dateLabel(raw){if(!raw)return '미정';return new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',timeZone:'Asia/Seoul'}).format(new Date(`${raw}T00:00:00+09:00`))}
  function read(key){try{const data=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(data)?data:[]}catch{return[]}}
  function persist(key,data){localStorage.setItem(key,JSON.stringify(data))}
  function empty(text){const node=document.createElement('div');node.className='mw-empty';node.textContent=text;return node}
  function setText(id,text){const node=document.getElementById(id);if(node)node.textContent=text}
  function escapeHtml(text){const node=document.createElement('span');node.textContent=String(text||'');return node.innerHTML}
})();
