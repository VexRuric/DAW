/* DAW Warehouse — Roster JS */
// Data is injected from PHP via window.WRESTLERS_DATA and window.CHAMPIONS_DATA
// Map Supabase wrestler records to format expected by UI
const WRESTLERS = (window.WRESTLERS_DATA || []).map(w => {
  // Find if this wrestler is a champion
  const champRecord = (window.CHAMPIONS_DATA || []).find(c => c.wrestler_id === w.id);
  return {
    id: w.id,
    name: w.name,
    division: w.division,
    role: w.role,
    gender: w.gender,
    champion: champRecord ? champRecord.title_name : '',
    daysHeld: champRecord ? champRecord.days_held + ' days' : ''
  };
});

let currentFilter = 'all';
let currentSearch = '';
let currentRole   = 'all';

const dot = document.getElementById('cursorDot');

function getFiltered() {
  return WRESTLERS.filter(w => {
    const okDiv  = currentFilter === 'all' || w.division === currentFilter;
    const okName = !currentSearch || w.name.toLowerCase().includes(currentSearch.toLowerCase());
    const okRole = currentRole === 'all' || w.role === currentRole;
    return okDiv && okName && okRole;
  }).sort((a,b) => a.name.localeCompare(b.name));
}

function buildCard(w) {
  const sil  = w.gender === 'Female' ? 'sil-female' : 'sil-male';
  const role = w.role.toLowerCase();
  const belt = w.champion ? `<div class="card-belt">${w.champion}</div>` : '';
  const href = `wrestler.php?name=${encodeURIComponent(w.name)}`;
  return `<a href="${href}" class="wrestler-card ${role}">
    <div class="card-image"><svg><use href="#${sil}"/></svg>${belt}</div>
    <div class="card-info">
      <div class="card-name">${w.name}</div>
      <div class="card-division">${w.division}</div>
      <div class="card-meta"><span class="card-role ${role}">${w.role}</span></div>
    </div></a>`;
}

function buildChampCard(w) {
  const sil  = w.gender === 'Female' ? 'sil-female' : 'sil-male';
  const role = w.role.toLowerCase();
  const href = `wrestler.php?name=${encodeURIComponent(w.name)}`;
  return `<a href="${href}" class="champ-card">
    <div class="champ-image"><svg><use href="#${sil}"/></svg><div class="champ-crown">${w.champion}</div></div>
    <div class="champ-info">
      <div class="card-name">${w.name}</div>
      <div class="card-division">${w.division}</div>
      <div class="card-meta"><span class="card-role ${role}">${w.role}</span></div>
      <div class="champ-days">${w.daysHeld || ''}</div>
    </div></a>`;
}

function renderChampions() {
  const champs = WRESTLERS.filter(w => w.champion).sort((a,b) => a.champion.localeCompare(b.champion));
  const grid = document.getElementById('champsGrid');
  grid.innerHTML = champs.map(buildChampCard).join('');
  if (dot) grid.querySelectorAll('.champ-card').forEach(el => {
    el.addEventListener('mouseenter', () => dot.classList.add('hover'));
    el.addEventListener('mouseleave', () => dot.classList.remove('hover'));
  });
}

function render() {
  const list  = getFiltered();
  const grid  = document.getElementById('rosterGrid');
  const empty = document.getElementById('emptyState');
  const count = document.getElementById('resultCount');
  count.textContent = list.length === WRESTLERS.length
    ? `Showing all ${list.length} wrestlers`
    : `Showing ${list.length} of ${WRESTLERS.length} wrestlers`;
  document.getElementById('statTotal').textContent = list.length;
  if (!list.length) { grid.innerHTML=''; empty.classList.add('visible'); return; }
  empty.classList.remove('visible');
  grid.innerHTML = list.map(buildCard).join('');
  if (dot) grid.querySelectorAll('.wrestler-card').forEach(el => {
    el.addEventListener('mouseenter', () => dot.classList.add('hover'));
    el.addEventListener('mouseleave', () => dot.classList.remove('hover'));
  });
}

document.getElementById('filterTabs').addEventListener('click', e => {
  const btn = e.target.closest('.filter-tab');
  if (!btn) return;
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  render();
});

document.getElementById('searchInput').addEventListener('input', e => {
  currentSearch = e.target.value; render();
});

['faceBtn','heelBtn'].forEach(id => {
  const btn = document.getElementById(id);
  btn.addEventListener('click', () => {
    const role = btn.dataset.role;
    if (currentRole === role) {
      currentRole = 'all'; btn.className = 'role-btn';
    } else {
      currentRole = role;
      document.getElementById('faceBtn').className = 'role-btn';
      document.getElementById('heelBtn').className = 'role-btn';
      btn.className = `role-btn active-${role.toLowerCase()}`;
    }
    render();
  });
});

renderChampions();
render();
