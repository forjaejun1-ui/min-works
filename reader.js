(()=>{'use strict';
const API='https://min-works-api.forjaejun.workers.dev';
const SESSION_KEY='minWorksSessionV1';
const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const day=(offset=0)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+offset*86400000));
const safePhoto=src=>{try{const url=new URL(src,location.href);return /^data:image\/(png|jpeg|webp|gif);/i.test(src)||url.protocol==='https:'||url.origin===location.origin?src:''}catch{return''}};
const number=value=>Number.isFinite(Number(value))&&value!==null&&value!==''?Number(value):null;

let selected=day(),groups=[],siteIndex=0,reportIndex=0,busy=false,lastFingerprint='',lastToday=day();
let currentPhotos=[],photoIndex=0,suppressClickUntil=0,readTimer=null;
const dayReports=new Map();
const previewUrls=new Map();
const previewDb=new Promise(resolve=>{
  if(!('indexedDB' in window))return resolve(null);
  const request=indexedDB.open('minworks-plus-photo-previews-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('photos');
  request.onsuccess=()=>{const db=request.result;resolve(db);const cursor=db.transaction('photos','readwrite').objectStore('photos').openCursor();cursor.onsuccess=()=>{const row=cursor.result;if(!row)return;if(Date.now()-row.value.savedAt>3*86400000)row.delete();row.continue()}};request.onerror=()=>resolve(null);
});
async function cachedPreview(src){
  if(previewUrls.has(src))return previewUrls.get(src);
  const db=await previewDb;if(!db)return null;
  return new Promise(resolve=>{const request=db.transaction('photos','readonly').objectStore('photos').get(src);request.onsuccess=()=>{const entry=request.result;if(!entry?.blob||Date.now()-entry.savedAt>3*86400000)return resolve(null);const url=URL.createObjectURL(entry.blob);previewUrls.set(src,url);resolve(url)};request.onerror=()=>resolve(null)});
}
async function cachePreview(src,image){
  if(!image.naturalWidth||image.naturalWidth<=1080)return;
  try{
    const db=await previewDb;if(!db)return;
    const scale=Math.min(1,1080/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.68));if(!blob)return;
    db.transaction('photos','readwrite').objectStore('photos').put({blob,savedAt:Date.now()},src);
  }catch{} // Signed images without canvas permission still display normally.
}
async function hydrateThumb(image,src){
  const cached=await cachedPreview(src);if(!image.isConnected)return;
  image.crossOrigin='anonymous';image.src=cached||src;
  if(!cached)image.addEventListener('load',()=>cachePreview(src,image),{once:true});
}

