/* Native document navigation and locally saved safety records. Test only. */
(() => {
  
  function init(){
    const view=document.querySelector('#documentsView');
    if(!view||document.querySelector('#safetyEditor'))return;
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const editor=document.createElement('section');editor.id='safetyEditor';editor.dataset.docPanel='safety';editor.hidden=true;
    editor.innerHTML=`<header class="safety-editor-header"><button type="button" class="safety-back" data-safety-back>← 서류 목록</button><div class="safety-title-row"><div><h2 data-safety-id="pageTitle"></h2><p data-safety-id="mode"></p></div><div class="safety-primary-actions"><button type="button" data-safety-id="newBtn">새 문서</button><button type="button" class="primary" data-safety-id="saveBtn">서류 저장</button></div></div><div class="safety-toolbar"><button type="button" data-safety-id="printBtn">인쇄 / PDF</button><button type="button" class="primary" data-safety-id="printAllBtn" hidden>전체 PDF 출력</button><button type="button" data-safety-id="excelBtn">Excel 원본 양식</button><button type="button" data-safety-id="pdfBtn" hidden>PDF 다운로드</button><div hidden><button data-safety-id="exportBtn"></button><button data-safety-id="resetBtn"></button></div><span class="original-status">원본 없음</span><label class="original-upload">원본 파일 등록<input type="file" data-original-upload hidden></label><button type="button" data-original-download disabled>원본 다운로드</button><button type="button" data-safety-history-toggle>저장 문서</button></div><div data-safety-id="status" class="safety-save-status" role="status"></div><div class="safety-history" hidden></div></header><section class="safety-context-bar" data-safety-context><label><span>현장</span><select data-document-site><option value="">현장 선택</option></select></label><div><span>담당자</span><b data-context-manager>미등록</b></div><div><span>공사기간</span><b data-context-period>미등록</b></div><div><span>발주처</span><b data-context-client>미등록</b></div><div><span>공사금액</span><b data-context-amount>미등록</b></div></section><article class="paper" data-safety-id="paper"></article>`;
    view.append(editor);
    const engine=window.MIN_WORKS_SAFETY_ENGINE(editor);editor.addEventListener('input',()=>window.MIN_WORKS_SAFETY_DIRTY=true);
    window.safetyEngine73=engine;
    const context=window.MIN_WORKS_DOCUMENT_CONTEXT,siteSelect=editor.querySelector('[data-document-site]');
    const renderContext=site=>{const sites=context?.sites?.()||[],previous=site?.name||siteSelect.value||context?.current?.()?.name||'';siteSelect.innerHTML='<option value="">현장 선택</option>'+sites.map(item=>'<option value="'+esc(item.name)+'">'+esc(item.name)+'</option>').join('');siteSelect.value=previous;const current=sites.find(item=>item.name===siteSelect.value)||null;editor.querySelector('[data-context-manager]').textContent=current?.manager||'미등록';editor.querySelector('[data-context-period]').textContent=current?.start||current?.end?[current?.start||'미등록',current?.end||'미등록'].join(' ~ '):'미등록';editor.querySelector('[data-context-client]').textContent=current?.client||'미등록';editor.querySelector('[data-context-amount]').textContent=context?.formatAmount?.(current?.amount)||'미등록';return current};
    const applyContext=site=>{if(!site)return;const frame=editor.querySelector('iframe'),api=frame?.contentWindow?.MIN_WORKS_FORM_TOOL||frame?.contentWindow?.MIN_WORKS_RISK_TOOL||frame?.contentWindow?.MIN_WORKS_TBM_TOOL||frame?.contentWindow?.MIN_WORKS_PHOTO_LEDGER||frame?.contentWindow?.MIN_WORKS_PRINT_FORM;api?.applyContext?.(site);if(frame&&!api){const doc=frame.contentDocument,sheet=doc?.querySelector('article.sheet'),head=sheet?.querySelector('header');if(sheet&&head){let box=sheet.querySelector('[data-linked-site]');if(!box){box=doc.createElement('section');box.dataset.linkedSite='';box.innerHTML='<div><span>현장명</span><b data-linked-name></b></div><div><span>담당자</span><b data-linked-manager></b></div><div><span>공사기간</span><b data-linked-period></b></div><div><span>발주처</span><b data-linked-client></b></div>';head.after(box);const style=doc.createElement('style');style.textContent='[data-linked-site]{display:grid;grid-template-columns:1.3fr .8fr 1.2fr 1fr;border:1px solid #9fa895;border-top:0;margin:0 0 10px}[data-linked-site]>div{min-width:0;padding:5px 7px;border-right:1px solid #c6ccbe}[data-linked-site]>div:last-child{border-right:0}[data-linked-site] span{display:block;color:#747c6c;font-size:8px}[data-linked-site] b{display:block;overflow:hidden;margin-top:2px;font-size:10px;text-overflow:ellipsis;white-space:nowrap}';doc.head.append(style)}box.querySelector('[data-linked-name]').textContent=site.name||'';box.querySelector('[data-linked-manager]').textContent=site.manager||'미등록';box.querySelector('[data-linked-period]').textContent=[site.start,site.end].filter(Boolean).join(' ~ ')||'미등록';box.querySelector('[data-linked-client]').textContent=site.client||'미등록'}}const nativeSite=editor.querySelector('[data-key="site"], [data-key="siteName"], [data-key="sc_project"]');if(nativeSite&&nativeSite.value!==site.name){nativeSite.value=site.name;nativeSite.dispatchEvent(new Event('change',{bubbles:true}))}};
    siteSelect.addEventListener('change',()=>{const site=renderContext(context?.select?.(siteSelect.value));applyContext(site)});
    editor.addEventListener('load',event=>{if(event.target.tagName==='IFRAME')applyContext(renderContext(context?.current?.()))},true);
    window.addEventListener('minworks:document-context-changed',event=>{const site=renderContext(event.detail);applyContext(site)});
    renderContext(context?.current?.());
    window.addEventListener('minworks:risk-input',()=>{if(engine.current()==='risk-assessment')window.MIN_WORKS_SAFETY_DIRTY=true;});
    window.addEventListener('message',event=>{const frame=editor.querySelector('#riskToolFrame');if(event.origin===location.origin&&event.source===frame?.contentWindow&&event.data?.type==='minworks:risk-height'){const height=Number(event.data.height);if(Number.isFinite(height)&&height>0)frame.style.height=Math.min(60000,Math.max(600,height))+'px';}});
    window.addEventListener('minworks:tbm-input',()=>{if(engine.current()==='tbm-minutes')window.MIN_WORKS_SAFETY_DIRTY=true;});
    window.addEventListener('message',event=>{const frame=editor.querySelector('#tbmToolFrame');if(event.origin===location.origin&&event.source===frame?.contentWindow&&event.data?.type==='minworks:tbm-height'){const height=Number(event.data.height);if(Number.isFinite(height)&&height>0)frame.style.height=Math.min(30000,Math.max(600,height))+'px';}});
    window.addEventListener('minworks:photo-ledger-input',()=>{if(engine.current()==='photo-ledger-pro-v1')window.MIN_WORKS_SAFETY_DIRTY=true;});
    window.addEventListener('message',event=>{const frame=editor.querySelector('#photoLedgerFrame');if(event.origin===location.origin&&event.source===frame?.contentWindow&&event.data?.type==='minworks:photo-ledger-height'){const height=Number(event.data.height);if(Number.isFinite(height)&&height>0)frame.style.height=Math.min(60000,Math.max(900,height))+'px';}});
    window.addEventListener('minworks:form-input',()=>{if(editor.querySelector('#documentFormFrame'))window.MIN_WORKS_SAFETY_DIRTY=true;});
 window.addEventListener('message',event=>{const frame=editor.querySelector('#documentFormFrame');if(event.origin===location.origin&&event.source===frame?.contentWindow&&event.data?.type==='minworks:form-height'){const height=Number(event.data.height);if(Number.isFinite(height)&&height>0)frame.style.height=Math.min(30000,Math.max(600,height+10))+'px';}});
 const docs=engine.documents;
    const costItems=[{page:1,title:'안전관리비 내역'},{page:2,title:'항목별 내역'},{page:4,title:'항목별 사진'},{page:3,title:'세금계산서·거래명세표'}];
    const groups=[
      {title:'위험성평가',items:[{id:'risk-assessment',title:'위험성평가표'}]},
      {title:'교육 서류',items:[{id:'new-hire-training',title:'신규채용자 교육'},{id:'worker-safety-pledge',title:'근로자 안전 서약서'},{id:'ppe-register',title:'개인보호구 지급대장'},{id:'msds-education-result',title:'MSDS 교육'}]},
      {title:'각종 허가서',items:[{id:'hot-work-permit',title:'화기작업허가서'},{id:'height-work-permit',title:'고소작업허가서'},{id:'trestle-permit',title:'말비계 작업허가서'}]},
      {title:'산업안전보건관리비',items:costItems.map(item=>({...item,id:'safety-cost-statement'}))}
    ];
    const glyph=kind=>({
      people:'<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8" r="2.5"/><path d="M3.5 18v-1.5A4.5 4.5 0 0 1 8 12h0a4.5 4.5 0 0 1 4.5 4.5V18M11.5 18v-1.5A4.5 4.5 0 0 1 16 12h0a4.5 4.5 0 0 1 4.5 4.5V18"/></svg>',
      photo:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m5 18 5-5 3.5 3 2.5-2 3 4"/></svg>',
      receipt:'<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
      permit:'<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h4m-4 4 2 2 5-5"/></svg>',
      document:'<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6Z"/><path d="M14 3v5h5M9 12h6M9 16h6"/></svg>',
      folder:'<svg viewBox="0 0 24 24"><path d="M3 6h7l2 2h9v11H3Z"/></svg>'
    }[kind]||'');
    const icon=id=>id==='tbm-minutes'?'people':id==='photo-ledger-pro-v1'?'photo':id==='safety-cost-statement'?'receipt':id.includes('permit')?'permit':'document';
    const attrs=item=>'data-safety-doc="'+item.id+'"'+(item.page?' data-safety-page="'+item.page+'"':'');
    const gallery=document.querySelector('.document-category-grid');gallery.className='safety-library';
    const card=item=>'<button type="button" '+attrs(item)+'><span class="safety-doc-icon" aria-hidden="true">'+glyph(icon(item.id))+'</span><div><b>'+item.title+'</b><small>'+(item.id==='tbm-minutes'?'바로 작성 · 인쇄':item.id==='photo-ledger-pro-v1'?'사진 편집 · PDF 출력':['new-hire-training','worker-safety-pledge','ppe-register'].includes(item.id)?'출력 · 수기 작성':'작성 · 저장')+'</small></div><span class="safety-card-arrow" aria-hidden="true">→</span></button>';
    gallery.innerHTML='<section class="safety-daily-section"><div class="safety-document-grid">'+card({id:'tbm-minutes',title:'TBM 일지'})+card({id:'photo-ledger-pro-v1',title:'사진대지PRO_V1'})+'</div><p>TBM 작성 및 현장 사진대지 제작</p></section>'+groups.map(g=>'<section><h3>'+g.title+'</h3><div class="safety-document-grid">'+g.items.map(card).join('')+'</div></section>').join('');
    const submenu=document.querySelector('.nav-submenu');
    const navItem=item=>'<button class="nav-subgroup" type="button" '+attrs(item)+'><span class="safety-doc-icon" aria-hidden="true">'+glyph(icon(item.id))+'</span><b>'+item.title+'</b></button>';
    const chevron='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6.5 8 3.5 3.5L13.5 8"/></svg>';
    submenu.innerHTML='<div class="safety-primary-nav">'+navItem({id:'tbm-minutes',title:'TBM 일지'})+navItem({id:'photo-ledger-pro-v1',title:'사진대지PRO_V1'})+'</div>'+groups.map((g,i)=>'<section class="safety-nav-section" data-safety-group="'+i+'"><button type="button" class="safety-nav-group-toggle" aria-expanded="false" aria-controls="safetyNavGroup'+i+'"><span>'+g.title+'</span><i aria-hidden="true">'+chevron+'</i></button><div class="safety-nav-group-items" id="safetyNavGroup'+i+'" hidden>'+g.items.map(navItem).join('')+'</div></section>').join('');
    const navParent=document.querySelector('.nav-parent[data-view="documents"]');
    if(navParent)navParent.innerHTML='<span class="safety-doc-icon" aria-hidden="true">'+glyph('folder')+'</span><b>현장서류</b><span class="safety-nav-chevron" aria-hidden="true">'+chevron+'</span>';
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
      editor.querySelector('[data-safety-id="printAllBtn"]').hidden=!isCost;
      if(isCost){const item=costItems.find(x=>x.page===engine.costPage());editor.querySelector('[data-safety-id="pageTitle"]').textContent=item.title;editor.querySelector('[data-safety-id="paper"]').dataset.printTitle=item.title;}
      document.querySelectorAll('[data-safety-doc]').forEach(b=>b.classList.toggle('selected',b.dataset.safetyDoc===engine.current()&&(!isCost||Number(b.dataset.safetyPage)===engine.costPage())));
    }
    function setNavGroup(section,open){if(!section)return;section.classList.toggle('open',open);section.querySelector('.safety-nav-group-toggle')?.setAttribute('aria-expanded',String(open));const items=section.querySelector('.safety-nav-group-items');if(items)items.hidden=!open}
    function revealNavGroup(id,page){const candidates=[...submenu.querySelectorAll('[data-safety-doc="'+id+'"]')];const selected=id==='safety-cost-statement'?candidates.find(b=>Number(b.dataset.safetyPage)===Number(page||1)):candidates[0];setNavGroup(selected?.closest('.safety-nav-section'),true)}
    function open(id,page){shell();hidePanels();gallery.hidden=true;pageHead.hidden=true;editor.hidden=false;history.hidden=true;if(engine.current()!==id||!editor.querySelector('[data-safety-id="paper"]').children.length)engine.open(id);if(id==='safety-cost-statement')engine.goCostPage(Number(page)||1);revealNavGroup(id,page);syncCost();list();const site=renderContext(context?.current?.());setTimeout(()=>applyContext(site),0);window.scrollTo({top:0,behavior:'smooth'});}
    function home(){shell();hidePanels();gallery.hidden=false;pageHead.hidden=false;document.querySelectorAll('[data-safety-doc]').forEach(b=>b.classList.remove('selected'));}
    document.addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b)return;
      if(b.dataset.safetyDoc){e.preventDefault();e.stopImmediatePropagation();open(b.dataset.safetyDoc,b.dataset.safetyPage)}
      else if(b.matches('.safety-nav-group-toggle')){e.preventDefault();e.stopImmediatePropagation();const section=b.closest('.safety-nav-section');setNavGroup(section,!section.classList.contains('open'))}
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
        if(editor.querySelector('#documentFormFrame')){const api=editor.querySelector('#documentFormFrame').contentWindow?.MIN_WORKS_FORM_TOOL;if(!api)throw Error('서류를 불러오는 중입니다.');if(!api.validate())return;}
        if(engine.current()==='risk-assessment'){const api=editor.querySelector('#riskToolFrame')?.contentWindow?.MIN_WORKS_RISK_TOOL;if(!api)throw Error('위험성평가표를 불러오는 중입니다.');if(!api.validate())throw Error('공사명을 입력해 주세요.');}
        if(engine.current()==='tbm-minutes'){const api=editor.querySelector('#tbmToolFrame')?.contentWindow?.MIN_WORKS_TBM_TOOL;if(!api)throw Error('TBM 양식을 불러오는 중입니다.');if(!api.validate())return;}
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
    const help=document.createElement('article');help.className='help-card static';help.innerHTML='<span class="safety-doc-icon">'+glyph('document')+'</span><div><h3>안전서류 작성·출력</h3><p>현장서류에서 원하는 서류를 바로 선택하세요. 매일 사용하는 TBM 일지는 맨 위에 강조되어 있습니다. 현장명을 선택하면 담당자·공사기간·발주처·공사금액이 연결됩니다. 필요한 내용을 작성한 뒤 인쇄/PDF로 바로 출력하세요. 왼쪽 메뉴는 TBM 일지, 교육 서류, 각종 허가서, 산업안전보건관리비 순서입니다. 안전관리비는 안전관리비 내역·항목별 내역·항목별 사진·세금계산서와 거래명세표의 네 메뉴로 구성되며 모두 A4 가로로 출력됩니다. 사진대지는 현장명·날짜·종류를 입력하고 한 장에 4컷으로 출력합니다.</p></div>';document.querySelector('.help-grid').append(help);
    const patch=document.createElement('article');patch.className='patch-item';patch.innerHTML='<time datetime="2026-09-16">2026. 09. 16</time><div><span>v56</span><h3>현장서류 작성·원본 보관 개선</h3><p>TBM 일지를 맨 위에 강조하고 교육 서류·각종 허가서·산업안전보건관리비 순서로 정리했습니다. TBM 작성 바로가기와 이전 TBM 기록 메뉴를 제거하고 MSDS 교육 명칭을 줄였습니다. 안전관리비 내역·항목별 내역·항목별 사진·세금계산서·거래명세표가 각각 바로 열립니다. 현장정보 자동 연결, 직원 이름·직급 연결, 금액 자동 합산, 간결한 2열 화면, 교육서류 직접 작성과 원본 파일 보관을 추가했습니다. 메뉴 접기·펼치기도 수정했습니다. 저장 자료는 유지됩니다. 본판 적용.</p></div>';document.querySelector('#patchView .patch-item')?.before(patch);
    document.querySelectorAll('.help-card').forEach(card=>{if(card.querySelector('h3')?.textContent==='TBM 일지 작성'){card.querySelector('p').textContent='현장서류 맨 위의 TBM 일지를 열어 공정 이름을 누르거나 검색하세요. 여러 공정을 선택하고 내용을 작성한 뒤 인쇄하기를 누르면 됩니다. 별도 서류 저장 메뉴는 표시하지 않습니다.'}});
    const docs06Patch=document.createElement('article');docs06Patch.className='patch-item';docs06Patch.innerHTML='<time datetime="2026-09-17">2026. 09. 17</time><div><span>작업판 DOCS 06</span><h3>교육서류·작업허가서 양식 정리</h3><p>신규채용자 교육의 날짜·시간 수기 칸, 이수증 제출 안내를 개선했습니다. 근로자 안전서약서와 개인보호구 지급대장을 A4 출력 양식으로 통일했습니다. MSDS 교육은 날짜·사용물질·참석자·교육사진을 입력하고 저장합니다. 화기·말비계 원본 기준 작성폼과 고소작업허가서를 추가했으며 출력 미리보기를 제공합니다. 현장서류 작업판 적용 · 본판 미반영.</p></div>';document.querySelector('#patchView .patch-item')?.before(docs06Patch);
    help.querySelector('p').textContent+=' 신규채용자 교육, 근로자 안전 서약서, 개인보호구 지급대장은 출력 후 수기로 작성합니다. MSDS와 화기·말비계·고소작업허가서는 항목 입력 후 서류 저장으로 보관합니다. MSDS 사진은 두 장 등록·교체·삭제할 수 있습니다. 출력 미리보기에서 입력 내용을 확인하고 인쇄/PDF를 누르세요. 입력량이 많으면 다음 페이지로 이어질 수 있습니다.';
    const tbmPatch=document.createElement('article');tbmPatch.className='patch-item';tbmPatch.innerHTML='<time datetime="2026-09-17">2026. 09. 17</time><div><span>작업판 DOCS 15</span><h3>산업안전보건관리비 가로 출력 개편</h3><p>관리비 서류를 A4 가로 출력으로 고정하고 사용내역·항목별 내역을 한 장 요약형으로 압축했습니다. 사진대지는 현장명·날짜·종류와 4컷 구성으로 바꾸고, 세금계산서와 거래명세표를 하나의 메뉴로 합쳤습니다. 본판 미반영.</p></div>';document.querySelector('#patchView .patch-item')?.before(tbmPatch);
    const photoProPatch=document.createElement('article');photoProPatch.className='patch-item';photoProPatch.innerHTML='<time datetime="2026-09-21">2026. 09. 21</time><div><span>작업판 DOCS 16</span><h3>사진대지PRO_V1 추가</h3><p>현장서류의 TBM 일지 바로 아래에 사진대지PRO_V1을 추가했습니다. 사진 등록·순서 편집·페이지 구성·검수·PDF 출력을 한 화면에서 진행하며, 도구 내부 단계는 상단 탭으로 정리했습니다. 본판 미반영.</p></div>';document.querySelector('#patchView .patch-item')?.before(photoProPatch);
    const docs17Patch=document.createElement('article');docs17Patch.className='patch-item';docs17Patch.innerHTML='<time datetime="2026-09-21">2026. 09. 21</time><div><span>작업판 DOCS 17</span><h3>현장정보 전체 서류 연동</h3><p>현장서류 상단에 공통 현장 선택을 추가하고 현장명·담당자·공사기간·발주처·공사금액을 TBM, 사진대지PRO_V1, 위험성평가표, 교육서류, 작업허가서, 산업안전보건관리비에 연결했습니다. 자동 입력된 값은 각 서류에서 필요에 따라 수정할 수 있습니다. 본판 미반영.</p></div>';document.querySelector('#patchView .patch-item')?.before(docs17Patch);
    const docs18Patch=document.createElement('article');docs18Patch.className='patch-item';docs18Patch.innerHTML='<time datetime="2026-09-21">2026. 09. 21</time><div><span>작업판 DOCS 18</span><h3>직원 테스트 피드백 반영</h3><p>위험성평가표를 v8.16 R5 최종본으로 교체하고 공정 선택 후 해당 페이지 이동, 상단 고정 메뉴와 맨위로 기능을 적용했습니다. 안전관리비 작성일 입력 폭을 줄이고 인쇄 앞뒤 빈 페이지를 제거했습니다. 항목별 사진은 클릭과 끌어놓기를 모두 지원하며, 안전관리비 전체 4페이지 PDF 출력 기능을 추가했습니다. 본판 미반영.</p></div>';document.querySelector('#patchView .patch-item')?.before(docs18Patch);
    const docs19Patch=document.createElement('article');docs19Patch.className='patch-item';docs19Patch.innerHTML='<time datetime="2026-09-21">2026. 09. 21</time><div><span>본판 DOCS 20</span><h3>현장서류 디자인 통합 및 전 화면 검수</h3><p>현장서류 메뉴와 작성 화면을 민웍스 본판의 색상·간격·버튼·입력칸 규격에 맞췄습니다. 오프라인 단일 HTML에서도 아이콘이 글자로 깨지지 않도록 교체하고, 현장정보 블록과 서류별 도구 모음의 높이·정렬·글꼴을 통일했습니다. PC·모바일·폴드 화면과 하위 서류 열기, 입력, 사진 추가, 인쇄를 함께 검수하고 현장·직원 정보와 연결했습니다. 본판 적용.</p></div>';document.querySelector('#patchView .patch-item')?.before(docs19Patch);
    hidePanels();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

