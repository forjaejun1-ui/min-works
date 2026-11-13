(()=>{
  function init(){
    const mode=document.querySelector('.top-actions .view-mode-toggle'), original=document.querySelector('#openingToggle');
    if(!mode||!original||document.querySelector('#mobileOpeningToggle'))return;

    const button=document.createElement('button');button.type='button';button.id='mobileOpeningToggle';button.className='mobile-opening-toggle';button.setAttribute('role','switch');button.setAttribute('aria-label','오프닝 재생');
    const sync=()=>{button.setAttribute('aria-checked',String(original.checked));button.innerHTML='<span>오프닝</span><b>'+(original.checked?'ON':'OFF')+'</b>';};
    button.addEventListener('click',()=>{original.checked=!original.checked;original.dispatchEvent(new Event('change',{bubbles:true}));sync();});
    original.addEventListener('change',sync);
    window.addEventListener('storage',e=>{if(e.key==='minWorksOpeningEnabledV1'){original.checked=e.newValue!=='false';sync();}});
    mode.before(button);sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
