<?php
require_once 'lib/queries.php';

// Fetch data for homepage
$nextShow = getNextShow();
$recentMatches = getRecentMatches(5);
$champions = getCurrentChampions();

// Calculate the next show's matches if available
$nextShowMatches = $nextShow ? getMatchesForShow($nextShow['id']) : [];

$pageTitle  = 'DAW Warehouse LIVE';
$pageDesc   = 'DAW Warehouse LIVE — WWE 2K26 Universe Mode federation streamed weekly on Twitch.';
$pageCSS    = ['home.css'];
$activePage = 'home';
include 'includes/head.php';
?>
<body>
<div class="cursor-glow" id="cursorGlow"></div>
<div class="cursor-dot" id="cursorDot"></div>

<div class="stack">
  <?php include 'includes/topbar.php'; ?>
  <?php include 'includes/nav.php'; ?>

  <!-- Hero Section: Featured Match / Next Show -->
  <div class="hero-section">
    <?php if ($nextShow && count($nextShowMatches) > 0): ?>
      <?php
        $mainMatch = $nextShowMatches[0];
        $matchDate = $nextShow['show_date'];
        $matchType = $mainMatch['match_type'];
      ?>
      <div class="hero-content">
        <div class="hero-eyebrow">Next Show</div>
        <h1 class="hero-title"><?= htmlspecialchars($nextShow['name']) ?></h1>
        <div class="hero-meta">
          <span class="hero-date"><?= date('F j, Y', strtotime($matchDate)) ?></span>
          <span class="hero-matches"><?= count($nextShowMatches) ?> Matches</span>
        </div>
        <div class="hero-card-preview">
          <div class="card-label">Main Event</div>
          <h3 class="card-match-type"><?= htmlspecialchars($matchType) ?></h3>
          <a href="#" class="hero-button">View Full Card →</a>
        </div>
      </div>
    <?php else: ?>
      <div class="hero-content">
        <div class="hero-eyebrow">DAW Warehouse LIVE</div>
        <h1 class="hero-title">Wrestling's<br>Premier Federation</h1>
        <p class="hero-subtitle">Stream live every Friday at 7PM ET on Twitch</p>
      </div>
    <?php endif; ?>
  </div>

  <!-- Current Champions Section -->
  <div class="section">
    <div class="section-header">
      <h2 class="section-title">Current Champions</h2>
    </div>
    <div class="champions-grid">
      <?php foreach ($champions as $champ): ?>
        <div class="champion-card">
          <div class="champ-title"><?= htmlspecialchars($champ['title_name']) ?></div>
          <div class="champ-holder"><?= htmlspecialchars($champ['wrestler_name']) ?></div>
          <div class="champ-days"><?= htmlspecialchars($champ['days_held']) ?> days</div>
        </div>
      <?php endforeach; ?>
    </div>
  </div>

  <!-- Recent Results Section -->
  <div class="section">
    <div class="section-header">
      <h2 class="section-title">Recent Results</h2>
      <a href="daw-schedule.php" class="section-link">View Archive →</a>
    </div>
    <div class="results-list">
      <?php foreach ($recentMatches as $match): ?>
        <?php
          $show = $match['shows'][0] ?? null;
          $participants = $match['match_participants'] ?? [];
          $winner = array_values(array_filter($participants, fn($p) => $p['result'] === 'winner'))[0] ?? null;
        ?>
        <div class="result-item">
          <div class="result-show">
            <?php if ($show): ?>
              <div class="result-date"><?= htmlspecialchars($show['name']) ?></div>
            <?php endif; ?>
          </div>
          <div class="result-match">
            <h4 class="result-type"><?= htmlspecialchars($match['match_type']) ?></h4>
            <?php if ($winner): ?>
              <div class="result-winner">
                <strong><?= htmlspecialchars($winner['wrestlers']['name'] ?? $winner['teams']['name']) ?></strong>
                <?php if ($match['rating']): ?>
                  <span class="result-rating">★ <?= $match['rating'] ?>/5</span>
                <?php endif; ?>
              </div>
            <?php endif; ?>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
  </div>

  <?php include 'includes/footer.php'; ?>
</div>

<script src="assets/js/cursor.js"></script>
</body>
</html>
