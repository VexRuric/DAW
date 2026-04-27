/* DAW Warehouse — Shared Custom Cursor */
(function () {
  const glow = document.getElementById('cursorGlow');
  const dot  = document.getElementById('cursorDot');
  if (!glow || !dot) return;
  let tx=0,ty=0,gx=0,gy=0;
  document.addEventListener('mousemove', e => {
    tx=e.clientX; ty=e.clientY;
    dot.style.transform=`translate(${tx}px,${ty}px) translate(-50%,-50%)`;
  });
  (function loop(){
    gx+=(tx-gx)*.12; gy+=(ty-gy)*.12;
    glow.style.transform=`translate(${gx}px,${gy}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();
  document.addEventListener('mouseleave',()=>{ glow.style.opacity='0'; dot.style.opacity='0'; });
  document.addEventListener('mouseenter',()=>{ glow.style.opacity='1'; dot.style.opacity='1'; });
  document.querySelectorAll('a,button,input,select,textarea,label').forEach(el=>{
    el.addEventListener('mouseenter',()=>dot.classList.add('hover'));
    el.addEventListener('mouseleave',()=>dot.classList.remove('hover'));
  });
})();
