<?php
require_once 'lib/queries.php';

// Fetch approved submissions (read-only gallery)
$submissions = getSubmissions('approved');

// Group by type
$wrestlers = array_filter($submissions, fn($s) => $s['type'] === 'new_wrestler');
$factions = array_filter($submissions, fn($s) => $s['type'] === 'faction');
$stories = array_filter($submissions, fn($s) => $s['type'] === 'story');

$pageTitle  = 'DAW Creations — Fan Gallery';
$pageDesc   = 'Browse approved wrestler and faction submissions from fans of DAW Warehouse LIVE.';
$pageCSS    = ['creations.css'];
$activePage = 'creations';
include 'includes/head.php';
?>
<body>
<div class="cursor-glow" id="cursorGlow"></div>
<div class="cursor-dot" id="cursorDot"></div>

<div class="stack">
  <?php include 'includes/topbar.php'; ?>
  <?php include 'includes/nav.php'; ?>

  <div class="page-header">
    <div class="page-eyebrow">Community Creations</div>
    <h1 class="page-title">DAW<br>Creations</h1>
    <div class="page-stats">
      <div class="page-stat"><span class="page-stat-num"><?= count($wrestlers) ?></span><span class="page-stat-label">Wrestlers</span></div>
      <div class="page-stat"><span class="page-stat-num"><?= count($factions) ?></span><span class="page-stat-label">Factions</span></div>
      <div class="page-stat"><span class="page-stat-num"><?= count($stories) ?></span><span class="page-stat-label">Stories</span></div>
    </div>
  </div>

  <div class="filter-tabs" id="creationsTabs">
    <button class="tab-btn active" data-type="wrestlers">All Wrestlers <span class="count"><?= count($wrestlers) ?></span></button>
    <button class="tab-btn" data-type="factions">Factions <span class="count"><?= count($factions) ?></span></button>
    <button class="tab-btn" data-type="stories">Stories <span class="count"><?= count($stories) ?></span></button>
  </div>

  <!-- Wrestlers Gallery -->
  <div class="creations-gallery" id="wrestlersGallery">
    <div class="gallery-grid">
      <?php foreach ($wrestlers as $sub): ?>
        <?php $data = json_decode($sub['data'], true); ?>
        <div class="creation-card wrestler-card">
          <?php if ($data['imageUrl'] ?? false): ?>
            <img src="<?= htmlspecialchars($data['imageUrl']) ?>" alt="<?= htmlspecialchars($data['ringName'] ?? 'Wrestler') ?>" class="card-image">
          <?php else: ?>
            <div class="card-image placeholder">No Image</div>
          <?php endif; ?>
          <div class="card-content">
            <h3 class="card-title"><?= htmlspecialchars($data['ringName'] ?? 'Unknown') ?></h3>
            <p class="card-meta">Submitted by <?= htmlspecialchars($sub['profiles']['twitch_handle'] ?? 'Fan') ?></p>
            <?php if ($data['fightingStyles'] ?? false): ?>
              <div class="card-tags">
                <?php foreach ((array)$data['fightingStyles'] as $style): ?>
                  <span class="tag"><?= htmlspecialchars($style) ?></span>
                <?php endforeach; ?>
              </div>
            <?php endif; ?>
            <a href="#" class="card-link">View Details →</a>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
    <?php if (empty($wrestlers)): ?>
      <div class="empty-state">
        <p>No approved wrestler submissions yet.</p>
      </div>
    <?php endif; ?>
  </div>

  <!-- Factions Gallery -->
  <div class="creations-gallery hidden" id="factionsGallery">
    <div class="gallery-grid">
      <?php foreach ($factions as $sub): ?>
        <?php $data = json_decode($sub['data'], true); ?>
        <div class="creation-card faction-card">
          <?php if ($data['imageUrl'] ?? false): ?>
            <img src="<?= htmlspecialchars($data['imageUrl']) ?>" alt="<?= htmlspecialchars($data['factionName'] ?? 'Faction') ?>" class="card-image">
          <?php else: ?>
            <div class="card-image placeholder">No Image</div>
          <?php endif; ?>
          <div class="card-content">
            <h3 class="card-title"><?= htmlspecialchars($data['factionName'] ?? 'Unknown') ?></h3>
            <p class="card-meta">Submitted by <?= htmlspecialchars($sub['profiles']['twitch_handle'] ?? 'Fan') ?></p>
            <?php if ($data['memberCount'] ?? false): ?>
              <p class="card-subtitle"><?= $data['memberCount'] ?> Members</p>
            <?php endif; ?>
            <a href="#" class="card-link">View Details →</a>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
    <?php if (empty($factions)): ?>
      <div class="empty-state">
        <p>No approved faction submissions yet.</p>
      </div>
    <?php endif; ?>
  </div>

  <!-- Stories Gallery -->
  <div class="creations-gallery hidden" id="storiesGallery">
    <div class gallery-list">
      <?php foreach ($stories as $sub): ?>
        <div class="story-item">
          <h3 class="story-title"><?= htmlspecialchars($sub['title'] ?? 'Untitled') ?></h3>
          <p class="story-meta">Submitted by <?= htmlspecialchars($sub['profiles']['twitch_handle'] ?? 'Fan') ?> • <?= date('M j, Y', strtotime($sub['created_at'])) ?></p>
          <p class="story-preview"><?= htmlspecialchars(substr($sub['data'] ?? '', 0, 200)) ?>...</p>
          <a href="#" class="story-link">Read Full Story →</a>
        </div>
      <?php endforeach; ?>
    </div>
    <?php if (empty($stories)): ?>
      <div class="empty-state">
        <p>No approved story submissions yet.</p>
      </div>
    <?php endif; ?>
  </div>

  <?php include 'includes/footer.php'; ?>
</div>

<script src="assets/js/cursor.js"></script>
<script>
// Tab switching for gallery views
document.querySelectorAll('#creationsTabs .tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active class from all tabs and galleries
    document.querySelectorAll('#creationsTabs .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.creations-gallery').forEach(g => g.classList.add('hidden'));

    // Add active class to clicked tab
    btn.classList.add('active');

    // Show corresponding gallery
    const type = btn.dataset.type;
    if (type === 'wrestlers') document.getElementById('wrestlersGallery').classList.remove('hidden');
    else if (type === 'factions') document.getElementById('factionsGallery').classList.remove('hidden');
    else if (type === 'stories') document.getElementById('storiesGallery').classList.remove('hidden');
  });
});
</script>
</body>
</html>
