/* v39 clean production start: remove bundled samples and one-time device sample data. */
(() => {
  const CLEAN_KEY='minWorksProductionCleanV39';
  if(localStorage.getItem(CLEAN_KEY)!=='done'){
    ['minWorksCloudSnapshotV1','minWorksPlannedPaymentsV2','minWorksReceivablesV2','minWorksCompanyCalendarV1','minworks_storage_trash_v1','minworks_storage_retention_v1','minworks_exported_sites_v1','minWorksSiteStateV28','minWorksDeletedRecordsV1'].forEach(key=>localStorage.removeItem(key));
    localStorage.setItem(CLEAN_KEY,'done');
  }
  document.querySelectorAll('.site-list .site-card,.site-table-row,.report-card,.issue-detail-card,.briefing-item,.home-event,#paymentPanel>.finance-row,#receivablePanel>.finance-row').forEach(node=>node.remove());
  document.querySelectorAll('#dailyForm>div:first-child select option,#issueSite option,#paymentSite option,#receivableSite option,.site-option').forEach(node=>node.remove());
  document.querySelectorAll('.daily-filter button:not(:first-child)').forEach(node=>node.remove());
  const current=document.getElementById('currentSiteName');if(current)current.textContent='등록된 현장 없음';
})();

/* v38 cloud snapshot bootstrap: apply the last server copy before event handlers are attached. */
(() => {
  try {
    const cached=JSON.parse(localStorage.getItem('minWorksCloudSnapshotV1')||'null');
    const state=cached?.payload;if(!state)return;
    const parseNodes=html=>{const host=document.createElement('div');host.innerHTML=html||'';return [...host.children]};
    if(state.siteCards!=null){const host=document.querySelector('.site-list');if(host)host.replaceChildren(...parseNodes(state.siteCards))}
    if(state.siteRows!=null){const table=document.querySelector('.site-table');if(table){document.querySelectorAll('.site-table-row').forEach(node=>node.remove());parseNodes(state.siteRows).forEach(node=>table.appendChild(node))}}
    if(state.reports!=null){document.querySelectorAll('.report-card').forEach(node=>node.remove());const target=document.getElementById('todayReports');parseNodes(state.reports).forEach(node=>{try{node.reportProcesses=JSON.parse(node.dataset.cloudProcesses||'[]');node.reportPhotos=JSON.parse(node.dataset.cloudPhotos||'[]')}catch{}target?.appendChild(node)})}
    if(state.issues!=null){const host=document.querySelector('.issue-board');if(host)host.replaceChildren(...parseNodes(state.issues))}
    if(Array.isArray(state.payments))localStorage.setItem('minWorksPlannedPaymentsV2',JSON.stringify(state.payments));
    if(Array.isArray(state.receivables))localStorage.setItem('minWorksReceivablesV2',JSON.stringify(state.receivables));
    const names=[...document.querySelectorAll('.site-table-row')].map(row=>row.dataset.siteRow).filter(Boolean);
    ['#dailyForm>div:first-child select','#issueSite','#paymentSite','#receivableSite'].forEach(selector=>{const select=document.querySelector(selector);if(select){select.replaceChildren();names.forEach(name=>select.add(new Option(name,name)))}});
    const current=document.getElementById('currentSiteName');if(current&&names[0])current.textContent=names[0];
    window.MIN_WORKS_CLOUD_VERSION=Number(cached.version)||0;
  } catch(error) { console.warn('Cloud snapshot bootstrap skipped',error); }
})();

/* v40 shared company data and private Google Drive photo synchronization */
(() => {
  'use strict';
  const API='https://min-works-api.forjaejun.workers.dev',TOKEN_KEY='minWorksSessionV1',CACHE_KEY='minWorksCloudSnapshotV1';
  let version=Number(window.MIN_WORKS_CLOUD_VERSION)||0,timer=null,started=false,saving=false,dirty=false;
  const token=()=>localStorage.getItem(TOKEN_KEY)||'';
  async function request(path,options={}){const headers={...(options.headers||{}),Authorization:`Bearer ${token()}`};if(options.json)headers['Content-Type']='application/json';const response=await fetch(API+path,{method:options.method||'GET',headers,body:options.form||options.json&&JSON.stringify(options.json)});let data={};try{data=await response.json()}catch{}return{response,data}}
  function cleanOuter(node){const clone=node.cloneNode(true);clone.querySelectorAll('.site-record-actions,.report-record-actions,.record-edit-button,.record-delete-button').forEach(item=>item.remove());clone.hidden=false;clone.removeAttribute('style');return clone.outerHTML}
  function readArray(key){try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[]}catch{return[]}}
  async function uploadPendingPhotos(){for(const card of document.querySelectorAll('.report-card')){const photos=Array.isArray(card.reportPhotos)?card.reportPhotos:[];for(const photo of photos){if(!(photo.file instanceof File))continue;const form=new FormData();form.append('file',photo.file,photo.file.name);form.append('site',card.dataset.site||'');form.append('category','report');const{response,data}=await request('/files',{method:'POST',form});if(!response.ok)throw new Error(data.error||'사진을 회사 Google Drive에 저장하지 못했습니다.');if(String(photo.src).startsWith('blob:'))URL.revokeObjectURL(photo.src);photo.src=data.url;photo.size=data.size;photo.id=data.id;delete photo.file}card.dataset.cloudProcesses=JSON.stringify(card.reportProcesses||[]);card.dataset.cloudPhotos=JSON.stringify(photos.map(({file,...photo})=>photo))}}
  function capture(){document.querySelectorAll('.report-card').forEach(card=>{card.dataset.cloudProcesses=JSON.stringify(card.reportProcesses||[]);card.dataset.cloudPhotos=JSON.stringify((card.reportPhotos||[]).map(({file,...photo})=>photo))});return{
    siteCards:[...document.querySelectorAll('.site-list .site-card')].map(cleanOuter).join(''),
    siteRows:[...document.querySelectorAll('.site-table-row')].map(cleanOuter).join(''),
    reports:[...document.querySelectorAll('.report-card')].map(cleanOuter).join(''),
    issues:[...document.querySelectorAll('.issue-detail-card')].map(cleanOuter).join(''),
    payments:readArray('minWorksPlannedPaymentsV2'),receivables:readArray('minWorksReceivablesV2'),savedAt:new Date().toISOString()
  }}
  function cache(payload,nextVersion){localStorage.setItem(CACHE_KEY,JSON.stringify({version:nextVersion,payload}));window.MIN_WORKS_CLOUD_VERSION=nextVersion;version=nextVersion}
  function isEditing(){return !!document.querySelector('.modal.show,.daily-editor:not([hidden]),.report-viewer.show,.issue-peek.show,.export-modal.show,.report-download-modal.show')}
  async function pull(reload=true){const{response,data}=await request('/company-state');if(!response.ok)throw new Error(data.error||'회사 자료를 불러오지 못했습니다.');if(data.version>version&&data.payload){if(reload&&isEditing())return data;cache(data.payload,data.version);if(reload)location.reload()}return data}
  function mergeHtml(remoteHtml,localHtml,type){const host=document.createElement('div'),items=new Map(),key=node=>type==='site'?node.dataset.siteId||node.dataset.site||node.dataset.siteRow:type==='report'?`${node.dataset.site||''}|${node.dataset.createdAt||node.outerHTML}`:node.dataset.issueId||`${node.dataset.issueCard||''}|${node.querySelector('h3')?.textContent||node.outerHTML}`;host.innerHTML=remoteHtml||'';[...host.children].forEach(node=>items.set(key(node),node.outerHTML));host.innerHTML=localHtml||'';[...host.children].forEach(node=>items.set(key(node),node.outerHTML));return[...items.values()].join('')}
  function mergePayload(remote={},local={}){const union=(first,second)=>[...new Map([...(Array.isArray(first)?first:[]),...(Array.isArray(second)?second:[])].map(item=>[JSON.stringify(item),item])).values()];return{siteCards:mergeHtml(remote.siteCards,local.siteCards,'site'),siteRows:mergeHtml(remote.siteRows,local.siteRows,'site'),reports:mergeHtml(remote.reports,local.reports,'report'),issues:mergeHtml(remote.issues,local.issues,'issue'),payments:union(remote.payments,local.payments),receivables:union(remote.receivables,local.receivables),savedAt:new Date().toISOString()}}
  async function save(){if(saving||!token())return;clearTimeout(timer);saving=true;dirty=false;try{await uploadPendingPhotos();let payload=capture(),baseVersion=version,merged=false;let{response,data}=await request('/company-state',{method:'PUT',json:{baseVersion,payload}});if(response.status===409){const latest=await request('/company-state');if(!latest.response.ok)throw new Error(latest.data.error||'최신 회사 자료를 불러오지 못했습니다.');payload=mergePayload(latest.data.payload,payload);baseVersion=Number(latest.data.version)||0;merged=true;({response,data}=await request('/company-state',{method:'PUT',json:{baseVersion,payload}}));if(response.ok)notify('다른 직원의 변경사항과 합쳐 저장했습니다.')}if(!response.ok)throw new Error(data.error||'회사 자료를 저장하지 못했습니다.');cache(payload,data.version);if(merged){location.reload();return}window.refreshMinWorksStorage?.()}catch(error){dirty=true;notify(error.message)}finally{saving=false}}
  function queue(){if(!started||saving||document.body.classList.contains('auth-pending'))return;dirty=true;clearTimeout(timer);timer=setTimeout(save,900)}
  function startObservers(){if(started)return;started=true;['.site-list','.site-table','#dailyListScreen','#issuesView','#mwPaymentList','#mwReceivableList'].forEach(selector=>{const node=document.querySelector(selector);if(node)new MutationObserver(queue).observe(node,{childList:true,subtree:true,attributes:true,attributeFilter:['data-progress','data-status','data-comments','data-due']})});document.addEventListener('click',event=>{if(event.target.closest('#savePayment,#saveReceivable,#mwSavePayment,#mwSaveReceivable,#saveIssue,#createSite,#deleteIssue,#toggleIssueStatus,#addIssueComment,[data-site-edit],[data-site-delete],.record-edit-button,.record-delete-button'))setTimeout(queue,100)});setInterval(async()=>{if(saving||dirty||!token())return;try{await pull(true)}catch{}},15000)}
  async function init(){if(!token())return;try{const remote=await pull(false);if(remote.version===0&&version>0){localStorage.removeItem(CACHE_KEY);window.MIN_WORKS_CLOUD_VERSION=0;version=0;location.reload();return}if(remote.version>version&&remote.payload){cache(remote.payload,remote.version);location.reload();return}startObservers();if(remote.version===0)queue();window.refreshMinWorksStorage?.()}catch(error){notify(error.message)}}
  document.addEventListener('minworks:user-ready',()=>setTimeout(init,200));
})();

/* SOURCE: app.js */
const views = document.querySelectorAll('.view');
const navButtons = document.querySelectorAll('[data-view]');
const titles = {dashboard:'좋은 아침입니다, 재준님',sites:'현장 관리',daily:'공사일보',finance:'자금 집행',issues:'이슈 관리',calendar:'회사 일정',settings:'사용자 설정',help:'앱 사용법',patch:'패치노트',storage:'저장공간 정리'};
function showView(name){views.forEach(v=>v.classList.toggle('active',v.id===name+'View'));navButtons.forEach(b=>b.classList.toggle('active',b.dataset.view===name));document.getElementById('pageTitle').textContent=titles[name];window.scrollTo({top:0,behavior:'smooth'});}

// 서울 시간 기준 인사말 (날씨 값은 Google Weather API 연결 지점)
function updateGreeting(){
  const hour=Number(new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',hour12:false,timeZone:'Asia/Seoul'}).format(new Date()).replace('시','').trim());
  let greeting='좋은 아침입니다',message='오늘도 안전하게 현장 시작하세요.';
  if(hour>=12&&hour<18){greeting='좋은 오후입니다';message='진행 중인 현장과 오후 일정을 확인해보세요.'}
  else if(hour>=18||hour<5){greeting='오늘도 수고하셨습니다';message='공사일보와 남은 이슈를 확인해보세요.'}
  titles.dashboard=`${greeting}, 재준님`;if(document.getElementById('dashboardView').classList.contains('active'))document.getElementById('pageTitle').textContent=titles.dashboard;
  document.getElementById('greetingMessage').textContent=message;
}
updateGreeting();
navButtons.forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));
document.getElementById('writeDaily').addEventListener('click',()=>{showView('daily');openDailyEditor()});
const toast=document.getElementById('toast');
function notify(message){toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2200)}
document.querySelectorAll('.task input').forEach(input=>input.addEventListener('change',()=>notify(input.checked?'업무를 완료 처리했습니다.':'완료를 취소했습니다.')));
const dailyListScreen=document.getElementById('dailyListScreen'),dailyEditor=document.getElementById('dailyEditor');
function openDailyEditor(){dailyListScreen.hidden=true;dailyEditor.hidden=false;document.getElementById('openDailyEditor').style.display='none';restoreDailyDraft();const dateInput=document.querySelector('#dailyForm input[type=date]');if(dateInput&&!dateInput.value){const now=new Date(),local=new Date(now.getTime()-now.getTimezoneOffset()*60000);dateInput.value=local.toISOString().slice(0,10)}updateCumulativePeople();window.scrollTo({top:0,behavior:'smooth'})}
function closeDailyEditor(){dailyEditor.hidden=true;dailyListScreen.hidden=false;document.getElementById('openDailyEditor').style.display='flex';window.scrollTo({top:0,behavior:'smooth'})}
document.getElementById('openDailyEditor').addEventListener('click',openDailyEditor);
document.getElementById('closeDailyEditor').addEventListener('click',closeDailyEditor);
const workProcessOptions=['철거','제작가구','경량','금속','샷시','수장','도장','목공','석공','습식','미장','방수','준공청소','청소','용역','유리','인조석','조경(생화)','조경(조화)','큐비클','타일','필름','사인','전기','통신','전기통신','소방전기','소방','기계설비','위생설비','공조설비','에어컨','가설','폐기물','이동식가구','매트','건축','토목','잡철물','어닝','디지털사이니지','방송','영상','DID','살균','조형','DP'];
function createProcessSelect(value=''){
  const select=document.createElement('select');select.className='process-name';select.setAttribute('aria-label','공정 선택');
  select.innerHTML='<option value="">공정 선택</option>'+workProcessOptions.map(name=>`<option value="${name}">${name}</option>`).join('');
  select.value=workProcessOptions.includes(value)?value:'';return select;
}
function addCumulativeField(row){
  if(row.querySelector('.cumulative-people'))return;
  const label=document.createElement('label');label.className='cumulative-field';label.innerHTML='<span>누계인원</span><input class="cumulative-people" type="number" value="0" readonly tabindex="-1"><i>명</i>';
  row.insertBefore(label,row.children[2]||null);
}
function cardProcessEntries(card){
  if(Array.isArray(card.reportProcesses))return card.reportProcesses;
  const summary=card.querySelector('p')?.textContent||'';const entries=[];
  summary.replace(/([^·]+?)\s+(\d+)명/g,(_,name,count)=>{const clean=name.trim();if(workProcessOptions.includes(clean))entries.push({name:clean,today:Number(count)||0})});
  return entries;
}
function updateCumulativePeople(){
  const form=document.getElementById('dailyForm');if(!form)return;
  const site=form.querySelector('select')?.value.replace(' 학생식당','')||'';const date=form.querySelector('input[type=date]')?.value||'';
  document.querySelectorAll('#processRows .process-row').forEach(row=>{
    const process=row.querySelector('.process-name')?.value||'';const today=Number(row.querySelector('input[type=number]:not(.cumulative-people)')?.value)||0;
    const previous=[...document.querySelectorAll('.report-card')].filter(card=>card.dataset.site===site&&card.dataset.reportDate&&card.dataset.reportDate<date).reduce((total,card)=>total+cardProcessEntries(card).filter(item=>item.name===process).reduce((sum,item)=>sum+(Number(item.today)||0),0),0);
    const cumulative=row.querySelector('.cumulative-people');if(cumulative)cumulative.value=process?previous+today:0;
  });
  const total=[...document.querySelectorAll('#processRows input[type=number]:not(.cumulative-people)')].reduce((sum,input)=>sum+(Number(input.value)||0),0),output=document.getElementById('dailyTotalPeople');if(output)output.textContent=`${total}명`;
}
document.querySelectorAll('#processRows .process-row').forEach(row=>{const input=row.querySelector('label:first-child input');if(input)input.replaceWith(createProcessSelect());const peopleLabel=row.children[1];if(peopleLabel?.querySelector('span'))peopleLabel.querySelector('span').textContent='금일인원';addCumulativeField(row)});
document.getElementById('dailyForm').addEventListener('input',updateCumulativePeople);
document.getElementById('dailyForm').addEventListener('change',updateCumulativePeople);
document.getElementById('dailyForm').addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.tagName!=='TEXTAREA'){event.preventDefault();notify('공사일보는 아래 등록 버튼을 눌러 저장해주세요.')}});
let submittingReport=false;
document.getElementById('dailyForm').addEventListener('submit',e=>{
  e.preventDefault();
  if(submittingReport)return;
  const site=e.currentTarget.querySelector('select').value.replace(' 학생식당','');
  const date=e.currentTarget.querySelector('input[type=date]').value;
  const processes=[...document.querySelectorAll('#processRows .process-row')].filter(r=>r.querySelector('.process-name')?.value);
  if(!site){notify('현장을 선택해주세요.');return}
  if(!date){notify('작업일을 선택해주세요.');return}
  if(!processes.length){notify('공정을 한 개 이상 선택해주세요.');return}
  if(processes.some(row=>!(Number(row.querySelector('input[type=number]:not(.cumulative-people)')?.value)||0)&&!row.querySelector('input[placeholder="세부 작업내용"]')?.value.trim())){notify('선택한 공정의 인원 또는 작업내용을 입력해주세요.');return}
  submittingReport=true;const submitButton=document.getElementById('reportSubmit');submitButton.disabled=true;submitButton.textContent='등록 중…';
  const people=processes.reduce((sum,r)=>sum+(Number(r.querySelector('input[type=number]').value)||0),0);
  const processData=processes.map(row=>({name:row.querySelector('.process-name').value,today:Number(row.querySelector('input[type=number]:not(.cumulative-people)').value)||0,cumulative:Number(row.querySelector('.cumulative-people').value)||0}));
  const photoCount=document.querySelectorAll('#tbmPreview .uploaded-photo, #progressPreview .uploaded-photo').length;
  const processSummary=processData.map(item=>`${item.name} ${item.today}명`).join(' · ');
  const card=document.createElement('button');card.className='report-card';card.dataset.author=currentUser;card.dataset.site=site;
  card.innerHTML=`<span class="report-file-icon"><span class="material-symbols-rounded">description</span></span><div><small>${site}</small><b>${Number(date.slice(5,7))}월 ${Number(date.slice(8,10))}일 공사일보</b><p>${processSummary||`공정 ${processes.length}개`} · 총출력 ${people}명 · 사진 ${photoCount}장</p></div><div class="report-author"><span>작성자</span><b>${currentUser} 부장</b><em class="owner-mark">내 일보</em></div><span class="report-status">작성 완료</span>`;
  card.dataset.totalPeople=String(people);
  card.reportPhotos=[...document.querySelectorAll('#tbmPreview .uploaded-photo, #progressPreview .uploaded-photo')].map(photo=>({src:photo.dataset.photoSrc,type:photo.dataset.photoType||'현장사진',size:Number(photo.dataset.photoSize)||0,file:photo.photoFile||null})).filter(photo=>photo.src);
  card.reportProcesses=processData;
  card.dataset.reportDate=date;card.dataset.createdAt=new Date().toISOString();document.getElementById('todayReports').prepend(card);attachReportCard(card);renderCardCheckSummaries();updateSiteManagersFromReports();updateRecentReportLinks();
  notify('공사일보가 날짜별 목록에 추가되었습니다.');closeDailyEditor();localStorage.removeItem('minWorksDailyDraftV2');e.currentTarget.reset();document.querySelectorAll('#processRows .process-name').forEach(select=>select.value='');document.querySelectorAll('#processRows .cumulative-people').forEach(input=>input.value='0');document.querySelectorAll('#tbmPreview .uploaded-photo,#progressPreview .uploaded-photo').forEach(photo=>{if(photo.dataset.photoSrc?.startsWith('blob:'))URL.revokeObjectURL(photo.dataset.photoSrc);photo.remove()});updatePhotoCount('tbmPreview','tbmPhotoCount');updatePhotoCount('progressPreview','progressPhotoCount');updateCumulativePeople();setTimeout(()=>{submittingReport=false;submitButton.disabled=false;submitButton.textContent='공사일보 등록'},800);if(userSettings.openAfterSubmit)setTimeout(()=>card.click(),250);
});
document.getElementById('photoBtn').addEventListener('click',()=>notify('카메라 기능은 정식 버전에서 연결됩니다.'));
const tbmGalleryInput=document.getElementById('tbmGalleryInput');
const tbmCameraInput=document.getElementById('tbmCameraInput');
const progressGalleryInput=document.getElementById('progressGalleryInput');
function openPhotoPicker(input){const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;if(userSettings?.wifiOnly&&connection?.type&&connection.type!=='wifi'){notify('Wi‑Fi에서만 사진 업로드하도록 설정되어 있습니다.');return}input.click()}
document.getElementById('tbmGalleryBtn').addEventListener('click',()=>openPhotoPicker(tbmGalleryInput));
document.getElementById('tbmCameraBtn').addEventListener('click',()=>openPhotoPicker(tbmCameraInput));
document.getElementById('progressPhotoAdd').addEventListener('click',()=>openPhotoPicker(progressGalleryInput));
function addPhotoPreviews(input,containerId,countId,type){
  const container=document.getElementById(containerId);
  [...input.files].forEach(file=>{
    const card=document.createElement('div'),photoUrl=URL.createObjectURL(file);card.className='uploaded-photo';card.style.backgroundImage=`url(${photoUrl})`;card.dataset.photoSrc=photoUrl;card.dataset.photoType=type;card.dataset.photoSize=String(file.size||0);card.photoFile=file;
    card.innerHTML=`<button type="button">×</button><small>${type} · ${userSettings?.photoQuality||'고화질'} · 방금 전</small>`;
    card.querySelector('button').addEventListener('click',()=>{card.remove();updatePhotoCount(containerId,countId)});
    container.appendChild(card);
  });
  updatePhotoCount(containerId,countId);input.value='';notify(type+'을 추가했습니다.');
}
function updatePhotoCount(containerId,countId){const count=document.querySelectorAll(`#${containerId} .uploaded-photo, #${containerId} .photo.sample`).length;document.getElementById(countId).textContent=count+'장'}
tbmGalleryInput.addEventListener('change',()=>addPhotoPreviews(tbmGalleryInput,'tbmPreview','tbmPhotoCount','TBM 사진'));
tbmCameraInput.addEventListener('change',()=>addPhotoPreviews(tbmCameraInput,'tbmPreview','tbmPhotoCount','TBM 사진'));
progressGalleryInput.addEventListener('change',()=>addPhotoPreviews(progressGalleryInput,'progressPreview','progressPhotoCount','진행사진'));
const modal=document.getElementById('modal');
['newSiteBtn','newSiteBtn2'].forEach(id=>document.getElementById(id).addEventListener('click',()=>modal.classList.add('show')));
document.getElementById('modalClose').addEventListener('click',()=>modal.classList.remove('show'));
let creatingSite=false;
document.getElementById('createSite').addEventListener('click',()=>{
  if(creatingSite)return;
  const name=document.getElementById('newSiteName').value.trim(),type=document.getElementById('newSiteType').value;
  if(!name){notify('현장명을 입력해주세요.');return}
  if([...document.querySelectorAll('.site-table-row')].some(row=>row.dataset.siteRow===name)){notify('같은 이름의 현장이 이미 등록되어 있습니다.');return}
  const startDate=document.getElementById('newSiteStart').value,endDate=document.getElementById('newSiteEnd').value;
  if(!startDate||!endDate){notify('착공일과 준공일을 모두 입력해주세요.');return}
  if(endDate<startDate){notify('준공일은 착공일보다 빠를 수 없습니다.');return}
  const amount=parseMoneyInput(document.getElementById('newSiteAmount').value),extra=parseMoneyInput(document.getElementById('newSiteExtraAmount').value);
  const createButton=document.getElementById('createSite'),siteId=crypto.randomUUID();creatingSite=true;createButton.disabled=true;modal.classList.remove('show');
  const card=document.createElement('article');card.className='site-card';card.dataset.site=name;card.dataset.siteId=siteId;card.dataset.amount=amount;card.dataset.extraAmount=extra;card.tabIndex=0;card.innerHTML=`<div class="site-color green"></div><div class="site-main"><div class="site-top"><span class="tag">${type}</span><span>신규</span></div><h3>${name}</h3><p>공사금액 ${won(amount)} · 추가 예상 ${won(extra)}</p><div class="progress-row"><div class="progress"><i style="width:0%"></i></div><b>0%</b></div></div>`;
  document.querySelector('.site-list').prepend(card);attachHomeSiteCard(card);
  const row=document.createElement('div');row.className='table-row site-table-row';row.dataset.siteRow=name;row.dataset.siteId=siteId;row.dataset.startDate=startDate;row.dataset.endDate=endDate;row.innerHTML=`<span><b>${name}</b><small>${type} · ${startDate} ~ ${endDate}</small></span><span class="site-manager">일보 미등록</span><button class="progress-edit" data-progress="0"><div class="inline-progress"><i style="width:0%"></i></div><b>0%</b><span class="material-symbols-rounded">edit</span></button><button class="recent-report-link" data-report-site="${name}">일보 없음</button><span><em class="status ok">신규</em></span>`;
  document.querySelector('.site-table').appendChild(row);attachRecentReportLink(row.querySelector('.recent-report-link'));window.refreshProjectStatuses?.();
  ['issueSite','paymentSite','receivableSite'].forEach(id=>{const option=document.createElement('option');option.textContent=name;document.getElementById(id)?.appendChild(option)});
  const dailySite=document.querySelector('#dailyForm select');if(dailySite){const option=document.createElement('option');option.textContent=name;dailySite.appendChild(option)}
  let budgets=document.getElementById('siteBudgetSummary');if(!budgets){budgets=document.createElement('section');budgets.id='siteBudgetSummary';budgets.className='site-budget-summary';budgets.innerHTML='<div class="panel-head"><div><p class="eyebrow">SITE BUDGET</p><h2>현장 계약금액</h2></div></div>';document.querySelector('.finance-tabs').before(budgets)}
  const budget=document.createElement('article');budget.innerHTML=`<div><b>${name}</b><small>${type}</small></div><span>공사금액 <strong>${won(amount)}</strong></span><span>추가 예상 <strong>${won(extra)}</strong></span><em>총 예상 ${won(amount+extra)}</em>`;budgets.appendChild(budget);
  ['newSiteName','newSiteStart','newSiteEnd','newSiteAmount','newSiteExtraAmount'].forEach(id=>document.getElementById(id).value='');applyExtendedSettings();notify('새 현장과 공사금액을 등록했습니다.');setTimeout(()=>{creatingSite=false;createButton.disabled=false},800);
});
modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});
document.getElementById('newIssue').addEventListener('click',()=>document.getElementById('issueFormModal').classList.add('show'));
document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active')}));

