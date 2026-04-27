<?php
require_once 'lib/queries.php';

// Fetch roster data
$wrestlers = getWrestlers(['active' => true]);
$champions = getCurrentChampions();

// Calculate stats
$statTotal = count($wrestlers);
$statMens = count(array_filter($wrestlers, fn($w) => $w['division'] === 'Mens'));
$statWomens = count(array_filter($wrestlers, fn($w) => $w['division'] === 'Womens'));
$statInternet = count(array_filter($wrestlers, fn($w) => $w['division'] === 'Internet'));

$pageTitle  = 'DAW Warehouse LIVE — Roster';
$pageDesc   = 'Full active roster for DAW Warehouse LIVE — WWE 2K26 Universe Mode.';
$pageCSS    = ['roster.css'];
$activePage = 'roster';
include 'includes/head.php';
?>
<body>
<svg style="position:absolute;width:0;height:0;" aria-hidden="true">
  <defs>
    <symbol id="sil-male" viewBox="0 0 300 400" preserveAspectRatio="xMidYMax meet">
      <defs><linearGradient id="sm" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#1a0a2e"/><stop offset="100%" stop-color="#0a0318"/></linearGradient></defs>
      <rect width="300" height="400" fill="url(#sm)"/>
      <g fill="#0d0820" stroke="rgba(168,77,255,0.2)" stroke-width="1">
        <ellipse cx="150" cy="95" rx="52" ry="58"/>
        <rect x="133" y="147" width="34" height="22"/>
        <path d="M 45 400 L 62 235 Q 82 175 142 168 L 158 168 Q 218 175 238 235 L 255 400 Z"/>
        <path d="M 62 235 L 24 310 L 8 400 L 55 400 L 72 320 Z"/>
        <path d="M 238 235 L 276 310 L 292 400 L 245 400 L 228 320 Z"/>
      </g>
    </symbol>
    <symbol id="sil-female" viewBox="0 0 300 400" preserveAspectRatio="xMidYMax meet">
      <defs><linearGradient id="sf" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#1a0a2e"/><stop offset="100%" stop-color="#0a0318"/></linearGradient></defs>
      <rect width="300" height="400" fill="url(#sf)"/>
      <g fill="#0d0820" stroke="rgba(168,77,255,0.2)" stroke-width="1">
        <path d="M 102 45 Q 150 28 198 45 Q 210 78 206 112 L 94 112 Q 90 78 102 45 Z"/>
        <ellipse cx="150" cy="112" rx="48" ry="54"/>
        <rect x="136" y="160" width="28" height="18"/>
        <path d="M 65 400 L 78 255 Q 90 195 132 172 L 168 172 Q 210 195 222 255 L 235 400 Z"/>
        <path d="M 78 255 L 45 310 L 35 380 L 78 385 L 88 320 Z"/>
        <path d="M 222 255 L 255 310 L 265 380 L 222 385 L 212 320 Z"/>
      </g>
    </symbol>
  </defs>
</svg>

<div class="cursor-glow" id="cursorGlow"></div>
<div class="cursor-dot" id="cursorDot"></div>

<div class="stack">
  <?php include 'includes/topbar.php'; ?>
  <?php include 'includes/nav.php'; ?>

  <div class="page-header">
    <div class="page-eyebrow">Active Roster</div>
    <h1 class="page-title">DAW Warehouse<br>Roster</h1>
    <div class="page-stats">
      <div class="page-stat"><span class="page-stat-num" id="statTotal"><?= $statTotal ?></span><span class="page-stat-label">Total Wrestlers</span></div>
      <div class="page-stat"><span class="page-stat-num"><?= $statMens ?></span><span class="page-stat-label">Men's</span></div>
      <div class="page-stat"><span class="page-stat-num"><?= $statWomens ?></span><span class="page-stat-label">Women's</span></div>
      <div class="page-stat"><span class="page-stat-num"><?= $statInternet ?></span><span class="page-stat-label">Internet</span></div>
    </div>
  </div>

  <div class="filter-bar">
    <div class="filter-tabs" id="filterTabs">
      <button class="filter-tab active" data-filter="all">All <span class="filter-count" id="fc-all">41</span></button>
      <button class="filter-tab" data-filter="Mens">Men's <span class="filter-count">22</span></button>
      <button class="filter-tab" data-filter="Womens">Women's <span class="filter-count">13</span></button>
      <button class="filter-tab" data-filter="Internet">Internet <span class="filter-count">10</span></button>
      <button class="filter-tab" data-filter="Intercontinental">Intercontinental <span class="filter-count">4</span></button>
      <button class="filter-tab" data-filter="Tag Team">Tag Team <span class="filter-count">1</span></button>
    </div>
    <div class="filter-right">
      <div class="search-wrap">
        <span class="search-icon">⌕</span>
        <input type="text" class="search-input" id="searchInput" placeholder="Search...">
      </div>
      <div class="role-toggle">
        <button class="role-btn" id="faceBtn" data-role="Face">Face</button>
        <button class="role-btn" id="heelBtn" data-role="Heel">Heel</button>
      </div>
    </div>
  </div>

  <div class="champs-section">
    <div class="champs-eyebrow">Current Champions</div>
    <div class="champs-grid" id="champsGrid"></div>
  </div>

  <div class="result-count" id="resultCount">Showing <?= $statTotal ?> wrestlers</div>

  <div class="roster-wrap">
    <div class="roster-grid" id="rosterGrid"></div>
    <div class="empty-state" id="emptyState">
      <div class="empty-title">No wrestlers found</div>
      <div class="empty-sub">Try a different search or filter</div>
    </div>
  </div>

  <?php include 'includes/footer.php'; ?>
</div>

<script>
// Embed wrestler and champion data from PHP
window.WRESTLERS_DATA = <?= json_encode($wrestlers) ?>;
window.CHAMPIONS_DATA = <?= json_encode($champions) ?>;
</script>
<script src="assets/js/cursor.js"></script>
<script src="assets/js/roster.js"></script>
</body>
</html>
