/* DAW Warehouse — Homepage JS */
const dot = document.getElementById('cursorDot');

// Hover helper
function addHover(sel) {
  document.querySelectorAll(sel).forEach(el => {
    el.addEventListener('mouseenter', () => dot && dot.classList.add('hover'));
    el.addEventListener('mouseleave', () => dot && dot.classList.remove('hover'));
  });
}
addHover('a, button, .news-card, .event-card, .mini-card, .highlight-card, .community-card');

// Featured banner carousel
(function () {
  const slides = document.querySelectorAll('#featuredMain .featured-slide');
  const dotsEl = document.getElementById('featuredDots');
  if (!slides.length || !dotsEl) return;
  let idx = 0; const n = slides.length;
  for (let i = 0; i < n; i++) {
    const b = document.createElement('button');
    b.className = 'featured-dot' + (i === 0 ? ' active' : '');
    b.addEventListener('click', () => goTo(i));
    if (dot) { b.addEventListener('mouseenter', () => dot.classList.add('hover')); b.addEventListener('mouseleave', () => dot.classList.remove('hover')); }
    dotsEl.appendChild(b);
  }
  const dots = dotsEl.querySelectorAll('.featured-dot');
  function goTo(i) {
    slides[idx].classList.remove('active'); dots[idx].classList.remove('active');
    idx = (i + n) % n;
    slides[idx].classList.add('active'); dots[idx].classList.add('active');
    resetInterval();
    const ad = dots[idx]; ad.style.animation='none'; void ad.offsetWidth; ad.style.animation='';
  }
  let interval = setInterval(() => goTo(idx + 1), 7000);
  function resetInterval() { clearInterval(interval); interval = setInterval(() => goTo(idx + 1), 7000); }
  const main = document.getElementById('featuredMain');
  if (main) { main.addEventListener('mouseenter', () => clearInterval(interval)); main.addEventListener('mouseleave', resetInterval); }
})();

// Match ticker
function makeTicker(slideSel, tabContainerId, currentSpanId) {
  const slides = document.querySelectorAll(slideSel);
  const tabsEl = tabContainerId ? document.getElementById(tabContainerId) : null;
  const curSpan = currentSpanId ? document.getElementById(currentSpanId) : null;
  if (!slides.length) return;
  let idx = 0; const n = slides.length;
  if (tabsEl) {
    for (let i = 0; i < n; i++) {
      const b = document.createElement('button');
      b.className = 'match-tab' + (i === 0 ? ' active' : '');
      b.textContent = String(i + 1).padStart(2, '0');
      b.addEventListener('click', () => go(i));
      if (dot) { b.addEventListener('mouseenter', () => dot.classList.add('hover')); b.addEventListener('mouseleave', () => dot.classList.remove('hover')); }
      tabsEl.appendChild(b);
    }
  }
  function go(i) {
    slides[idx].classList.remove('active'); idx = (i + n) % n; slides[idx].classList.add('active');
    if (curSpan) curSpan.textContent = String(idx + 1).padStart(2, '0');
    if (tabsEl) tabsEl.querySelectorAll('.match-tab').forEach((b, j) => b.classList.toggle('active', j === idx));
    clearInterval(auto); auto = setInterval(() => go(idx + 1), 6000);
  }
  let auto = setInterval(() => go(idx + 1), 6000);
}
makeTicker('#standardTicker .matchcard-slide', 'matchTabs', 'matchCurrent');
makeTicker('#ppvTicker .ppv-slide', 'ppvTabs', 'ppvCurrent');

// View toggle (Weekly / PPV)
document.querySelectorAll('.view-toggle button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-toggle button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const v = btn.dataset.view;
    const sec = document.getElementById('matchcardSection');
    const std = document.getElementById('standardTicker');
    const ppv = document.getElementById('ppvTicker');
    if (v === 'ppv') { sec && sec.classList.add('ppv-mode'); std && std.classList.remove('visible'); ppv && ppv.classList.add('visible'); }
    else { sec && sec.classList.remove('ppv-mode'); std && std.classList.add('visible'); ppv && ppv.classList.remove('visible'); }
  });
  if (dot) { btn.addEventListener('mouseenter', () => dot.classList.add('hover')); btn.addEventListener('mouseleave', () => dot.classList.remove('hover')); }
});

// Section tabs (news)
document.querySelectorAll('.section-tab').forEach(btn => {
  btn.addEventListener('click', () => { document.querySelectorAll('.section-tab').forEach(b => b.classList.remove('active')); btn.classList.add('active'); });
  if (dot) { btn.addEventListener('mouseenter', () => dot.classList.add('hover')); btn.addEventListener('mouseleave', () => dot.classList.remove('hover')); }
});
