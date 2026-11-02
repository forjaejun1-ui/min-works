/* The browser calls only the authenticated MIN WORKS API. No Gemini key is shipped. */
(() => {
  const view = document.getElementById('qaView');
  const board = document.getElementById('qaBoard');
  if (!view || !board) return;
  const API = 'https://min-works-api.forjaejun.workers.dev';
  const state = {ready:false, checking:false, message:'연결 확인 중', answers:{}, pending:new Set(), errors:{}};
  const announce = () => document.dispatchEvent(new Event('minworks:qa-ai'));
  async function request(path, body) {
    const token = localStorage.getItem('minWorksSessionV1');
    if (!token) throw new Error('민웍스에 로그인한 뒤 이용하세요.');
    const response = await fetch(API + path, {
      method:body ? 'POST' : 'GET', cache:'no-store', signal:AbortSignal.timeout(35000),
      headers:{Authorization:'Bearer '+token, ...(body ? {'Content-Type':'application/json'} : {})},
      ...(body ? {body:JSON.stringify(body)} : {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || (response.status === 404 ? 'Gemini 서버 연결을 준비하고 있습니다.' : '자동답변 연결을 확인해 주세요.'));
    return data;
  }
  async function refresh() {
    if (state.checking) return;
    state.checking = true;
    try {
      const data = await request('/qa/assistant');
      state.ready = data.ready === true;
      state.message = state.ready ? '답변 가능' : '연결 준비 중';
      state.answers = data.answers || {};
    } catch (error) { state.ready = false; state.message = error.message; }
    finally {state.checking=false; updateStatus(); announce();}
  }
  async function answerPost(id) {
    if (state.pending.has(id)) return;
    state.pending.add(id); delete state.errors[id]; announce();
    try {const data = await request('/qa/answer', {questionId:id}); state.answers[id] = data.answer;}
    catch (error) {state.errors[id] = error.name === 'TimeoutError' ? '답변 시간이 길어지고 있어요. 잠시 후 다시 요청해 주세요.' : error.message;}
    finally {state.pending.delete(id); announce();}
  }
  window.MIN_WORKS_QA_AI = {state,refresh,answerPost};
  const section = document.createElement('section');
  section.className = 'qa-assistant panel';
  section.id = 'qaAssistant';
  section.setAttribute('aria-labelledby', 'qaAssistantTitle');
  section.innerHTML = `
    <header class="qa-assistant-head">
      <div class="qa-assistant-brand"><span class="qa-assistant-icon" aria-hidden="true">✦</span><div><p>MIN WORKS ASSISTANT</p><h2 id="qaAssistantTitle">Gemini 자동답변</h2></div></div>
      <button type="button" class="qa-assistant-status" title="연결 상태 다시 확인">연결 확인 중</button>
    </header>
    <p class="qa-assistant-description">민웍스 사용법이나 오류, 개선 계획을 물어보세요.</p>
    <div class="qa-assistant-conversation" role="status" aria-live="polite">
      <span class="qa-assistant-message-icon" aria-hidden="true">✦</span>
      <div><b>민웍스에 대해 궁금한 점을 남겨 주세요.</b><p>사용법과 등록된 업데이트 계획을 참고해 답변합니다. 계획에서 확인되지 않는 내용은 확정된 일정처럼 안내하지 않습니다.</p></div>
    </div>
    <label for="qaAssistantQuestion" class="qa-assistant-label">질문 작성</label>
    <div class="qa-assistant-compose">
      <textarea id="qaAssistantQuestion" maxlength="1500" rows="3" placeholder="예: 공사일보 사진이 늦게 보여요. 개선 예정인가요?" aria-describedby="qaAssistantHint"></textarea>
      <div class="qa-assistant-compose-foot"><span id="qaAssistantCount">0 / 1,500</span><button type="button" class="qa-assistant-send" disabled>질문 보내기 ↑</button></div>
    </div>
    <div class="qa-assistant-foot"><p id="qaAssistantHint">질문과 공개용 업데이트 계획을 Google Gemini로 전송합니다. 무료 서비스의 입력·답변은 Google 제품 개선에 사용될 수 있으니 개인정보·기밀은 입력하지 마세요. AI 답변은 틀릴 수 있으며 개발자 답변을 우선 확인하세요.</p><button type="button" class="qa-assistant-report">작성한 내용으로 의견 접수 ↓</button></div>`;
  board.before(section);
  const question = section.querySelector('textarea');
  const send = section.querySelector('.qa-assistant-send');
  const conversation = section.querySelector('.qa-assistant-conversation');
  let busy = false;
  function updateStatus() {
    const badge=section.querySelector('.qa-assistant-status');
    badge.textContent=state.checking ? '연결 확인 중' : state.ready ? '답변 가능' : '연결 확인 필요';
    badge.title=state.message+' · 눌러서 다시 확인';
    badge.classList.toggle('ready',state.ready);
    send.disabled = busy || !state.ready;
  }
  section.querySelector('.qa-assistant-status').addEventListener('click',refresh);
  send.addEventListener('click',async()=>{
    const message=question.value.trim();
    if (!message || busy) {question.focus(); return;}
    busy=true; updateStatus(); send.textContent='답변 작성 중…';
    conversation.replaceChildren();
    const status=document.createElement('p');status.textContent='사용법과 업데이트 계획을 확인하고 있어요…';conversation.append(status);
    try {
      const data=await request('/qa/ask',{message});
      if (!data.answer?.text) throw new Error('답변을 받지 못했어요. 다시 시도해 주세요.');
      conversation.replaceChildren();
      const content=document.createElement('div'), label=document.createElement('b'), text=document.createElement('p');
      label.textContent='AI 답변입니다 · Gemini';text.textContent=data.answer.text;content.append(label,text);conversation.append(content);
    } catch(error) {status.textContent=error.name==='TimeoutError' ? '답변 시간이 길어지고 있어요. 질문은 그대로 남아 있으니 다시 시도해 주세요.' : error.message;}
    finally {busy=false;send.textContent='질문 보내기 ↑';updateStatus();}
  });
  question.addEventListener('input', () => {section.querySelector('#qaAssistantCount').textContent = `${question.value.length.toLocaleString()} / 1,500`;});
  section.querySelector('.qa-assistant-report').addEventListener('click', () => {
    const form = board.querySelector(':scope > .qa-form');
    const title = form?.querySelector('[name="title"]');
    const detail = form?.querySelector('[name="detail"]');
    if (!form || !title || !detail) return;
    if (question.value.trim()) {
      if (!title.value.trim()) title.value = question.value.trim().split('\n')[0].slice(0,100);
      if (!detail.value.trim()) detail.value = question.value.trim();
    }
    form.scrollIntoView({behavior:'smooth',block:'center'});
    detail.focus({preventScroll:true});
  });
  document.addEventListener('minworks:user-ready',refresh);
  window.addEventListener('hashchange',()=>{if(location.hash==='#qa')refresh();});
  if (window.MIN_WORKS_USER) refresh();
})();
