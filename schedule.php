<?php
require_once 'lib/queries.php';

// Fetch shows for all years (2022-2026)
$showsByYear = [];
for ($year = 2022; $year <= 2026; $year++) {
    $showsByYear[$year] = getShows($year);
}

$pageTitle  = 'DAW Warehouse LIVE — Show Schedule';
$pageDesc   = 'Full 2022–2026 show schedule and PPV calendar for DAW Warehouse LIVE.';
$pageCSS    = ['schedule.css'];
$activePage = 'schedule';
include 'includes/head.php';
?>
<body>
<div class="cursor-glow" id="cursorGlow"></div>
<div class="cursor-dot" id="cursorDot"></div>
<div class="stack">
  <?php include 'includes/topbar.php'; ?>
  <?php include 'includes/nav.php'; ?>

  <div class="page-header">
    <div class="page-eyebrow">2025 · 2026 Show Schedule</div>
    <h1 class="page-title">Show<br>Schedule</h1>
    <div class="page-stats">
      <div class="page-stat"><span class="page-stat-num">184</span><span class="page-stat-label">Episodes Aired</span></div>
      <div class="page-stat"><span class="page-stat-num">12</span><span class="page-stat-label">Annual PPVs</span></div>
      <div class="page-stat"><span class="page-stat-num">52</span><span class="page-stat-label">Fridays a Year</span></div>
    </div>
  </div>

  <div class="year-tabs">
    <button class="year-tab" data-year="2026">2026</button>
    <button class="year-tab active" data-year="2025">2025</button>
    <button class="year-tab" data-year="2024">2024</button>
    <button class="year-tab" data-year="2023">2023</button>
    <button class="year-tab" data-year="2022">2022</button>
  </div>

  <div class="ppv-legend" id="ppvLegend"></div>
  <div class="schedule-body" id="scheduleBody"></div>

  <?php include 'includes/footer.php'; ?>
</div>

<script>
// Embed show data from PHP
window.SHOWS_BY_YEAR = <?= json_encode($showsByYear) ?>;
</script>
<script src="assets/js/cursor.js"></script>
<script src="assets/js/schedule.js"></script>
</body>
</html>
