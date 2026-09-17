(()=>{
  function init(){
    const weather=document.querySelector('#weatherPill'), original=document.querySelector('#openingToggle');
    if(!weather||!original||document.querySelector('#mobileOpeningToggle'))return;
    const group=document.createElement('div');group.className='mobile-weather-controls';weather.before(group);group.append(weather);
    const button=document.createElement('button');button.type='button';button.id='mobileOpeningToggle';button.className='mobile-opening-toggle';button.setAttribute('role','switch');button.setAttribute('aria-label','오프닝 재생');
    const sync=()=>{button.setAttribute('aria-checked',String(original.checked));button.innerHTML='<span>오프닝</span><b>'+(original.checked?'ON':'OFF')+'</b>';};
    button.addEventListener('click',()=>{original.checked=!original.checked;original.dispatchEvent(new Event('change',{bubbles:true}));sync();});
    original.addEventListener('change',sync);
    window.addEventListener('storage',e=>{if(e.key==='minWorksOpeningEnabledV1'){original.checked=e.newValue!=='false';sync();}});
    group.append(button);sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