function scopeKey(){
  const token=localStorage.getItem(SESSION_KEY)||'guest';
  let hash=2166136261;
  for(let i=0;i<token.length;i++)hash=Math.imul(hash^token.charCodeAt(i),16777619);
  return 'minworks-plus-seen-v1-'+(hash>>>0).toString(36);
}
let seenScope=scopeKey();
function readSeen(){try{return new Set(JSON.parse(localStorage.getItem(seenScope)||'[]'))}catch{return new Set()}}
let seen=readSeen();
function syncSeenScope(){const next=scopeKey();if(next!==seenScope){seenScope=next;seen=readSeen()}}
function reportKey(report){return [report.id||[report.site,report.reportDate,report.author,report.time].join(':'),report.createdAt||report.reportDate||''].join('|')}
function saveSeen(){try{localStorage.setItem(seenScope,JSON.stringify([...seen].slice(-1500)))}catch{}}
function unread(date){return (dayReports.get(date)||[]).filter(report=>!seen.has(reportKey(report))).length}
function pruneHistory(){
  const allowed=new Set([day(),day(-1)]);
  for(const date of dayReports.keys())if(!allowed.has(date))dayReports.delete(date);
  const visibleKeys=new Set([...dayReports.values()].flatMap(reports=>reports.map(reportKey)));
  const retained=new Set([...seen].filter(key=>visibleKeys.has(key)));
  if(retained.size!==seen.size){seen=retained;saveSeen()}
}
function updateUnread(){
  for(const [date,badge] of [[day(),'#todayUnread'],[day(-1),'#yesterdayUnread']]){
    const count=unread(date),node=$(badge);
    node.hidden=!count;
    node.textContent=count?'+'+count:'';
    node.setAttribute('aria-label',count?`읽지 않은 공사일보 ${count}건`:'');
  }
}
const current=()=>groups[siteIndex]?.reports[reportIndex];
function markVisible(){
  clearTimeout(readTimer);
  const report=current(),date=selected;
  if(!report)return;
  const key=reportKey(report);
  readTimer=setTimeout(()=>{
    if(selected!==date||reportKey(current()||{})!==key||document.hidden||!window.MINWORKS_PLUS_READY)return;
    syncSeenScope();
    if(!seen.has(key)){seen.add(key);saveSeen();updateUnread()}
  },800);
}
function pager(){
  $('#pagePosition').textContent=groups.length?`${siteIndex+1} / ${groups.length} 현장`:'0 / 0 현장';
  $('#prevSite').disabled=siteIndex<=0;
  $('#nextSite').disabled=siteIndex>=groups.length-1;
  $('#swipeHint').textContent=groups.length>1?'좌우로 넘겨 현장 보기':'15초마다 자동 갱신';
}
function closePhotos(){if($('#photoDialog').open)$('#photoDialog').close();$('#largePhoto').removeAttribute('src');currentPhotos=[]}
function clear(){clearTimeout(readTimer);groups=[];siteIndex=reportIndex=0;lastFingerprint='';$('#reports').replaceChildren();closePhotos();pager()}
function processRows(processes){
  if(!processes?.length)return '<p class="process-empty">등록된 공정 정보가 없습니다.</p>';
  return processes.map(process=>{
    const cumulative=number(process.cumulative);
    return `<button type="button" class="process-row" aria-expanded="false" aria-label="${esc(`${process.name||'미등록'}, ${process.work||'작업내용 없음'}, 금일 ${number(process.today)??0}명, 누계 ${cumulative===null?'미입력':cumulative+'명'}`)}"><b>${esc(process.name||'미등록')}</b><span class="process-work">${esc(process.work||'작업내용 없음')}</span><strong>${number(process.today)??0}<small>명</small></strong><strong class="cumulative">${cumulative===null?'—':cumulative+'<small>명</small>'}</strong></button>`;
  }).join('');
}
function draw(direction=0){
  const report=current();pager();
  if(!report){$('#reports').innerHTML='<div class="empty"><b>등록된 일보가 없습니다</b><span>날짜를 선택해 이전 일보를 확인하세요.</span></div>';return}
  const photos=(report.photos||[]).filter(photo=>safePhoto(photo.src));
  const progress=Math.min(100,Math.max(0,number(report.progress)??0));
  const group=groups[siteIndex];
  $('#reports').innerHTML=`<article class="report ${direction>0?'slide-next':direction<0?'slide-prev':''}" aria-label="${esc(report.site)} 공사일보">
    <div class="report-top"><div><span class="report-kicker ${groups.length>1?'swipe-guide':''}">${groups.length>1?'← 좌우로 스와이프해 다른 현장 보기 →':'DAILY REPORT'}</span><h2>${esc(report.site)}</h2></div><time>${esc(report.time||'')}</time></div>
    <div class="site-progress"><div><span>공정률</span><b>${progress}%</b><span class="today-total">금일 총인원 <strong>${number(report.totalPeople)??0}명</strong></span></div><div class="progress" role="progressbar" aria-label="현장 공정률" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i></div></div>
    <div class="process-list" aria-label="공정별 작업내용과 인원"><div class="process-head"><span>공정</span><span>작업내용</span><span>금일</span><span>누계</span></div>${processRows(report.processes)}${report.note?`<p class="report-note"><b>특이사항</b> ${esc(report.note)}</p>`:''}</div>
    <div class="photos" aria-label="현장사진">${photos.slice(0,3).map((photo,index)=>`<button data-photo="${index}" aria-label="${esc(report.site)} 사진 ${index+1} 보기"><img draggable="false" loading="${index?'lazy':'eager'}" decoding="async" ${index?'':'fetchpriority="high"'} data-source="${esc(safePhoto(photo.src))}" alt="현장사진 ${index+1}">${index===2&&photos.length>3?`<em>+${photos.length-2}</em>`:''}</button>`).join('')||'<small>등록된 사진 없음</small>'}</div>
    <div class="meta"><span>${esc(report.author||'작성자 미등록')}</span><span>${esc(report.reportDate||'—')}</span></div>
    ${group.reports.length>1?`<div class="report-bottom"><select id="reportSelect" aria-label="이 현장의 일보 선택">${group.reports.map((item,index)=>`<option value="${index}" ${index===reportIndex?'selected':''}>${index+1}번째 일보 · ${esc(item.author||item.time||'작성자 미등록')}</option>`).join('')}</select></div>`:''}
  </article>`;
  $('#reportSelect')?.addEventListener('change',event=>{reportIndex=Number(event.target.value);closePhotos();draw()});
  $('#reports').querySelectorAll('.process-row').forEach(row=>row.onclick=()=>{
    const expanded=row.getAttribute('aria-expanded')==='true';
    row.setAttribute('aria-expanded',String(!expanded));
  });
  $('#reports').querySelectorAll('[data-photo]').forEach(button=>button.onclick=()=>{
    currentPhotos=photos;photoIndex=Number(button.dataset.photo);showPhoto();$('#photoDialog').showModal();
  });
  $('#reports').querySelectorAll('.photos img').forEach(image=>hydrateThumb(image,image.dataset.source));
  markVisible();
}
function render(data){
  const oldSite=groups[siteIndex]?.key,oldId=current()?.id,bySite=new Map();
  for(const report of data.reports||[]){const key=report.site||'현장 미등록';if(!bySite.has(key))bySite.set(key,{key,reports:[]});bySite.get(key).reports.push(report)}
  groups=[...bySite.values()];
  siteIndex=Math.max(0,groups.findIndex(group=>group.key===oldSite));
  reportIndex=Math.max(0,groups[siteIndex]?.reports.findIndex(report=>report.id===oldId)??0);
  draw();
  if($('#photoDialog').open){
    if(current()?.id!==oldId)closePhotos();
    else{
      const src=currentPhotos[photoIndex]?.src;
      currentPhotos=(current().photos||[]).filter(photo=>safePhoto(photo.src));
      photoIndex=currentPhotos.findIndex(photo=>photo.src===src);
      if(photoIndex<0)closePhotos();else showPhoto();
    }
  }
}
function move(delta){const next=siteIndex+delta;if(next<0||next>=groups.length)return;siteIndex=next;reportIndex=0;closePhotos();draw(delta)}
async function showPhoto(){
  const src=safePhoto(currentPhotos[photoIndex]?.src||'');
  $('#largePhoto').removeAttribute('src');
  $('#photoCount').textContent=`${photoIndex+1} / ${currentPhotos.length}`;
  $('#prevPhoto').disabled=photoIndex===0;$('#nextPhoto').disabled=photoIndex===currentPhotos.length-1;
  const cached=await cachedPreview(src);if(currentPhotos[photoIndex]?.src===src&&$('#photoDialog').open)$('#largePhoto').src=cached||src;
}
async function fetchDay(date,token){
  const response=await fetch(API+'/daily-reader?date='+encodeURIComponent(date),{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  if(!response.ok){
    if([401,403].includes(response.status))window.MINWORKS_PLUS_AUTH?.check();
    throw Error(response.status===403?'관리자가 지정한 계정만 열람할 수 있습니다.':response.status===401?'로그인이 만료되었습니다. 다시 연결해 주세요.':'연결이 끊겼습니다. 마지막 조회 자료를 표시합니다.');
  }
  return response.json();
}
async function load(){
  if(busy||!window.MINWORKS_PLUS_READY)return;
  busy=true;$('#refresh').disabled=true;
  const requested=selected;
  try{
    const token=localStorage.getItem(SESSION_KEY);
    if(!token){clear();$('#reports').innerHTML='<div class="empty"><b>로그인이 필요합니다</b><span>직원 기기를 연결해 주세요.</span></div>';$('#sync').textContent='로그인 대기';return}
    syncSeenScope();
    const dates=[...new Set([requested,day(),day(-1)])];
    const responses=await Promise.all(dates.map(date=>fetchDay(date,token)));
    if(selected!==requested)return;
    const byDate=new Map(dates.map((date,index)=>[date,responses[index]]));
    for(const [date,data] of byDate)dayReports.set(date,data.reports||[]);
    pruneHistory();
    const todayData=byDate.get(day());
    const active=number(todayData?.activeSiteCount);
    $('#activeSiteCount').textContent=active===null?'—':`+${active.toLocaleString('ko-KR')}`;
    updateUnread();
    const data=byDate.get(requested),fingerprint=JSON.stringify(data);
    if(fingerprint!==lastFingerprint){render(data);lastFingerprint=fingerprint}
    $('#notice').textContent='';
    $('#sync').textContent=new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+' 갱신';
  }catch(error){$('#notice').textContent=error.message;$('#sync').textContent='연결 확인 필요'}
  finally{busy=false;$('#refresh').disabled=false;if(selected!==requested)load()}
}
function select(date){
  selected=[day(),day(-1)].includes(date)?date:day();
  date=selected;
  $('#today').classList.toggle('selected',date===day());
  $('#yesterday').classList.toggle('selected',date===day(-1));
  $('#summaryLabel').textContent=date===day()?'오늘 현장 보고':date===day(-1)?'전일 현장 보고':date+' 현장 보고';
  clear();load();
}
const surface=$('#reports');
function attachSwipe(element,change,threshold){
  let start=null;
  const begin=(x,y)=>{start={x,y}};
  const end=(x,y)=>{
    if(!start)return;
    const dx=x-start.x,dy=y-start.y;start=null;
    if(Math.abs(dx)>=threshold&&Math.abs(dx)>Math.abs(dy)*1.25){suppressClickUntil=Date.now()+100;change(dx<0?1:-1)}
  };
  element.addEventListener('touchstart',event=>{if(event.touches.length!==1||event.target.closest('select'))return;begin(event.touches[0].clientX,event.touches[0].clientY)},{passive:true});
  element.addEventListener('touchmove',event=>{if(!start||event.touches.length!==1)return;const dx=event.touches[0].clientX-start.x,dy=event.touches[0].clientY-start.y;if(Math.abs(dx)>15&&Math.abs(dx)>Math.abs(dy)*1.2)event.preventDefault()},{passive:false});
  element.addEventListener('touchend',event=>{if(event.changedTouches.length)end(event.changedTouches[0].clientX,event.changedTouches[0].clientY)},{passive:true});
  element.addEventListener('touchcancel',()=>start=null,{passive:true});
  element.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'||!event.isPrimary||event.button!==0||event.target.closest('select'))return;begin(event.clientX,event.clientY)});
  element.addEventListener('pointerup',event=>{if(event.pointerType!=='touch')end(event.clientX,event.clientY)});
  element.addEventListener('pointercancel',event=>{if(event.pointerType!=='touch')start=null});
}
attachSwipe(surface,delta=>move(delta),55);
surface.addEventListener('click',event=>{if(Date.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation()}},true);
surface.addEventListener('dragstart',event=>event.preventDefault());
surface.addEventListener('keydown',event=>{if(event.target.closest('select'))return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();move(event.key==='ArrowRight'?1:-1)}});
$('#prevSite').onclick=()=>move(-1);$('#nextSite').onclick=()=>move(1);
$('#today').onclick=()=>select(day());$('#yesterday').onclick=()=>select(day(-1));
$('#refresh').onclick=load;
$('#closePhoto').onclick=closePhotos;
$('#prevPhoto').onclick=()=>{if(photoIndex>0){photoIndex--;showPhoto()}};
$('#nextPhoto').onclick=()=>{if(photoIndex<currentPhotos.length-1){photoIndex++;showPhoto()}};
const downloadDialog=$('#photoDownloadDialog'),downloadStatus=$('#downloadStatus');
$('#downloadPhoto').onclick=()=>{downloadStatus.textContent='';downloadDialog.showModal()};
$('#cancelDownload').onclick=()=>downloadDialog.close();
const crcTable=Uint32Array.from({length:256},(_,index)=>{let value=index;for(let bit=0;bit<8;bit++)value=value&1?0xedb88320^(value>>>1):value>>>1;return value>>>0});
function crc32(bytes){let crc=-1;for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);return(crc^-1)>>>0}
function zipPhotos(files){
  const encoder=new TextEncoder(),parts=[],directory=[];let offset=0;
  for(const file of files){
    const name=encoder.encode(file.name),data=file.data,crc=crc32(data),header=new Uint8Array(30+name.length),view=new DataView(header.buffer);
    view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint32(14,crc,true);view.setUint32(18,data.length,true);view.setUint32(22,data.length,true);view.setUint16(26,name.length,true);header.set(name,30);parts.push(header,data);
    const entry=new Uint8Array(46+name.length),central=new DataView(entry.buffer);
    central.setUint32(0,0x02014b50,true);central.setUint16(4,20,true);central.setUint16(6,20,true);central.setUint32(16,crc,true);central.setUint32(20,data.length,true);central.setUint32(24,data.length,true);central.setUint16(28,name.length,true);central.setUint32(42,offset,true);entry.set(name,46);directory.push(entry);offset+=header.length+data.length;
  }
  const end=new Uint8Array(22),view=new DataView(end.buffer);view.setUint32(0,0x06054b50,true);view.setUint16(8,files.length,true);view.setUint16(10,files.length,true);view.setUint32(12,directory.reduce((sum,entry)=>sum+entry.length,0),true);view.setUint32(16,offset,true);
  return new Blob([...parts,...directory,end],{type:'application/zip'});
}
async function photoFile(photo,index){
  const response=await fetch(safePhoto(photo.src),{cache:'no-store'});
  if(!response.ok)throw Error(`사진 ${index+1}을 불러오지 못했어요.`);
  const blob=await response.blob(),type=blob.type.split(';')[0],ext=type==='image/png'?'png':type==='image/webp'?'webp':type==='image/gif'?'gif':type==='image/svg+xml'?'svg':'jpg';
  return{name:`현장사진_${String(index+1).padStart(2,'0')}.${ext}`,data:new Uint8Array(await blob.arrayBuffer()),blob};
}
function saveBlob(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
async function downloadPhotos(all){
  const buttons=[$('#downloadCurrent'),$('#downloadAll')];buttons.forEach(button=>button.disabled=true);
  try{
    const indices=all?currentPhotos.map((_,index)=>index):[photoIndex];
    if(!indices.length)throw Error('저장할 사진이 없어요.');
    const files=[];
    for(const index of indices){downloadStatus.textContent=`사진 ${files.length+1} / ${indices.length} 준비 중`;files.push(await photoFile(currentPhotos[index],index))}
    if(all)saveBlob(zipPhotos(files),`민웍스_현장사진_${selected}.zip`);
    else saveBlob(files[0].blob,files[0].name);
    downloadDialog.close();
  }catch(error){downloadStatus.textContent=error.message||'사진 저장에 실패했어요. 다시 시도해 주세요.'}
  finally{buttons.forEach(button=>button.disabled=false)}
}
$('#downloadCurrent').onclick=()=>downloadPhotos(false);
$('#downloadAll').onclick=()=>downloadPhotos(true);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
window.addEventListener('storage',event=>{if(event.key===SESSION_KEY){syncSeenScope();load()}else if(event.key===seenScope){seen=readSeen();updateUnread()}});
setInterval(()=>{if(document.hidden)return;const today=day();if(today!==lastToday){const wasToday=selected===lastToday;lastToday=today;if(wasToday||![today,day(-1)].includes(selected))return select(today)}load()},15000);
window.addEventListener('minworks:plus-ready',load);
select(selected);

const photoStage=$('.photo-stage');
attachSwipe(photoStage,delta=>{const next=photoIndex+delta;if(next>=0&&next<currentPhotos.length){photoIndex=next;showPhoto()}},45);
photoStage.addEventListener('dragstart',event=>event.preventDefault());
$('#photoDialog').addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();const next=photoIndex+(event.key==='ArrowRight'?1:-1);if(next>=0&&next<currentPhotos.length){photoIndex=next;showPhoto()}}});
if('serviceWorker' in navigator&&!['localhost','127.0.0.1'].includes(location.hostname))navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