// 현장 전환
const siteSheet=document.getElementById('siteSheet');
document.getElementById('siteSwitcher').addEventListener('click',()=>siteSheet.classList.add('show'));
document.getElementById('siteSheetClose').addEventListener('click',()=>siteSheet.classList.remove('show'));
siteSheet.querySelector('.sheet-backdrop').addEventListener('click',()=>siteSheet.classList.remove('show'));
document.querySelectorAll('.site-option').forEach(option=>option.addEventListener('click',()=>{
  document.querySelectorAll('.site-option').forEach(x=>{x.classList.remove('active');x.querySelector('em').textContent=''});
  option.classList.add('active');option.querySelector('em').textContent='선택됨';
  document.getElementById('currentSiteName').textContent=option.dataset.siteName;
  siteSheet.classList.remove('show');notify(option.dataset.siteName+' 현장으로 변경했습니다.');
}));
document.getElementById('mobileDailyStart').addEventListener('click',()=>{showView('daily');openDailyEditor()});

// 사진 분류
document.querySelectorAll('.photo-categories button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.photo-categories button').forEach(x=>x.classList.remove('active'));b.classList.add('active');
}));

// 공정 입력줄 추가
document.getElementById('addProcess').addEventListener('click',()=>{
  const rows=document.getElementById('processRows');
  const number=rows.children.length+1;
  const row=document.createElement('div');
  row.className='process-row';
  row.innerHTML=`<label><span>공정 ${number}</span></label><label><span>금일인원</span><input type="number" min="0"><i>명</i></label><label><span>작업내용</span><input placeholder="세부 작업내용"></label>`;
  row.querySelector('label:first-child').appendChild(createProcessSelect());
  addCumulativeField(row);
  rows.appendChild(row);
  row.querySelector('.process-name').focus();
  notify(`공정 ${number} 입력줄을 추가했습니다.`);
});

// 완료된 공사일보: 작성자만 수정, 그 외 사용자는 열람 전용
let currentUser='김재준';
window.setMinWorksUser=function(user){
  if(!user)return;
  if(user.role==='employee'&&user.name){
    currentUser=user.name;
    const nameOnly=user.name.replace(/\s/g,'');
    const hour=Number(new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',hour12:false,timeZone:'Asia/Seoul'}).format(new Date()).replace('시','').trim());
    const greeting=hour>=18||hour<5?'오늘도 수고하셨습니다':hour>=12?'좋은 오후입니다':'좋은 아침입니다';
    titles.dashboard=`${greeting}, ${nameOnly}님`;
    if(document.getElementById('dashboardView').classList.contains('active'))document.getElementById('pageTitle').textContent=titles.dashboard;
  }else if(user.role==='admin'){
    titles.dashboard='관리자님, 안녕하세요';
    if(document.getElementById('dashboardView').classList.contains('active'))document.getElementById('pageTitle').textContent=titles.dashboard;
  }
};
const legacyViewerPhotos=document.querySelector('#reportViewer .viewer-photos');
legacyViewerPhotos.className='viewer-photo-gallery';
legacyViewerPhotos.setAttribute('aria-label','공사일보 현장사진');
legacyViewerPhotos.innerHTML='<div class="viewer-photo-head"><div><span class="material-symbols-rounded">photo_library</span><div><b>현장사진</b><small id="viewerPhotoSummary">사진을 옆으로 넘겨 확인하세요.</small></div></div><em id="viewerPhotoCounter">0 / 0</em></div><div class="viewer-photo-stage"><button type="button" class="viewer-photo-arrow prev" id="viewerPhotoPrev" aria-label="이전 사진"><span class="material-symbols-rounded">chevron_left</span></button><div class="viewer-photo-track" id="viewerPhotoTrack"></div><button type="button" class="viewer-photo-arrow next" id="viewerPhotoNext" aria-label="다음 사진"><span class="material-symbols-rounded">chevron_right</span></button></div><div class="viewer-photo-dots" id="viewerPhotoDots"></div>';
const reportViewer=document.getElementById('reportViewer');
const checkRecords={
  '연세대학교 고를샘':[{name:'최진영 대표',time:'오전 9:18'},{name:'박민수 과장',time:'오전 9:24'}],
  '에잇세컨즈 AK분당점':[{name:'강신윤 대표',time:'오전 10:05'}],
  '알뜰주유소 시설개선':[],
  '힐스테이트 아산 커뮤니티':[{name:'김재준 부장',time:'어제 오후 6:20'}]
};
let activeReportSite='';
let activeReportCard=null;
function renderCardCheckSummaries(){
  document.querySelectorAll('.report-card').forEach(card=>{
    const records=checkRecords[card.dataset.site]||[];
    let summary=card.querySelector('.card-check-summary');
    if(!summary){summary=document.createElement('div');summary.className='card-check-summary';card.appendChild(summary)}
    summary.classList.toggle('none',records.length===0);
    summary.innerHTML=records.length?`<span class="material-symbols-rounded">visibility</span><b>확인 ${records.length}명</b><span>${records.map(r=>r.name).join(' · ')}</span><em>확인자 보기</em>`:`<span class="material-symbols-rounded">visibility_off</span><b>확인 0명</b><span>아직 확인한 사람이 없습니다.</span>`;
  });
}
function renderCheckHistory(){
  const records=checkRecords[activeReportSite]||[];
  document.getElementById('checkCount').textContent=records.length+'명 확인';
  document.getElementById('checkPeople').innerHTML=records.length?records.map(r=>`<div class="check-person"><i>${r.name[0]}</i><span>${r.name}</span><small>${r.time}</small></div>`).join(''):'<span class="empty-check">아직 확인한 사람이 없습니다.</span>';
  const checked=records.some(r=>r.name.startsWith(currentUser));
  const button=document.getElementById('checkReport');button.disabled=checked;button.classList.toggle('checked',checked);button.innerHTML=checked?'<span class="material-symbols-rounded">done_all</span>확인 완료':'<span class="material-symbols-rounded">done</span>확인했습니다';
}
function attachReportCard(card){card.addEventListener('click',()=>{
  activeReportCard=card;
  activeReportSite=card.dataset.site;
  document.getElementById('viewerSite').textContent=card.dataset.site;
  document.getElementById('viewerAuthor').textContent=card.querySelector('.report-author b').textContent;
  const savedTotal=Number(card.dataset.totalPeople),processTotal=Array.isArray(card.reportProcesses)?card.reportProcesses.reduce((sum,item)=>sum+(Number(item.today)||0),0):0,summaryText=card.querySelector('p')?.textContent||'',explicitTotal=Number(summaryText.match(/총출력\s*(\d+)명/)?.[1]||0),summaryTotal=explicitTotal||[...summaryText.matchAll(/(\d+)명/g)].reduce((sum,match)=>sum+Number(match[1]),0);document.getElementById('viewerTotalPeople').textContent=`${savedTotal||processTotal||summaryTotal||0}명`;
  document.getElementById('editOwnReport').classList.toggle('visible',card.dataset.author===currentUser);
  renderViewerPhotos(card);
  renderCheckHistory();
  reportViewer.classList.add('show');
})}
let viewerPhotoIndex=0;
function reportPhotos(card){
  if(Array.isArray(card.reportPhotos))return card.reportPhotos;
  try{return JSON.parse(card.dataset.photos||'[]')}catch{return []}
}
function renderViewerPhotos(card){
  const photos=reportPhotos(card),track=document.getElementById('viewerPhotoTrack'),dots=document.getElementById('viewerPhotoDots');viewerPhotoIndex=0;track.style.transform='translateX(0)';track.replaceChildren();dots.replaceChildren();
  if(!photos.length){const empty=document.createElement('div');empty.className='viewer-photo-empty';empty.innerHTML='<span class="material-symbols-rounded">photo_camera</span><b>등록된 현장사진이 없습니다.</b><small>사진을 첨부한 일보는 이곳에서 좌우로 넘겨볼 수 있습니다.</small>';track.appendChild(empty);updateViewerPhotoState(photos);return}
  photos.forEach((photo,index)=>{const figure=document.createElement('figure');figure.className='viewer-photo-slide';const img=document.createElement('img');img.src=photo.src;img.alt=`${photo.type||'현장사진'} ${index+1}`;const caption=document.createElement('figcaption');caption.innerHTML=`<span>${photo.type||'현장사진'}</span><b>${index+1} / ${photos.length}</b>`;figure.append(img,caption);track.appendChild(figure);const dot=document.createElement('button');dot.type='button';dot.setAttribute('aria-label',`${index+1}번 사진`);dot.addEventListener('click',()=>goViewerPhoto(index,photos));dots.appendChild(dot)});updateViewerPhotoState(photos);
}
function updateViewerPhotoState(photos){const count=photos.length;document.getElementById('viewerPhotoCounter').textContent=count?`${viewerPhotoIndex+1} / ${count}`:'0 / 0';document.getElementById('viewerPhotoSummary').textContent=count?`등록 사진 ${count}장 · 좌우로 넘겨보기`:'등록 사진 없음';document.getElementById('viewerPhotoPrev').disabled=count<2;document.getElementById('viewerPhotoNext').disabled=count<2;document.querySelectorAll('#viewerPhotoDots button').forEach((dot,index)=>dot.classList.toggle('active',index===viewerPhotoIndex));}
function goViewerPhoto(index,photos){if(!photos.length)return;viewerPhotoIndex=(index+photos.length)%photos.length;document.getElementById('viewerPhotoTrack').style.transform=`translateX(-${viewerPhotoIndex*100}%)`;updateViewerPhotoState(photos)}
document.getElementById('viewerPhotoPrev').addEventListener('click',()=>{const card=[...document.querySelectorAll('.report-card')].find(item=>item.dataset.site===activeReportSite);goViewerPhoto(viewerPhotoIndex-1,reportPhotos(card||{}))});
document.getElementById('viewerPhotoNext').addEventListener('click',()=>{const card=[...document.querySelectorAll('.report-card')].find(item=>item.dataset.site===activeReportSite);goViewerPhoto(viewerPhotoIndex+1,reportPhotos(card||{}))});
document.querySelectorAll('.report-card').forEach(attachReportCard);
document.getElementById('closeReportViewer').addEventListener('click',()=>reportViewer.classList.remove('show'));
reportViewer.querySelector('.viewer-backdrop').addEventListener('click',()=>reportViewer.classList.remove('show'));
document.getElementById('editOwnReport').addEventListener('click',()=>{reportViewer.classList.remove('show');openDailyEditor();notify('내 공사일보 수정 화면을 열었습니다.')});

// 공사일보·현장 이슈 삭제 상태는 이 기기에 보관합니다.
const deletedRecordKey='minWorksDeletedRecordsV1';
function deletedRecords(){try{return JSON.parse(localStorage.getItem(deletedRecordKey)||'{"reports":[],"issues":[]}')}catch{return {reports:[],issues:[]}}}
function saveDeletedRecord(type,id){const saved=deletedRecords();if(!saved[type].includes(id))saved[type].push(id);localStorage.setItem(deletedRecordKey,JSON.stringify(saved))}
function recordId(element,type){
  if(element.dataset.recordId)return element.dataset.recordId;
  const parts=type==='reports'
    ?[element.dataset.site,element.dataset.author,element.querySelector('b')?.textContent,element.dataset.reportDate]
    :[element.dataset.issueCard,element.querySelector('h3')?.textContent,element.querySelector('small')?.textContent];
  element.dataset.recordId=parts.filter(Boolean).join('|').replace(/\s+/g,' ').trim();
  return element.dataset.recordId;
}
function removeReportCard(card){const group=card.closest('.date-group');card.remove();if(group&&!group.querySelector('.report-card'))group.remove()}
function syncSiteIssueAlerts(){document.querySelectorAll('[data-issue-site]').forEach(alert=>{const site=alert.dataset.issueSite;if(![...document.querySelectorAll('.issue-detail-card')].some(card=>card.dataset.issueCard===site))alert.closest('span').innerHTML='<em class="status ok">이슈 없음</em>'})}
function refreshAfterRecordDelete(){renderCardCheckSummaries();updateSiteManagersFromReports();updateRecentReportLinks();refreshIssueSummary();syncSiteIssueAlerts();window.refreshProjectStatuses?.();window.refreshMinWorksSummary?.()}
function canDeleteReport(card){const user=window.MIN_WORKS_USER;return user?.role==='admin'||card?.dataset.author===currentUser}
const reportDeleteButton=document.createElement('button');
reportDeleteButton.type='button';reportDeleteButton.id='deleteReport';reportDeleteButton.className='record-delete-button';
reportDeleteButton.innerHTML='<span class="material-symbols-rounded">delete</span>일보 삭제';
document.querySelector('#reportViewer .viewer-actions')?.prepend(reportDeleteButton);
reportDeleteButton.addEventListener('click',()=>{
  const card=activeReportCard;if(!card)return;
  if(!canDeleteReport(card)){notify('관리자 또는 작성자만 공사일보를 삭제할 수 있습니다.');return}
  const title=card.querySelector('div>b')?.textContent||'공사일보';
  if(!confirm(`${card.dataset.site} · ${title}\n\n이 공사일보를 삭제할까요? 삭제 후 되돌릴 수 없습니다.`))return;
  saveDeletedRecord('reports',recordId(card,'reports'));removeReportCard(card);reportViewer.classList.remove('show');activeReportCard=null;refreshAfterRecordDelete();notify('공사일보를 삭제했습니다.');
});
document.getElementById('checkReport').addEventListener('click',()=>{
  const records=checkRecords[activeReportSite]||(checkRecords[activeReportSite]=[]);
  if(!records.some(r=>r.name.startsWith(currentUser)))records.push({name:currentUser+' 부장',time:'방금 전'});
  renderCheckHistory();notify('확인 기록이 남았습니다.');
  renderCardCheckSummaries();
});
renderCardCheckSummaries();

// 공사일보 현장별 필터
document.querySelectorAll('.daily-filter button').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.daily-filter button').forEach(x=>x.classList.remove('active'));
  button.classList.add('active');
  const filter=button.textContent.trim();
  document.querySelectorAll('.report-card').forEach(card=>{
    card.style.display=filter==='전체 현장'||card.dataset.site.includes(filter)?'grid':'none';
  });
  document.querySelectorAll('.date-group').forEach(group=>{
    const hasVisible=[...group.querySelectorAll('.report-card')].some(card=>card.style.display!=='none');
    group.style.display=hasVisible?'block':'none';
  });
  const exportButton=document.getElementById('exportSiteBtn');
  exportButton.hidden=filter==='전체 현장';
  exportButton.dataset.site=filter;
  notify(filter==='전체 현장'?'전체 현장 일보를 표시합니다.':filter+' 현장 일보만 표시합니다.');
}));

// 현장 종료 자료 내보내기
const exportModal=document.getElementById('exportModal');
document.getElementById('exportSiteBtn').addEventListener('click',e=>{
  document.getElementById('exportSiteName').textContent=e.currentTarget.dataset.site+' 현장';
  exportModal.classList.add('show');
});
document.getElementById('closeExportModal').addEventListener('click',()=>exportModal.classList.remove('show'));
exportModal.querySelector('.export-backdrop').addEventListener('click',()=>exportModal.classList.remove('show'));
document.querySelectorAll('[data-export]').forEach(button=>button.addEventListener('click',()=>{
  notify(button.dataset.export+' 다운로드가 완료되었습니다.');
  exportModal.classList.remove('show');
  const site=document.getElementById('exportSiteName').textContent;
  document.getElementById('retentionSiteName').textContent=site;
  document.getElementById('deleteSiteName').textContent=site;
  setTimeout(()=>document.getElementById('retentionModal').classList.add('show'),450);
}));

// 다운로드 완료 후 보관 또는 삭제 선택
const retentionModal=document.getElementById('retentionModal');
const deleteConfirmModal=document.getElementById('deleteConfirmModal');
const retentionDates={3:'2026년 11월 20일까지',6:'2027년 2월 20일까지',12:'2027년 8월 20일까지',forever:'삭제 전까지 계속 보관'};
document.getElementById('retentionPeriod').addEventListener('change',e=>document.getElementById('retentionDate').textContent=retentionDates[e.target.value]);
document.getElementById('keepReports').addEventListener('click',()=>{retentionModal.classList.remove('show');notify(document.getElementById('retentionDate').textContent+' 보관합니다.')});
document.getElementById('requestReportDelete').addEventListener('click',()=>{retentionModal.classList.remove('show');deleteConfirmModal.classList.add('show')});
document.getElementById('cancelReportDelete').addEventListener('click',()=>{deleteConfirmModal.classList.remove('show');retentionModal.classList.add('show')});
document.getElementById('confirmReportDelete').addEventListener('click',()=>{
  const filter=document.getElementById('exportSiteBtn').dataset.site;
  document.querySelectorAll('.report-card').forEach(card=>{if(card.dataset.site.includes(filter))card.remove()});
  document.querySelectorAll('.date-group').forEach(group=>{if(!group.querySelector('.report-card'))group.style.display='none'});
  deleteConfirmModal.classList.remove('show');document.getElementById('exportSiteBtn').hidden=true;
  notify(filter+' 현장의 공사일보를 삭제했습니다.');
});

// Google Calendar 일정 분류 보기
document.querySelectorAll('[data-calendar-filter]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-calendar-filter]').forEach(x=>x.classList.remove('active'));button.classList.add('active');
  const filter=button.dataset.calendarFilter;
  document.querySelectorAll('.agenda-event').forEach(event=>event.style.display=filter==='all'||event.dataset.source===filter?'grid':'none');
  document.querySelectorAll('.agenda-date').forEach(group=>group.style.display=[...group.querySelectorAll('.agenda-event')].some(x=>x.style.display!=='none')?'block':'none');
}));
document.getElementById('newCalendarEvent').addEventListener('click',()=>notify('일정 등록 화면은 다음 단계에서 Google Calendar에 연결합니다.'));

