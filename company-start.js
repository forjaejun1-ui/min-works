/* Hydrate before the classic UI scripts bind their handlers. No navigation is needed. */
(() => {
  // Older WebKit provides secure random bytes but lacks randomUUID().
  if (typeof crypto.randomUUID !== 'function') {
    crypto.randomUUID = () => {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      return [hex.slice(0,8), hex.slice(8,12), hex.slice(12,16), hex.slice(16,20), hex.slice(20)].join('-');
    };
  }
  let ready;
  window.minWorksScriptsReady = new Promise(resolve => { ready = resolve; });

  async function start() {
    if(window.MIN_WORKS_TEST)document.body.classList.remove('auth-pending');
    const token = localStorage.getItem('minWorksSessionV1');
    window.minWorksBootHadToken = Boolean(token);
    if (token && !window.MIN_WORKS_TEST) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      try {
        const response = await fetch('https://min-works-api.forjaejun.workers.dev/company-state', {
          headers: {Authorization: 'Bearer ' + token}, cache: 'no-store', signal: controller.signal
        });
        if (response.ok && localStorage.getItem('minWorksSessionV1') === token) {
          const snapshot = await response.json();
          if (Number.isInteger(snapshot.version) && (snapshot.payload || snapshot.version === 0)) {
            window.minWorksInitialSnapshot = snapshot;
            try {
              localStorage.setItem('minWorksCloudSnapshotV1', JSON.stringify(snapshot));
            } catch { /* The boot snapshot stays available even when device storage is full. */ }
          }
        }
      } catch { /* Offline startup uses the last device copy. */ }
      finally { clearTimeout(timer); }
    }
    const scripts = document.querySelector('#companyAppScripts').content.querySelectorAll('script');
    await Promise.all(Array.from(scripts, source => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.async = false;
      script.src = source.src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(source.src));
      document.body.appendChild(script);
    })));
    ready();
  }
  start().catch(() => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'primary';
    button.textContent = '화면을 불러오지 못했습니다. 다시 열기';
    button.onclick = () => location.reload();
    document.body.replaceChildren(button);
  });
})();
