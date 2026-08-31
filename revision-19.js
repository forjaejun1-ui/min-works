(() => {
  'use strict';
  let installPrompt = null;

  const installButton = document.createElement('button');
  installButton.className = 'install-min-works';
  installButton.type = 'button';
  installButton.innerHTML = '<img src="assets/icons/min-works-v3-192.png" alt=""><span><b>MIN WORKS 설치</b><small>휴대폰 앱으로 사용</small></span><i class="material-symbols-rounded">download</i>';

  const shortcuts = document.querySelector('.mobile-header-shortcuts');
  if (shortcuts) shortcuts.insertAdjacentElement('afterend', installButton);
  else document.querySelector('.topbar')?.prepend(installButton);

  const guide = document.createElement('div');
  guide.className = 'install-guide';
  guide.innerHTML = '<div class="install-guide-backdrop"></div><section><button class="install-guide-close" aria-label="닫기">×</button><img src="assets/icons/min-works-v3-192.png" alt="MIN WORKS"><p class="eyebrow">INSTALL APP</p><h2>MIN WORKS를 앱으로 설치</h2><div class="install-guide-steps"></div><button class="install-guide-done">확인</button></section>';
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
  if (['dashboard', 'sites', 'daily', 'finance', 'issues', 'settings', 'help'].includes(hashView)) window.showView?.(hashView);
})();
