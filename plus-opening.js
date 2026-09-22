(()=>{'use strict';
  const key='minWorksPlusOpeningEnabledV1';
  const splash=document.getElementById('plusOpening');
  const toggle=document.getElementById('plusOpeningToggle');
  const enabled=localStorage.getItem(key)!=='false';
  toggle.checked=enabled;
  toggle.addEventListener('change',()=>localStorage.setItem(key,String(toggle.checked)));
  if(!enabled||window.matchMedia('(prefers-reduced-motion: reduce)').matches){splash.remove();return}
  const word=splash.querySelector('.plus-opening-word');
  const letters=[...word.textContent];
  word.replaceChildren(...letters.map((letter,index)=>{
    const span=document.createElement('span');span.textContent=letter===' '?'\u00a0':letter;
    span.style.setProperty('--letter-index',index);span.className=letter==='+'?'plus-opening-plus':'';
    span.setAttribute('aria-hidden','true');return span;
  }));
  let finished=false;
  const finish=()=>{if(finished)return;finished=true;splash.classList.add('leaving');setTimeout(()=>splash.remove(),380)};
  const start=performance.now();
  const afterLoad=()=>setTimeout(finish,Math.max(0,1900-(performance.now()-start)));
  if(document.readyState==='complete')afterLoad();else window.addEventListener('load',afterLoad,{once:true});
  setTimeout(finish,3200);
})();
