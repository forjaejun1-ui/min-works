(() => {
  'use strict';
  const view = document.querySelector('#lettersView');
  const memo = view.querySelector('#letterMemo');
  const purpose = view.querySelector('#letterPurpose');
  const connect = view.querySelector('#letterConnect');
  const code = view.querySelector('#letterCode');
  const pairButton = view.querySelector('#letterPair');
  const panels = [...view.querySelectorAll('[data-letter-provider]')];
  const state = new Map();
  const account = () => window.MIN_WORKS_USER?.id;
  let local = null;
  let revision = 0;
  const initialCode = window.minWorksLetterPair;
  delete window.minWorksLetterPair;

  function connection(value) {
    const parts = /^(\d{1,5})\.([\w-]{43})$/.exec(value.trim());
    if (!parts || +parts[1] < 1 || +parts[1] > 65535) throw Error('CMD에 표시된 연결 코드를 다시 붙여 넣어 주세요.');
    return {base:'http://127.0.0.1:' + Number(parts[1]), token:parts[2]};
  }
  function controls(panel) {
    const pc = panel.dataset.letterProvider === 'pc';
    panel.querySelector('.letter-run').disabled = !account() || !memo.value.trim() || state.get(panel).busy || (pc && !local);
    panel.querySelector('.letter-copy').disabled = !panel.querySelector('textarea').value.trim();
  }
  function update() {
    view.querySelector('#letterCount').textContent = memo.value.length.toLocaleString() + ' / 5,000자';
    panels.forEach(controls);
  }
  async function call(url, token, body, timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(),timeout);
    try {
      const response = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
        body:JSON.stringify(body),cache:'no-store',credentials:'omit',signal:controller.signal});
      const data = await response.json().catch(()=>({}));
      if(!response.ok)throw Error(data.error || '요청을 처리하지 못했습니다. 다시 시도해 주세요.');
      return data;
    } catch(error) {
      if(controller.signal.aborted)throw Error('응답 시간이 길어졌습니다. 메모를 유지했으니 다시 시도해 주세요.');
      if(error instanceof TypeError)throw Error(url.startsWith('http://127.')?'CMD가 열려 있는지 확인하고 브라우저의 로컬 네트워크 접근을 허용해 주세요.':'서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      throw error;
    } finally {clearTimeout(timer);}
  }
  const pcStatus = view.querySelector('[data-letter-provider="pc"] .letter-status');
  async function pair(value) {
    pairButton.disabled = true;
    try {
      const candidate = connection(value);
      await call(candidate.base+'/status',candidate.token,{},6000);
      local=candidate;code.value='';connect.open=false;
      pcStatus.textContent='이 PC의 Codex에 연결됐습니다.';
    } catch(error) {local=null;connect.open=true;pcStatus.textContent=error.message;}
    finally {pairButton.disabled=false;update();}
  }
  pairButton.addEventListener('click',()=>pair(code.value));
  for(const panel of panels) {
    const pc = panel.dataset.letterProvider==='pc';
    const status = panel.querySelector('.letter-status');
    const output = panel.querySelector('textarea');
    const run = panel.querySelector('.letter-run');
    const task = {busy:false, edits:0};
    state.set(panel,task);
    output.addEventListener('input',()=>{task.edits++;controls(panel);});
    run.onclick=async()=>{
      if (run.disabled) return;
      const user=account(), version=revision, previousEdits=task.edits;
      const token=localStorage.getItem('minWorksSessionV1');
      if(!token || !user){status.textContent='민웍스 로그인 후 이용해 주세요.';return;}
      task.busy=true;controls(panel);status.textContent='문안을 다듬고 있어요…';
      try {
        const data=await call(pc?local.base+'/draft':'https://min-works-api.forjaejun.workers.dev/letters/draft',
          pc?local.token:token,{memo:memo.value.trim(),purpose:purpose.value},pc?150000:45000);
        if(account()!==user || revision!==version || task.edits!==previousEdits)throw Error('작성 내용이 변경됐습니다. 현재 메모로 다시 다듬어 주세요.');
        if(typeof data.content!=='string'||!data.content.trim())throw Error('빈 문안이 반환됐습니다. 메모를 조금 더 구체적으로 적어 주세요.');
        output.value=data.content.trim();status.textContent='초안이 완성됐습니다.';
      }catch(error){status.textContent=error.message;}
      finally{task.busy=false;controls(panel);}
    };
    panel.querySelector('.letter-copy').onclick=async()=>{
      try {await navigator.clipboard.writeText(output.value);status.textContent='본문을 복사했습니다.';}
      catch {output.focus();output.select();status.textContent='본문을 선택했습니다. 복사 메뉴를 눌러 주세요.';}
    };
  }
  memo.oninput=()=>{revision++;update();};
  purpose.onchange=()=>{revision++;};
  document.addEventListener('minworks:user-ready',update);
  update();
  if(initialCode)pair(initialCode);
})();
