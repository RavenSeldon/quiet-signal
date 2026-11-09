/* Presentation preferences only; these never enter the experiment engine. */
(function () {
  let saved;
  try { saved=localStorage.getItem('quiet-signal-theme'); } catch (_) {}
  document.documentElement.dataset.theme=saved==='light'?'light':'dark';
  function sync(){
    const light=document.documentElement.dataset.theme==='light';
    const button=document.getElementById('theme');
    if(button){button.textContent=light?'☾ Dark':'☼ Light';button.setAttribute('aria-label',light?'Switch to dark mode':'Switch to light mode');}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    sync();const button=document.getElementById('theme');
    if(button)button.addEventListener('click',()=>{
      const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
      document.documentElement.dataset.theme=theme;
      try{localStorage.setItem('quiet-signal-theme',theme);}catch(_){}
      sync();document.dispatchEvent(new Event('quiet:theme'));
    });
  });
})();