// 사용자 설정: 기기별 자동 저장 및 즉시 반영
const settingsKey='minWorksUserSettings';
const settingDefaults={theme:'light',fontSize:'normal',density:'comfortable',accent:'lime',contrast:false,displayMode:'pc',startView:'dashboard',siteCount:'4',weather:true,financeSummary:true,calendarSummary:true,processRows:'5',photoQuality:'고화질',autosave:true,photoWarning:true,openAfterSubmit:false,urgentNotice:true,approvalNotice:true,moneyNotice:true,calendarNotice:true,quietStart:'19:00',quietEnd:'07:00',role:'시공팀장',mySitesFirst:true,hideMoney:false,retention:'1년',wifiOnly:false,selectedSites:['연세대학교','에잇세컨즈','알뜰주유소','힐스테이트']};
let userSettings={...settingDefaults,...JSON.parse(localStorage.getItem(settingsKey)||'{}')};
userSettings.theme='light';
if(userSettings.displayMode==='mobile')userSettings.displayMode='galaxy';
const accentColors={lime:'#7fbc03',blue:'#327ae8',orange:'#ef8d23',charcoal:'#252525'};
function saveUserSettings(){localStorage.setItem(settingsKey,JSON.stringify(userSettings));applyUserSettings();notify('설정이 저장되었습니다.');}
function applyUserSettings(){
  userSettings.theme='light';document.documentElement.dataset.theme='light';document.documentElement.style.colorScheme='light';const themeMeta=document.querySelector('meta[name="theme-color"]');if(themeMeta)themeMeta.content='#f4f6f2';
  document.documentElement.style.setProperty('--accent',accentColors[userSettings.accent]||accentColors.lime);
  document.documentElement.style.setProperty('--green',accentColors[userSettings.accent]||accentColors.lime);
  document.body.classList.toggle('font-small',userSettings.fontSize==='small');document.body.classList.toggle('font-large',userSettings.fontSize==='large');document.body.classList.toggle('density-compact',userSettings.density==='compact');document.body.classList.toggle('high-contrast',!!userSettings.contrast);document.body.classList.toggle('hide-weather',!userSettings.weather);document.body.classList.toggle('hide-finance-summary',!userSettings.financeSummary);document.body.classList.toggle('hide-calendar-summary',!userSettings.calendarSummary);document.body.classList.toggle('hide-money',!!userSettings.hideMoney);
  applyExtendedSettings();
}
function syncSettingsUI(){document.querySelectorAll('[data-setting]').forEach(g=>g.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.value===String(userSettings[g.dataset.setting]))));document.querySelectorAll('[data-toggle-setting]').forEach(i=>i.checked=!!userSettings[i.dataset.toggleSetting]);document.querySelectorAll('[data-select-setting]').forEach(i=>i.value=userSettings[i.dataset.selectSetting]??i.value);document.querySelectorAll('[data-input-setting]').forEach(i=>i.value=userSettings[i.dataset.inputSetting]??i.value);}
document.querySelectorAll('[data-settings-group]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-settings-group]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('[data-settings-panel]').forEach(x=>x.classList.toggle('active',x.dataset.settingsPanel===b.dataset.settingsGroup));}));
document.querySelectorAll('[data-setting] button').forEach(b=>b.addEventListener('click',()=>{userSettings[b.parentElement.dataset.setting]=b.dataset.value;syncSettingsUI();saveUserSettings();}));
document.querySelectorAll('[data-toggle-setting]').forEach(i=>i.addEventListener('change',()=>{userSettings[i.dataset.toggleSetting]=i.checked;saveUserSettings();}));document.querySelectorAll('[data-select-setting]').forEach(i=>i.addEventListener('change',()=>{userSettings[i.dataset.selectSetting]=i.value;saveUserSettings();}));document.querySelectorAll('[data-input-setting]').forEach(i=>i.addEventListener('change',()=>{userSettings[i.dataset.inputSetting]=i.value;saveUserSettings();}));
document.getElementById('resetSettings').addEventListener('click',()=>{userSettings={...settingDefaults};syncSettingsUI();saveUserSettings();});
syncSettingsUI();applyUserSettings();

// 자금 현황 탭
document.querySelectorAll('[data-finance-tab]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-finance-tab]').forEach(x=>x.classList.remove('active'));button.classList.add('active');
  document.querySelectorAll('.finance-panel').forEach(x=>x.classList.remove('active'));
  document.getElementById(button.dataset.financeTab==='payment'?'paymentPanel':'receivablePanel').classList.add('active');
}));
document.querySelectorAll('[data-approval-stage]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-approval-stage]').forEach(x=>x.classList.remove('active'));button.classList.add('active');
  const stage=button.dataset.approvalStage;
  document.querySelectorAll('#paymentPanel .finance-row').forEach(row=>row.style.display=stage==='all'||row.dataset.stage===stage?'grid':'none');
}));

// 지출·기성 3단계 결재 보드
const stageInfo={public:{title:'공무부 확인',subtitle:'현장에서 보낸 내역',button:'확인 후 경리부로 전달',next:'accounting'},accounting:{title:'경리부 확인',subtitle:'공무부 확인 완료',button:'확인 후 대표님께 전달',next:'representative'},representative:{title:'대표님 검토·결제 대기',subtitle:'경리부 확인 완료',button:'결제 완료 확인',next:'complete'}};
const paymentBoard=document.createElement('div');paymentBoard.className='payment-workflow-board';paymentBoard.innerHTML=Object.entries(stageInfo).map(([key,value])=>`<section class="workflow-column" data-workflow-column="${key}"><header><div><b>${value.title}</b><small>${value.subtitle}</small></div><span>0</span></header><div class="workflow-cards"></div></section>`).join('');
const workflowNotice=document.createElement('div');workflowNotice.className='workflow-notice';workflowNotice.innerHTML='<span class="material-symbols-rounded">info</span><p><b>결재 진행 참고용</b><small>실제 전자결재가 아닌 부서별 확인·전달 상태를 공유하는 화면입니다.</small></p>';document.querySelector('#paymentPanel .finance-panel-toolbar').after(workflowNotice);workflowNotice.after(paymentBoard);
function updateWorkflowCounts(){document.querySelectorAll('[data-workflow-column]').forEach(column=>column.querySelector('header span').textContent=column.querySelectorAll('.workflow-card').length)}
function createWorkflowCard({site,urgent='-',progress='-',date='일정 미정',memo='',stage='public',author='현장소장'}){
  if(stage==='complete')return;
  const card=document.createElement('article');card.className='workflow-card';card.dataset.stage=stage;card.innerHTML=`<div class="workflow-card-top"><span>${site}</span><em>${author}</em></div><div class="workflow-money"><div><small>긴급지출</small><b>${urgent}</b></div><div><small>이번 달 기성</small><b>${progress}</b></div></div>${memo?`<p>${memo}</p>`:''}<div class="workflow-date"><span class="material-symbols-rounded">event</span><span>지급 예정</span><b>${date}</b></div><button class="workflow-move">${stageInfo[stage].button}<span class="material-symbols-rounded">arrow_forward</span></button>`;
  document.querySelector(`[data-workflow-column="${stage}"] .workflow-cards`).prepend(card);updateWorkflowCounts();
}
document.querySelectorAll('#paymentPanel>.finance-row').forEach(row=>{const cells=row.children;createWorkflowCard({site:cells[0].querySelector('b').textContent,author:cells[0].querySelector('small').textContent.replace('담당 ',''),urgent:cells[1].querySelector('b').textContent,progress:cells[2].querySelector('b').textContent,date:cells[4].querySelector('b').textContent,stage:row.dataset.stage});});
paymentBoard.addEventListener('click',event=>{const button=event.target.closest('.workflow-move');if(!button)return;const card=button.closest('.workflow-card'),current=card.dataset.stage,next=stageInfo[current].next;if(next==='complete'){button.disabled=true;button.innerHTML='<span class="material-symbols-rounded">check_circle</span> 결제 완료 확인됨';card.classList.add('workflow-complete');notify('결제 완료 상태를 참고용으로 기록했습니다.');return}card.dataset.stage=next;button.innerHTML=`${stageInfo[next].button}<span class="material-symbols-rounded">arrow_forward</span>`;document.querySelector(`[data-workflow-column="${next}"] .workflow-cards`).prepend(card);updateWorkflowCounts();notify(next==='accounting'?'공무부 확인 후 경리부 칸으로 전달했습니다.':'경리부 확인 후 대표님 검토·결제 대기 칸으로 전달했습니다.');});

// 현장소장 지출·기성 작성 / 공무·경리 수금 예정 작성
const paymentFormModal=document.getElementById('paymentFormModal'),receivableFormModal=document.getElementById('receivableFormModal');
document.getElementById('openPaymentForm').addEventListener('click',()=>paymentFormModal.classList.add('show'));
document.getElementById('openReceivableForm').addEventListener('click',()=>receivableFormModal.classList.add('show'));
document.querySelectorAll('[data-close-money]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.closeMoney).classList.remove('show')));
document.querySelectorAll('.money-modal-backdrop').forEach(backdrop=>backdrop.addEventListener('click',()=>backdrop.parentElement.classList.remove('show')));
const won=value=>'₩ '+Number(value||0).toLocaleString('ko-KR');
document.getElementById('savePayment').addEventListener('click',()=>{
  const site=document.getElementById('paymentSite').value,type=document.getElementById('paymentType').value,amount=document.getElementById('paymentAmount').value,memo=document.getElementById('paymentMemo').value.trim()||type;
  if(!amount){notify('금액을 입력해주세요.');return}
  const urgent=type.includes('긴급')?won(amount):'-',progress=type.includes('기성')?won(amount):'-';
  createWorkflowCard({site,urgent,progress,date:document.getElementById('paymentDate').value||'일정 미정',memo,stage:'public',author:'현장소장'});paymentFormModal.classList.remove('show');notify('지출·기성을 공무부 확인 칸으로 보냈습니다.');
});
document.getElementById('saveReceivable').addEventListener('click',()=>{
  const client=document.getElementById('receivableClient').value.trim(),site=document.getElementById('receivableSite').value,amount=document.getElementById('receivableAmount').value,date=document.getElementById('receivableDate').value;
  if(!client||!amount||!date){notify('거래처, 금액, 입금 예정일을 입력해주세요.');return}
  const row=document.createElement('article');row.className='finance-row receivable-row';row.innerHTML=`<div><b>${client}</b><small>${site}</small></div><div><b>${won(amount)}</b><small>신규 청구</small></div><div><b>-</b><small>미입금</small></div><div><span class="money-status scheduled">입금 예정</span></div><div><b>${date}</b><small>입금 예정</small></div>`;
  document.getElementById('receivablePanel').appendChild(row);receivableFormModal.classList.remove('show');notify('거래처 수금 예정일을 등록했습니다.');
});

// 현장 이슈 등록 및 현장 탭 연동
const issueFormModal=document.getElementById('issueFormModal'),issuePeek=document.getElementById('issuePeek');
const issueDueLabel=document.createElement('label');issueDueLabel.innerHTML='완료 기한<input id="issueDue" type="date" value="2026-08-21">';issueFormModal.querySelector('.issue-form-grid').appendChild(issueDueLabel);
const issueFilterButtons=[...document.querySelectorAll('.issue-summary button')];['all','urgent','active','complete'].forEach((key,index)=>issueFilterButtons[index].dataset.issueFilter=key);
function refreshIssueSummary(){const cards=[...document.querySelectorAll('.issue-detail-card')],counts=[cards.length,cards.filter(c=>c.dataset.urgency==='urgent').length,cards.filter(c=>c.dataset.status!=='complete').length,cards.filter(c=>c.dataset.status==='complete').length];issueFilterButtons.forEach((button,index)=>button.textContent=['전체 ','긴급 ','진행 중 ','완료 '][index]+counts[index]);}
document.querySelectorAll('.issue-detail-card').forEach(card=>{card.dataset.urgency=card.classList.contains('urgent')?'urgent':'normal';card.dataset.status='active';card.dataset.comments=card.querySelector('.issue-meta span:last-child')?.textContent.match(/\d+/)?.[0]||'0';card.dataset.due=card.querySelector('.issue-meta span:nth-child(2)')?.textContent.trim()||'기한 미정';});
issueFilterButtons.forEach(button=>button.addEventListener('click',()=>{issueFilterButtons.forEach(x=>x.classList.toggle('active',x===button));document.querySelectorAll('.issue-detail-card').forEach(card=>{const f=button.dataset.issueFilter;card.style.display=f==='all'||f===card.dataset.urgency||(f==='active'&&card.dataset.status==='active')||(f==='complete'&&card.dataset.status==='complete')?'block':'none';});}));
const issueDetailActions=document.createElement('div');issueDetailActions.className='issue-detail-actions';issueDetailActions.innerHTML='<div class="issue-status-row"><span id="peekDue">기한 미정</span><div><button id="deleteIssue" class="record-delete-button"><span class="material-symbols-rounded">delete</span>이슈 삭제</button><button id="toggleIssueStatus">완료 처리</button></div></div><section class="issue-comments"><b>댓글 <em id="peekCommentCount">0</em></b><div id="peekCommentList"><p><strong>김재준 부장</strong> 발주처 확인 후 공유하겠습니다.</p></div><label><input id="issueCommentInput" placeholder="댓글을 입력하세요"><button id="addIssueComment">등록</button></label></section>';issuePeek.querySelector('section').appendChild(issueDetailActions);let activeIssueCard=null;
document.getElementById('closeIssueForm').addEventListener('click',()=>issueFormModal.classList.remove('show'));
issueFormModal.querySelector('.issue-modal-backdrop').addEventListener('click',()=>issueFormModal.classList.remove('show'));
document.getElementById('saveIssue').addEventListener('click',()=>{
  const site=document.getElementById('issueSite').value,title=document.getElementById('issueTitle').value.trim()||'새 현장 이슈',description=document.getElementById('issueDescription').value.trim()||'상세 내용이 없습니다.';
  const urgency=document.getElementById('issueUrgency').value,category=document.getElementById('issueCategory').value,owner=document.getElementById('issueOwner').value,due=document.getElementById('issueDue').value||'기한 미정';
  const card=document.createElement('article');card.className='issue-detail-card'+(urgency==='긴급'?' urgent':'');card.dataset.issueCard=site;
  card.dataset.urgency=urgency==='긴급'?'urgent':'normal';card.dataset.status='active';card.dataset.comments='0';card.dataset.due=due;card.innerHTML=`<header><div><span class="issue-label ${urgency==='긴급'?'':'normal'}">${urgency}</span><span class="issue-category">${category}</span></div><em>진행 중</em></header><small>${site} · 오늘</small><h3>${title}</h3><p>${description}</p><div class="issue-meta"><span><i class="material-symbols-rounded">person</i>담당 ${owner}</span><span><i class="material-symbols-rounded">schedule</i>${due}</span><span><i class="material-symbols-rounded">chat</i>댓글 0</span></div>`;
  document.querySelector('.issue-board').prepend(card);attachIssueCard(card);
  const row=document.querySelector(`[data-site-row="${site}"]`);if(row){const cell=row.lastElementChild;cell.innerHTML=`<button class="site-issue-alert" data-issue-site="${site}"><span class="material-symbols-rounded">error</span>이슈 있음</button>`;attachSiteIssueAlert(cell.querySelector('button'))}
  issueFormModal.classList.remove('show');refreshIssueSummary();notify(site+' 현장에 이슈를 등록했습니다.');
});
function showIssuePeek(site,selectedCard){const card=selectedCard||document.querySelector(`[data-issue-card="${site}"]`);if(!card)return;activeIssueCard=card;document.getElementById('peekSite').textContent=site;document.getElementById('peekTitle').textContent=card.querySelector('h3').textContent;document.getElementById('peekDescription').textContent=card.querySelector('p').textContent;document.getElementById('peekOwner').textContent=card.querySelector('.issue-meta span').textContent.trim();document.getElementById('peekUrgency').textContent=card.querySelector('.issue-label').textContent;document.getElementById('peekDue').textContent='완료 기한 '+card.dataset.due;document.getElementById('peekCommentCount').textContent=card.dataset.comments;document.getElementById('toggleIssueStatus').textContent=card.dataset.status==='complete'?'다시 진행':'완료 처리';issuePeek.classList.add('show')}
function attachSiteIssueAlert(button){button.addEventListener('click',()=>showIssuePeek(button.dataset.issueSite))}
function attachIssueCard(card){card.addEventListener('click',()=>showIssuePeek(card.dataset.issueCard,card))}
document.querySelectorAll('.site-issue-alert').forEach(attachSiteIssueAlert);document.querySelectorAll('.issue-detail-card').forEach(attachIssueCard);
document.getElementById('closeIssuePeek').addEventListener('click',()=>issuePeek.classList.remove('show'));issuePeek.querySelector('.issue-peek-backdrop').addEventListener('click',()=>issuePeek.classList.remove('show'));
document.getElementById('goToIssue').addEventListener('click',()=>{issuePeek.classList.remove('show');showView('issues')});
document.getElementById('toggleIssueStatus').addEventListener('click',()=>{if(!activeIssueCard)return;const complete=activeIssueCard.dataset.status!=='complete';activeIssueCard.dataset.status=complete?'complete':'active';activeIssueCard.classList.toggle('issue-completed',complete);activeIssueCard.querySelector('header>em').textContent=complete?'완료':'진행 중';document.getElementById('toggleIssueStatus').textContent=complete?'다시 진행':'완료 처리';refreshIssueSummary();notify(complete?'이슈를 완료 처리했습니다.':'이슈를 다시 진행 상태로 바꿨습니다.');});
document.getElementById('deleteIssue').addEventListener('click',()=>{
  if(!activeIssueCard)return;
  const user=window.MIN_WORKS_USER,owner=activeIssueCard.querySelector('.issue-meta span')?.textContent||'';
  if(user?.role!=='admin'&&!owner.includes(currentUser)){notify('관리자 또는 담당자만 이슈를 삭제할 수 있습니다.');return}
  const site=activeIssueCard.dataset.issueCard,title=activeIssueCard.querySelector('h3')?.textContent||'현장 이슈';
  if(!confirm(`${site} · ${title}\n\n이 이슈를 삭제할까요? 삭제 후 되돌릴 수 없습니다.`))return;
  saveDeletedRecord('issues',recordId(activeIssueCard,'issues'));activeIssueCard.remove();issuePeek.classList.remove('show');activeIssueCard=null;
  const remaining=[...document.querySelectorAll('.issue-detail-card')].some(card=>card.dataset.issueCard===site);
  if(!remaining){const alert=[...document.querySelectorAll('[data-issue-site]')].find(item=>item.dataset.issueSite===site);if(alert)alert.closest('span').innerHTML='<em class="status ok">이슈 없음</em>'}
  refreshAfterRecordDelete();notify('현장 이슈를 삭제했습니다.');
});
document.getElementById('addIssueComment').addEventListener('click',()=>{const input=document.getElementById('issueCommentInput'),text=input.value.trim();if(!text||!activeIssueCard)return;const comment=document.createElement('p');comment.innerHTML=`<strong>김재준 부장</strong> ${text}`;document.getElementById('peekCommentList').appendChild(comment);activeIssueCard.dataset.comments=String(Number(activeIssueCard.dataset.comments||0)+1);activeIssueCard.querySelector('.issue-meta span:last-child').innerHTML=`<i class="material-symbols-rounded">chat</i>댓글 ${activeIssueCard.dataset.comments}`;document.getElementById('peekCommentCount').textContent=activeIssueCard.dataset.comments;input.value='';notify('댓글을 등록했습니다.');});refreshIssueSummary();

// 삭제한 샘플은 새로고침해도 다시 나타나지 않습니다.
(()=>{const saved=deletedRecords();document.querySelectorAll('.report-card').forEach(card=>{if(saved.reports.includes(recordId(card,'reports')))removeReportCard(card)});document.querySelectorAll('.issue-detail-card').forEach(card=>{if(saved.issues.includes(recordId(card,'issues')))card.remove()});refreshAfterRecordDelete()})();

// 공정률은 현장소장이 직접 갱신하고 이력을 남김
const progressModal=document.getElementById('progressModal'),progressRange=document.getElementById('progressRange');let activeProgressButton=null;
document.querySelectorAll('.progress-edit').forEach(button=>button.addEventListener('click',()=>{activeProgressButton=button;const site=button.closest('.site-table-row').dataset.siteRow;document.getElementById('progressSiteName').textContent=site;progressRange.value=button.dataset.progress;document.getElementById('progressValue').textContent=button.dataset.progress;progressModal.classList.add('show')}));
progressRange.addEventListener('input',()=>document.getElementById('progressValue').textContent=progressRange.value);
document.getElementById('closeProgressModal').addEventListener('click',()=>progressModal.classList.remove('show'));progressModal.querySelector('.progress-backdrop').addEventListener('click',()=>progressModal.classList.remove('show'));
document.getElementById('saveProgress').addEventListener('click',()=>{if(!activeProgressButton)return;activeProgressButton.dataset.progress=progressRange.value;activeProgressButton.querySelector('.inline-progress i').style.width=progressRange.value+'%';activeProgressButton.querySelector('b').textContent=progressRange.value+'%';progressModal.classList.remove('show');notify('공정률 변경 이력을 저장했습니다.')});

// Revision 5: 현장 카드, 최근 일보, 담당자, 화면 모드와 설정의 실제 동작
function parseMoneyInput(value){return Number(String(value||'').replace(/[^0-9]/g,''))||0}
['newSiteAmount','newSiteExtraAmount'].forEach(id=>document.getElementById(id).addEventListener('input',event=>{const value=parseMoneyInput(event.target.value);event.target.value=value?value.toLocaleString('ko-KR'):''}));

function attachHomeSiteCard(card){
  const open=()=>{const site=card.dataset.site;showView('sites');document.querySelectorAll('.site-table-row').forEach(row=>row.classList.toggle('focused-site',row.dataset.siteRow===site));const target=document.querySelector(`[data-site-row="${CSS.escape(site)}"]`);target?.scrollIntoView({behavior:'smooth',block:'center'});notify(site+' 현장 상세를 열었습니다.');};
  card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',card.dataset.site+' 현장 상세 열기');card.addEventListener('click',open);card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open()}});
}
document.querySelectorAll('.site-card').forEach(attachHomeSiteCard);

function updateSiteManagersFromReports(){
  const latest={};document.querySelectorAll('.report-card').forEach(card=>{if(!latest[card.dataset.site])latest[card.dataset.site]=card.dataset.author});
  document.querySelectorAll('.site-table-row').forEach(row=>{const manager=latest[row.dataset.siteRow];if(manager)row.querySelector('.site-manager').textContent=manager});
}
function updateRecentReportLinks(){
  document.querySelectorAll('.recent-report-link').forEach(link=>{const card=[...document.querySelectorAll('.report-card')].find(report=>report.dataset.site===link.dataset.reportSite);link.disabled=!card;if(card?.dataset.createdAt)link.textContent='방금 전'});
}
function attachRecentReportLink(link){link.addEventListener('click',()=>{const card=[...document.querySelectorAll('.report-card')].find(report=>report.dataset.site===link.dataset.reportSite);if(!card){notify('등록된 공사일보가 없습니다.');return}showView('daily');card.click();});}
document.querySelectorAll('.recent-report-link').forEach(attachRecentReportLink);updateSiteManagersFromReports();updateRecentReportLinks();

function applyProcessRowCount(){
  const rows=document.getElementById('processRows'),wanted=Number(userSettings.processRows)||5;
  while(rows.children.length<wanted)document.getElementById('addProcess').click();
  while(rows.children.length>wanted&&rows.children.length>1)rows.lastElementChild.remove();
}
function applyExtendedSettings(){
  const list=document.querySelector('.site-list'),selected=new Set(userSettings.selectedSites||[]),cards=[...list.children];
  cards.forEach((card,index)=>{if(card.dataset.originalOrder==null)card.dataset.originalOrder=String(index)});
  cards.sort((a,b)=>userSettings.mySitesFirst?Number(![...selected].some(s=>a.dataset.site.includes(s)))-Number(![...selected].some(s=>b.dataset.site.includes(s))):Number(a.dataset.originalOrder)-Number(b.dataset.originalOrder)).forEach(card=>list.appendChild(card));
  const count=Number(userSettings.siteCount)||4;[...list.querySelectorAll('.site-card')].forEach((card,index)=>{card.hidden=index>=count;card.classList.toggle('is-setting-hidden',index>=count)});
  document.body.classList.toggle('force-mobile',['galaxy','iphone'].includes(userSettings.displayMode));
  document.body.classList.toggle('force-galaxy',userSettings.displayMode==='galaxy');
  document.body.classList.toggle('force-fold',userSettings.displayMode==='fold');
  document.body.classList.toggle('force-iphone',userSettings.displayMode==='iphone');
  document.querySelectorAll('[data-display-mode]').forEach(button=>button.classList.toggle('active',button.dataset.displayMode===userSettings.displayMode));
  document.body.classList.toggle('notice-urgent-off',!userSettings.urgentNotice);document.body.classList.toggle('notice-approval-off',!userSettings.approvalNotice);document.body.classList.toggle('notice-money-off',!userSettings.moneyNotice);document.body.classList.toggle('notice-calendar-off',!userSettings.calendarNotice);
  const role=document.querySelector('.sidebar .user small');if(role)role.textContent=userSettings.role;
  const retentionMap={'3개월':'3','6개월':'6','1년':'12','계속':'forever'};const retention=document.getElementById('retentionPeriod');if(retention&&retentionMap[userSettings.retention]){retention.value=retentionMap[userSettings.retention];retention.dispatchEvent(new Event('change'))}
  if(document.getElementById('processRows'))applyProcessRowCount();
  document.querySelectorAll('.site-checks label').forEach(label=>{const checked=selected.has(label.textContent.trim());label.querySelector('input').checked=checked});
  document.body.dataset.photoQuality=userSettings.photoQuality;document.body.dataset.autosave=userSettings.autosave?'on':'off';document.body.dataset.wifiOnly=userSettings.wifiOnly?'on':'off';
  document.body.dataset.quietHours=`${userSettings.quietStart}-${userSettings.quietEnd}`;
}
document.querySelectorAll('[data-display-mode]').forEach(button=>button.addEventListener('click',()=>{userSettings.displayMode=button.dataset.displayMode;saveUserSettings()}));
document.querySelectorAll('.site-checks input').forEach(input=>input.addEventListener('change',()=>{userSettings.selectedSites=[...document.querySelectorAll('.site-checks input:checked')].map(item=>item.parentElement.textContent.trim());saveUserSettings()}));
document.querySelector('[data-select-setting="startView"]').addEventListener('change',event=>showView(event.target.value));

// 공사일보 자동 임시 저장
const draftKey='minWorksDailyDraftV2';
function saveDailyDraft(){if(!userSettings.autosave)return;const fields=[...document.querySelectorAll('#dailyForm input, #dailyForm select, #dailyForm textarea')];localStorage.setItem(draftKey,JSON.stringify(fields.map(field=>({name:field.name||field.placeholder||field.type,value:field.value}))));}
function restoreDailyDraft(){if(!userSettings?.autosave)return;try{const saved=JSON.parse(localStorage.getItem(draftKey)||'[]'),fields=[...document.querySelectorAll('#dailyForm input, #dailyForm select, #dailyForm textarea')];saved.forEach((item,index)=>{if(fields[index]&&item.value)fields[index].value=item.value});if(saved.length)notify('자동 저장된 공사일보 초안을 불러왔습니다.')}catch{localStorage.removeItem(draftKey)}}
document.getElementById('dailyForm').addEventListener('input',()=>{clearTimeout(window.minWorksDraftTimer);window.minWorksDraftTimer=setTimeout(saveDailyDraft,350)});

// 설정 내보내기를 실제 JSON 파일로 제공
document.getElementById('exportMySettings').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(userSettings,null,2)],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='min-works-settings.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);});

