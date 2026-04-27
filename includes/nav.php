<?php
// includes/nav.php
// $activePage: 'home' | 'roster' | 'schedule' | 'auth'
$activePage = $activePage ?? '';
function navClass($page, $active) { return $page === $active ? ' class="active"' : ''; }
?>
<nav>
  <a href="homepage.php"><img src="assets/dawlogo.png" alt="DAW Warehouse LIVE" class="logo-img"></a>
  <div class="nav-links">
    <a href="homepage.php"<?= navClass('home', $activePage) ?>>Home</a>
    <a href="#"<?= navClass('matchcard', $activePage) ?>>Matchcard</a>
    <a href="roster.php"<?= navClass('roster', $activePage) ?>>Roster</a>
    <a href="schedule.php"<?= navClass('schedule', $activePage) ?>>Events</a>
  </div>
  <a href="https://twitch.tv/daware" class="live-pill">
    <span class="live-dot-sm"></span> Watch Live
  </a>
</nav>
