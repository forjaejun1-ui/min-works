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
    render();
    if (!window.MIN_WORKS_TEST) {
      try {
        if (!window.MIN_WORKS_CLOUD?.saveNow) throw Error('회사 자료 연결을 확인해 주세요.');
        await window.MIN_WORKS_CLOUD.saveNow();
      } catch (error) {
        if (before == null) localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, before);
        render();
        alert(`Q&A를 공유 저장하지 못했습니다. ${error.message}`);
        return false;
      }
    }
    return true;
  };
  const render = () => {
    const data = read();
    board.replaceChildren();
    const intro = el('div','qa-intro');
    intro.append(el('p','', '사용 중 발견한 오류나 개선 의견을 남겨 주세요. 답변은 직원들과 공유됩니다.'),el('p','qa-muted','Gemini AI 자동 답변은 다음 패치 예정입니다. 지금은 개발자 답변으로 안내합니다.'));
    board.append(intro);
    const form = el('form','qa-form');
    const kind = el('select');
    kind.name = 'kind';
    [['bug','버그 신고'],['request','개선 요청'],['question','사용 질문']].forEach(([value,label]) => kind.add(new Option(label,value)));
    const title = el('input'); title.name='title'; title.maxLength=100; title.required=true; title.placeholder='제목을 적어 주세요';
    const detail = el('textarea'); detail.name='detail'; detail.maxLength=1500; detail.required=true; detail.placeholder='어떤 화면에서 무엇이 일어났는지 적어 주세요';
    const submit = el('button','', '등록하기'); submit.type='submit';
    form.append(el('label','', '종류'),kind,el('label','', '제목'),title,el('label','', '상세 내용'),detail,submit);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      submit.disabled = true;
      const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const ok = await mutate(next => next.posts.unshift({id,kind:kind.value,title:title.value.trim(),detail:detail.value.trim(),authorId:user().id||'',author:user().name||'직원',createdAt:new Date().toISOString()}));
      if (ok) render();
    });
    board.append(form);
    if (admin()) {
      const section = el('section','qa-admin');
      section.append(el('h3','', '다음 업데이트·수정 계획'));
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
      const head=el('div','qa-item-head');
      const heading=el('div');
      heading.append(el('span','qa-kind',({bug:'버그',request:'개선',question:'질문'})[post.kind]||'의견'),el('b','',post.title));
      head.append(heading,el('small','',`${post.author||'직원'} · ${String(post.createdAt||'').slice(0,10)}`));
      item.append(head,el('p','',post.detail));
      if(post.aiAnswer?.text){const answer=el('div','qa-answer');answer.append(el('b','', 'AI 답변입니다 · 계획은 변경될 수 있습니다'),el('p','',post.aiAnswer.text));item.append(answer)}
      else if(!post.developerAnswer?.text)item.append(el('p','qa-muted','개발자 답변 대기 중'));
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
  document.addEventListener('minworks:user-ready',render);
  render();
})();