// 시작 화면 설정은 새로 열 때 적용
if(userSettings.startView&&userSettings.startView!=='dashboard')showView(userSettings.startView);
applyExtendedSettings();



/* SOURCE: revision-8.js */
(() => {
  'use strict';

  const CALENDAR_KEY = 'minWorksCompanyCalendarV1';
  const kstToday = getKstDate();
  let calendarMonth = new Date(kstToday.getFullYear(), kstToday.getMonth(), 1);
  let selectedDate = dateKey(kstToday);
  let calendarEvents = loadCalendarEvents();
  let activeCalendarFilter = 'all';

  enableBackNavigation();
  makeBrandHomeButton();
  connectBriefingCards();
  connectSiteStatusFilters();
  connectPhotoShortcut();
  connectFinanceMonthButtons();
  initializeInternalCalendar();
  initializePersonalGoogleCalendar();

  function enableBackNavigation() {
    const originalShowView = showView;
    let restoringHistory = false;
    const visibleView = () => document.querySelector('.view.active')?.id.replace(/View$/, '') || 'dashboard';
    const initialView = visibleView();
    history.replaceState({ minWorks: true, view: initialView }, '', location.href);

    window.showView = function(name) {
      originalShowView(name);
      if (!restoringHistory && history.state?.view !== name) {
        history.pushState({ minWorks: true, view: name }, '', `#${name}`);
      }
    };

    window.addEventListener('popstate', event => {
      closeTopLayer();
      const view = event.state?.minWorks ? event.state.view : 'dashboard';
      restoringHistory = true;
      originalShowView(view || 'dashboard');
      restoringHistory = false;
    });
  }

  function closeTopLayer() {
    document.querySelectorAll('.show').forEach(element => {
      if (element.classList.contains('view')) return;
      element.classList.remove('show');
    });
    document.querySelectorAll('.admin-security-modal').forEach(element => element.hidden = true);
  }

  function makeBrandHomeButton() {
    const brand = document.querySelector('.brand');
    if (!brand) return;
    brand.tabIndex = 0;
    brand.setAttribute('role', 'button');
    brand.setAttribute('aria-label', '홈으로 이동');
    brand.title = '홈으로 이동';
    const goHome = () => {
      showView('dashboard');
      document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === 'dashboard'));
    };
    brand.addEventListener('click', goHome);
    brand.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        goHome();
      }
    });
  }

  function connectBriefingCards() {
    document.querySelectorAll('.briefing-item').forEach(button => {
      button.addEventListener('click', () => {
        const site = button.querySelector('b')?.textContent.trim();
        showView('sites');
        document.querySelectorAll('.site-table-row').forEach(row => row.classList.toggle('focused-site', row.dataset.siteRow === site));
        document.querySelector(`[data-site-row="${cssEscape(site)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        notify(`${site} 현장으로 이동했습니다.`);
      });
    });
  }

  function connectSiteStatusFilters() {
    const buttons = [...document.querySelectorAll('.filter-row .filter')];
    const table = document.querySelector('.site-table');
    if (!buttons.length || !table) return;
    const keys = ['active','complete'];
    const sampleDates = [
      ['2026-07-01','2026-09-30'],
      ['2026-08-01','2026-09-15'],
      ['2026-08-15','2027-02-28'],
      ['2026-08-05','2026-10-31']
    ];
    document.querySelectorAll('.site-table-row').forEach((row,index) => {
      row.dataset.startDate ||= sampleDates[index]?.[0] || '';
      row.dataset.endDate ||= sampleDates[index]?.[1] || '';
    });
    buttons.forEach((button,index) => button.dataset.siteStatus = keys[index]);
    let empty = document.createElement('div');
    empty.className = 'site-filter-empty';
    empty.hidden = true;
    table.appendChild(empty);
    let activeKey = buttons.find(button => button.classList.contains('active'))?.dataset.siteStatus || 'active';
    const classify = row => {
      const today = dateKey(kstToday);
      if (row.dataset.endDate && row.dataset.endDate < today) return 'complete';
      return 'active';
    };
    const render = () => {
      const rows = [...document.querySelectorAll('.site-table-row')];
      const counts = { active:0, scheduled:0, complete:0 };
      rows.forEach(row => {
        row.dataset.projectStatus = classify(row);
        counts[row.dataset.projectStatus] += 1;
      });
      buttons.forEach(button => {
        const key = button.dataset.siteStatus;
        const label = key === 'active' ? '진행 중' : '완료';
        button.textContent = `${label} ${counts[key]}`;
        button.classList.toggle('active', key === activeKey);
      });
      let visible = 0;
      rows.forEach(row => {
        const show = row.dataset.projectStatus === activeKey;
        row.hidden = !show;
        if (show) visible += 1;
      });
      empty.hidden = visible > 0;
      empty.textContent = activeKey === 'complete' ? '준공일이 지난 현장이 없습니다.' : '진행 중인 현장이 없습니다.';
    };
    buttons.forEach(button => button.addEventListener('click', () => {
      activeKey = button.dataset.siteStatus;
      render();
    }));
    window.refreshProjectStatuses = render;
    render();
  }

  function connectPhotoShortcut() {
    const oldButton = document.getElementById('photoBtn');
    if (!oldButton) return;
    const button = oldButton.cloneNode(true);
    oldButton.replaceWith(button);
    button.addEventListener('click', () => {
      showView('daily');
      openDailyEditor();
      setTimeout(() => document.querySelector('.photo-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      notify('공사일보의 현장사진 등록 화면을 열었습니다.');
    });
  }

  function connectFinanceMonthButtons() {
    const period = document.querySelector('.finance-period');
    if (!period) return;
    const label = period.querySelector('b');
    const buttons = period.querySelectorAll('button');
    let shown = new Date(kstToday.getFullYear(), kstToday.getMonth(), 1);
    const render = () => label.textContent = `${shown.getFullYear()}년 ${shown.getMonth() + 1}월`;
    buttons[0]?.addEventListener('click', () => { shown = new Date(shown.getFullYear(), shown.getMonth() - 1, 1); render(); notify('선택한 달의 자금 내역을 표시했습니다.'); });
    buttons[1]?.addEventListener('click', () => { shown = new Date(shown.getFullYear(), shown.getMonth() + 1, 1); render(); notify('선택한 달의 자금 내역을 표시했습니다.'); });
    render();
  }

  function initializeInternalCalendar() {
    const view = document.getElementById('calendarView');
    if (!view) return;
    view.querySelector('.section-title .eyebrow').textContent = 'MIN WORKS CALENDAR';
    const account = view.querySelector('.google-account-bar');
    if (account) {
      account.classList.add('internal-calendar-bar');
      account.querySelector('.google-g').textContent = 'MIN';
      account.querySelector('b').textContent = 'MIN WORKS 회사 일정';
      account.querySelector('small').textContent = '회사 내부 일정 · 오늘 이후 자동 표시';
      account.querySelector('span').innerHTML = '<i></i>사용 중';
    }

    const month = view.querySelector('.mini-month');
    const header = month.querySelector('header');
    const originalButtons = header.querySelectorAll('button');
    originalButtons[0].id = 'calendarPrevMonth';
    originalButtons[1].id = 'calendarNextMonth';
    const todayButton = document.createElement('button');
    todayButton.id = 'calendarToday';
    todayButton.className = 'calendar-today-button';
    todayButton.textContent = '오늘';
    header.insertBefore(todayButton, originalButtons[1]);

    document.getElementById('calendarPrevMonth').addEventListener('click', () => changeCalendarMonth(-1));
    document.getElementById('calendarNextMonth').addEventListener('click', () => changeCalendarMonth(1));
    todayButton.addEventListener('click', () => {
      calendarMonth = new Date(kstToday.getFullYear(), kstToday.getMonth(), 1);
      selectedDate = dateKey(kstToday);
      renderCalendar();
    });

    const oldNewButton = document.getElementById('newCalendarEvent');
    const newButton = oldNewButton.cloneNode(true);
    oldNewButton.replaceWith(newButton);
    newButton.addEventListener('click', openCalendarForm);
    createCalendarForm();

    document.querySelectorAll('[data-calendar-filter]').forEach(button => {
      button.addEventListener('click', () => {
        activeCalendarFilter = button.dataset.calendarFilter;
        renderCalendarAgenda();
      });
    });
    renderCalendar();
  }

  function initializePersonalGoogleCalendar() {
    const calendarView = document.getElementById('calendarView');
    const companyBar = calendarView?.querySelector('.internal-calendar-bar');
    if (!calendarView || !companyBar) return;
    const storageKey = 'minWorksPersonalGoogleCalendarV1';
    let connected = localStorage.getItem(storageKey) === 'connected';
    const settingsGoogle = document.querySelector('[data-settings-panel="data"] .connection-card');
    const card = document.createElement('section');
    card.className = 'personal-calendar-card';
    companyBar.insertAdjacentElement('afterend', card);

    const modal = document.createElement('div');
    modal.className = 'google-consent-modal';
    modal.innerHTML = `<div class="google-consent-backdrop"></div><section><button class="google-consent-close" aria-label="닫기">×</button><header><span class="google-g">G</span><div><p class="eyebrow">OPTIONAL CONNECTION</p><h2>개인 Google 캘린더 연결</h2></div></header><div class="google-warning"><span class="material-symbols-rounded">privacy_tip</span><div><b>연결 전에 꼭 확인해주세요.</b><p>개인 캘린더 연결은 선택 사항이며 회사 공동 일정 사용에는 영향을 주지 않습니다.</p></div></div><ul><li><b>나에게만 표시</b><span>개인 일정은 본인 화면에서만 보이고 다른 직원에게 자동 공유되지 않습니다.</span></li><li><b>회사 공유는 별도 등록</b><span>직원들과 공유할 일정은 MIN WORKS 회사 일정에 따로 등록해야 합니다.</span></li><li><b>읽기 전용 연결</b><span>앱은 일정을 보여주기 위한 권한만 요청하며 Google 원본 일정을 수정하지 않습니다.</span></li><li><b>언제든 연결 해제</b><span>연결을 해제해도 Google 캘린더의 원본 일정은 삭제되지 않습니다.</span></li></ul><label class="google-consent-check"><input type="checkbox"><span>위 내용을 확인했고 개인 캘린더 연결에 동의합니다.</span></label><div class="google-consent-actions"><button class="google-consent-cancel">취소</button><button class="google-consent-confirm" disabled>동의하고 연결</button></div></section>`;
    document.body.appendChild(modal);

    const render = () => {
      card.classList.toggle('connected', connected);
      card.innerHTML = connected
        ? `<div class="google-calendar-icon">G</div><div><b>개인 Google 캘린더</b><small>내 화면에만 표시 · 회사 공동 일정과 분리</small></div><span class="google-connected"><i></i>연결됨</span><button class="google-disconnect">연결 해제</button>`
        : `<div class="google-calendar-icon">G</div><div><b>개인 Google 캘린더</b><small>원하는 직원만 선택적으로 연결할 수 있습니다.</small></div><em>선택 사항</em><button class="google-connect">주의사항 확인 후 연결</button>`;
      card.querySelector('.google-connect')?.addEventListener('click', () => modal.classList.add('show'));
      card.querySelector('.google-disconnect')?.addEventListener('click', () => {
        if (!confirm('개인 Google 캘린더 연결을 해제할까요?\nGoogle의 원본 일정은 삭제되지 않습니다.')) return;
        connected = false;
        localStorage.removeItem(storageKey);
        render();
        notify('개인 Google 캘린더 연결을 해제했습니다.');
      });
      if (settingsGoogle) {
        settingsGoogle.querySelector('b').textContent = '개인 Google 캘린더';
        settingsGoogle.querySelector('small').textContent = connected ? '내 계정에만 연결됨 · 회사 일정과 분리' : '선택 사항 · 일정 탭에서 연결';
        settingsGoogle.querySelector('em').textContent = connected ? '연결됨' : '미연결';
        settingsGoogle.querySelector('em').classList.toggle('waiting', !connected);
      }
    };
    const close = () => {
      modal.classList.remove('show');
      modal.querySelector('input').checked = false;
      modal.querySelector('.google-consent-confirm').disabled = true;
    };
    modal.querySelector('.google-consent-close').addEventListener('click', close);
    modal.querySelector('.google-consent-cancel').addEventListener('click', close);
    modal.querySelector('.google-consent-backdrop').addEventListener('click', close);
    modal.querySelector('input').addEventListener('change', event => modal.querySelector('.google-consent-confirm').disabled = !event.target.checked);
    modal.querySelector('.google-consent-confirm').addEventListener('click', () => {
      connected = true;
      localStorage.setItem(storageKey, 'connected');
      close();
      render();
      notify('개인 Google 캘린더 연결을 저장했습니다.');
    });
    render();
  }

  function changeCalendarMonth(amount) {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + amount, 1);
    selectedDate = '';
    renderCalendar();
  }

  function renderCalendar() {
    const title = document.querySelector('.mini-month header h3');
    const grid = document.querySelector('.mini-month .month-grid');
    if (!title || !grid) return;
    title.textContent = `${calendarMonth.getFullYear()}년 ${calendarMonth.getMonth() + 1}월`;
    grid.replaceChildren();
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let index = 0; index < firstDay; index++) grid.appendChild(document.createElement('i'));
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const key = dateKey(date);
      const events = calendarEvents.filter(event => event.date === key);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'calendar-day';
      cell.textContent = day;
      cell.dataset.date = key;
      if (key === dateKey(kstToday)) cell.classList.add('today');
      if (key === selectedDate) cell.classList.add('selected');
      if (events.some(event => event.type === 'business')) cell.classList.add('has-business');
      if (events.some(event => event.type === 'attendance')) cell.classList.add('has-attendance');
      if (events.some(event => event.type === 'business') && events.some(event => event.type === 'attendance')) cell.classList.add('has-both');
      cell.addEventListener('click', () => {
        selectedDate = key;
        document.querySelectorAll('.calendar-day').forEach(item => item.classList.toggle('selected', item.dataset.date === key));
        renderCalendarAgenda();
      });
      grid.appendChild(cell);
    }
    renderCalendarAgenda();
  }

  function renderCalendarAgenda() {
    const panel = document.querySelector('.calendar-agenda');
    if (!panel) return;
    panel.querySelectorAll('.agenda-date,.calendar-empty').forEach(item => item.remove());
    const todayKey = dateKey(kstToday);
    let events = calendarEvents.filter(event => event.date >= todayKey);
    if (selectedDate) events = events.filter(event => event.date === selectedDate || !isCurrentCalendarMonthSelected());
    if (activeCalendarFilter !== 'all') events = events.filter(event => event.type === activeCalendarFilter);
    events.sort((a, b) => `${a.date} ${a.time || '00:00'}`.localeCompare(`${b.date} ${b.time || '00:00'}`));
    if (!events.length) {
      const empty = document.createElement('div');
      empty.className = 'calendar-empty';
      empty.innerHTML = `<span class="material-symbols-rounded">event_available</span><b>${selectedDate ? formatDateHeading(selectedDate) : '다가오는 일정'}이 없습니다.</b><small>‘일정 등록’을 눌러 회사 일정을 추가할 수 있습니다.</small>`;
      panel.appendChild(empty);
      renderHomeCalendar();
      return;
    }
    const grouped = Map.groupBy ? Map.groupBy(events, event => event.date) : groupEvents(events);
    for (const [date, items] of grouped) {
      const group = document.createElement('div');
      group.className = 'agenda-date';
      const heading = document.createElement('h4');
      heading.textContent = formatDateHeading(date);
      group.appendChild(heading);
      items.forEach(event => group.appendChild(createAgendaEvent(event)));
      panel.appendChild(group);
    }
    renderHomeCalendar();
  }

  function createAgendaEvent(event) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `agenda-event ${event.type}`;
    item.dataset.source = event.type;
    item.innerHTML = `<i></i><time>${escapeHtml(event.time || '종일')}</time><div><b>${escapeHtml(event.title)}</b><small>${event.type === 'attendance' ? '근태 관리' : '회사 주요 일정'}${event.memo ? ' · ' + escapeHtml(event.memo) : ''}</small></div><span class="material-symbols-rounded">chevron_right</span>`;
    item.addEventListener('click', () => openCalendarForm(event));
    return item;
  }

  function createCalendarForm() {
    const modal = document.createElement('div');
    modal.id = 'calendarEventModal';
    modal.className = 'calendar-event-modal';
    modal.innerHTML = `<div class="calendar-event-backdrop"></div><section><header><div><p class="eyebrow">COMPANY SCHEDULE</p><h2 id="calendarFormTitle">회사 일정 등록</h2></div><button type="button" id="closeCalendarForm">×</button></header><form id="calendarEventForm"><input type="hidden" name="id"><label>일정명<input name="title" required maxlength="60" placeholder="예: 현장 준공, 직원 연차"></label><div class="calendar-form-grid"><label>날짜<input name="date" type="date" required></label><label>시간<input name="time" type="time"></label><label>구분<select name="type"><option value="business">회사 주요 일정</option><option value="attendance">근태 관리</option></select></label></div><label>메모<input name="memo" maxlength="100" placeholder="필요한 내용을 간단히 입력"></label><div class="calendar-form-actions"><button type="button" class="calendar-delete" id="deleteCalendarEvent" hidden>삭제</button><button type="submit" class="primary">저장</button></div></form></section>`;
    document.body.appendChild(modal);
    modal.querySelector('.calendar-event-backdrop').addEventListener('click', closeCalendarForm);
    document.getElementById('closeCalendarForm').addEventListener('click', closeCalendarForm);
    document.getElementById('calendarEventForm').addEventListener('submit', saveCalendarEvent);
    document.getElementById('deleteCalendarEvent').addEventListener('click', deleteCalendarEvent);
  }

  function openCalendarForm(existing) {
    const form = document.getElementById('calendarEventForm');
    form.reset();
    form.elements.id.value = existing?.id || '';
    form.elements.title.value = existing?.title || '';
    form.elements.date.value = existing?.date || selectedDate || dateKey(kstToday);
    form.elements.time.value = existing?.time || '';
    form.elements.type.value = existing?.type || 'business';
    form.elements.memo.value = existing?.memo || '';
    document.getElementById('calendarFormTitle').textContent = existing?.id ? '회사 일정 수정' : '회사 일정 등록';
    document.getElementById('deleteCalendarEvent').hidden = !existing?.id;
    document.getElementById('calendarEventModal').classList.add('show');
    setTimeout(() => form.elements.title.focus(), 50);
  }

  function closeCalendarForm() {
    document.getElementById('calendarEventModal').classList.remove('show');
  }

  function saveCalendarEvent(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const record = { id: data.id || crypto.randomUUID(), title: data.title.trim(), date: data.date, time: data.time, type: data.type, memo: data.memo.trim() };
    if (!record.title || !record.date) return;
    const index = calendarEvents.findIndex(item => item.id === record.id);
    if (index >= 0) calendarEvents[index] = record; else calendarEvents.push(record);
    persistCalendarEvents();
    calendarMonth = new Date(`${record.date}T00:00:00`);
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    selectedDate = record.date;
    closeCalendarForm();
    renderCalendar();
    notify(index >= 0 ? '회사 일정을 수정했습니다.' : '회사 일정을 등록했습니다.');
  }

  function deleteCalendarEvent() {
    const id = document.getElementById('calendarEventForm').elements.id.value;
    if (!id || !confirm('이 일정을 삭제할까요?')) return;
    calendarEvents = calendarEvents.filter(event => event.id !== id);
    persistCalendarEvents();
    closeCalendarForm();
    renderCalendar();
    notify('회사 일정을 삭제했습니다.');
  }

  function renderHomeCalendar() {
    const list = document.querySelector('.home-event-list');
    if (!list) return;
    const todayKey = dateKey(kstToday);
    const events = calendarEvents.filter(event => event.date >= todayKey).sort((a,b) => a.date.localeCompare(b.date)).slice(0,3);
    list.replaceChildren();
    if (!events.length) {
      const empty = document.createElement('button');
      empty.className = 'home-calendar-empty';
      empty.innerHTML = '<span class="material-symbols-rounded">event_available</span><b>다가오는 회사 일정이 없습니다.</b><small>일정 탭에서 새 일정을 등록하세요.</small>';
      empty.addEventListener('click', () => showView('calendar'));
      list.appendChild(empty);
      return;
    }
    events.forEach(event => {
      const date = new Date(`${event.date}T00:00:00`);
      const item = document.createElement('button');
      item.className = 'home-event';
      item.innerHTML = `<time><b>${date.getDate()}</b><small>${date.getMonth()+1}월</small></time><div><span class="event-type ${event.type === 'attendance' ? 'leave' : 'site'}">${event.type === 'attendance' ? '근태' : '회사'}</span><b>${escapeHtml(event.title)}</b></div><em>${relativeDay(event.date)}</em>`;
      item.addEventListener('click', () => { selectedDate = event.date; calendarMonth = new Date(date.getFullYear(), date.getMonth(), 1); showView('calendar'); renderCalendar(); });
      list.appendChild(item);
    });
  }

  function loadCalendarEvents() {
    try {
      const saved = JSON.parse(localStorage.getItem(CALENDAR_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(event => event.id && event.title && event.date) : [];
    } catch (_) {
      return [];
    }
  }

  function persistCalendarEvents() {
    localStorage.setItem(CALENDAR_KEY, JSON.stringify(calendarEvents));
  }

  function getKstDate() {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return new Date(Number(values.year), Number(values.month) - 1, Number(values.day));
  }

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function formatDateHeading(key) {
    const date = new Date(`${key}T00:00:00`);
    return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(date);
  }

  function relativeDay(key) {
    const date = new Date(`${key}T00:00:00`);
    const diff = Math.round((date - kstToday) / 86400000);
    return diff === 0 ? '오늘' : diff === 1 ? '내일' : `D-${diff}`;
  }

  function groupEvents(events) {
    const groups = new Map();
    events.forEach(event => {
      if (!groups.has(event.date)) groups.set(event.date, []);
      groups.get(event.date).push(event);
    });
    return groups;
  }

  function isCurrentCalendarMonthSelected() {
    if (!selectedDate) return false;
    const date = new Date(`${selectedDate}T00:00:00`);
    return date.getFullYear() === calendarMonth.getFullYear() && date.getMonth() === calendarMonth.getMonth();
  }

  function cssEscape(value) {
    return window.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, '\\$&');
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]);
  }
})();

/* Storage manager and site archive export */
(() => {
  'use strict';
  const TRASH_KEY='minworks_storage_trash_v1',RETENTION_KEY='minworks_storage_retention_v1',EXPORTED_KEY='minworks_exported_sites_v1';
  const encoder=new TextEncoder();
  const cards=()=>[...document.querySelectorAll('.report-card')];
  const cardPhotos=card=>Array.isArray(card.reportPhotos)?card.reportPhotos:[];
  const safe=value=>String(value||'MIN_WORKS').replace(/[\\/:*?"<>|]/g,'_').trim();
  const bytes=value=>encoder.encode(String(value||'')).length;
  function formatBytes(value){const size=Math.max(0,Number(value)||0);if(size<1024)return `${size} B`;if(size<1048576)return `${(size/1024).toFixed(1)} KB`;if(size<1073741824)return `${(size/1048576).toFixed(1)} MB`;return `${(size/1073741824).toFixed(1)} GB`}
  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}}
  function siteStats(){const map=new Map();cards().forEach(card=>{const site=card.dataset.site||'현장 미지정',current=map.get(site)||{site,reports:0,photos:0,photoBytes:0,documentBytes:0};current.reports+=1;current.documentBytes+=bytes(card.textContent)+bytes(JSON.stringify(card.reportProcesses||[]));cardPhotos(card).forEach(photo=>{current.photos+=1;current.photoBytes+=Number(photo.size)||0});map.set(site,current)});return [...map.values()]}
  function localDataBytes(){let total=0;for(let index=0;index<localStorage.length;index+=1){const key=localStorage.key(index);total+=bytes(key)+bytes(localStorage.getItem(key))}return total}
  async function cloudStats(){const token=localStorage.getItem('minWorksSessionV1');if(!token)return null;try{const response=await fetch('https://min-works-api.forjaejun.workers.dev/storage-stats',{headers:{Authorization:`Bearer ${token}`}});return response.ok?response.json():null}catch{return null}}
  async function refreshStorage(){
    const stats=siteStats(),photoBytes=stats.reduce((sum,item)=>sum+item.photoBytes,0),documentBytes=localDataBytes()+stats.reduce((sum,item)=>sum+item.documentBytes,0);
    const cloud=await cloudStats();const shownPhotoBytes=Number(cloud?.photoBytes)||photoBytes,shownDocumentBytes=Number(cloud?.documentBytes)||documentBytes;
    const usage=Number(cloud?.totalBytes)||(shownPhotoBytes+shownDocumentBytes),quota=Number(cloud?.quotaBytes)||0,other=Math.max(0,usage-shownPhotoBytes-shownDocumentBytes),percent=quota?Math.min(100,usage/quota*100):0;
    const set=(id,value)=>{const element=document.getElementById(id);if(element)element.textContent=value};
    set('storageMiniValue',quota?`${formatBytes(usage)} / ${formatBytes(quota)}`:formatBytes(usage));set('storageMiniBreakdown',`사진 ${formatBytes(shownPhotoBytes)} · 문서 ${formatBytes(shownDocumentBytes)}`);
    set('storageUsed',formatBytes(usage));set('storageQuota',cloud?`회사 클라우드 ${formatBytes(quota)} 중 사용`:'연결 전 임시 사용량');set('storagePercent',`${percent.toFixed(percent<1?2:0)}%`);set('storagePhotos',formatBytes(shownPhotoBytes));set('storageDocuments',formatBytes(shownDocumentBytes));set('storageOther',formatBytes(other));
    ['storageMiniBar','storageMainBar'].forEach(id=>{const bar=document.getElementById(id);if(bar)bar.style.width=`${Math.max(percent,usage?1:0)}%`});
    renderSites(stats);renderTrash();
  }
  function renderSites(stats){
    const list=document.getElementById('storageSiteList');if(!list)return;
    if(!stats.length){list.innerHTML='<p class="storage-empty">내보낼 현장 자료가 없습니다.</p>';return}
    list.innerHTML=stats.map(item=>`<article class="storage-site-row" data-storage-site="${escapeHtml(item.site)}"><div><b>${escapeHtml(item.site)}</b><small>공사일보 ${item.reports}개 · 사진 ${item.photos}장 · 확인된 원본 ${formatBytes(item.photoBytes)}</small></div><strong>${formatBytes(item.photoBytes+item.documentBytes)}</strong><div><button data-site-zip><span class="material-symbols-rounded">folder_zip</span>ZIP</button><button data-site-pdf><span class="material-symbols-rounded">picture_as_pdf</span>PDF</button><button class="danger" data-site-clean><span class="material-symbols-rounded">delete</span>정리</button></div></article>`).join('');
    list.querySelectorAll('[data-site-zip]').forEach(button=>button.addEventListener('click',()=>exportSiteZip(button.closest('[data-storage-site]').dataset.storageSite)));
    list.querySelectorAll('[data-site-pdf]').forEach(button=>button.addEventListener('click',()=>openSitePdf(button.closest('[data-storage-site]').dataset.storageSite)));
    list.querySelectorAll('[data-site-clean]').forEach(button=>button.addEventListener('click',()=>requestSiteCleanup(button.closest('[data-storage-site]').dataset.storageSite)));
  }
  function reportText(card){const processes=Array.isArray(card.reportProcesses)?card.reportProcesses:[];return [`MIN WORKS 공사일보`,`현장: ${card.dataset.site||''}`,`작성일: ${card.dataset.reportDate||''}`,`작성자: ${card.querySelector('.report-author b')?.textContent||''}`,`요약: ${card.querySelector('div>p')?.textContent||''}`,...processes.map(item=>`${item.name}: 금일 ${item.today||0}명 / 누계 ${item.cumulative||0}명`)].join('\r\n')}
  async function exportSiteZip(site){
    const selected=cards().filter(card=>card.dataset.site===site);if(!selected.length)return notify('내보낼 자료가 없습니다.');notify('현장 ZIP 파일을 만들고 있습니다.');
    const entries=[];for(let index=0;index<selected.length;index+=1){const card=selected[index],base=`${safe(site)}/${safe(card.dataset.reportDate||`일보_${index+1}`)}`;entries.push({name:`${base}/공사일보.txt`,data:encoder.encode(reportText(card))});for(let photoIndex=0;photoIndex<cardPhotos(card).length;photoIndex+=1){const photo=cardPhotos(card)[photoIndex];try{const blob=await fetch(photo.src).then(response=>response.blob()),extension=(blob.type.split('/')[1]||'jpg').replace('jpeg','jpg');entries.push({name:`${base}/사진_${photoIndex+1}.${extension}`,data:new Uint8Array(await blob.arrayBuffer())})}catch{}}}
    const blob=new Blob([makeZip(entries)],{type:'application/zip'}),anchor=document.createElement('a');anchor.href=URL.createObjectURL(blob);anchor.download=`${safe(site)}_MIN_WORKS_현장자료.zip`;anchor.click();setTimeout(()=>URL.revokeObjectURL(anchor.href),3000);markExported(site,'ZIP');notify(`${site} 현장 ZIP을 저장했습니다.`);document.dispatchEvent(new CustomEvent('minworks:exported',{detail:{site,type:'ZIP'}}));
  }
  function makeZip(entries){const local=[],central=[];let offset=0;const now=new Date(),time=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1),date=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();entries.forEach(entry=>{const name=encoder.encode(entry.name),data=entry.data instanceof Uint8Array?entry.data:new Uint8Array(entry.data),crc=crc32(data),header=concat(le32(0x04034b50),le16(20),le16(0),le16(0),le16(time),le16(date),le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),name);local.push(header,data);const center=concat(le32(0x02014b50),le16(20),le16(20),le16(0),le16(0),le16(time),le16(date),le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),le16(0),le16(0),le16(0),le32(0),le32(offset),name);central.push(center);offset+=header.length+data.length});const centralData=concat(...central),localData=concat(...local),end=concat(le32(0x06054b50),le16(0),le16(0),le16(entries.length),le16(entries.length),le32(centralData.length),le32(localData.length),le16(0));return concat(localData,centralData,end)}
  const crcTable=(()=>{const table=new Uint32Array(256);for(let n=0;n<256;n+=1){let value=n;for(let k=0;k<8;k+=1)value=(value&1)?0xedb88320^(value>>>1):value>>>1;table[n]=value>>>0}return table})();
  function crc32(data){let crc=0xffffffff;for(const value of data)crc=crcTable[(crc^value)&255]^(crc>>>8);return (crc^0xffffffff)>>>0}
  function le16(value){return new Uint8Array([value&255,(value>>>8)&255])}function le32(value){return new Uint8Array([value&255,(value>>>8)&255,(value>>>16)&255,(value>>>24)&255])}function concat(...arrays){const length=arrays.reduce((sum,array)=>sum+array.length,0),result=new Uint8Array(length);let offset=0;arrays.forEach(array=>{result.set(array,offset);offset+=array.length});return result}
  function openSitePdf(site){const button=document.querySelector('.all-reports-pdf');if(!button)return notify('PDF 내보내기 기능을 찾지 못했습니다.');button.click();setTimeout(()=>{const select=document.querySelector('.report-download-modal .report-site-select select');if(select&&[...select.options].some(option=>option.value===site)){select.value=site;select.dispatchEvent(new Event('change'))}},0)}
  function markExported(site,type){const exported=read(EXPORTED_KEY,{});exported[site]={type,at:new Date().toISOString()};localStorage.setItem(EXPORTED_KEY,JSON.stringify(exported))}
  function requestSiteCleanup(site){const exported=read(EXPORTED_KEY,{});if(!exported[site]){notify('안전을 위해 ZIP 또는 PDF로 먼저 내보내주세요.');return}if(!confirm(`${site} 자료를 휴지통으로 이동할까요? 7일 동안 복구할 수 있습니다.`))return;moveSiteToTrash(site)}
  function moveSiteToTrash(site){const trash=read(TRASH_KEY,[]),selected=cards().filter(card=>card.dataset.site===site);selected.forEach(card=>{trash.push({site,html:card.outerHTML,photos:cardPhotos(card),processes:card.reportProcesses||[],deletedAt:Date.now()});card.remove()});localStorage.setItem(TRASH_KEY,JSON.stringify(trash));document.querySelectorAll('.date-group').forEach(group=>{if(!group.querySelector('.report-card'))group.remove()});window.refreshMinWorksSummary?.();refreshStorage();notify(`${site} 자료를 휴지통으로 이동했습니다.`)}
  function renderTrash(){purgeExpiredTrash();const trash=read(TRASH_KEY,[]),count=document.getElementById('storageTrashCount');if(count)count.textContent=`${trash.length}개 자료 · 7일 후 영구 삭제`}
  function purgeExpiredTrash(){const limit=Date.now()-7*86400000,trash=read(TRASH_KEY,[]),kept=trash.filter(item=>Number(item.deletedAt)>limit);if(kept.length!==trash.length)localStorage.setItem(TRASH_KEY,JSON.stringify(kept))}
  function restoreTrash(){const trash=read(TRASH_KEY,[]),target=document.getElementById('todayReports');if(!trash.length)return notify('복구할 자료가 없습니다.');trash.forEach(item=>{const wrap=document.createElement('div');wrap.innerHTML=item.html;const card=wrap.firstElementChild;if(!card)return;card.reportPhotos=item.photos||[];card.reportProcesses=item.processes||[];target.prepend(card);window.attachReportCard?.(card)});localStorage.setItem(TRASH_KEY,'[]');refreshStorage();window.refreshMinWorksSummary?.();notify('휴지통 자료를 모두 복구했습니다.')}
  function emptyTrash(){const trash=read(TRASH_KEY,[]);if(!trash.length)return notify('휴지통이 비어 있습니다.');if(!confirm(`${trash.length}개 자료를 영구 삭제할까요? 복구할 수 없습니다.`))return;localStorage.setItem(TRASH_KEY,'[]');refreshStorage();notify('휴지통을 비웠습니다.')}
  function offerRetention(site,type){if(!site)return;markExported(site,type);setTimeout(()=>{if(confirm(`${site} 내보내기가 완료되었습니다. 앱 자료를 30일간 더 보관할까요?`)){const retention=read(RETENTION_KEY,{});retention[site]={until:Date.now()+30*86400000,type};localStorage.setItem(RETENTION_KEY,JSON.stringify(retention));notify('30일 보관으로 설정했습니다.')}else if(confirm('지금 휴지통으로 이동할까요? 7일 동안 복구할 수 있습니다.'))moveSiteToTrash(site)},1200)}
  function escapeHtml(value){return String(value||'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
  document.getElementById('storageRefresh')?.addEventListener('click',refreshStorage);document.getElementById('restoreStorageTrash')?.addEventListener('click',restoreTrash);document.getElementById('emptyStorageTrash')?.addEventListener('click',emptyTrash);
  document.querySelectorAll('[data-view="storage"]').forEach(button=>button.addEventListener('click',()=>setTimeout(refreshStorage,0)));
  document.addEventListener('minworks:exported',event=>offerRetention(event.detail?.site,event.detail?.type));
  new MutationObserver(()=>refreshStorage()).observe(document.getElementById('dailyListScreen'),{childList:true,subtree:true});
  window.refreshMinWorksStorage=refreshStorage;
  refreshStorage();
})();

/* v28 unified workflow and dashboard enhancements */
(() => {
  'use strict';
  const financeAllowed=user=>user?.role==='admin'||['임원','공무팀','관리팀','시공팀'].includes(user?.department);
  window.applyMinWorksAccess=user=>{
    document.querySelectorAll('[data-view="finance"],[data-go="finance"],[data-menu-view="finance"],[data-bottom-view="finance"]').forEach(node=>node.hidden=!financeAllowed(user));
    const canWritePayment=user?.role==='admin'||user?.department==='시공팀';const canWriteReceivable=user?.role==='admin'||['공무팀','관리팀'].includes(user?.department);
    if(document.getElementById('mwOpenPayment'))document.getElementById('mwOpenPayment').hidden=!canWritePayment;
    if(document.getElementById('mwOpenReceivable'))document.getElementById('mwOpenReceivable').hidden=!canWriteReceivable;
    document.body.classList.toggle('finance-restricted',!financeAllowed(user));
    if(!financeAllowed(user)&&document.getElementById('financeView')?.classList.contains('active'))window.showView?.('dashboard');
    const eyebrow=document.querySelector('.greeting-wrap .eyebrow');if(eyebrow)eyebrow.textContent='MIN WORKS';
    const profile=user?.role==='admin'?'관리자':`${user?.department||''} ${user?.name||''} ${user?.rank||''}`.trim();
    const live=document.querySelector('.live-user-welcome');if(live)live.textContent=`${profile} 님, MIN WORKS에 오신 것을 환영합니다.`;
  };

  document.querySelector('.greeting-wrap .eyebrow')?.replaceChildren(document.createTextNode('MIN WORKS'));
  const financeNav=document.querySelector('.nav-item[data-view="finance"]');if(financeNav)financeNav.lastChild.textContent=' 자금 집행';
  document.querySelectorAll('[data-go="finance"] b').forEach(node=>node.textContent='자금 집행');
  document.querySelectorAll('[data-menu-view="finance"] b').forEach(node=>node.textContent='자금 집행');
  document.querySelectorAll('option[value="finance"]').forEach(node=>node.textContent='자금 집행');
  const mobileFinance=document.querySelector('.mobile-nav [data-view="finance"]');if(mobileFinance)mobileFinance.lastChild.textContent='자금집행';
  const dailyBottom=document.querySelector('.mobile-nav .fab[data-view="daily"]');if(dailyBottom){dailyBottom.classList.remove('fab');dailyBottom.classList.add('daily-highlight');dailyBottom.append(document.createTextNode('공사일보'))}

  const reportEdit=document.createElement('button');reportEdit.type='button';reportEdit.className='record-edit-button';reportEdit.innerHTML='<span class="material-symbols-rounded">edit</span>일보 수정';document.querySelector('#reportViewer .viewer-actions')?.prepend(reportEdit);
  reportEdit.addEventListener('click',()=>{const card=activeReportCard,user=window.MIN_WORKS_USER;if(!card)return;if(user?.role!=='admin'&&card.dataset.author!==currentUser)return notify('관리자 또는 작성자만 수정할 수 있습니다.');const title=prompt('공사일보 제목을 수정하세요.',card.querySelector('div>b')?.textContent||'');if(!title)return;card.querySelector('div>b').textContent=title;document.querySelector('#reportViewer header h2').textContent=title;reportViewer.classList.remove('show');notify('공사일보를 수정했습니다.')});
  const issueEdit=document.createElement('button');issueEdit.type='button';issueEdit.className='record-edit-button';issueEdit.innerHTML='<span class="material-symbols-rounded">edit</span>이슈 수정';document.querySelector('.issue-status-row>div')?.prepend(issueEdit);
  issueEdit.addEventListener('click',()=>{const card=activeIssueCard,user=window.MIN_WORKS_USER;if(!card)return;const owner=card.querySelector('.issue-meta span')?.textContent||'';if(user?.role!=='admin'&&!owner.includes(currentUser))return notify('관리자 또는 담당자만 수정할 수 있습니다.');const title=prompt('이슈 제목을 수정하세요.',card.querySelector('h3')?.textContent||'');if(!title)return;const description=prompt('상세 내용을 수정하세요.',card.querySelector('p')?.textContent||'');if(description===null)return;card.querySelector('h3').textContent=title;card.querySelector('p').textContent=description;document.getElementById('peekTitle').textContent=title;document.getElementById('peekDescription').textContent=description;notify('현장 이슈를 수정했습니다.');refreshHomeExtras()});

  const photos=document.createElement('section');photos.className='panel today-photo-panel';photos.innerHTML='<div class="panel-head"><div><p class="eyebrow">TODAY SITE PHOTOS</p><h2>오늘 현장 사진</h2></div><button class="text-btn" data-photo-all>전체보기 →</button></div><div class="today-photo-strip"></div>';
  document.querySelector('.quick-panel')?.before(photos);
  photos.querySelector('[data-photo-all]').addEventListener('click',()=>window.showView?.('daily'));

  const issueHost=document.createElement('section');issueHost.className='home-issue-briefing';issueHost.innerHTML='<header><div><p class="eyebrow">SITE ISSUES</p><h2>현장 이슈사항</h2></div><span class="count-badge">0</span></header><div class="home-issue-list"></div><button class="text-btn" data-issue-all>전체보기 →</button>';
  document.querySelector('.briefing-list')?.after(issueHost);
  issueHost.querySelector('[data-issue-all]').addEventListener('click',()=>window.showView?.('issues'));

  function refreshHomeExtras(){
    const strip=photos.querySelector('.today-photo-strip');strip.replaceChildren();
    const reportCards=[...document.querySelectorAll('.report-card')];
    const photoItems=reportCards.flatMap(card=>(Array.isArray(card.reportPhotos)?card.reportPhotos:[]).map(photo=>({card,photo}))).slice(0,8);
    if(!photoItems.length)strip.innerHTML='<div class="home-extra-empty"><span class="material-symbols-rounded">photo_camera</span><b>오늘 등록된 현장 사진이 없습니다.</b><small>공사일보에 사진을 올리면 여기에 표시됩니다.</small></div>';
    photoItems.forEach(({card,photo})=>{const button=document.createElement('button');button.innerHTML=`<img src="${photo.src}" alt=""><span><b>${card.dataset.site}</b><small>${photo.type||'현장사진'} · ${card.dataset.author||'작성자'}</small></span>`;button.addEventListener('click',()=>card.click());strip.appendChild(button)});
    const list=issueHost.querySelector('.home-issue-list'),issues=[...document.querySelectorAll('.issue-detail-card')].filter(card=>card.dataset.status!=='complete');list.replaceChildren();issueHost.querySelector('.count-badge').textContent=issues.length;
    if(!issues.length)list.innerHTML='<div class="home-extra-empty"><b>현재 진행 중인 이슈가 없습니다.</b></div>';
    issues.slice(0,5).forEach(card=>{const button=document.createElement('button');const urgent=card.dataset.urgency==='urgent';button.innerHTML=`<i class="${urgent?'urgent':''}"></i><span><b>${card.dataset.issueCard}</b><small>${card.querySelector('h3')?.textContent||'현장 이슈'} · ${card.querySelector('.issue-meta span')?.textContent||''}</small></span><em>${urgent?'긴급':'일반'}</em>`;button.addEventListener('click',()=>card.click());list.appendChild(button)});
  }

  const SITE_KEY='minWorksSiteStateV28';
  function siteState(){try{return JSON.parse(localStorage.getItem(SITE_KEY)||'{"deleted":[],"updated":{}}')}catch{return {deleted:[],updated:{}}}}
  function saveSiteState(state){localStorage.setItem(SITE_KEY,JSON.stringify(state))}
  function ensureSiteIdentity(row){if(row.dataset.siteId)return row.dataset.siteId;const sameRows=[...document.querySelectorAll('.site-table-row')].filter(item=>item.dataset.siteRow===row.dataset.siteRow),occurrence=Math.max(0,sameRows.indexOf(row)),hash=Array.from(row.dataset.siteRow||'site').reduce((value,letter)=>((value*31)+letter.codePointAt(0))>>>0,7),id=`legacy-${hash.toString(36)}-${occurrence+1}`,matching=[...document.querySelectorAll('.site-card')].filter(card=>card.dataset.site===row.dataset.siteRow&&!card.dataset.siteId)[occurrence]||[...document.querySelectorAll('.site-card')].find(card=>card.dataset.site===row.dataset.siteRow&&!card.dataset.siteId);row.dataset.siteId=id;if(matching)matching.dataset.siteId=id;return id}
  function enhanceSiteRows(){document.querySelectorAll('.site-table-row').forEach(row=>{ensureSiteIdentity(row);if(row.querySelector('.site-record-actions'))return;const actions=document.createElement('div');actions.className='site-record-actions';actions.innerHTML='<button data-site-edit>수정</button><button class="danger" data-site-delete>삭제</button>';row.appendChild(actions);actions.querySelector('[data-site-edit]').addEventListener('click',()=>editSite(row));actions.querySelector('[data-site-delete]').addEventListener('click',()=>deleteSite(row))})}
  function editSite(row){const old=row.dataset.siteRow,name=prompt('현장명을 수정하세요.',old);if(!name)return;const start=prompt('착공일을 입력하세요. (YYYY-MM-DD)',row.dataset.startDate||'');if(start===null)return;const end=prompt('준공일을 입력하세요. (YYYY-MM-DD)',row.dataset.endDate||'');if(end===null)return;if(start&&end&&end<start)return notify('준공일은 착공일보다 빠를 수 없습니다.');document.querySelectorAll(`[data-site="${CSS.escape(old)}"]`).forEach(node=>node.dataset.site=name);document.querySelectorAll(`[data-issue-card="${CSS.escape(old)}"]`).forEach(node=>node.dataset.issueCard=name);document.querySelectorAll(`[data-report-site="${CSS.escape(old)}"]`).forEach(node=>node.dataset.reportSite=name);row.dataset.siteRow=name;row.dataset.startDate=start;row.dataset.endDate=end;row.querySelector('span:first-child b').textContent=name;document.querySelectorAll('select option').forEach(option=>{if(option.textContent===old||option.textContent===`${old} 학생식당`)option.textContent=name});const state=siteState();state.updated[old]={name,start,end};saveSiteState(state);notify('현장 정보를 수정했습니다.');refreshHomeExtras()}
  function deleteSite(row){const site=row.dataset.siteRow,siteId=ensureSiteIdentity(row),otherRows=[...document.querySelectorAll('.site-table-row')].filter(item=>item!==row&&item.dataset.siteRow===site),removeLinked=otherRows.length===0,linked=removeLinked?document.querySelectorAll(`.report-card[data-site="${CSS.escape(site)}"],[data-issue-card="${CSS.escape(site)}"]`).length:0;const message=removeLinked?`${site}\n\n이 현장과 연결된 일보·이슈 ${linked}건도 함께 삭제할까요?`:`${site}\n\n선택한 중복 현장 1건만 삭제할까요?`;if(!confirm(message))return;row.remove();document.querySelector(`.site-card[data-site-id="${CSS.escape(siteId)}"]`)?.remove();if(removeLinked){document.querySelectorAll(`.report-card[data-site="${CSS.escape(site)}"],[data-issue-card="${CSS.escape(site)}"]`).forEach(node=>node.remove());document.querySelectorAll('select option').forEach(option=>{if(option.textContent===site)option.remove()})}const state=siteState();if(!state.deleted.some(item=>(typeof item==='string'?item:item.id)===siteId))state.deleted.push({id:siteId,name:site,removeLinked});saveSiteState(state);notify(removeLinked?'현장과 연결 자료를 삭제했습니다.':'중복 현장 1건만 삭제했습니다.');refreshHomeExtras()}
  function restoreSiteState(){const state=siteState();state.deleted.forEach(item=>{if(typeof item==='string'){document.querySelectorAll(`[data-site="${CSS.escape(item)}"],[data-issue-card="${CSS.escape(item)}"],[data-site-row="${CSS.escape(item)}"]`).forEach(node=>node.remove());return}document.querySelector(`[data-site-id="${CSS.escape(item.id)}"]`)?.remove();document.querySelector(`.site-table-row[data-site-id="${CSS.escape(item.id)}"]`)?.remove();if(item.removeLinked)document.querySelectorAll(`.report-card[data-site="${CSS.escape(item.name)}"],[data-issue-card="${CSS.escape(item.name)}"]`).forEach(node=>node.remove())});Object.entries(state.updated).forEach(([old,data])=>{const value=typeof data==='string'?{name:data}:data,row=document.querySelector(`[data-site-row="${CSS.escape(old)}"]`);if(row){row.dataset.siteRow=value.name;row.dataset.startDate=value.start||row.dataset.startDate||'';row.dataset.endDate=value.end||row.dataset.endDate||'';row.querySelector('span:first-child b').textContent=value.name}})}

  restoreSiteState();enhanceSiteRows();refreshHomeExtras();
  new MutationObserver(()=>{enhanceSiteRows();refreshHomeExtras()}).observe(document.querySelector('.site-table'),{childList:true});
  new MutationObserver(refreshHomeExtras).observe(document.querySelector('#dailyView'),{childList:true,subtree:true});
  new MutationObserver(refreshHomeExtras).observe(document.querySelector('#issuesView'),{childList:true,subtree:true});
  if(window.MIN_WORKS_USER)window.applyMinWorksAccess(window.MIN_WORKS_USER);
})();


/* SOURCE: weather.js */
(() => {
  'use strict';

  const pill = document.getElementById('weatherPill');
  const icon = document.getElementById('weatherIcon');
  const temperature = document.getElementById('weatherTemp');
  const condition = document.getElementById('weatherCondition');
  const place = pill?.querySelector('em');
  if (!pill || !icon || !temperature || !condition || !place) return;

  const SEOUL = { latitude: 37.5665, longitude: 126.9780 };
  const weatherLabels = code => {
    if (code === 0) return ['맑음','sunny'];
    if (code === 1) return ['대체로 맑음','partly_cloudy_day'];
    if (code === 2) return ['구름 조금','partly_cloudy_day'];
    if (code === 3) return ['흐림','cloud'];
    if ([45,48].includes(code)) return ['안개','foggy'];
    if ([51,53,55,56,57].includes(code)) return ['이슬비','rainy'];
    if ([61,63,65,66,67,80,81,82].includes(code)) return ['비','rainy'];
    if ([71,73,75,77,85,86].includes(code)) return ['눈','weather_snowy'];
    if ([95,96,99].includes(code)) return ['천둥·번개','thunderstorm'];
    return ['날씨 확인','partly_cloudy_day'];
  };

  async function loadWeather(latitude, longitude, locationLabel, isFallback = false) {
    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', latitude.toFixed(4));
      url.searchParams.set('longitude', longitude.toFixed(4));
      url.searchParams.set('current', 'temperature_2m,weather_code,is_day');
      url.searchParams.set('timezone', 'auto');
      const response = await fetch(url);
      if (!response.ok) throw new Error('weather response');
      const data = await response.json();
      const current = data.current;
      if (!current || !Number.isFinite(current.temperature_2m)) throw new Error('weather data');
      const [text, symbol] = weatherLabels(Number(current.weather_code));
      temperature.textContent = `${Math.round(current.temperature_2m)}°`;
      condition.textContent = isFallback ? `${text} · 위치 꺼짐` : text;
      place.textContent = locationLabel;
      icon.textContent = current.is_day === 0 && symbol === 'sunny' ? 'clear_night' : symbol;
      pill.href = `https://www.google.com/search?q=${encodeURIComponent(`${latitude},${longitude} 날씨`)}`;
      pill.title = `${locationLabel} 현재 날씨 · 제공 Open-Meteo`;
      pill.classList.remove('weather-loading','weather-error');
    } catch (_) {
      temperature.textContent = '--°';
      condition.textContent = '날씨 불러오기 실패';
      place.textContent = locationLabel;
      icon.textContent = 'cloud_off';
      pill.title = '날씨를 다시 불러오려면 누르세요.';
      pill.classList.remove('weather-loading');
      pill.classList.add('weather-error');
    }
  }

  function requestLocation() {
    pill.classList.add('weather-loading');
    temperature.textContent = '--°';
    condition.textContent = '현재 위치 확인 중';
    place.textContent = '내 위치';
    if (!navigator.geolocation) {
      loadWeather(SEOUL.latitude, SEOUL.longitude, '서울', true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => loadWeather(position.coords.latitude, position.coords.longitude, '내 위치'),
      () => loadWeather(SEOUL.latitude, SEOUL.longitude, '서울', true),
      { enableHighAccuracy: false, timeout: 9000, maximumAge: 600000 }
    );
  }

  pill.addEventListener('click', event => {
    if (!pill.classList.contains('weather-error')) return;
    event.preventDefault();
    requestLocation();
  });
  requestLocation();
})();


/* SOURCE: revision-17.js */
(() => {
  'use strict';
  const topbar = document.querySelector('.topbar');
  if (!topbar || topbar.querySelector('.mobile-header-shortcuts')) return;
  const shortcuts = document.createElement('nav');
  shortcuts.className = 'mobile-header-shortcuts';
  shortcuts.setAttribute('aria-label', '모바일 빠른 이동');
  shortcuts.innerHTML = `<button type="button" data-mobile-go="dashboard"><span class="material-symbols-rounded">home</span><b>MIN WORKS</b></button><button type="button" data-mobile-go="calendar"><span class="material-symbols-rounded">calendar_month</span><b>일정</b><small>Google 연결</small></button>`;
  topbar.prepend(shortcuts);
  shortcuts.querySelectorAll('[data-mobile-go]').forEach(button => button.addEventListener('click', () => {
    const view = button.dataset.mobileGo;
    window.showView(view);
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item.dataset.view === view));
  }));
})();


/* SOURCE: revision-18.js */
(() => {
  'use strict';

  const GOOGLE_KEY = 'minWorksPersonalGoogleCalendarV1';
  setupMobileNavigation();
  setupHomeGoogleCalendar();
  setupReportDownloads();

  function setupMobileNavigation() {
    const shortcuts = document.querySelector('.mobile-header-shortcuts');
    if (shortcuts) {
      shortcuts.innerHTML = `<button type="button" data-mobile-action="home"><span class="material-symbols-rounded">home</span><b>MIN WORKS 홈</b></button><button type="button" data-mobile-action="menu"><span class="material-symbols-rounded">apps</span><b>전체 메뉴</b></button>`;
      shortcuts.querySelector('[data-mobile-action="home"]').addEventListener('click', () => goView('dashboard'));
      shortcuts.querySelector('[data-mobile-action="menu"]').addEventListener('click', openMenu);
    }
    const sheet = document.createElement('div');
    sheet.className = 'mobile-all-menu';
    sheet.innerHTML = `<div class="mobile-menu-backdrop"></div><section><header><div><p class="eyebrow">ALL MENU</p><h2>전체 메뉴</h2></div><button class="mobile-menu-close" aria-label="닫기">×</button></header><div class="mobile-menu-grid"><button data-menu-view="dashboard"><span class="material-symbols-rounded">home</span><b>홈</b></button><button data-menu-view="sites"><span class="material-symbols-rounded">construction</span><b>현장</b></button><button data-menu-view="daily"><span class="material-symbols-rounded">description</span><b>공사일보</b></button><button data-menu-view="finance"><span class="material-symbols-rounded">payments</span><b>자금 집행</b></button><button data-menu-view="issues"><span class="material-symbols-rounded">report_problem</span><b>이슈</b></button><button data-menu-view="settings"><span class="material-symbols-rounded">settings</span><b>설정</b></button><button data-menu-view="help"><span class="material-symbols-rounded">help</span><b>사용법</b></button><button data-menu-view="patch"><span class="material-symbols-rounded">new_releases</span><b>패치노트</b></button><button data-menu-view="storage"><span class="material-symbols-rounded">storage</span><b>저장공간</b></button></div></section>`;
    document.body.appendChild(sheet);
    sheet.querySelector('.mobile-menu-close').addEventListener('click', closeMenu);
    sheet.querySelector('.mobile-menu-backdrop').addEventListener('click', closeMenu);
    sheet.querySelectorAll('[data-menu-view]').forEach(button => button.addEventListener('click', () => { closeMenu(); goView(button.dataset.menuView); }));
    function openMenu() { sheet.classList.add('show'); }
    function closeMenu() { sheet.classList.remove('show'); }
  }

  function goView(view) {
    window.showView(view);
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item.dataset.view === view));
  }

  function setupHomeGoogleCalendar() {
    const panel = document.querySelector('.home-calendar-panel');
    if (!panel) return;
    const render = () => {
      const connected = localStorage.getItem(GOOGLE_KEY) === 'connected';
      panel.innerHTML = `<div class="panel-head"><div><p class="eyebrow">PERSONAL GOOGLE CALENDAR</p><h2>다가오는 일정</h2></div><button class="google-home-action ${connected ? 'connected' : ''}">${connected ? '자세히 보기' : 'Google 캘린더 연동하기'}</button></div><div class="google-home-state ${connected ? 'connected' : ''}"><span class="material-symbols-rounded">${connected ? 'event_available' : 'calendar_add_on'}</span><div><b>${connected ? '개인 Google 캘린더가 연결되어 있습니다.' : 'Google 캘린더를 연결하면 여기에 일정이 표시됩니다.'}</b><p>${connected ? '개인 일정은 본인에게만 보이며 회사 직원에게 공유되지 않습니다.' : '연결은 선택 사항이며, 연결 전에 개인정보 안내를 확인합니다.'}</p></div></div>`;
      panel.querySelector('.google-home-action').addEventListener('click', () => {
        if (connected) {
          window.open('https://calendar.google.com/calendar/u/0/r/agenda', '_blank', 'noopener');
          return;
        }
        const connect = document.querySelector('.google-connect');
        if (connect) connect.click();
        else notify('Google 연결 화면을 준비하지 못했습니다. 새로고침 후 다시 시도해주세요.');
      });
    };
    document.querySelector('.google-consent-confirm')?.addEventListener('click', () => setTimeout(render, 0));
    document.addEventListener('click', event => { if (event.target.closest('.google-disconnect')) setTimeout(render, 0); });
    render();
  }

  function setupReportDownloads() {
    const modal = document.createElement('div');
    modal.className = 'report-download-modal';
    modal.innerHTML = `<div class="report-download-backdrop"></div><section><button class="report-download-close" aria-label="닫기">×</button><p class="eyebrow">REPORT DOWNLOAD</p><h2>공사일보 저장</h2><p class="report-download-subtitle">기기에 맞는 저장 방식을 선택하세요.</p><label class="report-site-select" hidden>현장 선택<select></select></label><div class="report-download-summary"><span><b id="pdfReportCount">1</b><small>일보</small></span><span><b id="pdfPhotoCount">0</b><small>사진</small></span><span><b id="pdfPageCount">1</b><small>예상 페이지</small></span></div><div class="report-download-options"><button class="jpg-download-option" data-jpg-download><span class="material-symbols-rounded">image</span><div><b>JPG 이미지 저장</b><small>휴대폰 갤러리에 바로 저장 · 사진 포함</small></div><em>모바일 추천</em></button><button data-pdf-photos="include"><span class="material-symbols-rounded">photo_library</span><div><b>사진 포함 PDF</b><small>일보 아래에 등록 사진을 함께 배치</small></div></button><button data-pdf-photos="exclude"><span class="material-symbols-rounded">description</span><div><b>사진 제외 PDF</b><small>작업 내용과 확인 기록만 저장</small></div></button></div><p class="report-download-note"><span class="material-symbols-rounded">info</span>휴대폰은 JPG 저장, PC와 현장 전체 자료는 PDF 저장을 권장합니다.</p></section>`;
    document.body.appendChild(modal);
    let selectedCards = [];
    let bulkMode = false;
    const siteSelect = modal.querySelector('select');
    const close = () => modal.classList.remove('show');
    modal.querySelector('.report-download-close').addEventListener('click', close);
    modal.querySelector('.report-download-backdrop').addEventListener('click', close);

    const reportCards = () => [...document.querySelectorAll('.report-card')];
    const getPhotos = card => typeof window.reportPhotos === 'function' ? window.reportPhotos(card) : (Array.isArray(card.reportPhotos) ? card.reportPhotos : []);
    const statedPhotoCount = card => Number(card.querySelector('p')?.textContent.match(/사진\s*(\d+)장/)?.[1] || getPhotos(card).length);
    const refreshSummary = () => {
      if (bulkMode) selectedCards = reportCards().filter(card => card.dataset.site === siteSelect.value || card.dataset.site.includes(siteSelect.value));
      const photoCount = selectedCards.reduce((sum,card) => sum + statedPhotoCount(card), 0);
      document.getElementById('pdfReportCount').textContent = selectedCards.length;
      document.getElementById('pdfPhotoCount').textContent = photoCount;
      document.getElementById('pdfPageCount').textContent = selectedCards.length + Math.ceil(photoCount / 2);
    };
    siteSelect.addEventListener('change', refreshSummary);

    function openDialog(card = null) {
      bulkMode = !card;
      const selectLabel = modal.querySelector('.report-site-select');
      selectLabel.hidden = !bulkMode;
      if (bulkMode) {
        const sites = [...new Set(reportCards().map(item => item.dataset.site))];
        siteSelect.replaceChildren(...sites.map(site => { const option = document.createElement('option'); option.value = site; option.textContent = site; return option; }));
        selectedCards = sites.length ? reportCards().filter(item => item.dataset.site === sites[0]) : [];
        modal.querySelector('h2').textContent = '현장 전체 공사일보 저장';
      } else {
        selectedCards = [card];
        modal.querySelector('h2').textContent = '공사일보 저장';
      }
      refreshSummary();
      modal.classList.add('show');
    }

    reportCards().forEach(card => addCardDownload(card));
    const list = document.getElementById('todayReports');
    if (list) new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node.matches?.('.report-card')) addCardDownload(node); }))).observe(list,{childList:true});
    function addCardDownload(card) {
      if (card.querySelector('.report-pdf-action')) return;
      const action = document.createElement('span');
      action.className = 'report-pdf-action material-symbols-rounded';
      action.textContent = 'download';
      action.title = '이 공사일보 저장';
      action.tabIndex = 0;
      action.setAttribute('role','button');
      const activate = event => { event.preventDefault(); event.stopPropagation(); openDialog(card); };
      action.addEventListener('click', activate);
      action.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') activate(event); });
      card.appendChild(action);
    }

    const allButton = document.createElement('button');
    allButton.className = 'export-site-btn all-reports-pdf';
    allButton.innerHTML = '<span class="material-symbols-rounded">picture_as_pdf</span>현장 전체 PDF';
    allButton.addEventListener('click', () => openDialog());
    document.querySelector('#dailyView .title-actions')?.prepend(allButton);

    const viewerButton = document.createElement('button');
    viewerButton.className = 'viewer-pdf-button';
    viewerButton.innerHTML = '<span class="material-symbols-rounded">download</span>일보 저장';
    viewerButton.addEventListener('click', () => {
      const card = reportCards().find(item => item.dataset.site === window.activeReportSite) || reportCards().find(item => item.dataset.site === document.getElementById('viewerSite')?.textContent);
      if (card) openDialog(card); else notify('선택한 일보를 찾지 못했습니다.');
    });
    document.querySelector('#reportViewer .viewer-actions')?.prepend(viewerButton);

    modal.querySelectorAll('[data-pdf-photos]').forEach(button => button.addEventListener('click', async () => {
      if (!selectedCards.length) { notify('저장할 공사일보가 없습니다.'); return; }
      await printReports(selectedCards, button.dataset.pdfPhotos === 'include');
      close();
    }));
    modal.querySelector('[data-jpg-download]').addEventListener('click', async () => {
      if (!selectedCards.length) { notify('저장할 공사일보가 없습니다.'); return; }
      await downloadReportsJpg(selectedCards);
      close();
    });

    async function downloadReportsJpg(cards) {
      for (let index=0; index<cards.length; index+=1) {
        const card=cards[index],photos=getPhotos(card),width=1240,height=620+photos.length*650;
        const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');
        context.fillStyle='#fff';context.fillRect(0,0,width,height);context.fillStyle='#7fbc03';context.fillRect(0,0,width,18);
        context.fillStyle='#171717';context.font='800 32px Arial, sans-serif';context.fillText('MIN WORKS',70,85);context.font='800 54px Arial, sans-serif';context.fillText(card.dataset.site||'현장',70,160);
        context.font='700 30px Arial, sans-serif';context.fillStyle='#555';context.fillText(card.querySelector('div>b')?.textContent||'공사일보',70,215);
        const author=card.querySelector('.report-author b')?.textContent||'작성자 미상',summary=card.querySelector('div>p')?.textContent||'작업 내용';
        context.fillStyle='#f3f6ef';context.fillRect(70,260,1100,180);context.fillStyle='#777';context.font='600 21px Arial, sans-serif';context.fillText('작성자',100,310);context.fillText('작업 요약',100,370);context.fillStyle='#171717';context.font='700 24px Arial, sans-serif';context.fillText(author,245,310);drawCanvasText(context,summary,245,370,870,32);
        context.fillStyle='#171717';context.font='800 27px Arial, sans-serif';context.fillText(`현장사진 ${photos.length}장`,70,505);
        for(let photoIndex=0;photoIndex<photos.length;photoIndex+=1){const x=70,y=545+photoIndex*650;context.fillStyle='#eef0eb';context.fillRect(x,y,1100,590);try{const image=await loadCanvasImage(photos[photoIndex].src);drawContainedImage(context,image,x,y,1100,550)}catch{}context.fillStyle='#555';context.font='600 18px Arial, sans-serif';context.fillText(`${photos[photoIndex].type||'현장사진'} ${photoIndex+1}`,x+12,y+580)}
        context.fillStyle='#888';context.font='18px Arial, sans-serif';context.fillText(`MIN WORKS · ${new Date().toLocaleDateString('ko-KR')}`,70,height-35);
        await new Promise(resolve=>canvas.toBlob(blob=>{if(blob){const anchor=document.createElement('a');anchor.href=URL.createObjectURL(blob);anchor.download=`${safeFileName(card.dataset.site)}_${safeFileName(card.querySelector('div>b')?.textContent||'공사일보')}_${index+1}.jpg`;anchor.click();setTimeout(()=>URL.revokeObjectURL(anchor.href),2000)}resolve()},'image/jpeg',.9));
      }
      notify(`${cards.length}개 공사일보를 JPG로 저장했습니다.`);
      document.dispatchEvent(new CustomEvent('minworks:exported',{detail:{site:cards[0]?.dataset.site||'',type:'JPG'}}));
    }
    function drawCanvasText(context,text,x,y,maxWidth,lineHeight){let line='';String(text).split(' ').forEach(word=>{const test=line+word+' ';if(context.measureText(test).width>maxWidth&&line){context.fillText(line,x,y);line=word+' ';y+=lineHeight}else line=test});context.fillText(line,x,y)}
    async function photoDataUrl(source){if(!source)return'';if(String(source).startsWith('data:'))return source;const headers={};if(String(source).includes('min-works-api.forjaejun.workers.dev')){const token=localStorage.getItem('minWorksSessionV1');if(token)headers.Authorization=`Bearer ${token}`}const response=await fetch(source,{headers});if(!response.ok)throw new Error('사진을 불러오지 못했습니다.');const blob=await response.blob();return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)})}
    async function loadCanvasImage(source){const resolved=await photoDataUrl(source);return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=resolved})}
    function drawContainedImage(context,image,x,y,width,height){const ratio=Math.min(width/image.width,height/image.height),drawWidth=image.width*ratio,drawHeight=image.height*ratio;context.drawImage(image,x+(width-drawWidth)/2,y+(height-drawHeight)/2,drawWidth,drawHeight)}
    function safeFileName(value){return String(value||'MIN_WORKS').replace(/[\\/:*?"<>|]/g,'_').trim()}

    async function printReports(cards, includePhotos) {
      const popup = window.open('', '_blank');
      if (!popup) { notify('팝업을 허용한 뒤 다시 시도해주세요.'); return; }
      popup.document.write('<!doctype html><html lang="ko"><meta charset="utf-8"><body style="font-family:sans-serif;padding:32px">사진과 공사일보를 준비하고 있습니다…</body></html>');
      const reports = (await Promise.all(cards.map(async card => {
        const site = escapeText(card.dataset.site);
        const title = escapeText(card.querySelector('div>b')?.textContent || '공사일보');
        const summary = escapeText(card.querySelector('div>p')?.textContent || '작업 내용');
        const author = escapeText(card.querySelector('.report-author b')?.textContent || '작성자 미상');
        const rawPhotos = includePhotos ? getPhotos(card) : [];
        const photos = (await Promise.all(rawPhotos.map(async photo=>{try{return{...photo,src:await photoDataUrl(photo.src)}}catch{return null}}))).filter(Boolean);
        return `<article class="pdf-report"><header><p>MIN WORKS</p><h1>${site}</h1><h2>${title}</h2></header><dl><div><dt>작성자</dt><dd>${author}</dd></div><div><dt>작업 요약</dt><dd>${summary}</dd></div><div><dt>확인 기록</dt><dd>앱 등록 기록 기준</dd></div></dl><section><h3>공정별 작업 내용</h3><table><thead><tr><th>공정</th><th>금일인원</th><th>작업내용</th></tr></thead><tbody><tr><td>등록 공정</td><td>-</td><td>${summary}</td></tr></tbody></table></section>${includePhotos ? `<section class="pdf-photos"><h3>현장사진 ${photos.length}장</h3>${photos.length ? `<div>${photos.map((photo,index) => `<figure><img src="${photo.src}" alt="현장사진 ${index+1}"><figcaption>${escapeText(photo.type || '현장사진')} ${index+1}</figcaption></figure>`).join('')}</div>` : '<p>이 일보에 저장된 사진 원본이 없습니다.</p>'}</section>` : ''}</article>`;
      }))).join('');
      popup.document.open();
      popup.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>MIN WORKS 공사일보</title><style>@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}html,body{margin:0;padding:0;color:#181818;background:#fff;font-family:"Noto Sans KR","Malgun Gothic",Arial,sans-serif}.pdf-report{width:100%;page-break-after:always}.pdf-report:last-child{page-break-after:auto}header{border-top:5px solid #7fbc03;padding:14px 0 10px}header p{margin:0;color:#689900;font-weight:800;font-size:11px}h1{margin:7px 0 2px;font-size:23px;overflow-wrap:anywhere}h2{margin:0;color:#666;font-size:14px}dl{display:grid;grid-template-columns:1fr 2fr 1fr;margin:12px 0;border:1px solid #ddd}dl div{min-width:0;padding:10px;border-right:1px solid #ddd}dl div:last-child{border:0}dt{color:#777;font-size:10px}dd{margin:4px 0 0;font-size:12px;font-weight:700;overflow-wrap:anywhere}h3{margin:16px 0 8px;font-size:14px}table{width:100%;table-layout:fixed;border-collapse:collapse}th,td{padding:9px;border:1px solid #ddd;font-size:11px;text-align:left;overflow-wrap:anywhere}th{background:#f4f6f1}.pdf-photos>div{display:block}.pdf-photos figure{width:100%;margin:0 0 12mm;page-break-inside:avoid;break-inside:avoid;text-align:center}.pdf-photos img{display:block;width:100%;height:auto;max-height:230mm;margin:0 auto;object-fit:contain;background:#f2f2f2}.pdf-photos figcaption{padding:6px;color:#666;font-size:10px;text-align:center}</style></head><body>${reports}<script>window.addEventListener('load',async()=>{await Promise.all([...document.images].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=img.onerror=resolve})));setTimeout(()=>window.print(),250)});<\/script></body></html>`);
      popup.document.close();
      document.dispatchEvent(new CustomEvent('minworks:exported',{detail:{site:cards[0]?.dataset.site||'',type:'PDF'}}));
    }
  }

  function escapeText(value) {
    return String(value || '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  }
})();


/* SOURCE: revision-19.js */
(() => {
  'use strict';
  let installPrompt = null;

  const installButton = document.createElement('button');
  installButton.className = 'install-min-works';
  installButton.type = 'button';
  installButton.innerHTML = '<img src="assets/icons/min-works-v4-192.png" alt=""><span><b>MIN WORKS 설치</b><small>휴대폰 앱으로 사용</small></span><i class="material-symbols-rounded">download</i>';

  const shortcuts = document.querySelector('.mobile-header-shortcuts');
  if (shortcuts) shortcuts.insertAdjacentElement('afterend', installButton);
  else document.querySelector('.topbar')?.prepend(installButton);

  const guide = document.createElement('div');
  guide.className = 'install-guide';
  guide.innerHTML = '<div class="install-guide-backdrop"></div><section><button class="install-guide-close" aria-label="닫기">×</button><img src="assets/icons/min-works-v4-192.png" alt="MIN WORKS"><p class="eyebrow">INSTALL APP</p><h2>MIN WORKS를 앱으로 설치</h2><div class="install-guide-steps"></div><button class="install-guide-done">확인</button></section>';
  document.body.appendChild(guide);

  const closeGuide = () => guide.classList.remove('show');
  guide.querySelector('.install-guide-close').addEventListener('click', closeGuide);
  guide.querySelector('.install-guide-backdrop').addEventListener('click', closeGuide);
  guide.querySelector('.install-guide-done').addEventListener('click', closeGuide);

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    installButton.classList.add('ready');
  });

  installButton.addEventListener('click', async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      installButton.classList.remove('ready');
      return;
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const samsung = /samsungbrowser/i.test(navigator.userAgent);
    guide.querySelector('.install-guide-steps').innerHTML = ios
      ? '<p><b>1</b>Safari 아래쪽 <strong>공유</strong> 버튼을 누르세요.</p><p><b>2</b><strong>홈 화면에 추가</strong>를 선택하세요.</p><p><b>3</b>오른쪽 위 <strong>추가</strong>를 누르세요.</p>'
      : samsung
        ? '<p><b>1</b>브라우저 메뉴 <strong>≡</strong>를 누르세요.</p><p><b>2</b><strong>현재 페이지 추가</strong>를 선택하세요.</p><p><b>3</b><strong>홈 화면</strong>을 선택하세요.</p>'
        : '<p><b>1</b>브라우저 오른쪽 위 <strong>⋮</strong>를 누르세요.</p><p><b>2</b><strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong>를 선택하세요.</p><p><b>3</b>설치를 누르면 MIN WORKS 아이콘이 생깁니다.</p>';
    guide.classList.add('show');
  });

  window.addEventListener('appinstalled', () => {
    installButton.classList.add('installed');
    installButton.querySelector('b').textContent = '설치 완료';
    installButton.querySelector('small').textContent = '홈 화면에서 실행하세요';
  });

  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));

  const hashView = location.hash.replace('#', '');
  if (['dashboard', 'sites', 'daily', 'finance', 'issues', 'settings', 'help', 'patch', 'storage'].includes(hashView)) window.showView?.(hashView);
})();


