/* Shared partner contacts; the public bundle contains no contact records. */
(() => {
  'use strict';
  const KEY = 'minWorksVendorDirectoryV1';
  let busy = false;
  const user = () => window.MIN_WORKS_USER;
  const requireUser = () => {
    if (!user() || document.body.classList.contains('auth-pending')) throw Error('로그인 후 이용해 주세요.');
  };
  const read = () => {
    requireUser();
    const data = JSON.parse(localStorage.getItem(KEY) || '{"revision":"","entries":[]}');
    return {revision:data.revision || '', entries:Array.isArray(data.entries)?data.entries:[], updatedAt:data.updatedAt || '', updatedBy:data.updatedBy || ''};
  };
  const save = async (entries, revision) => {
    requireUser();
    if (busy) throw Error('저장 중입니다. 잠시 기다려 주세요.');
    if (!Array.isArray(entries) || entries.length > 2000) throw Error('연락처 형식을 확인해 주세요.');
    const ids = new Set();
    for (const entry of entries) {
      if (!entry || typeof entry.id!=='string' || !entry.id || ids.has(entry.id) || !entry.name || !entry.trade) throw Error('중복 번호 또는 필수 항목을 확인해 주세요.');
      ids.add(entry.id);
    }
    const current = read();
    if (current.revision !== revision) throw Error('다른 직원이 연락처를 변경했습니다. 새로고침 후 다시 확인해 주세요. 작성 내용은 유지됩니다.');
    const before = localStorage.getItem(KEY);
    const next = {revision:crypto.randomUUID(),entries,updatedAt:new Date().toISOString(),updatedBy:[user().department,user().name || '관리자',user().rank].filter(Boolean).join(' ')};
    busy = true;
    window.MIN_WORKS_VENDOR_DIRTY = true;
    try {
      if (!window.MIN_WORKS_CLOUD?.saveNow) throw Error('회사 자료 연결을 확인한 뒤 저장해 주세요.');
      localStorage.setItem(KEY,JSON.stringify(next));
      await window.MIN_WORKS_CLOUD.saveNow();
      return next;
    } catch (error) {
      if (before == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY,before);
      throw error;
    } finally { busy=false; window.MIN_WORKS_VENDOR_DIRTY=false; }
  };
  window.MIN_WORKS_VENDORS = Object.freeze({read, save, canImport:()=>user()?.role==='admin', userId:()=>user()?.id || user()?.name || 'admin'});
  const view = document.getElementById('vendorsView');
  const frame = document.getElementById('vendorFrame');
  let previousGreeting=null;
  function open() {
    const greeting=document.getElementById('greetingMessage');
    if (!view.classList.contains('active')) {
      if(previousGreeting!==null&&greeting){greeting.textContent=previousGreeting;previousGreeting=null;}
      return;
    }
    if(greeting){if(previousGreeting===null)previousGreeting=greeting.textContent;greeting.textContent='지역별 협력업체와 연락처를 한눈에 확인하세요.';}
    if (!user()) return;
    if (!frame.getAttribute('src')) frame.src='vendor-directory.html?v=vendors95';
  }
  new MutationObserver(open).observe(view,{attributes:true,attributeFilter:['class']});
  document.addEventListener('minworks:user-ready',open);
  window.addEventListener('beforeunload',event=>{if(window.MIN_WORKS_VENDOR_DIRTY){event.preventDefault();event.returnValue='';}});
  open();
})();
