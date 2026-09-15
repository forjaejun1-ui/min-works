/* test68: a single report source for the editor, list, viewer and home. */
(() => {
  'use strict';

  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = safeText;
  const form = $('#dailyForm');
  const draftStorage = 'minWorksDailyDraftV3';
  let editing = null, dirty = false, draftSaved = false, saving = false, restoring = false, refreshTimer, draftRevision = 0;
  const today = () => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  const cards = () => $$('.report-card');
  const entries = card => cardProcessEntries(card).map(p=>({...p,name:String(p.name||'').trim(),today:Math.max(0,Number(p.today)||0),work:String(p.work||'')}));
  const sorted = site => cards().filter(c=>c.dataset.site===site).sort((a,b)=>(b.dataset.reportDate||'').localeCompare(a.dataset.reportDate||'')||(b.dataset.createdAt||'').localeCompare(a.dataset.createdAt||''));
  function cumulative(site,date,name,exclude=null) {
    return cards().filter(c=>c!==exclude&&c.dataset.site===site&&c.dataset.reportDate&&c.dataset.reportDate<=date)
      .reduce((sum,c)=>sum+entries(c).filter(p=>p.name===name).reduce((n,p)=>n+p.today,0),0);
  }
  function readRows() {
    return $$('#processRows .process-row').map(row=>({name:row.querySelector('.process-name').value.trim(),today:Number(row.querySelector('input[type=number]:not(.cumulative-people)').value)||0,work:row.querySelector('input[placeholder="세부 작업내용"]')?.value.trim()||''}));
  }
  function updateCumulative() {
    const rows=readRows(), site=form.querySelector('select').value, date=form.querySelector('[type=date]').value;
    $$('#processRows .process-row').forEach((row,i)=>{
      const p=rows[i];row.querySelector('.cumulative-people').value=p.name?cumulative(site,date,p.name,editing)+rows.filter(v=>v.name===p.name).reduce((s,v)=>s+v.today,0):0;
    });
    $('#dailyTotalPeople').textContent=rows.filter(p=>p.name).reduce((sum,p)=>sum+p.today,0)+'명';
  }
  function recalculate() {
    cards().forEach(card=>{
      const processes=entries(card);processes.forEach(p=>p.cumulative=cumulative(card.dataset.site,card.dataset.reportDate,p.name));
      card.reportProcesses=processes;card.dataset.cloudProcesses=JSON.stringify(processes);
      if(processes.length)card.dataset.totalPeople=String(processes.reduce((s,p)=>s+p.today,0));
    });
  }
  function renderViewer(card) {
    recalculate();
    $('#viewerSite').textContent=card.dataset.site;
    $('#viewerAuthor').textContent=card.querySelector('.report-author b')?.textContent||card.dataset.author||'작성자 미기록';
    $('#reportViewer .viewer-meta>div:nth-child(2)>b').textContent=card.dataset.reportDate?.replaceAll('-','. ')||'작업일 미기록';
    $('#viewerTotalPeople').textContent=(card.dataset.totalPeople||'0')+'명';
    $('#reportViewer table thead').innerHTML='<tr><th>공정</th><th>금일인원</th><th>누계인원</th><th>작업내용</th></tr>';
    $('#reportViewer table tbody').innerHTML=entries(card).map(p=>`<tr><td>${esc(p.name)}</td><td>${p.today}명</td><td>${p.cumulative}명</td><td>${esc(p.work)||'—'}</td></tr>`).join('')||'<tr><td colspan="4">저장된 공정 정보가 없습니다.</td></tr>';
    $('#reportViewer .viewer-note p').textContent=card.dataset.note||'등록된 특이사항이 없습니다.';
    $('#editOwnReport').classList.toggle('visible',canDeleteReport(card));
    $('#editOwnReport').innerHTML='<span class="material-symbols-rounded">edit</span>일보 수정';
    $('#reportViewer .read-only-mark').textContent='작성자 또는 관리자 수정 가능';
  }
  function recent() {
    $$('.recent-report-link').forEach(link=>{
      const report=sorted(link.dataset.reportSite)[0];link.disabled=!report;
      link.textContent=report?`${report.dataset.reportDate||'최근'} 일보 →`:'일보 없음';
      link.title=report?'최근 공사일보 바로 열기':'등록된 공사일보가 없습니다.';
    });
  }
  function managers() {
    $$('.site-table-row').forEach(row=>{const card=sorted(row.dataset.siteRow)[0];row.querySelector('.site-manager').textContent=card?.querySelector('.report-author b')?.textContent||'일보 미등록';});
  }
  function briefing(site) {
    const work=sorted(site).filter(c=>c.dataset.reportDate===today()).flatMap(c=>entries(c).map(p=>p.work).filter(Boolean));
    return [...new Set(work)].join(' · ')||'오늘 작업내용 미등록';
  }
  function regroup() {
    const screen=$('#dailyListScreen');
    const reports=cards().sort((a,b)=>(b.dataset.reportDate||'').localeCompare(a.dataset.reportDate||'')||(b.dataset.createdAt||'').localeCompare(a.dataset.createdAt||''));
    reports.forEach(card=>{
      let date=card.dataset.reportDate;
      if(!date){const title=card.querySelector('div>b')?.textContent||'';const match=title.match(/(\d+)월\s*(\d+)일/);if(match&&card.dataset.createdAt)date=card.dataset.createdAt.slice(0,4)+'-'+match[1].padStart(2,'0')+'-'+match[2].padStart(2,'0');}
      if(date)card.dataset.reportDate=date;
      const key=date||'unknown';
      let group=[...screen.querySelectorAll('.date-group')].find(g=>g.dataset.reportDate===key);
      if(!group){group=document.createElement('div');group.className='date-group';group.dataset.reportDate=key;group.innerHTML='<h3></h3><div class="completed-reports"></div>';screen.appendChild(group);}
      group.querySelector('h3').innerHTML=date?`${Number(date.slice(0,4))}년 ${Number(date.slice(5,7))}월 ${Number(date.slice(8,10))}일${date===today()?' <em>오늘</em>':''}`:'작업일 미기록';
      group.querySelector('.completed-reports').appendChild(card);
    });
    $$('.date-group').forEach(g=>{if(!g.querySelector('.report-card')){if(g.querySelector('#todayReports')){$('#todayReports').removeAttribute('id');}g.remove();}});
    $$('#dailyListScreen .date-group').sort((a,b)=>b.dataset.reportDate.localeCompare(a.dataset.reportDate)).forEach(g=>screen.appendChild(g));
    if(!$('#todayReports')){const target=document.createElement('div');target.id='todayReports';target.hidden=true;screen.appendChild(target);}
  }
  function refresh() {
    recalculate();regroup();window.rebuildMinWorksReportFilters?.();managers();recent();
    window.syncOperationalSiteOptions?.();window.refreshMinWorksSummary?.();window.refreshMinWorksHomeExtras?.();
    renderCardCheckSummaries();window.enhanceMinWorksReportDownloads?.();
    $$('.report-card').forEach(card=>{
      card.querySelector('.report-record-actions')?.setAttribute('aria-label','일보 다운로드');
      const summary=card.querySelector('.card-check-summary');
      if(summary&&!summary.dataset.bound){summary.dataset.bound='1';summary.title='일보에서 확인자 보기';}
    });
    let empty=$('#dailyEmpty');
    if(!empty){empty=document.createElement('div');empty.id='dailyEmpty';empty.className='home-extra-empty';empty.innerHTML='<b>표시할 공사일보가 없습니다.</b><p>현장을 선택하거나 새 공사일보를 작성해 주세요.</p><button type="button" class="primary">공사일보 작성하기</button>';empty.querySelector('button').onclick=()=>openDailyEditor();$('#dailyListScreen').appendChild(empty);}
    empty.hidden=cards().some(c=>c.style.display!=='none');
    updateSuggestions();
  }
  function queueRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(refresh,40);}
  function updateSuggestions(){
    const names=[...new Set([...workProcessOptions,...cards().flatMap(c=>entries(c).map(p=>p.name))])].filter(Boolean);
    let list=$('#workProcessSuggestions');if(!list){list=document.createElement('datalist');list.id='workProcessSuggestions';document.body.appendChild(list);}
    list.replaceChildren(...names.map(name=>{const option=document.createElement('option');option.value=name;return option;}));
  }
  function resetPhotos(){
    $$('#tbmPreview .uploaded-photo,#progressPreview .uploaded-photo').forEach(node=>{if(node.dataset.photoSrc?.startsWith('blob:'))URL.revokeObjectURL(node.dataset.photoSrc);node.remove();});
    updatePhotoCount('tbmPreview','tbmPhotoCount');updatePhotoCount('progressPreview','progressPhotoCount');
  }
  function loadPhotos(photos){resetPhotos();photos.forEach(photo=>{
    const el=document.createElement('div');el.className='uploaded-photo';el.dataset.photoSrc=photo.src;el.dataset.photoType=photo.type;el.dataset.photoSize=photo.size||0;el.style.backgroundImage=`url("${photo.src}")`;
    const button=document.createElement('button');button.type='button';button.textContent='×';button.setAttribute('aria-label','사진 삭제');button.onclick=()=>{el.remove();dirty=true;updatePhotoCount('tbmPreview','tbmPhotoCount');updatePhotoCount('progressPreview','progressPhotoCount');saveDraft();};
    const caption=document.createElement('small');caption.textContent=photo.type;el.append(button,caption);$(photo.type?.includes('TBM')?'#tbmPreview':'#progressPreview').appendChild(el);
  });updatePhotoCount('tbmPreview','tbmPhotoCount');updatePhotoCount('progressPreview','progressPhotoCount');}
  function fillRows(processes) {
    const count=Math.max(Number(userSettings.processRows)||5,processes.length);
    while($('#processRows').children.length<count)$('#addProcess').click();
    $$('#processRows .process-row').forEach((row,i)=>{const p=processes[i]||{};row.querySelector('.process-name').value=p.name||'';row.querySelector('input[type=number]:not(.cumulative-people)').value=p.today??'';row.querySelector('input[placeholder="세부 작업내용"]').value=p.work||'';});
  }
  async function photoData(forCloud=false) {
    return Promise.all($$('#tbmPreview .uploaded-photo,#progressPreview .uploaded-photo').map(async node=>{
      let src=node.dataset.photoSrc;
      if(forCloud&&node.photoFile instanceof File)return {src,type:node.dataset.photoType||"현장사진",size:node.photoFile.size,file:node.photoFile};
      if(forCloud&&src?.startsWith('data:')){const blob=await fetch(src).then(r=>r.blob());return {src,type:node.dataset.photoType||'현장사진',size:blob.size,file:new File([blob],'report-photo.jpg',{type:blob.type||'image/jpeg'})};}
      if(node.photoFile instanceof Blob)src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('사진을 읽지 못했습니다.'));reader.readAsDataURL(node.photoFile);});
      else if(src?.startsWith('blob:')){const blob=await fetch(src).then(r=>r.blob());src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});}
      return {src,type:node.dataset.photoType||'현장사진',size:Number(node.dataset.photoSize)||0};
    }));
  }
  async function persist(){if(!window.MIN_WORKS_CLOUD)throw Error("회사 자료 연결을 확인해 주세요.");await window.MIN_WORKS_CLOUD.saveNow();}
  async function submit() {
    if(saving)return;
    const site=form.querySelector('select').value,date=form.querySelector('[type=date]').value,allRows=readRows(),processes=allRows.filter(p=>p.name);
    if(!site||!date)return notify('현장과 작업일을 입력해주세요.');
    if(!processes.length)return notify('공정을 한 개 이상 입력해주세요.');
    if(allRows.some(p=>!p.name&&(p.today||p.work)))return notify('인원이나 작업내용을 입력한 줄의 공정명을 입력해주세요.');
    if(processes.some(p=>p.today<0||!Number.isInteger(p.today)))return notify('인원은 0 이상의 정수로 입력해주세요.');
    if(processes.some(p=>!p.today&&!p.work))return notify('입력한 공정의 인원 또는 작업내용을 입력해주세요.');
    saving=true;const submitButton=$('#reportSubmit');submitButton.disabled=true;submitButton.textContent='저장 중…';
    const card=editing||document.createElement('button'),isNew=!editing;
    const backup=isNew?null:{html:card.innerHTML,data:{...card.dataset},processes:card.reportProcesses,photos:card.reportPhotos};
    try {
      if(!window.MIN_WORKS_USER)throw Error("로그인이 필요합니다.");if(editing&&!canDeleteReport(editing))throw Error("수정 권한이 없습니다.");
      const photos=await photoData(true);window.MIN_WORKS_TRANSACTION=true;
      card.className='report-card';card.type='button';card.dataset.site=site;card.dataset.reportDate=date;card.dataset.note=form.querySelector('textarea').value.trim();
      if(isNew){card.dataset.author=currentUser||'관리자';card.dataset.authorTitle=currentUserTitle();card.dataset.createdAt=new Date().toISOString();card.dataset.recordId=crypto.randomUUID();}
      card.dataset.updatedAt=new Date().toISOString();card.dataset.checks='[]';
      const author=card.dataset.authorTitle||card.querySelector('.report-author b')?.textContent||card.dataset.author;
      card.dataset.authorTitle=author;card.reportProcesses=processes;card.reportPhotos=photos;card.dataset.cloudPhotos=JSON.stringify(photos);
      const total=processes.reduce((sum,p)=>sum+p.today,0);
      card.innerHTML=`<span class="report-file-icon"><span class="material-symbols-rounded">description</span></span><div><small>${esc(site)}</small><b>${Number(date.slice(5,7))}월 ${Number(date.slice(8,10))}일 공사일보</b><p>${processes.map(p=>esc(p.name)+' '+p.today+'명').join(' · ')} · 총출력 ${total}명 · 사진 ${photos.length}장</p></div><div class="report-author"><span>작성자</span><b>${esc(author)}</b><em class="owner-mark">${card.dataset.author===currentUser?'내 일보':''}</em></div><span class="report-status">작성 완료</span>`;
      if(isNew){$('#todayReports').appendChild(card);attachReportCard(card);}
      recalculate();await persist();
      dirty=false;draftRevision++;clearTimeout(window.minWorksDraftTimer);localStorage.removeItem(draftStorage);localStorage.removeItem('minWorksDailyDraftV2');
      editing=null;closeDailyEditor();form.reset();fillRows([]);resetPhotos();updateCumulative();refresh();
      window.dispatchEvent(new Event('minworks:reports-changed'));
      window.dispatchEvent(new CustomEvent('minworks:new-content',{detail:{view:'daily'}}));
      notify(isNew?'공사일보를 저장했습니다.':'공사일보 수정 내용을 저장했습니다.');
      if(userSettings.openAfterSubmit)card.click();
    } catch(error) {
      if(isNew)card.remove();else{card.innerHTML=backup.html;Object.keys(card.dataset).forEach(key=>delete card.dataset[key]);Object.assign(card.dataset,backup.data);card.reportProcesses=backup.processes;card.reportPhotos=backup.photos;}
      recalculate();notify('저장하지 못했습니다. 입력 내용은 유지됩니다. '+(error.message||'연결을 확인해주세요.'));console.warn('Report save failed',error);
    } finally {window.MIN_WORKS_TRANSACTION=false;saving=false;submitButton.disabled=false;submitButton.textContent=editing?'수정 내용 저장':'공사일보 등록';}
  }
  function editorOpened(){
    $('#dailyEditor .editor-head small').textContent='작성자 · '+(editing?.dataset.authorTitle||currentUserTitle());
    $('#dailyEditor .editor-head h3').textContent=editing?'공사일보 수정':'새 공사일보 작성';
    $('#reportSubmit').textContent=editing?'수정 내용 저장':'공사일보 등록';
  }
  function edit(card) {
    if(!card||!canDeleteReport(card))return notify('관리자 또는 작성자만 수정할 수 있습니다.');
    if(dirty&&!confirm('작성 중인 초안을 이 일보 수정 내용으로 바꿀까요?'))return;
    restoring=true;editing=card;$('#reportViewer').classList.remove('show');showView('daily');openDailyEditor();
    form.querySelector('select').value=card.dataset.site;form.querySelector('[type=date]').value=card.dataset.reportDate;form.querySelector('textarea').value=card.dataset.note||'';
    fillRows(entries(card));loadPhotos(reportPhotos(card));dirty=false;restoring=false;editorOpened();updateCumulative();
  }
  async function saveDraft(){
    if(restoring||saving||!dirty||!userSettings.autosave)return;
    const revision=++draftRevision;
    const data={version:3,site:form.querySelector('select').value,date:form.querySelector('[type=date]').value,note:form.querySelector('textarea').value,processes:readRows(),editId:editing?.dataset.recordId||null};
    try{data.photos=await photoData();if(revision!==draftRevision||saving)return;localStorage.setItem(draftStorage,JSON.stringify(data));draftSaved=true;$('#dailyEditor .draft-state').textContent='임시저장됨';}
    catch{notify('임시저장 공간이 부족합니다. 입력 내용을 유지한 채 저장 공간을 확인해주세요.');}
  }
  function restoreDraft(){
    if(restoring||dirty)return;
    try{let data=JSON.parse(localStorage.getItem(draftStorage)||'null');
      if(!data){
        const legacy=JSON.parse(localStorage.getItem('minWorksDailyDraftV2')||'null');
        if(!Array.isArray(legacy)||!legacy.length)return;
        const fields=[...form.querySelectorAll('input,select,textarea')];
        legacy.forEach((item,i)=>{if(fields[i]&&fields[i].type!=='file')fields[i].value=item.value??'';});
        data={site:form.querySelector('select').value,date:form.querySelector('[type=date]').value,note:form.querySelector('textarea').value,processes:readRows(),photos:[]};
      }
      restoring=true;editing=data.editId?cards().find(c=>c.dataset.recordId===data.editId)||null:null;
      if(data.editId&&!editing){notify('원본 일보가 없어 초안을 새 일보로 불러왔습니다.');}
      form.querySelector('select').value=data.site;form.querySelector('[type=date]').value=data.date;form.querySelector('textarea').value=data.note||'';fillRows(data.processes||[]);loadPhotos(data.photos||[]);dirty=true;draftSaved=true;restoring=false;notify('임시저장한 내용을 불러왔습니다.');
    }catch{restoring=false;notify('초안을 불러오지 못했습니다. 기존 초안은 보관되어 있습니다.');}
  }
  window.MIN_WORKS_BATCH={submit,edit,renderViewer,today,briefing,recent,managers,updateCumulative,saveDraft,restoreDraft,editorOpened,queueRefresh,hasDraft:()=>dirty||!!editing,openRecent:link=>{const card=sorted(link.dataset.reportSite)[0];if(card){showView('daily');card.click();}}};
  function initialize(){
    updateSuggestions();fillRows([]);
    const syncWidth=()=>{const width=$('main').getBoundingClientRect().width;document.body.classList.toggle('mw-compact',width<=820);document.body.style.setProperty('--mw-frame-width',width+'px');};
    new ResizeObserver(syncWidth).observe($('main'));syncWidth();
    $('#reportViewer .record-edit-button')?.remove();
    
    const riskHeading=$('#riskView .sample-page-head>div');
    if(riskHeading&&!riskHeading.querySelector('.sample-badge')){const badge=document.createElement('span');badge.className='sample-badge';badge.textContent='샘플 화면 · 실제 등록 자료 아님';riskHeading.appendChild(badge);}
    $('[data-setting="density"]')?.closest('.setting-row')?.remove();userSettings.density='comfortable';document.body.classList.remove('density-compact');
    const refreshButton=document.createElement('button');refreshButton.type='button';refreshButton.id='refreshDaily';refreshButton.className='refresh-daily';refreshButton.innerHTML='<span class="material-symbols-rounded">refresh</span>새로고침';
    refreshButton.onclick=()=>{refresh();notify('일보 목록과 현장 정보를 새로고침했습니다.');};$('#openDailyEditor').before(refreshButton);
    const mobileMenu=$('.mobile-menu-grid');if(mobileMenu&&!mobileMenu.querySelector('[data-menu-view="issues"]')){const b=document.createElement('button');b.dataset.menuView='issues';b.innerHTML='<span class="material-symbols-rounded">report_problem</span><b>이슈 관리</b>';b.onclick=()=>{showView('issues');$('.mobile-all-menu')?.classList.remove('show');};mobileMenu.appendChild(b);}
    // Explicit refreshes avoid observing every render and triggering observer loops.
    document.addEventListener('click',event=>{if(event.target.closest('[data-view],[data-menu-view],[data-go],.daily-filter button,#createSite,[data-site-edit],[data-site-delete],#deleteReport,#restoreStorageTrash,#saveIssue,#deleteIssue,#toggleIssueStatus'))queueRefresh();});
    window.addEventListener('minworks:reports-changed',queueRefresh);window.addEventListener('popstate',queueRefresh);
    form.addEventListener('input',()=>{if(!restoring){dirty=true;draftSaved=false;$('#dailyEditor .draft-state').textContent='작성 중';}});
    form.addEventListener('change',()=>{if(!restoring){dirty=true;draftSaved=false;saveDraft();}});
    new MutationObserver(()=>{if(!restoring&&!saving&&!$('#dailyEditor').hidden){dirty=true;draftSaved=false;saveDraft();}}).observe($('#progressPreview'),{childList:true});
    new MutationObserver(()=>{if(!restoring&&!saving&&!$('#dailyEditor').hidden){dirty=true;draftSaved=false;saveDraft();}}).observe($('#tbmPreview'),{childList:true});
    window.addEventListener('beforeunload',e=>{if((dirty&&(!userSettings.autosave||!draftSaved))||saving){saveDraft();e.preventDefault();e.returnValue='';}});
    const filterNote=$('.daily-list-tools>span');if(filterNote)filterNote.textContent='일보는 작성자 또는 관리자가 수정할 수 있습니다.';
    updateHelp();updatePatch();refresh();editorOpened();
  }
  function updateHelp(){
    const topics=[
      ['home','홈','오늘 작업일 기준의 보고 현황·현장사진·현장명 - 주요 작업내용을 확인합니다. 사진을 누르면 해당 일보를 엽니다.'],
      ['apartment','현장관리','현장 개설에서 이름·착공일·준공일·금액을 등록합니다. 최근 일보를 누르면 해당 현장의 가장 최근 작업일 일보가 열립니다.'],
      ['edit_note','일보 작성','현장과 작업일을 선택하고 공정을 목록에서 고르거나 직접 입력합니다. 자동완성은 표준 공정과 저장된 공정명을 추천합니다. 인원·작업내용·사진·특이사항을 입력한 뒤 등록합니다.'],
      ['groups','인원과 누계','금일인원은 해당 줄의 투입 인원입니다. 누계는 같은 현장·같은 공정의 작업일까지 저장된 인원 합계입니다. 과거 일보 수정·삭제도 누계에 반영됩니다.'],
      ['save','저장과 수정','저장 완료 안내 후 목록과 홈이 자동 갱신됩니다. 일보 상세의 오른쪽 일보 수정에서 기존 내용을 불러와 수정 내용 저장을 누릅니다. 수정 시 기존 확인 기록은 초기화됩니다.'],
      ['photo_library','사진과 내보내기','TBM·진행사진은 선택사항입니다. 일보 저장 후 홈에는 오늘 작업일의 사진이 표시됩니다. 일보 다운로드 또는 현장별 통합 PDF 내보내기에서 저장합니다.'],
      ['report_problem','이슈 관리','메뉴의 이슈 관리에서 현장·유형·긴급도·담당자·내용을 등록하고 처리 상태를 관리합니다. 모바일에서는 하단 이슈관리 탭으로 바로 열 수 있습니다.'],
      ['folder_open','위험성평가·현장서류','해당 메뉴에서 제공되는 화면을 확인합니다. 샘플로 표시된 기능은 테스트용이며, 완료된 실제 서류로 취급하지 않습니다.'],
      ['settings','설정','PC·갤럭시·폴드·아이폰은 같은 색상과 글꼴을 사용하며 폭에 맞춰 배치됩니다. 글자 크기·강조색·사진 품질·임시저장·시작 화면을 조절할 수 있습니다.'],
      ['cloud_done','회사 자료 저장','로그인 후 회사 자료를 불러옵니다. 공사일보는 회사 저장 완료 안내를 확인하세요. 인터넷 연결이나 저장 충돌로 실패하면 작성 화면에 내용을 유지합니다.']
    ];
    if($('.help-grid'))$('.help-grid').innerHTML=topics.map(([icon,title,body],i)=>`<article class="help-card static"><span class="material-symbols-rounded">${icon}</span><div><small>${String(i+1).padStart(2,'0')}</small><h3>${title}</h3><p>${body}</p></div></article>`).join('');
    const faq=[['새 일보가 보이지 않아요.','등록 후 자동으로 표시됩니다. 현장 필터가 다른 현장으로 선택되어 있으면 전체 현장을 선택하세요. 상단 새로고침 버튼은 입력 중인 내용을 지우지 않고 목록과 현장 정보를 갱신합니다.'],['작성 중 나갔어요.','자동 임시저장이 켜져 있으면 입력한 공정·사진·특이사항을 다시 불러옵니다. 저장 공간이 부족하면 안내가 표시되며 입력 내용은 유지됩니다.'],['오늘 사진이 없어요.','일보의 작업일이 오늘인지 확인하세요. 어제 작업을 오늘 등록해도 오늘 현장사진에 포함되지 않습니다.'],['누계는 어떻게 계산하나요?','같은 현장과 동일한 공정명의 인원을 해당 작업일까지 합칩니다. 공정명이 다르면 별도 공정으로 계산하므로 자동완성으로 이름을 통일하세요.'],['다른 기기에 자료가 안 보여요.','같은 직원 계정으로 로그인하고 인터넷 연결을 확인하세요. 회사 자료는 주기적으로 갱신됩니다. 작성 중인 화면에서는 자동 새로고침을 미루므로 저장 후 다시 확인하세요.'],['화면 모드는 어떻게 쓰나요?','상단에서 기기를 고르면 해당 폭을 미리 볼 수 있습니다. 실제 기기에서는 화면 폭에 맞춰 자동으로 재배치됩니다.']];
    if($('.help-details'))$('.help-details').innerHTML='<div class="panel-head"><h2>자주 묻는 사용법</h2></div>'+faq.map(([q,a],i)=>`<details${i===0?' open':''}><summary><span>${i+1}</span>${q}<i class="material-symbols-rounded">expand_more</i></summary><div><p>${a}</p></div></details>`).join('');
    if($('.help-start p'))$('.help-start p').textContent='현장 등록 → 일보 작성 → 저장·확인 순서로 시작하세요. 아래 안내에 따라 사용해 주세요.';
  }
  function updatePatch(){const first=$('#patchView .patch-item');if(!first)return;const item=document.createElement('article');item.className='patch-item latest';item.innerHTML='<time datetime="2026-09-15">2026. 09. 15</time><div><span>v55</span><h3>공사일보·TBM 일지·기기별 화면 업데이트</h3><p>공정 직접 입력·자동완성, 일보 원본 표시·누계·사진·수정·임시저장, 최근 일보와 목록 갱신을 개선했습니다. TBM 작성과 TBM 일지 메뉴, 하단 이슈관리, 기종별 설치 안내를 추가했습니다. 위험성평가 명칭을 통일하고 메뉴 NEW와 화면 밀도 설정을 제거했습니다.</p></div>';first.classList.remove('latest');first.before(item);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
