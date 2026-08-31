const views = document.querySelectorAll('.view');
const navButtons = document.querySelectorAll('[data-view]');
const titles = {dashboard:'좋은 아침입니다, 재준님',sites:'현장 관리',daily:'공사일보',finance:'자금 현황',issues:'이슈 관리',calendar:'회사 일정',settings:'사용자 설정'};
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
function openDailyEditor(){dailyListScreen.hidden=true;dailyEditor.hidden=false;document.getElementById('openDailyEditor').style.display='none';restoreDailyDraft();window.scrollTo({top:0,behavior:'smooth'})}
function closeDailyEditor(){dailyEditor.hidden=true;dailyListScreen.hidden=false;document.getElementById('openDailyEditor').style.display='flex';window.scrollTo({top:0,behavior:'smooth'})}
document.getElementById('openDailyEditor').addEventListener('click',openDailyEditor);
document.getElementById('closeDailyEditor').addEventListener('click',closeDailyEditor);
document.getElementById('dailyForm').addEventListener('submit',e=>{
  e.preventDefault();
  if(userSettings.photoWarning&&!document.querySelector('#tbmPreview .uploaded-photo, #progressPreview .uploaded-photo')){notify('사진 누락 알림: TBM 또는 현장 사진을 1장 이상 추가해주세요.');return}
  const site=e.currentTarget.querySelector('select').value.replace(' 학생식당','');
  const date=e.currentTarget.querySelector('input[type=date]').value;
  const processes=[...document.querySelectorAll('#processRows .process-row')].filter(r=>r.querySelector('input').value.trim());
  const people=processes.reduce((sum,r)=>sum+(Number(r.querySelector('input[type=number]').value)||0),0);
  const card=document.createElement('button');card.className='report-card';card.dataset.author=currentUser;card.dataset.site=site;
  card.innerHTML=`<span class="report-file-icon"><span class="material-symbols-rounded">description</span></span><div><small>${site}</small><b>${Number(date.slice(5,7))}월 ${Number(date.slice(8,10))}일 공사일보</b><p>공정 ${processes.length}개 · 작업인원 ${people}명 · 작성 완료</p></div><div class="report-author"><span>작성자</span><b>${currentUser} 부장</b><em class="owner-mark">내 일보</em></div><span class="report-status">작성 완료</span>`;
  card.dataset.createdAt=new Date().toISOString();document.getElementById('todayReports').prepend(card);attachReportCard(card);renderCardCheckSummaries();updateSiteManagersFromReports();updateRecentReportLinks();
  notify('공사일보가 날짜별 목록에 추가되었습니다.');closeDailyEditor();if(userSettings.openAfterSubmit)setTimeout(()=>card.click(),250);
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
    const card=document.createElement('div');card.className='uploaded-photo';card.style.backgroundImage=`url(${URL.createObjectURL(file)})`;
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
document.getElementById('createSite').addEventListener('click',()=>{
  const name=document.getElementById('newSiteName').value.trim(),type=document.getElementById('newSiteType').value;
  if(!name){notify('현장명을 입력해주세요.');return}
  const amount=parseMoneyInput(document.getElementById('newSiteAmount').value),extra=parseMoneyInput(document.getElementById('newSiteExtraAmount').value);
  const card=document.createElement('article');card.className='site-card';card.dataset.site=name;card.dataset.amount=amount;card.dataset.extraAmount=extra;card.tabIndex=0;card.innerHTML=`<div class="site-color green"></div><div class="site-main"><div class="site-top"><span class="tag">${type}</span><span>신규</span></div><h3>${name}</h3><p>공사금액 ${won(amount)} · 추가 예상 ${won(extra)}</p><div class="progress-row"><div class="progress"><i style="width:0%"></i></div><b>0%</b></div></div>`;
  document.querySelector('.site-list').prepend(card);attachHomeSiteCard(card);
  const row=document.createElement('div');row.className='table-row site-table-row';row.dataset.siteRow=name;row.innerHTML=`<span><b>${name}</b><small>${type} · 공사금액 ${won(amount)}</small></span><span class="site-manager">일보 미등록</span><button class="progress-edit" data-progress="0"><div class="inline-progress"><i style="width:0%"></i></div><b>0%</b><span class="material-symbols-rounded">edit</span></button><button class="recent-report-link" data-report-site="${name}">일보 없음</button><span><em class="status ok">신규</em></span>`;
  document.querySelector('.site-table').appendChild(row);attachRecentReportLink(row.querySelector('.recent-report-link'));
  ['issueSite','paymentSite','receivableSite'].forEach(id=>{const option=document.createElement('option');option.textContent=name;document.getElementById(id)?.appendChild(option)});
  const dailySite=document.querySelector('#dailyForm select');if(dailySite){const option=document.createElement('option');option.textContent=name;dailySite.appendChild(option)}
  let budgets=document.getElementById('siteBudgetSummary');if(!budgets){budgets=document.createElement('section');budgets.id='siteBudgetSummary';budgets.className='site-budget-summary';budgets.innerHTML='<div class="panel-head"><div><p class="eyebrow">SITE BUDGET</p><h2>현장 계약금액</h2></div></div>';document.querySelector('.finance-tabs').before(budgets)}
  const budget=document.createElement('article');budget.innerHTML=`<div><b>${name}</b><small>${type}</small></div><span>공사금액 <strong>${won(amount)}</strong></span><span>추가 예상 <strong>${won(extra)}</strong></span><em>총 예상 ${won(amount+extra)}</em>`;budgets.appendChild(budget);
  modal.classList.remove('show');applyExtendedSettings();notify('새 현장과 공사금액을 등록했습니다.');
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

// 모바일 단계형 공사일보
const dailyChildren=[...document.querySelector('.daily-form').children];
const reportGroups=[[dailyChildren[0]],[dailyChildren[1],dailyChildren[2]],[dailyChildren[3],dailyChildren[4]]];
let reportStep=0;
const prevBtn=document.getElementById('reportPrev'),nextBtn=document.getElementById('reportNext'),submitBtn=document.getElementById('reportSubmit');
function renderReportStep(){
  dailyChildren.forEach(x=>x.classList.remove('step-visible'));
  reportGroups[reportStep].forEach(x=>x.classList.add('step-visible'));
  document.querySelectorAll('.report-stepper div').forEach((x,i)=>x.classList.toggle('active',i<=reportStep));
  prevBtn.style.visibility=reportStep===0?'hidden':'visible';nextBtn.style.display=reportStep===2?'none':'inline-block';submitBtn.style.display=reportStep===2?'inline-block':'none';
}
prevBtn.addEventListener('click',()=>{if(reportStep>0){reportStep--;renderReportStep();window.scrollTo({top:0,behavior:'smooth'})}});
nextBtn.addEventListener('click',()=>{if(reportStep<2){reportStep++;renderReportStep();window.scrollTo({top:0,behavior:'smooth'})}});
renderReportStep();

// 공정 입력줄 추가
document.getElementById('addProcess').addEventListener('click',()=>{
  const rows=document.getElementById('processRows');
  const number=rows.children.length+1;
  const row=document.createElement('div');
  row.className='process-row';
  row.innerHTML=`<label><span>공정 ${number}</span><input placeholder="공정명"></label><label><span>인원</span><input type="number" min="0"><i>명</i></label><label><span>작업내용</span><input placeholder="세부 작업내용"></label>`;
  rows.appendChild(row);
  row.querySelector('input').focus();
  notify(`공정 ${number} 입력줄을 추가했습니다.`);
});

// 완료된 공사일보: 작성자만 수정, 그 외 사용자는 열람 전용
const currentUser='김재준';
const reportViewer=document.getElementById('reportViewer');
const checkRecords={
  '연세대학교 고를샘':[{name:'최진영 대표',time:'오전 9:18'},{name:'박민수 과장',time:'오전 9:24'}],
  '에잇세컨즈 AK분당점':[{name:'강신윤 대표',time:'오전 10:05'}],
  '알뜰주유소 시설개선':[],
  '힐스테이트 아산 커뮤니티':[{name:'김재준 부장',time:'어제 오후 6:20'}]
};
let activeReportSite='';
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
  activeReportSite=card.dataset.site;
  document.getElementById('viewerSite').textContent=card.dataset.site;
  document.getElementById('viewerAuthor').textContent=card.querySelector('.report-author b').textContent;
  document.getElementById('editOwnReport').classList.toggle('visible',card.dataset.author===currentUser);
  renderCheckHistory();
  reportViewer.classList.add('show');
})}
document.querySelectorAll('.report-card').forEach(attachReportCard);
document.getElementById('closeReportViewer').addEventListener('click',()=>reportViewer.classList.remove('show'));
reportViewer.querySelector('.viewer-backdrop').addEventListener('click',()=>reportViewer.classList.remove('show'));
document.getElementById('editOwnReport').addEventListener('click',()=>{reportViewer.classList.remove('show');openDailyEditor();notify('내 공사일보 수정 화면을 열었습니다.')});
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
const settingDefaults={fontSize:'normal',density:'comfortable',accent:'lime',contrast:false,displayMode:'pc',startView:'dashboard',siteCount:'4',weather:true,financeSummary:true,calendarSummary:true,processRows:'5',photoQuality:'고화질',autosave:true,photoWarning:true,openAfterSubmit:false,urgentNotice:true,approvalNotice:true,moneyNotice:true,calendarNotice:true,quietStart:'19:00',quietEnd:'07:00',role:'시공팀장',mySitesFirst:true,hideMoney:false,retention:'1년',wifiOnly:false,selectedSites:['연세대학교','에잇세컨즈','알뜰주유소','힐스테이트']};
let userSettings={...settingDefaults,...JSON.parse(localStorage.getItem(settingsKey)||'{}')};
const accentColors={lime:'#7fbc03',blue:'#327ae8',orange:'#ef8d23',charcoal:'#252525'};
function saveUserSettings(){localStorage.setItem(settingsKey,JSON.stringify(userSettings));applyUserSettings();notify('설정이 저장되었습니다.');}
function applyUserSettings(){
  document.documentElement.style.setProperty('--accent',accentColors[userSettings.accent]||accentColors.lime);
  document.documentElement.style.setProperty('--green',accentColors[userSettings.accent]||accentColors.lime);
  document.body.classList.toggle('font-small',userSettings.fontSize==='small');document.body.classList.toggle('font-large',userSettings.fontSize==='large');document.body.classList.toggle('density-compact',userSettings.density==='compact');document.body.classList.toggle('high-contrast',!!userSettings.contrast);document.body.classList.toggle('hide-weather',!userSettings.weather);document.body.classList.toggle('hide-finance-summary',!userSettings.financeSummary);document.body.classList.toggle('hide-calendar-summary',!userSettings.calendarSummary);document.body.classList.toggle('hide-money',!!userSettings.hideMoney);
  applyExtendedSettings();
}
function syncSettingsUI(){document.querySelectorAll('[data-setting]').forEach(g=>g.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.value===String(userSettings[g.dataset.setting]))));document.querySelectorAll('[data-toggle-setting]').forEach(i=>i.checked=!!userSettings[i.dataset.toggleSetting]);document.querySelectorAll('[data-select-setting]').forEach(i=>i.value=userSettings[i.dataset.selectSetting]??i.value);document.querySelectorAll('[data-input-setting]').forEach(i=>i.value=userSettings[i.dataset.inputSetting]??i.value);}
document.querySelectorAll('[data-settings-group]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-settings-group]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('[data-settings-panel]').forEach(x=>x.classList.toggle('active',x.dataset.settingsPanel===b.dataset.settingsGroup));}));
document.querySelectorAll('[data-setting] button').forEach(b=>b.addEventListener('click',()=>{userSettings[b.parentElement.dataset.setting]=b.dataset.value;syncSettingsUI();saveUserSettings();}));
document.querySelectorAll('[data-toggle-setting]').forEach(i=>i.addEventListener('change',()=>{userSettings[i.dataset.toggleSetting]=i.checked;saveUserSettings();}));document.querySelectorAll('[data-select-setting]').forEach(i=>i.addEventListener('change',()=>{userSettings[i.dataset.selectSetting]=i.value;saveUserSettings();}));document.querySelectorAll('[data-input-setting]').forEach(i=>i.addEventListener('change',()=>{userSettings[i.dataset.inputSetting]=i.value;saveUserSettings();}));
document.getElementById('resetSettings').addEventListener('click',()=>{userSettings={...settingDefaults};syncSettingsUI();saveUserSettings();});document.getElementById('exportMySettings').addEventListener('click',()=>notify('내 설정 파일을 준비했습니다. 실제 계정 저장은 서버 연결 후 활성화됩니다.'));
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
const issueDetailActions=document.createElement('div');issueDetailActions.className='issue-detail-actions';issueDetailActions.innerHTML='<div class="issue-status-row"><span id="peekDue">기한 미정</span><button id="toggleIssueStatus">완료 처리</button></div><section class="issue-comments"><b>댓글 <em id="peekCommentCount">0</em></b><div id="peekCommentList"><p><strong>김재준 부장</strong> 발주처 확인 후 공유하겠습니다.</p></div><label><input id="issueCommentInput" placeholder="댓글을 입력하세요"><button id="addIssueComment">등록</button></label></section>';issuePeek.querySelector('section').appendChild(issueDetailActions);let activeIssueCard=null;
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
document.getElementById('addIssueComment').addEventListener('click',()=>{const input=document.getElementById('issueCommentInput'),text=input.value.trim();if(!text||!activeIssueCard)return;const comment=document.createElement('p');comment.innerHTML=`<strong>김재준 부장</strong> ${text}`;document.getElementById('peekCommentList').appendChild(comment);activeIssueCard.dataset.comments=String(Number(activeIssueCard.dataset.comments||0)+1);activeIssueCard.querySelector('.issue-meta span:last-child').innerHTML=`<i class="material-symbols-rounded">chat</i>댓글 ${activeIssueCard.dataset.comments}`;document.getElementById('peekCommentCount').textContent=activeIssueCard.dataset.comments;input.value='';notify('댓글을 등록했습니다.');});refreshIssueSummary();

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
  document.body.classList.toggle('force-mobile',userSettings.displayMode==='mobile'&&innerWidth>700);
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
const draftKey='minWorksDailyDraft';
function saveDailyDraft(){if(!userSettings.autosave)return;const fields=[...document.querySelectorAll('#dailyForm input, #dailyForm select, #dailyForm textarea')];localStorage.setItem(draftKey,JSON.stringify(fields.map(field=>({name:field.name||field.placeholder||field.type,value:field.value}))));}
function restoreDailyDraft(){if(!userSettings?.autosave)return;try{const saved=JSON.parse(localStorage.getItem(draftKey)||'[]'),fields=[...document.querySelectorAll('#dailyForm input, #dailyForm select, #dailyForm textarea')];saved.forEach((item,index)=>{if(fields[index]&&item.value)fields[index].value=item.value});if(saved.length)notify('자동 저장된 공사일보 초안을 불러왔습니다.')}catch{localStorage.removeItem(draftKey)}}
document.getElementById('dailyForm').addEventListener('input',()=>{clearTimeout(window.minWorksDraftTimer);window.minWorksDraftTimer=setTimeout(saveDailyDraft,350)});

// 설정 내보내기를 실제 JSON 파일로 제공
document.getElementById('exportMySettings').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(userSettings,null,2)],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='min-works-settings.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);});

// 시작 화면 설정은 새로 열 때 적용
if(userSettings.startView&&userSettings.startView!=='dashboard')showView(userSettings.startView);
applyExtendedSettings();