/* SOURCE: revision-20.js */
(() => {
  'use strict';
  document.querySelector('[data-bottom-menu]')?.addEventListener('click', () => {
    document.querySelector('[data-mobile-action="menu"]')?.click();
  });
})();


/* SOURCE: config.js */
window.MIN_WORKS_CONFIG = Object.freeze({
  googleOAuthClientId: '',
  apiBaseUrl: 'https://min-works-api.forjaejun.workers.dev'
});


/* SOURCE: revision-21.js */
(() => {
  'use strict';
  const config = window.MIN_WORKS_CONFIG || {};
  let googleToken = '';
  let googleTokenClient = null;

  cleanInterface();
  setupReportDateGroups();
  setupLiveSummary();
  setupDynamicReportFilters();
  setupHelpGuide();
  setupRealGoogleCalendar();
  setupLiveWelcome();

  function cleanInterface() {
    document.getElementById('newSiteBtn')?.classList.add('removed-control');
    document.getElementById('exportSiteBtn')?.classList.add('removed-control');
    document.querySelector('.quick-panel .panel-head small')?.remove();
    document.querySelector('.nav-item[data-view="calendar"]')?.remove();
    document.getElementById('calendarView')?.remove();
    document.querySelectorAll('.site-table-row > span:first-child > small').forEach(item => item.remove());
    const pending = [...document.querySelectorAll('.summary-card')].find(card => card.querySelector('span')?.textContent.includes('확인 대기'));
    pending?.remove();
    const allPdf = document.querySelector('.all-reports-pdf');
    if (allPdf) allPdf.innerHTML = '<span class="material-symbols-rounded">picture_as_pdf</span>현장별 통합 PDF 내보내기';
  }

  function navigate(view, status) {
    window.showView?.(view);
    if (view === 'sites' && status) document.querySelector(`[data-site-status="${status}"]`)?.click();
  }

  function setupLiveSummary() {
    const cards = [...document.querySelectorAll('.summary-grid .summary-card')];
    cards.forEach(card => { card.tabIndex = 0; card.setAttribute('role', 'button'); });
    cards[0]?.addEventListener('click', () => navigate('sites', 'active'));
    cards[1]?.addEventListener('click', () => navigate('daily'));
    cards[2]?.addEventListener('click', () => navigate('issues'));
    cards.forEach(card => card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); card.click(); } }));

    const refresh = () => {
      window.refreshProjectStatuses?.();
      const rows = [...document.querySelectorAll('.site-table-row')];
      const activeRows = rows.filter(row => (row.dataset.projectStatus || 'active') === 'active');
      const activeNames = new Set(activeRows.map(row => row.dataset.siteRow));
      const todayKey = localDateKey(new Date());
      const todaySites = new Set([...document.querySelectorAll('.report-card')]
        .filter(card => reportDateKey(card) === todayKey)
        .map(card => card.dataset.site)
        .filter(site => activeNames.has(site)));
      const issues = [...document.querySelectorAll('.issue-detail-card')].filter(card => card.dataset.status !== 'complete');
      const urgent = issues.filter(card => card.querySelector('.issue-label:not(.normal)')).length;
      const liveCards = [...document.querySelectorAll('.summary-grid .summary-card')];
      if (liveCards[0]) { liveCards[0].querySelector('strong').textContent = activeRows.length; const copy=liveCards[0].querySelector('.active-site-copy'); if(copy)copy.textContent=`${activeRows.length}개 현장 운영 중`; liveCards[0].dataset.target = 'sites'; }
      if (liveCards[1]) { liveCards[1].querySelector('strong').innerHTML = `${todaySites.size}<small>/ ${activeRows.length}</small>`; liveCards[1].querySelector('em').textContent = `${todaySites.size}개 현장 보고 완료`; liveCards[1].dataset.target = 'daily'; }
      if (liveCards[2]) { liveCards[2].querySelector('strong').innerHTML = `${issues.length}<small>건</small>`; liveCards[2].querySelector('em').textContent = urgent ? `긴급 ${urgent}건` : '긴급 이슈 없음'; liveCards[2].dataset.target = 'issues'; }
      const focus = document.querySelector('.mobile-focus');
      if (focus) {
        const now = new Date();
        focus.querySelector('.today-label').textContent = `오늘 · ${new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',timeZone:'Asia/Seoul'}).format(now)}`;
        focus.querySelector('h2').textContent = `${activeRows.length}개 현장 운영 중`;
        focus.querySelector('p').textContent = `현장 보고 ${todaySites.size}/${activeRows.length} · 미처리 이슈 ${issues.length}건`;
      }
    };
    window.refreshMinWorksSummary = refresh;
    // 현장 행의 추가/삭제만 감시한다. subtree까지 감시하면 refreshProjectStatuses가
    // 빈 상태 문구를 갱신할 때 다시 refresh가 호출되어 무한 반복할 수 있다.
    new MutationObserver(refresh).observe(document.querySelector('.site-table'), { childList: true });
    new MutationObserver(refresh).observe(document.querySelector('#dailyView'), { childList: true, subtree: true });
    new MutationObserver(refresh).observe(document.querySelector('#issuesView'), { childList: true, subtree: true });
    setTimeout(refresh, 0);
  }

  function shortName(name) {
    return name.replace(/\s+(고를샘|AK분당점|시설개선|아산 커뮤니티)$/,'').replace(/대학교$/,'대');
  }

  function setupReportDateGroups() {
    const screen = document.getElementById('dailyListScreen');
    if (!screen) return;
    const groups = () => [...screen.querySelectorAll('.date-group')];
    groups().forEach(group => {
      const firstCard = group.querySelector('.report-card');
      const key = firstCard ? reportDateKey(firstCard) : '';
      if (key) {
        group.dataset.reportDate = key;
        group.querySelectorAll('.report-card').forEach(card => { if (!card.dataset.reportDate) card.dataset.reportDate = key; });
        const date = new Date(`${key}T00:00:00+09:00`);
        const today = key === localDateKey(new Date());
        group.querySelector('h3').innerHTML = `${new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Seoul'}).format(date)}${today?' <em>오늘</em>':''}`;
      }
    });
    const place = card => {
      const key = card.dataset.reportDate;
      if (!key) return;
      let group = groups().find(item => item.dataset.reportDate === key);
      if (!group) {
        group = document.createElement('div');
        group.className = 'date-group';
        group.dataset.reportDate = key;
        const date = new Date(`${key}T00:00:00+09:00`);
        const today = key === localDateKey(new Date());
        group.innerHTML = `<h3>${new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Seoul'}).format(date)}${today?' <em>오늘</em>':''}</h3><div class="completed-reports"></div>`;
        const before = groups().find(item => (item.dataset.reportDate || '') < key);
        if (before) before.before(group); else screen.appendChild(group);
      }
      const target = group.querySelector('.completed-reports');
      if (card.parentElement !== target) target.prepend(card);
    };
    screen.querySelectorAll('.report-card').forEach(place);
    new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node.matches?.('.report-card')) place(node);
    }))).observe(screen, {childList:true,subtree:true});
  }

  function localDateKey(date) {
    const parts = new Intl.DateTimeFormat('en-CA', { year:'numeric', month:'2-digit', day:'2-digit', timeZone:'Asia/Seoul' }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function reportDateKey(card) {
    if (card.dataset.reportDate) return card.dataset.reportDate;
    if (card.dataset.createdAt) return localDateKey(new Date(card.dataset.createdAt));
    const label = card.closest('.date-group')?.querySelector('h3')?.textContent || '';
    const match = label.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (!match) return '';
    return `${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;
  }

  function setupDynamicReportFilters() {
    const filter = document.querySelector('.daily-filter');
    if (!filter) return;
    let active = 'all';
    const renderCards = () => {
      document.querySelectorAll('.report-card').forEach(card => card.style.display = active === 'all' || card.dataset.site === active ? '' : 'none');
      document.querySelectorAll('.date-group').forEach(group => group.hidden = ![...group.querySelectorAll('.report-card')].some(card => card.style.display !== 'none'));
    };
    const rebuild = () => {
      const names = [...new Set([...document.querySelectorAll('.site-table-row')].map(row => row.dataset.siteRow).filter(Boolean))];
      if (active !== 'all' && !names.includes(active)) active = 'all';
      filter.replaceChildren();
      [{ value:'all', label:'전체 현장' }, ...names.map(name => ({ value:name, label:shortName(name) }))].forEach(item => {
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = item.label; button.title = item.value === 'all' ? '' : item.value;
        button.classList.toggle('active', item.value === active);
        button.addEventListener('click', () => { active = item.value; rebuild(); renderCards(); });
        filter.appendChild(button);
      });
      renderCards();
    };
    new MutationObserver(rebuild).observe(document.querySelector('.site-table'), { childList:true });
    new MutationObserver(rebuild).observe(document.querySelector('#todayReports'), { childList:true });
    rebuild();
  }

  function setupHelpGuide() {
    const start = document.querySelector('.help-start');
    start?.querySelector('button')?.remove();
    const grid = document.querySelector('.help-grid');
    if (grid) grid.innerHTML = [
      ['home','홈','진행 현장·오늘 보고·미처리 이슈를 확인합니다. 요약 카드를 누르면 해당 업무로 이동합니다.'],
      ['construction','현장','개설한 현장은 진행 중으로 표시되며, 준공일이 지나면 완료로 자동 분류됩니다.'],
      ['description','공사일보','현장과 날짜, 공정·인원, 사진·특이사항을 입력합니다. 개별 또는 현장별 통합 PDF로 저장할 수 있습니다.'],
      ['payments','자금 집행','월별 예정 지출과 거래처 수금 예정 내역을 확인합니다.'],
      ['report_problem','이슈','현장 문제를 긴급도와 담당자 기준으로 등록하고 미처리 항목을 확인합니다.'],
      ['settings','설정','글자 크기, 화면 밀도, 강조색과 알림 방식을 내 기기에 맞게 저장합니다.'],
      ['apps','전체메뉴','모바일 하단 전체메뉴에서 설정과 사용법을 포함한 모든 기능을 열 수 있습니다.']
    ].map((item,index) => `<article class="help-card static"><span class="material-symbols-rounded">${item[0]}</span><div><small>${String(index+1).padStart(2,'0')}</small><h3>${item[1]}</h3><p>${item[2]}</p></div></article>`).join('');
    const details = document.querySelector('.help-details');
    if (details) details.innerHTML = `<div class="panel-head"><div><p class="eyebrow">FAQ</p><h2>자주 묻는 사용법</h2></div></div>${faqItems().map((item,index) => `<details ${index===0?'open':''}><summary><span>${index+1}</span>${item[0]}<i class="material-symbols-rounded">expand_more</i></summary><div><p>${item[1]}</p></div></details>`).join('')}`;
  }

  function faqItems() { return [
    ['새 현장이 공사일보 필터에 안 보여요.','현장을 개설하면 공사일보 상단 필터가 즉시 갱신됩니다. 보이지 않으면 전체 현장을 누른 뒤 다시 확인하세요.'],
    ['공사일보는 어떻게 작성하나요?','공사일보 탭의 작성 버튼을 누르고 현장·날짜, 공정·인원, 특이사항을 한 화면에서 입력한 뒤 공사일보 등록을 누릅니다. 사진은 없어도 등록할 수 있습니다.'],
    ['사진을 포함해 PDF로 저장하려면?','일보 오른쪽 다운로드 또는 현장별 통합 PDF 내보내기를 누른 뒤 사진 포함 PDF를 선택합니다.'],
    ['현장 담당자는 어떻게 바뀌나요?','해당 현장에 가장 최근 공사일보를 등록한 직원 이름으로 자동 갱신됩니다.'],
    ['현장 상태는 언제 바뀌나요?','개설한 현장은 진행 중으로 표시되며, 준공일 다음 날부터 완료입니다.'],
    ['Google 일정이 보이지 않아요.','설정된 Google OAuth로 연결을 완료한 본인에게만 향후 일정이 표시됩니다. 미연결 또는 권한 오류 상태를 먼저 확인하세요.'],
    ['앱은 어떻게 설치하나요?','모바일 상단 MIN WORKS 설치를 누르거나 브라우저 메뉴에서 홈 화면에 추가를 선택합니다.'],
    ['폴드 화면이 깨져 보여요.','상단 기기 보기에서 갤럭시 폴드를 선택하고 접힘·펼침 상태에 맞춰 화면을 다시 불러오세요.'],
    ['뒤로가기는 어떻게 하나요?','휴대폰 또는 브라우저 뒤로가기를 누르면 직전에 보던 앱 화면으로 돌아갑니다. 로고를 누르면 홈으로 이동합니다.'],
    ['다른 직원과 데이터가 다르게 보여요.','서버 동기화 상태를 확인하세요. 서버 미연결 상태의 임시 데이터는 현재 기기에만 저장됩니다.'],
    ['접속코드가 만료됐어요.','활성 접속코드는 5분 동안만 유효합니다. 기존 직원 또는 관리자가 새 코드를 발급해야 합니다.'],
    ['퇴사자는 어떻게 처리하나요?','관리자 계정의 직원 관리에서 해당 직원의 접속을 중지하거나 계정을 삭제합니다.']
  ]; }

  function setupRealGoogleCalendar() {
    localStorage.removeItem('minWorksPersonalGoogleCalendarV1');
    const panel = document.querySelector('.home-calendar-panel');
    const connection = document.querySelector('[data-settings-panel="data"] .connection-card');
    const renderState = (state, events = []) => {
      if (!panel) return;
      if (state === 'connected') {
        panel.innerHTML = `<div class="panel-head"><div><p class="eyebrow">PERSONAL GOOGLE CALENDAR</p><h2>다가오는 일정</h2></div><button class="google-real-disconnect">연결 해제</button></div><div class="real-calendar-events">${events.length ? events.map(event => `<a href="${event.htmlLink || 'https://calendar.google.com/calendar/u/0/r/agenda'}" target="_blank" rel="noopener"><time>${formatEventDate(event.start)}</time><div><b>${escapeHtml(event.summary || '제목 없는 일정')}</b><small>${escapeHtml(event.location || '개인 Google 캘린더')}</small></div><span class="material-symbols-rounded">open_in_new</span></a>`).join('') : '<p>오늘 이후 등록된 일정이 없습니다.</p>'}</div>`;
        panel.querySelector('.google-real-disconnect').addEventListener('click', disconnectGoogle);
      } else {
        const configured = Boolean(config.googleOAuthClientId);
        panel.innerHTML = `<div class="panel-head"><div><p class="eyebrow">PERSONAL GOOGLE CALENDAR</p><h2>다가오는 일정</h2></div><button class="google-real-connect">Google 캘린더 연동하기</button></div><div class="google-home-state"><span class="material-symbols-rounded">${configured?'calendar_add_on':'link_off'}</span><div><b>${configured?'개인 Google 캘린더는 아직 연결되지 않았습니다.':'Google OAuth 설정이 필요합니다.'}</b><p>${configured?'읽기 전용 권한으로 본인의 오늘 이후 일정만 표시합니다.':'가짜 연결 상태는 제거했습니다. 관리자 설정 후 실제 연결할 수 있습니다.'}</p></div></div>`;
        panel.querySelector('.google-real-connect').addEventListener('click', connectGoogle);
      }
      if (connection) {
        connection.querySelector('small').textContent = state === 'connected' ? '개인 Calendar 읽기 전용 연결' : 'Google OAuth 미연결';
        connection.querySelector('em').textContent = state === 'connected' ? '연결됨' : '미연결';
        connection.querySelector('em').classList.toggle('waiting', state !== 'connected');
      }
    };
    async function connectGoogle() {
      if (!config.googleOAuthClientId) { notify('Google OAuth 클라이언트 ID를 먼저 설정해야 합니다.'); return; }
      try {
        await loadGoogleIdentity();
        googleTokenClient ||= google.accounts.oauth2.initTokenClient({ client_id:config.googleOAuthClientId, scope:'https://www.googleapis.com/auth/calendar.readonly', callback:async response => {
          if (response.error || !response.access_token) { renderState('disconnected'); notify('Google 캘린더 연결에 실패했습니다.'); return; }
          googleToken = response.access_token;
          const events = await fetchGoogleEvents(googleToken);
          renderState('connected', events);
        }});
        googleTokenClient.requestAccessToken({ prompt:'consent' });
      } catch { renderState('disconnected'); notify('Google 연결 모듈을 불러오지 못했습니다.'); }
    }
    function disconnectGoogle() {
      if (googleToken && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(googleToken, () => {});
      googleToken = ''; renderState('disconnected');
    }
    renderState('disconnected');
  }

  function loadGoogleIdentity() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    return new Promise((resolve,reject) => { const script=document.createElement('script'); script.src='https://accounts.google.com/gsi/client'; script.async=true; script.onload=resolve; script.onerror=reject; document.head.appendChild(script); });
  }
  async function fetchGoogleEvents(token) {
    const params = new URLSearchParams({ timeMin:new Date().toISOString(), singleEvents:'true', orderBy:'startTime', maxResults:'8', timeZone:'Asia/Seoul' });
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, { headers:{ Authorization:`Bearer ${token}` } });
    if (!response.ok) throw new Error('calendar');
    return (await response.json()).items || [];
  }
  function formatEventDate(start) { const raw=start?.dateTime || start?.date; if (!raw) return '일정'; return new Intl.DateTimeFormat('ko-KR',{month:'short',day:'numeric',hour:start.dateTime?'2-digit':undefined,minute:start.dateTime?'2-digit':undefined,timeZone:'Asia/Seoul'}).format(new Date(raw)); }
  function escapeHtml(value) { const node=document.createElement('span'); node.textContent=value || ''; return node.innerHTML; }

  function setupLiveWelcome() {
    const greeting = document.querySelector('.greeting-wrap');
    if (!greeting) return;
    const live = document.createElement('p'); live.className='live-user-welcome'; live.textContent='접속자 정보를 확인 중입니다.'; greeting.appendChild(live);
    const original = window.setMinWorksUser;
    window.setMinWorksUser = user => {
      original?.(user);
      const name = user?.role === 'admin' ? '관리자' : user?.name;
      live.textContent = name ? `${name} 님, MIN WORKS에 오신 것을 환영합니다.` : '로그인 정보가 없습니다.';
      live.classList.toggle('ready', Boolean(name));
    };
    if (window.MIN_WORKS_USER) window.setMinWorksUser(window.MIN_WORKS_USER);
  }
})();


/* SOURCE: revision-22.js */
(() => {
  'use strict';
  const PAYMENT_KEY = 'minWorksPlannedPaymentsV2';
  const RECEIVABLE_KEY = 'minWorksReceivablesV2';
  const roles = ['담당자', '공무부', '관리부', '대표', '이사'];
  let payments = read(PAYMENT_KEY);
  let receivables = read(RECEIVABLE_KEY);
  let selectedMonth = todayKey().slice(0,7);
  let editingPaymentId = null;
  let editingReceivableId = null;

  document.querySelector('.approval-panel')?.remove();
  rebuildFinance();

  function rebuildFinance() {
    const view = document.getElementById('financeView');
    if (!view) return;
    view.innerHTML = `
      <div class="section-title mw-finance-title"><div><p class="eyebrow">FUND EXECUTION</p><h2>자금 집행</h2><small>예정 지출과 거래처 수금을 월별로 확인합니다.</small></div></div>
      <div class="mw-month-nav"><button id="mwPrevMonth">‹</button><b id="mwSelectedMonth"></b><button id="mwNextMonth">›</button></div>
      <div class="mw-finance-summary">
        <article class="monthly"><span>월기성 예정</span><b id="mwMonthlyTotal">₩0</b><small id="mwMonthlyCount">0건</small></article>
        <article class="urgent"><span>긴급기성 예정</span><b id="mwUrgentTotal">₩0</b><small id="mwUrgentCount">0건</small></article>
        <article class="receivable"><span>이번 달 수금 예정</span><b id="mwReceivableTotal">₩0</b><small id="mwReceivableCount">0건</small></article>
      </div>
      <div class="mw-finance-tabs"><button class="active" data-mw-finance="payment">예정 지출서</button><button data-mw-finance="receivable">거래처 수금 예정</button></div>
      <section class="mw-money-panel active" data-mw-panel="payment">
        <div class="mw-panel-head"><div><p class="eyebrow">PLANNED PAYMENT</p><h2>예정 지출서</h2><small class="mw-type-guide"><i></i>월기성 <i></i>긴급기성 · 색상으로 구분됩니다.</small><p class="mw-reference-note"><span class="material-symbols-rounded">info</span>이번 달 예상 지출을 미리 공유하는 참고 자료입니다. 실제 지급 및 결재 금액은 사무실에 제출된 서류를 기준으로 합니다.</p></div><button class="mw-write-button" id="mwOpenPayment"><span class="material-symbols-rounded">edit_square</span>예정 지출서 작성</button></div>
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
    document.getElementById('mwPrevMonth').addEventListener('click',()=>changeMonth(-1));
    document.getElementById('mwNextMonth').addEventListener('click',()=>changeMonth(1));
    prunePaidItems();
    renderAll();
    if(window.MIN_WORKS_USER)window.applyMinWorksAccess?.(window.MIN_WORKS_USER);
  }

  function buildPaymentModal() {
    const modal = document.getElementById('paymentFormModal');
    if (!modal) return;
    modal.innerHTML = `<div class="money-modal-backdrop"></div><section><header><div><p class="eyebrow">PLANNED PAYMENT</p><h2>예정 지출서 작성</h2><small>금액을 입력하면 금회까지 기성률이 자동 계산됩니다.</small></div><button type="button" data-mw-close>×</button></header><div class="money-form-grid">
      <label>현장명<select id="mwPaymentSite"></select></label><label>작성자<input id="mwPaymentAuthor" readonly></label>
      <label>구분<select id="mwPaymentType"><option value="monthly">월기성</option><option value="urgent">긴급기성</option></select></label><label>공정명<input id="mwProcessName" placeholder="작성자가 공정명을 입력"></label>
      <label>공정별 공사금액<input id="mwProcessTotal" type="number" min="0" placeholder="예: 50000000"></label><label>지출 예정금액<input id="mwPlannedAmount" type="number" min="0" placeholder="예: 10000000"></label>
      <label>금회까지 기성률<input id="mwProgressRate" readonly value="0%"></label><label>지급 요청 예정일<input id="mwRequestDate" type="date"></label>
    </div><button class="primary full" id="mwSavePayment">예정 지출서 저장</button></section>`;
    modal.querySelector('[data-mw-close]').addEventListener('click', () => closeModal(modal));
    modal.querySelector('.money-modal-backdrop').addEventListener('click', () => closeModal(modal));
    ['mwProcessName','mwProcessTotal','mwPlannedAmount'].forEach(id => document.getElementById(id).addEventListener('input', updatePaymentRate));
    document.getElementById('mwPaymentSite').addEventListener('change', updatePaymentRate);
    document.getElementById('mwPaymentType').addEventListener('change',event=>{if(!editingPaymentId)document.getElementById('mwRequestDate').value=defaultPaymentDate(event.target.value)});
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
      document.getElementById('mwRequestDate').value ||= defaultPaymentDate(value('mwPaymentType'));
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
    const existing=payments.find(entry=>entry.id===editingPaymentId);
    const item = { id:existing?.id||crypto.randomUUID(), site:value('mwPaymentSite'), author:existing?.author||currentName(), type:value('mwPaymentType'), process:value('mwProcessName').trim(), processTotal:number('mwProcessTotal'), amount:number('mwPlannedAmount'), requestDate:value('mwRequestDate'), confirmations:existing?.confirmations||{}, createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString() };
    if (!item.site || !item.process || !item.processTotal || !item.amount || !item.requestDate) return notify('현장·공정·금액·예정일을 모두 입력해주세요.');
    if(existing)payments[payments.indexOf(existing)]=item;else payments.unshift(item);editingPaymentId=null;persist(PAYMENT_KEY,payments);closeModal(document.getElementById('paymentFormModal'));clearPaymentForm();renderAll();notify(existing?'예정 지출서를 수정했습니다.':'예정 지출서를 저장했습니다.');
  }
  function saveReceivable() {
    const existing=receivables.find(entry=>entry.id===editingReceivableId);
    const item = { id:existing?.id||crypto.randomUUID(), site:value('mwReceivableSite'), period:value('mwSitePeriod'), contract:number('mwContractAmount'), received:number('mwReceivedAmount'), dueDate:value('mwDueDate'), createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString() };
    if (!item.site || !item.contract || !item.dueDate) return notify('현장·계약금액·입금 예정일을 입력해주세요.');
    if(existing)receivables[receivables.indexOf(existing)]=item;else receivables.unshift(item);editingReceivableId=null;persist(RECEIVABLE_KEY,receivables);closeModal(document.getElementById('receivableFormModal'));clearReceivableForm();renderAll();notify(existing?'수금 예정 내역을 수정했습니다.':'수금 예정 내역을 저장했습니다.');
  }

  function renderAll() { renderPayments(); renderReceivables(); renderSummary(); }
  function renderPayments() {
    const list = document.getElementById('mwPaymentList'); list.replaceChildren();
    const visible=payments.filter(item=>item.requestDate?.startsWith(selectedMonth));
    if (!visible.length) return list.append(empty('선택한 달의 예정 지출서가 없습니다.'));
    visible.forEach(item => {
      const card=document.createElement('article'); card.className=`mw-payment-card ${item.type}`;
      const cumulative=payments.filter(entry=>entry.site===item.site&&entry.process===item.process&&entry.createdAt<=item.createdAt).reduce((sum,entry)=>sum+entry.amount,0);
      card.innerHTML=`<header><div><span>${item.type==='urgent'?'긴급기성':'월기성'}</span><h3>${escapeHtml(item.site)}</h3><small>작성자 ${escapeHtml(item.author)}</small></div><time>${dateLabel(item.requestDate)} 지급 예정</time></header><div class="mw-payment-values"><div><small>공정명</small><b>${escapeHtml(item.process)}</b></div><div><small>공정별 공사금액</small><b>${won(item.processTotal)}</b></div><div><small>지출 예정금액</small><b>${won(item.amount)}</b></div><div><small>금회까지 기성률</small><b>${percent(cumulative,item.processTotal)}%</b></div></div><div class="mw-confirm-row">${['담당자','공무팀','관리팀','대표이사','상무이사'].map(role => confirmButton(item,role)).join('')}</div><div class="mw-record-actions"><button data-payment-edit>수정</button><button data-payment-complete>지출 완료</button><button class="danger" data-payment-delete>삭제</button></div>`;
      card.querySelectorAll('[data-confirm-role]').forEach(button => button.addEventListener('click', () => confirmPayment(item.id,button.dataset.confirmRole)));
      card.querySelector('[data-payment-edit]').addEventListener('click',()=>editPayment(item));
      card.querySelector('[data-payment-complete]').addEventListener('click',()=>removePayment(item,'지출 완료'));
      card.querySelector('[data-payment-delete]').addEventListener('click',()=>removePayment(item,'삭제'));
      list.appendChild(card);
    });
  }
  function confirmButton(item,role) {
    const person=item.confirmations?.[role];
    return `<button class="${person?'checked':''}" data-confirm-role="${role}"><span class="material-symbols-rounded">${person?'check_circle':'radio_button_unchecked'}</span><b>${role}</b><small>${person?escapeHtml(person):'확인 전'}</small></button>`;
  }
  function confirmPayment(id,role) {
    const item=payments.find(entry=>entry.id===id); if(!item)return;
    const user=window.MIN_WORKS_USER;
    const allowed=user?.role==='admin'||(role==='담당자'&&item.author===currentName())||(role==='공무팀'&&user?.department==='공무팀')||(role==='관리팀'&&user?.department==='관리팀')||(role==='대표이사'&&user?.rank==='대표이사')||(role==='상무이사'&&user?.rank==='상무이사');
    if(!allowed)return notify('해당 확인 권한이 없습니다.');
    item.confirmations ||= {}; item.confirmations[role]=currentName(); persist(PAYMENT_KEY,payments); renderAll(); notify(`${role} 확인을 기록했습니다.`);
  }
  function renderReceivables() {
    const list=document.getElementById('mwReceivableList'); list.replaceChildren();
    const visible=receivables.filter(item=>item.dueDate?.startsWith(selectedMonth));if(!visible.length)return list.append(empty('선택한 달의 수금 예정이 없습니다.'));
    visible.forEach(item=>{const row=document.createElement('article');row.className='mw-receivable-row';row.innerHTML=`<div><b>${escapeHtml(item.site)}</b><small>${escapeHtml(item.period)}</small></div><b>${won(item.contract)}</b><b>${won(item.received)}</b><b>${percent(item.received,item.contract)}%</b><b>${won(Math.max(0,item.contract-item.received))}</b><time>${dateLabel(item.dueDate)}</time><div class="mw-inline-actions"><button data-receivable-edit>수정</button><button data-receivable-delete>삭제</button></div>`;row.querySelector('[data-receivable-edit]').addEventListener('click',()=>editReceivable(item));row.querySelector('[data-receivable-delete]').addEventListener('click',()=>removeReceivable(item));list.appendChild(row)});
  }
  function renderSummary() {
    const monthly=payments.filter(item=>item.type==='monthly'&&item.requestDate?.startsWith(selectedMonth)),urgent=payments.filter(item=>item.type==='urgent'&&item.requestDate?.startsWith(selectedMonth));
    const due=receivables.filter(item=>item.dueDate?.startsWith(selectedMonth));
    setText('mwSelectedMonth',new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long'}).format(new Date(`${selectedMonth}-01T00:00:00+09:00`)));
    setText('mwMonthlyTotal',won(sum(monthly,'amount')));setText('mwMonthlyCount',`${monthly.length}건`);
    setText('mwUrgentTotal',won(sum(urgent,'amount')));setText('mwUrgentCount',`${urgent.length}건`);
    setText('mwReceivableTotal',won(due.reduce((total,item)=>total+Math.max(0,item.contract-item.received),0)));setText('mwReceivableCount',`${due.length}건`);
  }

  function changeMonth(delta){const date=new Date(`${selectedMonth}-01T00:00:00+09:00`);date.setMonth(date.getMonth()+delta);selectedMonth=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;renderAll()}
  function editPayment(item){editingPaymentId=item.id;openModal('paymentFormModal');document.getElementById('mwPaymentSite').value=item.site;document.getElementById('mwPaymentType').value=item.type;document.getElementById('mwProcessName').value=item.process;document.getElementById('mwProcessTotal').value=item.processTotal;document.getElementById('mwPlannedAmount').value=item.amount;document.getElementById('mwRequestDate').value=item.requestDate;document.querySelector('#paymentFormModal h2').textContent='예정 지출서 수정';document.getElementById('mwSavePayment').textContent='수정 내용 저장';updatePaymentRate()}
  function removePayment(item,label){if(!confirm(`${item.site} · ${item.process}\n\n${label} 처리할까요? 목록과 월 합계에서 제외됩니다.`))return;payments=payments.filter(entry=>entry.id!==item.id);persist(PAYMENT_KEY,payments);renderAll();notify(`예정 지출서를 ${label} 처리했습니다.`)}
  function editReceivable(item){editingReceivableId=item.id;openModal('receivableFormModal');document.getElementById('mwReceivableSite').value=item.site;document.getElementById('mwSitePeriod').value=item.period;document.getElementById('mwContractAmount').value=item.contract;document.getElementById('mwReceivedAmount').value=item.received;document.getElementById('mwDueDate').value=item.dueDate;document.querySelector('#receivableFormModal h2').textContent='수금 예정 수정';document.getElementById('mwSaveReceivable').textContent='수정 내용 저장';updateReceivableMath()}
  function removeReceivable(item){if(!confirm(`${item.site} 수금 예정 내역을 삭제할까요?`))return;receivables=receivables.filter(entry=>entry.id!==item.id);persist(RECEIVABLE_KEY,receivables);renderAll();notify('수금 예정 내역을 삭제했습니다.')}
  function prunePaidItems(){const today=todayKey(),before=payments.length;payments=payments.filter(item=>!item.requestDate||today<=item.requestDate);if(payments.length!==before)persist(PAYMENT_KEY,payments)}
  function defaultPaymentDate(type){const now=new Date(`${todayKey()}T00:00:00+09:00`);if(type==='urgent'){const days=(8-now.getDay())%7||7;now.setDate(now.getDate()+days)}else{now.setMonth(now.getMonth()+1,10)}return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`}

  function clearPaymentForm(){editingPaymentId=null;['mwProcessName','mwProcessTotal','mwPlannedAmount'].forEach(id=>document.getElementById(id).value='');document.querySelector('#paymentFormModal h2').textContent='예정 지출서 작성';document.getElementById('mwSavePayment').textContent='예정 지출서 저장';updatePaymentRate()}
  function clearReceivableForm(){editingReceivableId=null;['mwContractAmount','mwReceivedAmount'].forEach(id=>document.getElementById(id).value='');document.querySelector('#receivableFormModal h2').textContent='거래처 수금 예정 작성';document.getElementById('mwSaveReceivable').textContent='수금 예정 저장';updateReceivableMath()}
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


/* SOURCE: security.js */
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
        if (session.pending) return showPendingApproval();
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
        <label>부서명<select name="department" required><option value="">선택</option><option>임원</option><option>공무팀</option><option>관리팀</option><option>사인팀</option><option>시공팀</option><option>설계팀</option></select></label>
        <label>직급<select name="rank" required><option value="">선택</option><option>대표이사</option><option>상무이사</option><option>실장</option><option>부장</option><option>차장</option><option>과장</option><option>대리</option><option>주임</option><option>사원</option></select></label>
        <button class="auth-submit">이 기기 등록 신청</button>
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
    const button=event.currentTarget.querySelector('button');setBusy(button,true);setMessage('');
    try{const data=Object.fromEntries(new FormData(event.currentTarget));const result=await api('/employee/register',{method:'POST',body:data,auth:false});if(!result.ok)throw new Error(result.error||'등록하지 못했습니다.');saveToken(result.token);event.currentTarget.reset();showPendingApproval()}catch(error){setMessage(error.message)}finally{setBusy(button,false)}
  }

  async function loginAdmin(event) {
    event.preventDefault();
    await submitAuth(event.currentTarget, '/admin/login');
  }

  function showPendingApproval(){const content=document.getElementById('authContent');content.innerHTML='<h1>관리자 승인 대기</h1><p class="auth-copy">등록 신청이 완료되었습니다. 관리자가 부서와 직급을 확인해 승인하면 이 기기에서 사용할 수 있습니다.</p><button class="auth-submit" id="checkApproval">승인 상태 다시 확인</button><p class="auth-note">관리자 승인 후 위 버튼을 누르거나 앱을 다시 열어주세요.</p>';document.getElementById('checkApproval').addEventListener('click',()=>location.reload())}

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
    window.applyMinWorksAccess?.(user);
    addAccountButton(user);
    document.dispatchEvent(new CustomEvent('minworks:user-ready',{detail:{user}}));
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
    if (strong) strong.textContent = user.role === 'admin' ? name : `${user.department||'부서 미지정'} ${name} ${rank}`;
    if (small) small.textContent = user.role === 'admin' ? rank : `${user.department||'부서 미지정'} · ${rank}`;
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
    row.className = `employee-row ${employee.status === 'active' ? '' : 'inactive'} ${employee.status === 'pending' ? 'pending' : ''}`;
    const info = document.createElement('div');
    const name = document.createElement('b');
    const detail = document.createElement('small');
    name.textContent = `${employee.department||'부서 미지정'} ${employee.name} ${employee.rank}`;
    detail.textContent = `${employee.status === 'pending'?'승인 대기':employee.status === 'active' ? '사용 중' : '접속 중지'} · 등록 ${formatDate(employee.created_at)}`;
    info.append(name, detail);
    const actions = document.createElement('div');
    actions.className = 'employee-actions';
    const edit = document.createElement('button');
    edit.textContent = '부서·직급 수정';
    edit.addEventListener('click', () => editEmployeeProfile(employee));
    const toggle = document.createElement('button');
    toggle.textContent = employee.status === 'pending' ? '가입 승인' : employee.status === 'active' ? '접속 중지' : '다시 허용';
    toggle.addEventListener('click', () => employeeAction(employee, employee.status === 'active' ? 'deactivate' : 'activate'));
    const remove = document.createElement('button');
    remove.className = 'danger';
    remove.textContent = '퇴사자 삭제';
    remove.addEventListener('click', () => employeeAction(employee, 'delete'));
    actions.append(edit, toggle, remove);
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

  async function editEmployeeProfile(employee) {
    const departments=['임원','공무팀','관리팀','사인팀','시공팀','설계팀'];
    const ranks=['대표이사','상무이사','실장','부장','차장','과장','대리','주임','사원'];
    const department=prompt(`부서를 입력하세요.\n${departments.join(' / ')}`,employee.department||'시공팀');if(department===null)return;
    const rank=prompt(`직급을 입력하세요.\n${ranks.join(' / ')}`,employee.rank);if(rank===null)return;
    if(!departments.includes(department)||!ranks.includes(rank))return alert('목록에 있는 부서와 직급을 정확히 입력해 주세요.');
    const result=await api(`/admin/employees/${encodeURIComponent(employee.id)}/update`,{method:'POST',body:{department,rank}});
    if(!result.ok)return alert(result.error||'수정하지 못했습니다.');
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


