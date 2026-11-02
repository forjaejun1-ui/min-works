/* Employee Q&A is stored with company state. Gemini answers require the private Worker route. */
(() => {
  const KEY = 'minWorksQaBoardV1';
  const board = document.getElementById('qaBoard');
  if (!board) return;
  const admin = () => window.MIN_WORKS_USER?.role === 'admin';
  const user = () => window.MIN_WORKS_USER || {};
  const read = () => {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || '{}');
      return { posts:Array.isArray(data.posts) ? data.posts : [], plans:Array.isArray(data.plans) ? data.plans : [] };
    } catch { return { posts:[], plans:[] }; }
  };
  const el = (tag, className, content) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content != null) node.textContent = content;
    return node;
  };
  const mutate = async update => {
    const before = localStorage.getItem(KEY);
    const data = read();
    update(data);
    localStorage.setItem(KEY, JSON.stringify(data));
    if (!window.MIN_WORKS_TEST) {
      try {
        if (!window.MIN_WORKS_CLOUD?.saveNow) throw Error('회사 자료 연결을 확인해 주세요.');
        await window.MIN_WORKS_CLOUD.saveNow();
      } catch (error) {
        if (before == null) localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, before);
        alert(`Q&A를 공유 저장하지 못했습니다. ${error.message}`);
        return false;
      }
    }
    render();
    return true;
  };
  const render = () => {
    const data = read();
    board.replaceChildren();
    const intro = el('div','qa-intro');
    intro.append(el('h3','', '버그·개선 의견 접수'),el('p','', '사용 중 발견한 오류나 개선 의견을 남겨 주세요. 등록한 의견과 개발자 답변은 직원들과 공유됩니다.'));
    board.append(intro);
    const form = el('form','qa-form');
    const kind = el('select');
    kind.name = 'kind';
    [['bug','버그 신고'],['request','개선 요청'],['question','사용 질문']].forEach(([value,label]) => kind.add(new Option(label,value)));
    const title = el('input'); title.name='title'; title.maxLength=100; title.required=true; title.placeholder='제목을 적어 주세요';
    const detail = el('textarea'); detail.name='detail'; detail.maxLength=1500; detail.required=true; detail.placeholder='어떤 화면에서 무엇이 일어났는지 적어 주세요';
    const submit = el('button','', '등록하기'); submit.type='submit';
    const aiOption=el('label','qa-ai-option');
    const aiCheck=el('input');aiCheck.type='checkbox';aiCheck.checked=true;
    aiOption.append(aiCheck,document.createTextNode('등록 후 Gemini 자동답변 받기'));
    form.append(el('label','', '종류'),kind,el('label','', '제목'),title,el('label','', '상세 내용'),detail,aiOption,el('p','qa-muted','선택하면 제목·상세 내용과 업데이트 계획을 Google Gemini로 전송합니다. 개인정보·기밀은 입력하지 마세요.'),submit);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      submit.disabled = true;
      const wantsAi=aiCheck.checked;
      const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const ok = await mutate(next => next.posts.unshift({id,kind:kind.value,title:title.value.trim(),detail:detail.value.trim(),authorId:user().id||'',author:user().name||'직원',createdAt:new Date().toISOString()}));
      if (ok) {if(wantsAi)await window.MIN_WORKS_QA_AI?.answerPost(id);}
      else submit.disabled=false;
    });
    board.append(form);
    if (admin()) {
      const section = el('section','qa-admin');
      section.append(el('h3','', '다음 업데이트·수정 계획'));
      section.append(el('p','qa-muted','Gemini 답변의 참고 자료입니다. 직원에게 공개할 기능명·상태·안내만 입력하세요. 개인정보나 계약 내용은 입력하지 마세요.'));
      const planForm = el('form','qa-form');
      const planTitle=el('input'); planTitle.required=true; planTitle.maxLength=100; planTitle.placeholder='예: 사진 갱신 속도 개선';
      const planStatus=el('select');
      [['planned','예정'],['working','진행 중'],['done','완료'],['none','현재 계획 없음']].forEach(([value,label])=>planStatus.add(new Option(label,value)));
      const planDetail=el('textarea'); planDetail.maxLength=500; planDetail.placeholder='직원에게 보여줄 설명';
      const add=el('button','', '계획 저장'); add.type='submit';
      let editingId = '';
      planForm.append(el('label','', '항목'),planTitle,el('label','', '상태'),planStatus,el('label','', '설명'),planDetail,add);
      planForm.addEventListener('submit',async event=>{event.preventDefault();if(!planForm.reportValidity())return;await mutate(next=>{const value={id:editingId||crypto.randomUUID?.()||String(Date.now()),title:planTitle.value.trim(),status:planStatus.value,detail:planDetail.value.trim(),updatedAt:new Date().toISOString()};const index=next.plans.findIndex(item=>item.id===editingId);if(index>=0)next.plans[index]=value;else next.plans.unshift(value)});});
      section.append(planForm);
      const plans=el('div','qa-plan-list');
      data.plans.forEach(plan=>{const row=el('article');row.append(el('b','',({planned:'예정',working:'진행 중',done:'완료',none:'계획 없음'})[plan.status]||plan.status),el('span','',`${plan.title}${plan.detail?` · ${plan.detail}`:''}`));const edit=el('button','qa-plan-edit','수정');edit.type='button';edit.addEventListener('click',()=>{editingId=plan.id;planTitle.value=plan.title;planStatus.value=plan.status;planDetail.value=plan.detail||'';add.textContent='변경 저장';planTitle.focus()});row.append(edit);plans.append(row)});
      section.append(plans);
      board.append(section);
    }
    const posts=el('section','qa-list');
    posts.append(el('h3','',`등록된 의견 ${data.posts.length}건`));
    if (!data.posts.length) posts.append(el('p','', '아직 등록된 의견이 없습니다.'));
    data.posts.forEach(post=>{
      const item=el('article','qa-item');
      item.dataset.questionId=post.id;
      const head=el('div','qa-item-head');
      const heading=el('div');
      heading.append(el('span','qa-kind',({bug:'버그',request:'개선',question:'질문'})[post.kind]||'의견'),el('b','',post.title));
      head.append(heading,el('small','',`${post.author||'직원'} · ${String(post.createdAt||'').slice(0,10)}`));
      item.append(head,el('p','',post.detail));
      const aiReply=el('div','qa-ai-reply');item.append(aiReply);
      updateAiReply(aiReply,post);
      if(post.developerAnswer?.text){const answer=el('div','qa-answer developer');answer.append(el('b','', '개발자 답변'),el('p','',post.developerAnswer.text));item.append(answer)}
      if(admin()){
        const answer=el('textarea','qa-answer-input');answer.placeholder='개발자 답변을 직접 입력';answer.value=post.developerAnswer?.text||'';
        const save=el('button','qa-answer-save','개발자 답변 저장');save.type='button';
        save.addEventListener('click',async()=>{if(!answer.value.trim())return;await mutate(next=>{const target=next.posts.find(x=>x.id===post.id);if(target)target.developerAnswer={text:answer.value.trim().slice(0,1500),at:new Date().toISOString()}})});
        item.append(answer,save);
      }
      posts.append(item);
    });
    board.append(posts);
  };
  function updateAiReply(host,post) {
    host.replaceChildren();
    const service=window.MIN_WORKS_QA_AI;
    const answer=service?.state.answers[post.id];
    if(answer?.text){const box=el('div','qa-answer');box.append(el('b','','AI 답변입니다 · Gemini · 계획은 변경될 수 있습니다'),el('p','',answer.text));host.append(box);}
    if(service?.state.pending.has(post.id)){host.append(el('p','qa-muted','Gemini가 사용법과 업데이트 계획을 확인하고 있어요…'));return;}
    if(service?.state.errors[post.id])host.append(el('p','qa-muted',service.state.errors[post.id]));
    if(!answer?.text&&!post.developerAnswer?.text){
      host.append(el('p','qa-muted','개발자 답변 대기 중'));
      if(admin()||String(post.authorId)===String(user().id)){
        const retry=el('button','qa-ai-retry','Gemini 답변 요청');retry.type='button';
        retry.addEventListener('click',()=>service?.answerPost(post.id));host.append(retry);
      }
    }
  }
  document.addEventListener('minworks:qa-ai',()=>{
    const data=read();
    board.querySelectorAll('.qa-item[data-question-id]').forEach(item=>{
      const post=data.posts.find(p=>p.id===item.dataset.questionId);
      if(post)updateAiReply(item.querySelector('.qa-ai-reply'),post);
    });
  });
  document.addEventListener('minworks:user-ready',render);
  render();
})();
