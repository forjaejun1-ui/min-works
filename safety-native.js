/* Native document navigation and locally saved safety records. Test only. */
(() => {
  
  function init(){
    const view=document.querySelector('#documentsView');
    if(!view||document.querySelector('#safetyEditor'))return;
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const editor=document.createElement('section');editor.id='safetyEditor';editor.dataset.docPanel='safety';editor.hidden=true;
    editor.innerHTML=`<header class="safety-editor-header"><button type="button" class="safety-back" data-safety-back>← 서류 목록</button><div class="safety-title-row"><div><h2 data-safety-id="pageTitle"></h2><p data-safety-id="mode"></p></div><div class="safety-primary-actions"><button type="button" data-safety-id="newBtn">새 문서</button><button type="button" class="primary" data-safety-id="saveBtn">서류 저장</button></div></div><div class="safety-toolbar"><button type="button" data-safety-id="printBtn">인쇄 / PDF</button><button type="button" data-safety-id="excelBtn">Excel 원본 양식</button><button type="button" data-safety-id="pdfBtn" hidden>PDF 다운로드</button><div hidden><button data-safety-id="exportBtn"></button><button data-safety-id="resetBtn"></button></div><span class="original-status">원본 없음</span><label class="original-upload">원본 파일 등록<input type="file" data-original-upload hidden></label><button type="button" data-original-download disabled>원본 다운로드</button><button type="button" data-safety-history-toggle>저장 문서</button></div><div data-safety-id="status" class="safety-save-status" role="status"></div><div class="safety-history" hidden></div></header><article class="paper" data-safety-id="paper"></article>`;
    view.append(editor);
    const engine=window.MIN_WORKS_SAFETY_ENGINE(editor);editor.addEventListener('input',()=>window.MIN_WORKS_SAFETY_DIRTY=true);
    window.safetyEngine73=engine;
    const docs=engine.documents;
    const costItems=[{page:1,title:'안전관리비 내역'},{page:2,title:'항목별 내역'},{page:5,title:'항목별 사진'},{page:3,title:'세금계산서'},{page:4,title:'거래명세표'}];
    const groups=[
      {title:'교육 서류',items:[{id:'new-hire-training',title:'신규채용자 교육'},{id:'worker-safety-pledge',title:'근로자 안전 서약서'},{id:'ppe-register',title:'개인보호구 지급대장'},{id:'msds-education-result',title:'MSDS 교육'}]},
      {title:'각종 허가서',items:[{id:'hot-work-permit',title:'화기작업허가서'},{id:'height-work-permit',title:'고소작업허가서'},{id:'trestle-permit',title:'말비계 작업허가서'}]},
      {title:'산업안전보건관리비',items:costItems.map(item=>({...item,id:'safety-cost-statement'}))}
    ];
    const icon=id=>id==='tbm-minutes'?'groups':id==='safety-cost-statement'?'receipt_long':id.includes('permit')?'fact_check':'description';
    const attrs=item=>'data-safety-doc="'+item.id+'"'+(item.page?' data-safety-page="'+item.page+'"':'');
    const gallery=document.querySelector('.document-category-grid');gallery.className='safety-library';
    const card=item=>'<button type="button" '+attrs(item)+'><span class="material-symbols-rounded">'+icon(item.id)+'</span><div><b>'+item.title+'</b><small>'+(docs.find(d=>d.id===item.id).preview?'원본 미리보기':'작성 · 저장')+'</small></div><span aria-hidden="true">→</span></button>';
    gallery.innerHTML='<section class="safety-daily-section"><div class="safety-document-grid">'+card({id:'tbm-minutes',title:'TBM 일지'})+'</div><p>매일 작업 전 작성</p></section>'+groups.map(g=>'<section><h3>'+g.title+'</h3><div class="safety-document-grid">'+g.items.map(card).join('')+'</div></section>').join('');
    const submenu=document.querySelector('.nav-submenu');
    const navItem=item=>'<button class="nav-subgroup" type="button" '+attrs(item)+'><span class="material-symbols-rounded">'+icon(item.id)+'</span><b>'+item.title+'</b></button>';
    submenu.innerHTML='<div class="safety-daily-nav">'+navItem({id:'tbm-minutes',title:'TBM 일지'})+'<small>매일 작성</small></div>'+groups.map((g,i)=>'<section class="safety-nav-section" aria-labelledby="safetyNavGroup'+i+'"><h3 id="safetyNavGroup'+i+'">'+g.title+'</h3>'+g.items.map(navItem).join('')+'</section>').join('');
    document.querySelectorAll('.tbm-quick').forEach(b=>b.remove());
    const pageHead=view.querySelector('.sample-page-head');pageHead.querySelector('.sample-badge')?.remove();
    pageHead.querySelector('p:not(.eyebrow)').textContent='서류를 선택하면 바로 작성할 수 있습니다.';
    const recordsKey='SafetyRecordsV1', editingKey='SafetyEditingV1';
    const read=()=>{const rows=JSON.parse(localStorage.getItem(recordsKey)||'[]');if(!Array.isArray(rows))throw Error('저장 문서 형식 오류');return rows};
    let editing={};try{editing=JSON.parse(localStorage.getItem(editingKey)||'{}')}catch{}
    const history=editor.querySelector('.safety-history');
    function list(){
      try{const rows=read().filter(r=>r.documentId===engine.current()).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
        editor.querySelector('[data-safety-history-toggle]').textContent=`저장 문서 ${rows.length}`;
        history.innerHTML=rows.length?rows.map(r=>`<button type="button" data-safety-record="${esc(r.id)}"><b>${esc(r.site||'현장명 미입력')}</b><span>${esc(r.date||r.updatedAt.slice(0,10))}</span><small>${esc(r.title)}</small></button>`).join(''):'<p>저장된 문서가 없습니다. 작성 후 ‘서류 저장’을 눌러 보관하세요.</p>';
      }catch{history.textContent='저장 문서를 읽지 못했습니다. 기존 자료는 유지됩니다.'}
    }
    function hidePanels(){view.querySelectorAll('[data-doc-panel]').forEach(p=>p.hidden=true)}
    function shell(){window.showView('documents');document.querySelector('.nav-cluster')?.classList.add('open');document.querySelector('.nav-parent')?.setAttribute('aria-expanded','true')}
    function syncCost(){
      const isCost=engine.current()==='safety-cost-statement';
      editor.classList.toggle('safety-cost-editor',isCost);
      if(isCost){const item=costItems.find(x=>x.page===engine.costPage());editor.querySelector('[data-safety-id="pageTitle"]').textContent=item.title;editor.querySelector('[data-safety-id="paper"]').dataset.printTitle=item.title;}
      document.querySelectorAll('[data-safety-doc]').forEach(b=>b.classList.toggle('selected',b.dataset.safetyDoc===engine.current()&&(!isCost||Number(b.dataset.safetyPage)===engine.costPage())));
    }
    function open(id,page){shell();hidePanels();gallery.hidden=true;pageHead.hidden=true;editor.hidden=false;history.hidden=true;if(engine.current()!==id||!editor.querySelector('[data-safety-id="paper"]').children.length)engine.open(id);if(id==='safety-cost-statement')engine.goCostPage(Number(page)||1);syncCost();list();window.scrollTo({top:0,behavior:'smooth'});}
    function home(){shell();hidePanels();gallery.hidden=false;pageHead.hidden=false;document.querySelectorAll('[data-safety-doc]').forEach(b=>b.classList.remove('selected'));}
    document.addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b)return;
      if(b.dataset.safetyDoc){e.preventDefault();e.stopImmediatePropagation();open(b.dataset.safetyDoc,b.dataset.safetyPage)}
      else if(b.matches('.nav-parent[data-view="documents"]')){e.preventDefault();e.stopImmediatePropagation();const cluster=b.closest('.nav-cluster');const wasOpen=cluster?.classList.contains('open');if(!wasOpen)home();cluster?.classList.toggle('open',!wasOpen);b.setAttribute('aria-expanded',String(!wasOpen));}
      else if(b.matches('[data-view="documents"],[data-safety-back]')){e.preventDefault();e.stopImmediatePropagation();home()}
      else if(b.dataset.safetyRecord){
        e.preventDefault();try{const row=read().find(r=>r.id===b.dataset.safetyRecord);if(!row)return;engine.restore(row.snapshot);editing[engine.current()]=row.id;localStorage.setItem(editingKey,JSON.stringify(editing));history.hidden=true;engine.status('저장 문서를 열었습니다. 수정 후 저장하면 이 문서가 갱신됩니다.');}catch{engine.status('문서를 열지 못했습니다. 현재 입력은 유지됩니다.')}
      }
    },true);
    editor.addEventListener('safety-render',()=>{list();syncCost()});
    editor.addEventListener('safety-cost-page',syncCost);
    editor.querySelector('[data-safety-history-toggle]').addEventListener('click',()=>{list();history.hidden=!history.hidden});
    editor.querySelector('[data-safety-id="saveBtn"]').addEventListener('click',async()=>{
      const saveButton=editor.querySelector('[data-safety-id="saveBtn"]');if(saveButton.disabled)return;saveButton.disabled=true;const previous=localStorage.getItem(recordsKey);
      try{
        const inputs=[...editor.querySelectorAll('input[required],select[required],textarea[required]')];if(inputs.some(e=>!e.reportValidity()))return;
        const data=engine.data(), rows=read(), documentId=engine.current();
        const id=editing[documentId]||crypto.randomUUID();
        const row={id,documentId,title:docs.find(d=>d.id===documentId).title,site:data.site||data.siteName||data.sc_project||'',date:data.writeDate||data.workDate||data.date||data.sc_yearMonth||'',updatedAt:new Date().toISOString(),snapshot:engine.snapshot()};
        const i=rows.findIndex(r=>r.id===id);if(i<0)rows.push(row);else rows[i]=row;
        localStorage.setItem(recordsKey,JSON.stringify(rows));await window.MIN_WORKS_CLOUD.saveNow();window.MIN_WORKS_SAFETY_DIRTY=false;editing[documentId]=id;
        localStorage.setItem(editingKey,JSON.stringify(editing));list();engine.status('저장 완료 · 회사 자료에 보관되었습니다.');
      }catch(error){if(previous===null)localStorage.removeItem(recordsKey);else localStorage.setItem(recordsKey,previous);engine.status('저장 실패 · 작성내용은 임시저장에 남아 있습니다. '+error.message)}finally{saveButton.disabled=false}
    });
    editor.querySelector('[data-safety-id="newBtn"]').addEventListener('click',()=>{
      if(!confirm('현재 입력을 비우고 새 문서를 시작할까요? 필요한 내용은 서류 저장 또는 JSON 백업으로 먼저 보관해 주세요.'))return;
      try{engine.fresh();delete editing[engine.current()];localStorage.setItem(editingKey,JSON.stringify(editing));engine.status('새 문서 · 현장을 선택하고 작성해 주세요.')}catch{engine.status('새 문서를 만들지 못했습니다.')}
    });
    const help=document.createElement('article');help.className='help-card static';help.innerHTML='<span class="material-symbols-rounded">description</span><div><h3>안전서류 작성·보관</h3><p>현장서류에서 원하는 서류를 바로 선택하세요. 매일 사용하는 TBM 일지는 맨 위에 강조되어 있습니다. 입력은 자동 임시저장되며, ‘서류 저장’을 누르면 현장과 날짜별 문서로 보관됩니다. ‘저장 문서’에서 열어 수정하고 ‘새 문서’로 다음 서류를 작성하세요. 사진과 증빙도 함께 저장됩니다. 현장명을 선택하면 공사금액·공사기간·발주처가 연결됩니다. 공정률은 슬라이더로 조정하세요. 원본 파일 등록으로 Excel 등의 파일을 보관하고 원본 다운로드로 그대로 받습니다. 화면 작성내용은 인쇄/PDF로 출력합니다. 왼쪽 메뉴는 TBM 일지, 교육 서류, 각종 허가서, 산업안전보건관리비 순서입니다. 안전관리비는 다섯 메뉴에서 해당 내역과 증빙을 바로 엽니다. 서류 저장은 회사에 공유됩니다. 작성 중 임시저장과 등록한 원본 파일은 해당 기기에 보관됩니다.</p></div>';document.querySelector('.help-grid').append(help);
    const patch=document.createElement('article');patch.className='patch-item';patch.innerHTML='<time datetime="2026-09-16">2026. 09. 16</time><div><span>v56</span><h3>현장서류 작성·원본 보관 개선</h3><p>TBM 일지를 맨 위에 강조하고 교육 서류·각종 허가서·산업안전보건관리비 순서로 정리했습니다. TBM 작성 바로가기와 이전 TBM 기록 메뉴를 제거하고 MSDS 교육 명칭을 줄였습니다. 안전관리비 내역·항목별 내역·항목별 사진·세금계산서·거래명세표가 각각 바로 열립니다. 현장정보 자동 연결, 직원 이름·직급 연결, 금액 자동 합산, 간결한 2열 화면, 교육서류 직접 작성과 원본 파일 보관을 추가했습니다. 메뉴 접기·펼치기도 수정했습니다. 저장 자료는 유지됩니다. 본판 적용.</p></div>';document.querySelector('#patchView .patch-item')?.before(patch);
    document.querySelectorAll('.help-card').forEach(card=>{if(card.querySelector('h3')?.textContent==='TBM 일지 작성'){card.querySelector('p').textContent='현장서류 맨 위의 TBM 일지를 누르면 작성 화면이 바로 열립니다. 입력은 임시저장되며 서류 저장으로 보관하고 저장 문서에서 다시 열어 수정합니다.'}});
    hidePanels();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

