(()=>{'use strict';
if(window.MIN_WORKS_TEST)return;
const API=window.MIN_WORKS_CONFIG?.apiBaseUrl||'https://min-works-api.forjaejun.workers.dev',KEY='minWorksSessionV1';
let shownFor='',busy=false;
async function request(method='GET',body){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{const response=await fetch(API+'/employee/login-profile',{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+localStorage.getItem(KEY)},body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'계정 정보를 확인하지 못했습니다.');return data}
 catch(error){if(error.name==='AbortError')throw Error('응답이 늦습니다. 잠시 후 다시 시도하세요.');throw error}finally{clearTimeout(timer)}
}
async function open(options={}){
 if(document.getElementById('employeeAccountDialog'))return;
 const dialog=document.createElement('dialog');dialog.id='employeeAccountDialog';dialog.className='employee-account-dialog';
 dialog.innerHTML='<header><div><small>MY ACCOUNT</small><h2>내 아이디 · 개인 비밀번호</h2></div><button type="button" data-close aria-label="닫기">×</button></header><div data-account-body><p role="status">계정을 확인하고 있어요.</p></div>';
 document.body.append(dialog);dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();
 try{
  const profile=await request();if(!dialog.isConnected)return;
  dialog.querySelector('[data-account-body]').innerHTML=`<div class="employee-login-number"><span>현재 아이디</span><strong></strong><small>MIN WORKS · MIN WORKS+ 공통</small></div><p>${profile.hasPassword?'아이디·비밀번호를 변경하면 다른 기기에서 로그아웃됩니다.':'원하는 아이디와 비밀번호를 직접 정해 주세요. 다른 기기에서도 같은 계정으로 로그인할 수 있어요.'}</p><form><label>사용할 아이디<input type="text" name="loginId" autocomplete="username" autocapitalize="none" spellcheck="false" minlength="3" maxlength="20" pattern="[a-zA-Z][a-zA-Z0-9_]{2,19}" placeholder="예: jaejun" required></label><p class="employee-account-note">영문으로 시작하는 영문·숫자·밑줄(_) 3~20자 · 대소문자는 구분하지 않아요. 중복 아이디는 저장할 수 없어요.</p>${profile.hasPassword?'<label>현재 비밀번호<input type="password" name="currentPassword" autocomplete="current-password" maxlength="128" required></label>':''}<label>${profile.hasPassword?'새 ':''}비밀번호<input type="password" name="password" autocomplete="new-password" minlength="6" maxlength="128" placeholder="6자 이상" required></label><label>비밀번호 확인<input type="password" name="confirmation" autocomplete="new-password" minlength="6" maxlength="128" required></label><p class="employee-account-status" role="status"></p><button class="employee-account-primary" type="submit">${profile.hasPassword?'아이디·비밀번호 변경':'아이디·비밀번호 저장'}</button></form><p class="employee-account-note">앱별 이용 승인은 유지돼요. 비밀번호를 잊으면 관리자에게 초기화를 요청해 주세요.</p>${options.logout?'<button type="button" data-logout>이 기기 로그아웃</button>':''}`;
  dialog.querySelector('.employee-login-number strong').textContent=profile.loginId;
  dialog.querySelector('.employee-login-number').hidden=!profile.hasPassword;
  dialog.querySelector('[name=loginId]').value=profile.hasPassword||!/^min\d+$/.test(profile.loginId)?profile.loginId:'';
  if(options.logout)dialog.querySelector('[data-logout]').onclick=options.logout;
  dialog.querySelector('form').onsubmit=async event=>{
   event.preventDefault();const form=event.currentTarget,status=form.querySelector('[role=status]'),button=form.querySelector('button');
   if(form.password.value!==form.confirmation.value){status.textContent='비밀번호가 서로 다릅니다.';return}
   const data={loginId:form.elements.namedItem('loginId').value.trim().toLowerCase(),password:form.password.value,currentPassword:form.currentPassword?.value||''};button.disabled=true;status.textContent='저장 중…';
   try{const saved=await request('PUT',data);form.reset();form.hidden=true;const done=document.createElement('p');done.className='employee-account-success';done.textContent=saved.loginId+' · 계정이 저장됐어요. 다음부터 이 아이디와 비밀번호로 로그인하세요.';form.after(done);dialog.querySelector('[data-close]').focus()}
   catch(error){status.textContent=error.message}finally{button.disabled=false}
  };
 }catch(error){dialog.querySelector('[data-account-body] p').textContent=error.message}
}
async function ready(user){
 if(user?.role!=='employee'||busy||shownFor===user.id)return;busy=true;
 try{const profile=await request();shownFor=user.id;if(!profile.hasPassword)await open()}catch{}finally{busy=false}
}
window.MIN_WORKS_EMPLOYEE_ACCOUNT={open};
document.addEventListener('minworks:user-ready',event=>ready(event.detail?.user));
window.addEventListener('minworks:plus-ready',event=>ready(event.detail?.user));
if(window.MIN_WORKS_USER)ready(window.MIN_WORKS_USER);
})();
