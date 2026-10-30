
  (()=>{'use strict';
    const bridge=window.parent!==window ? window.parent.MIN_WORKS_VENDORS : null;
    if(!bridge){document.body.innerHTML='<main style="padding:32px;font-family:sans-serif"><h2>MIN WORKS 협력업체</h2><p>민웍스에 로그인한 뒤 협력업체 메뉴를 열어주세요.</p><a href="./#vendors" target="_top">민웍스 열기</a></main>';return}
    const FAVORITES='minWorksVendorFavoritesV1:'+bridge.userId();
    let favorites;try{favorites=new Set(JSON.parse(localStorage.getItem(FAVORITES)||'[]'))}catch{favorites=new Set()}
    let revision='',busy=false;
    function applyShared(data){revision=data.revision;entries=data.entries.map(x=>({...normalize(x),favorite:favorites.has(x.id)}));}

    const seed=JSON.parse(document.getElementById('seed-data').textContent);
    const regionInfo={seoul:{label:'서울',x:155,y:150,dx:26},incheon:{label:'인천',x:106,y:170,dx:-52},gyeonggi:{label:'경기',x:176,y:204,dx:25},chungbuk:{label:'충북',x:225,y:247,dx:24},daejeon:{label:'대전',x:172,y:277,dx:-51},jeolla:{label:'전라',x:130,y:370,dx:-52},gwangju:{label:'광주',x:149,y:371,dx:25},daegu:{label:'대구',x:280,y:312,dx:23},busan:{label:'부산',x:327,y:370,dx:23},jeju:{label:'제주',x:111,y:515,dx:24}};
    function text(v){return String(v??'').trim()}
    function regionGroup(raw){raw=text(raw).replace(/\s/g,'');if(raw==='서울')return 'seoul';if(raw==='인천')return 'incheon';if(raw==='대전')return 'daejeon';if(raw==='충북'||raw==='충청북도')return 'chungbuk';if(raw==='전라'||raw==='전북'||raw==='전남'||raw==='전라북도'||raw==='전라남도')return 'jeolla';if(raw==='광주')return 'gwangju';if(raw==='대구')return 'daegu';if(raw==='부산')return 'busan';if(raw==='제주')return 'jeju';if(raw==='경기'||raw==='일산'||raw.startsWith('경기')||raw==='경기도')return 'gyeonggi';return 'unlocated'}
    function normalize(x){return {id:text(x.id)||'new-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),name:text(x.name).slice(0,100),trade:text(x.trade).slice(0,60),person:text(x.person).slice(0,100),mobile:text(x.mobile).slice(0,40),landline:text(x.landline).slice(0,40),fax:text(x.fax).slice(0,40),email:text(x.email).slice(0,120),regionRaw:text(x.regionRaw).slice(0,50),region:regionGroup(x.regionRaw),note:text(x.note).slice(0,800),owner:text(x.owner).slice(0,100),sourceRow:Number.isFinite(+x.sourceRow)?+x.sourceRow:null,favorite:!!x.favorite};}
    let entries=[];
    const state={region:'all',trade:'',query:'',favorites:false,sortByName:false,selectedId:'',editingId:''};
    const $=id=>document.getElementById(id);let toastTimer;
    function toast(message){const el=$('toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3000)}
    async function persist(next){
      if(busy)return false;
      busy=true;document.querySelectorAll('#vendorForm button,#addBtn,#editBtn,#deleteBtn,#importBtn,#refreshBtn').forEach(b=>b.disabled=true);
      $('saveStatus').textContent='회사 자료에 저장 중…';
      try{
        const clean=next.map(({favorite,...item})=>item);
        const saved=await bridge.save(clean,revision);applyShared(saved);
        $('saveStatus').textContent='공유 저장 완료 · '+new Date(saved.updatedAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
        render();return true;
      }catch(error){$('saveStatus').textContent='저장되지 않음 · 입력 내용을 확인해 주세요';toast(error.message||'저장하지 못했습니다.');return false}
      finally{busy=false;document.querySelectorAll('#vendorForm button,#addBtn,#editBtn,#deleteBtn,#importBtn,#refreshBtn').forEach(b=>b.disabled=false);window.parent.MIN_WORKS_VENDOR_DIRTY=$('modal').classList.contains('open');}
    }
    function matchBase(x){const q=state.query.toLocaleLowerCase();if(state.trade&&x.trade!==state.trade)return false;if(state.favorites&&!x.favorite)return false;if(!q)return true;return [x.name,x.trade,x.person,x.mobile,x.landline,x.email,x.regionRaw,x.note,x.owner].join(' ').toLocaleLowerCase().includes(q)}
    function baseEntries(){return entries.filter(matchBase)}
    function visibleEntries(){const base=baseEntries();const filtered=state.region==='all'?base:base.filter(x=>x.region===state.region);return filtered.sort((a,b)=>state.sortByName?a.name.localeCompare(b.name,'ko'):((b.favorite?1:0)-(a.favorite?1:0))||((a.sourceRow||9999)-(b.sourceRow||9999)))}
    function renderMarkers(base){const holder=$('markers');holder.replaceChildren();const shortcuts=$('regionShortcuts');shortcuts.replaceChildren();for(const [key,info] of Object.entries(regionInfo)){const count=base.filter(x=>x.region===key).length;if(!count)continue;const shortcut=document.createElement('button');shortcut.type='button';shortcut.textContent=info.label+' '+count;shortcut.classList.toggle('active',state.region===key);shortcut.setAttribute('aria-pressed',String(state.region===key));shortcut.onclick=()=>selectRegion(key);shortcuts.append(shortcut);const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('class','marker'+(state.region===key?' active':''));g.setAttribute('data-region',key);g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',`${info.label} 연락처 ${count}건`);const halo=document.createElementNS('http://www.w3.org/2000/svg','circle');halo.setAttribute('class','halo');halo.setAttribute('cx',info.x);halo.setAttribute('cy',info.y);halo.setAttribute('r',19);g.append(halo);const disc=document.createElementNS('http://www.w3.org/2000/svg','circle');disc.setAttribute('class','disc');disc.setAttribute('cx',info.x);disc.setAttribute('cy',info.y);disc.setAttribute('r',13);g.append(disc);const value=document.createElementNS('http://www.w3.org/2000/svg','text');value.setAttribute('class','value');value.setAttribute('x',info.x);value.setAttribute('y',info.y+1);value.textContent=count;g.append(value);const label=document.createElementNS('http://www.w3.org/2000/svg','text');label.setAttribute('class','label');label.setAttribute('x',info.x+info.dx);label.setAttribute('y',info.y+4);label.textContent=info.label;g.append(label);g.addEventListener('click',()=>selectRegion(key));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectRegion(key)}});holder.append(g)}}
    function selectRegion(key){state.region=key;state.selectedId='';render()}
    function setText(id,value){const el=$(id);el.textContent=value||'미입력';el.classList.toggle('blank',!value)}
    function safePhone(v){return text(v).replace(/[^+\d]/g,'')}
    function setLink(id,href,enabled){const el=$(id);el.setAttribute('href',enabled?href:'#');el.classList.toggle('disabled',!enabled);el.setAttribute('aria-disabled',enabled?'false':'true')}
    function renderDetail(visible){const item=visible.find(x=>x.id===state.selectedId)||visible[0];const detail=$('detail');if(!item){detail.hidden=true;state.selectedId='';return}state.selectedId=item.id;detail.hidden=false;setText('detailName',item.name);$('detailSub').textContent=[item.trade,item.regionRaw||'지역 미입력'].filter(Boolean).join(' · ');setText('detailPerson',item.person);setText('detailRegion',item.regionRaw);setText('detailMobile',item.mobile);setText('detailPhone',[item.landline,item.fax&&'팩스 '+item.fax].filter(Boolean).join(' / '));setText('detailEmail',item.email);setText('detailOwner',item.owner);$('detailNote').textContent=item.note||'비고 없음';$('favoriteBtn').textContent=item.favorite?'★ 즐겨찾기':'☆ 즐겨찾기';const phone=safePhone(item.mobile||item.landline);setLink('callLink','tel:'+phone,!!phone);setLink('smsLink','sms:'+safePhone(item.mobile),!!safePhone(item.mobile));setLink('emailLink','mailto:'+encodeURIComponent(item.email),!!item.email)}
    function renderList(visible){const list=$('vendorList');list.replaceChildren();if(!visible.length){const el=document.createElement('p');el.className='empty';el.textContent='선택한 조건에 맞는 연락처가 없습니다.';list.append(el);return}for(const item of visible){const card=document.createElement('button');card.className='vendor-card'+(item.id===state.selectedId?' selected':'');card.type='button';const name=document.createElement('b');name.textContent=item.name;card.title=[item.name,item.person,item.trade].filter(Boolean).join(' · ');card.setAttribute('aria-pressed',String(item.id===state.selectedId));const person=document.createElement('span');person.textContent=[item.person,item.regionRaw].filter(Boolean).join(' · ')||'담당자 미입력';const trade=document.createElement('em');trade.textContent=item.trade;card.append(name,person,trade);card.addEventListener('click',()=>{const scrollTop=list.scrollTop;state.selectedId=item.id;renderList(visible);list.scrollTop=scrollTop;renderDetail(visible)});list.append(card)}}
    function renderTradeOptions(){const select=$('tradeSelect');const trades=[...new Set(entries.map(x=>x.trade).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));select.replaceChildren(new Option('전체 공종',''),...trades.map(t=>new Option(t,t)));select.value=state.trade;if(state.trade&&!trades.includes(state.trade)){state.trade='';select.value=''}const datalist=$('trades');datalist.replaceChildren(...trades.map(t=>new Option(t)))}
    function render(){renderTradeOptions();const base=baseEntries(),visible=visibleEntries();renderMarkers(base);const label=state.region==='all'?'전국':state.region==='unlocated'?'수도권·위치 미입력':regionInfo[state.region]?.label||'선택 지역';$('areaName').textContent=label;$('areaSub').textContent=state.query||state.trade?'검색 조건에 맞는 연락처':'선택한 지역의 연락처';$('areaCount').textContent=visible.length+'건';$('totalStatus').textContent=`연락처 ${entries.length}건`;$('unlocatedCount').textContent=base.filter(x=>x.region==='unlocated').length+'건';$('unlocatedBtn').classList.toggle('selected',state.region==='unlocated');$('allRegionBtn').classList.toggle('active',state.region==='all');$('allFilter').classList.toggle('active',!state.favorites);$('favFilter').classList.toggle('active',state.favorites);$('nameSort').classList.toggle('active',state.sortByName);if(!visible.some(x=>x.id===state.selectedId))state.selectedId=visible[0]?.id||'';renderList(visible);renderDetail(visible)}
    function openForm(item){if(busy)return;window.parent.MIN_WORKS_VENDOR_DIRTY=true;state.editingId=item?.id||'';$('modalTitle').textContent=item?'업체 정보 수정':'업체 등록';const form=$('vendorForm');form.reset();for(const field of ['name','trade','regionRaw','person','mobile','landline','fax','email','owner','note'])form.elements[field].value=item?.[field]||'';$('modal').classList.add('open');form.elements.name.focus()}
    function closeForm(){if(busy)return;window.parent.MIN_WORKS_VENDOR_DIRTY=false;$('modal').classList.remove('open');state.editingId=''}
    function selected(){return entries.find(x=>x.id===state.selectedId)}
    $('mapToggle').onclick=()=>{const expanded=document.querySelector('.map-panel').classList.toggle('map-expanded');$('mapToggle').setAttribute('aria-expanded',String(expanded));$('mapToggle').textContent=expanded?'지도 접기 ⌃':'지도 펼치기 ⌄'};
    $('search').addEventListener('input',e=>{state.query=e.target.value.trim();render()});$('tradeSelect').addEventListener('change',e=>{state.trade=e.target.value;render()});$('allRegionBtn').onclick=()=>selectRegion('all');$('unlocatedBtn').onclick=()=>selectRegion('unlocated');$('allFilter').onclick=()=>{state.favorites=false;render()};$('favFilter').onclick=()=>{state.favorites=true;render()};$('nameSort').onclick=()=>{state.sortByName=!state.sortByName;render()};$('addBtn').onclick=()=>openForm();$('editBtn').onclick=()=>{const x=selected();if(x)openForm(x)};$('favoriteBtn').onclick=()=>{const x=selected();if(!x||busy)return;if(favorites.has(x.id))favorites.delete(x.id);else favorites.add(x.id);try{localStorage.setItem(FAVORITES,JSON.stringify([...favorites]))}catch{toast('즐겨찾기를 이 기기에 저장하지 못했습니다.')}entries=entries.map(v=>({...v,favorite:favorites.has(v.id)}));render()};
    $('deleteBtn').onclick=async()=>{const x=selected();if(!x||busy||!confirm(x.name+' 연락처를 회사 연락망에서 삭제할까요?'))return;if(await persist(entries.filter(v=>v.id!==x.id)))toast('회사 연락망에서 삭제했습니다.')};
    $('closeModal').onclick=closeForm;$('cancelModal').onclick=closeForm;$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeForm()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeForm()});

    $('vendorForm').addEventListener('submit',async e=>{
      e.preventDefault();if(busy)return;
      const values=Object.fromEntries(new FormData(e.target).entries()),old=entries.find(x=>x.id===state.editingId);
      const item=normalize({...old,...values,id:old?.id||crypto.randomUUID()});
      if(!item.name||!item.trade||!item.regionRaw){toast('업체명·공종·지역을 입력해주세요.');return}
      const next=old?entries.map(v=>v.id===item.id?item:v):[item,...entries];
      if(await persist(next)){state.selectedId=item.id;state.region=item.region;state.trade='';state.query='';$('search').value='';closeForm();render();toast(old?'업체 정보를 함께 사용하는 연락망에 저장했습니다.':'새 업체를 등록했습니다.');}
    });
    $('exportBtn').onclick=()=>{const payload={format:'minworks-vendors-v1',exportedAt:new Date().toISOString(),entries:entries.map(({favorite,...x})=>x)};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}));a.download='MIN_WORKS_협력업체_백업_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)};
    $('importBtn').hidden=!bridge.canImport();
    $('importBtn').onclick=()=>{if(bridge.canImport()&&!busy)$('importInput').click()};
    $('importInput').addEventListener('change',async e=>{
      const file=e.target.files[0];e.target.value='';if(!file||busy||!bridge.canImport())return;
      try{
        if(file.size>2000000)throw Error('연락망 파일은 2MB 이하로 선택해 주세요.');
        const parsed=JSON.parse(await file.text());
        if(!['minworks-vendors-v1','minworks-vendors-test-v1'].includes(parsed.format)||!Array.isArray(parsed.entries)||parsed.entries.length>2000)throw Error('협력업체 백업 파일을 선택해 주세요.');
        const loaded=parsed.entries.map(normalize);
        if(loaded.some(x=>!x.name||!x.trade)||new Set(loaded.map(x=>x.id)).size!==loaded.length)throw Error('업체명·공종 또는 중복 번호를 확인해 주세요.');
        if(!confirm('현재 회사 연락처 '+entries.length+'건을 선택한 파일의 '+loaded.length+'건으로 교체할까요? 직원 모두에게 반영됩니다.'))return;
        if(await persist(loaded)){state.region='all';state.selectedId='';state.query='';state.trade='';$('search').value='';render();toast('회사 연락망을 가져왔습니다.');}
      }catch(error){toast(error.message||'자료를 읽지 못했습니다.');}
    });
    $('refreshBtn').onclick=()=>{if(!busy)window.parent.location.reload()};
    window.addEventListener('storage',event=>{if(event.key==='minWorksVendorDirectoryV1'&&!busy&&!$('modal').classList.contains('open')){applyShared(bridge.read());render();}});
    try{applyShared(bridge.read());$('saveStatus').textContent='직원 공용 연락망 · 변경 후 공유 저장';render();}catch(error){$('saveStatus').textContent=error.message;document.querySelectorAll('button').forEach(b=>b.disabled=true);}
  })();
