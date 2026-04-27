/* DAW Warehouse — Auth JS */
const dot = document.getElementById('cursorDot');
function addHover(sel) {
  document.querySelectorAll(sel).forEach(el => {
    el.addEventListener('mouseenter', () => dot && dot.classList.add('hover'));
    el.addEventListener('mouseleave', () => dot && dot.classList.remove('hover'));
  });
}
addHover('a,button,input,select,textarea,label');

// Page navigation
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const p = document.getElementById('page-' + id);
  if (p) p.classList.add('active');
}

// Mock login
function mockLogin(provider) {
  const isAdmin = provider === 'admin';
  const navBtn = document.getElementById('navUserBtn');
  if (navBtn) {
    navBtn.innerHTML = `<span class="nav-avatar">${isAdmin ? 'A' : 'U'}</span> ${isAdmin ? 'Admin' : 'Fan'}`;
    navBtn.className = 'nav-user-btn logged-in';
    navBtn.onclick = () => showPage('settings');
  }
  const navLinks = document.getElementById('navLinks');
  if (navLinks && isAdmin) {
    if (!document.getElementById('navAdminLink')) {
      const a = document.createElement('a'); a.href='#'; a.id='navAdminLink'; a.textContent='Admin';
      a.onclick = e => { e.preventDefault(); showPage('admin'); };
      navLinks.appendChild(a);
    }
  }
  if (!document.getElementById('navCreationsLink')) {
    const a = document.createElement('a'); a.href='#'; a.id='navCreationsLink'; a.textContent='My Creations';
    a.onclick = e => { e.preventDefault(); showPage('creations'); };
    if (navLinks) navLinks.appendChild(a);
  }
  showPage(isAdmin ? 'admin' : 'creations');
}

function logout() { location.reload(); }

// Admin sidebar
document.querySelectorAll('.admin-nav-item[data-panel]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('panel-' + btn.dataset.panel);
    if (panel) panel.classList.add('active');
  });
});

// Settings sidebar
document.querySelectorAll('.settings-nav-item[data-spanel]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('spanel-' + btn.dataset.spanel);
    if (panel) panel.classList.add('active');
  });
});

// Modals
function openModal(id) { const m = document.getElementById(id); if (m) m.classList.add('open'); }
function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('open'); }

// Story float
function toggleStoryFloat() { document.getElementById('storyFloat').classList.toggle('open'); }

// Approval actions
function approveItem(btn) { btn.closest('.approval-row').style.opacity='0.4'; }
function rejectItem(btn) { btn.closest('.approval-row').remove(); }

// Roster render (reuse from roster.js if on same page; otherwise define minimal)
if (typeof WRESTLERS !== 'undefined') {
  const rosterList = document.getElementById('rosterList');
  const rosterEditGrid = document.getElementById('rosterEditGrid');
  if (rosterList) {
    WRESTLERS.forEach(w => {
      const div = document.createElement('div'); div.className='roster-item'; div.dataset.name=w.name.toLowerCase();
      div.innerHTML=`<div class="ri-name">${w.name}</div><div class="ri-stats"><span class="ri-${w.role.toLowerCase()}">${w.role}</span> · ${w.division}</div>`;
      rosterList.appendChild(div);
    });
  }
  if (rosterEditGrid) {
    WRESTLERS.forEach(w => {
      const row = document.createElement('div'); row.className='roster-edit-row'; row.dataset.name=w.name.toLowerCase();
      row.innerHTML=`<div class="re-name">${w.name}</div><div class="re-fields"><select class="re-select"><option ${w.role==='Face'?'selected':''}>Face</option><option ${w.role==='Heel'?'selected':''}>Heel</option></select><select class="re-select"><option ${w.division==='Mens'?'selected':''}>Mens</option><option ${w.division==='Womens'?'selected':''}>Womens</option><option ${w.division==='Internet'?'selected':''}>Internet</option><option ${w.division==='Intercontinental'?'selected':''}>Intercontinental</option><option ${w.division==='Tag Team'?'selected':''}>Tag Team</option></select>${w.champion?`<span class="re-badge champ">CHAMP</span>`:''}</div><div><button class="slot-btn">Save</button></div>`;
      rosterEditGrid.appendChild(row);
    });
  }
}
function filterRoster(q) { document.querySelectorAll('.roster-item').forEach(el => { el.style.display = el.dataset.name.includes(q.toLowerCase()) ? '' : 'none'; }); }
function filterRosterEdit(q) { document.querySelectorAll('.roster-edit-row').forEach(el => { el.style.display = el.dataset.name.includes(q.toLowerCase()) ? '' : 'none'; }); }

// Booker
let showSlots = [];
function setShowType(type, btn) {
  document.querySelectorAll('.booker-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const count = type === 'ppv' ? 11 : 9;
  buildSlots(count);
}
function buildSlots(n) {
  showSlots = Array.from({length: n}, (_, i) => ({ num: i+1, participants: [], type:'Single Match', stip:'', title:'' }));
  renderSlots();
}
function renderSlots() {
  const mb = document.getElementById('matchBuilder'); if (!mb) return;
  mb.innerHTML = showSlots.map((s, i) => `
    <div class="match-slot${i===0?' main-event':''}">
      <div class="match-slot-num">${String(s.num).padStart(2,'0')}</div>
      <div class="match-slot-body">
        <div class="match-participants">${s.participants.length ? s.participants.join(' vs ') : '<span class="match-slot-empty">Empty slot</span>'}</div>
        <div class="match-slot-meta">
          <select class="re-select" onchange="showSlots[${i}].type=this.value">
            <option>Single Match</option><option>Tag Team</option><option>Triple Threat</option><option>Fatal 4-Way</option><option>Battle Royale</option>
          </select>
          <input class="form-input" style="width:130px;font-size:.7rem;padding:.3rem .6rem;" placeholder="Stipulation" oninput="showSlots[${i}].stip=this.value">
        </div>
      </div>
      <div class="match-slot-actions"><button class="slot-btn remove" onclick="showSlots[${i}].participants=[];renderSlots()">Clear</button></div>
    </div>`).join('');
}
function saveCard() { alert('Match card saved!'); }
function exportToDiscord() {
  const lines = showSlots.filter(s=>s.participants.length).map(s=>`Match ${s.num}: ${s.participants.join(' vs ')}${s.stip?' ('+s.stip+')':''}`);
  prompt('Discord export:', lines.join('\n'));
}
function clearCard() { showSlots.forEach(s=>s.participants=[]); renderSlots(); }
function saveStoryNote(type) { alert(`Story note (${type}) saved!`); }
buildSlots(9);

// Show name sync
const sni = document.getElementById('showNameInput');
const ct = document.getElementById('cardTitle');
if (sni && ct) sni.addEventListener('input', () => { ct.textContent = sni.value.toUpperCase(); });
