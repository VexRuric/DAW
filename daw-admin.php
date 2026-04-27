<?php
require_once 'lib/auth.php';
require_once 'lib/queries.php';
require_once 'lib/admin-queries.php';

// Verify authentication
$user = requireAuth('admin', false);
if (!$user) {
    header('Location: /');
    exit;
}

// Fetch admin data
$pendingSubmissions = getPendingApprovals();
$shows = getShows(date('Y'));
$wrestlers = getWrestlers(['active' => true]);
$storyNotes = getStoryNotes();

$pageTitle  = 'DAW Admin — Dashboard';
$pageDesc   = 'Administration dashboard for DAW Warehouse LIVE.';
$pageCSS    = ['admin.css'];
$activePage = 'admin';
include 'includes/head.php';
?>
<body>
<div class="cursor-glow" id="cursorGlow"></div>
<div class="cursor-dot" id="cursorDot"></div>

<div class="stack">
  <?php include 'includes/topbar.php'; ?>
  <?php include 'includes/nav.php'; ?>

  <div class="page-header">
    <div class="page-eyebrow">Administration</div>
    <h1 class="page-title">Admin<br>Dashboard</h1>
  </div>

  <div class="admin-tabs">
    <button class="admin-tab active" data-panel="approvals">Pending Approvals <span class="count"><?= count($pendingSubmissions) ?></span></button>
    <button class="admin-tab" data-panel="shows">Show Booker</button>
    <button class="admin-tab" data-panel="roster">Roster Management</button>
    <button class="admin-tab" data-panel="story">Story Notes</button>
  </div>

  <!-- Pending Approvals Panel -->
  <div class="admin-panel active" id="approvals-panel">
    <div class="panel-header">
      <h2>Pending Submissions</h2>
      <p class="panel-desc"><?= count($pendingSubmissions) ?> waiting for review</p>
    </div>

    <div class="submissions-list">
      <?php foreach ($pendingSubmissions as $sub): ?>
        <div class="submission-item">
          <div class="submission-header">
            <h3 class="submission-title"><?= htmlspecialchars($sub['title'] ?? 'Untitled') ?></h3>
            <span class="submission-type"><?= htmlspecialchars($sub['type']) ?></span>
          </div>
          <div class="submission-meta">
            <span>By <?= htmlspecialchars($sub['profiles']['twitch_handle'] ?? 'Unknown') ?></span>
            <span><?= date('M j, Y', strtotime($sub['created_at'])) ?></span>
          </div>
          <div class="submission-actions">
            <button class="btn-approve" onclick="approveSubmission('<?= $sub['id'] ?>')">Approve</button>
            <button class="btn-reject" onclick="rejectSubmission('<?= $sub['id'] ?>')">Reject</button>
          </div>
        </div>
      <?php endforeach; ?>
    </div>

    <?php if (empty($pendingSubmissions)): ?>
      <div class="empty-state">
        <p>No pending submissions</p>
      </div>
    <?php endif; ?>
  </div>

  <!-- Show Booker Panel -->
  <div class="admin-panel" id="shows-panel">
    <div class="panel-header">
      <h2>Show Booker</h2>
      <p class="panel-desc">Create new shows and matches</p>
    </div>

    <form class="booking-form" id="showForm" onsubmit="createShow(event)">
      <fieldset>
        <legend>Create New Show</legend>

        <div class="form-group">
          <label for="showName">Show Name</label>
          <input type="text" id="showName" name="name" placeholder="e.g., DAW 04-25-2025" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="showDate">Date</label>
            <input type="date" id="showDate" name="show_date" required>
          </div>

          <div class="form-group">
            <label for="showType">Type</label>
            <select id="showType" name="show_type" required>
              <option value="weekly">Weekly Show</option>
              <option value="ppv">PPV Event</option>
              <option value="special">Special</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="ppvName">PPV Name (if applicable)</label>
          <input type="text" id="ppvName" name="ppv_name" placeholder="e.g., Banned Portal">
        </div>

        <div class="form-group">
          <label for="streamUrl">Stream URL</label>
          <input type="url" id="streamUrl" name="stream_url" placeholder="https://twitch.tv/...">
        </div>

        <div class="form-group">
          <label for="showNotes">Notes</label>
          <textarea id="showNotes" name="notes" placeholder="Any additional notes..."></textarea>
        </div>

        <button type="submit" class="btn-primary">Create Show</button>
      </fieldset>
    </form>

    <div class="shows-list">
      <h3>Recent Shows</h3>
      <?php foreach (array_slice($shows, 0, 10) as $show): ?>
        <div class="show-item">
          <strong><?= htmlspecialchars($show['name']) ?></strong>
          <span class="show-date"><?= date('M j, Y', strtotime($show['show_date'])) ?></span>
          <span class="show-type"><?= htmlspecialchars($show['show_type']) ?></span>
        </div>
      <?php endforeach; ?>
    </div>
  </div>

  <!-- Roster Management Panel -->
  <div class="admin-panel" id="roster-panel">
    <div class="panel-header">
      <h2>Roster Management</h2>
      <p class="panel-desc"><?= count($wrestlers) ?> active wrestlers</p>
    </div>

    <div class="roster-table-wrap">
      <table class="roster-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Division</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach (array_slice($wrestlers, 0, 20) as $wrestler): ?>
            <tr>
              <td><?= htmlspecialchars($wrestler['name']) ?></td>
              <td><?= htmlspecialchars($wrestler['division']) ?></td>
              <td><?= htmlspecialchars($wrestler['role']) ?></td>
              <td><?= $wrestler['injured'] ? '🩹 Injured' : '✓ Active' ?></td>
              <td>
                <button class="btn-small" onclick="editWrestler('<?= $wrestler['id'] ?>')">Edit</button>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Story Notes Panel -->
  <div class="admin-panel" id="story-panel">
    <div class="panel-header">
      <h2>Story Notes</h2>
      <p class="panel-desc">Internal booking notes and storyline tracking</p>
    </div>

    <form class="story-form" id="storyForm" onsubmit="createStoryNote(event)">
      <div class="form-group">
        <label for="noteType">Type</label>
        <select id="noteType" name="note_type" required>
          <option value="feud">Feud Idea</option>
          <option value="story">Storyline Arc</option>
          <option value="ppv">PPV Idea</option>
          <option value="character">Character Note</option>
          <option value="faction">Faction Note</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div class="form-group">
        <label for="noteTitle">Title</label>
        <input type="text" id="noteTitle" name="title" placeholder="Brief title..." required>
      </div>

      <div class="form-group">
        <label for="noteContent">Content</label>
        <textarea id="noteContent" name="content" placeholder="Your notes..." required></textarea>
      </div>

      <button type="submit" class="btn-primary">Save Note</button>
    </form>

    <div class="notes-list">
      <h3>Recent Notes</h3>
      <?php foreach (array_slice($storyNotes, 0, 10) as $note): ?>
        <div class="note-item">
          <div class="note-header">
            <strong><?= htmlspecialchars($note['title']) ?></strong>
            <span class="note-type"><?= htmlspecialchars($note['note_type']) ?></span>
          </div>
          <p class="note-preview"><?= htmlspecialchars(substr($note['content'] ?? '', 0, 100)) ?>...</p>
          <div class="note-date"><?= date('M j', strtotime($note['created_at'])) ?></div>
        </div>
      <?php endforeach; ?>
    </div>
  </div>

  <?php include 'includes/footer.php'; ?>
</div>

<script src="assets/js/cursor.js"></script>
<script>
// Admin panel tab switching
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', function() {
    const panelId = this.dataset.panel + '-panel';

    // Hide all panels
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    // Remove active from all tabs
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));

    // Show selected panel
    document.getElementById(panelId).classList.add('active');
    // Mark tab as active
    this.classList.add('active');
  });
});

// Approve submission
async function approveSubmission(submissionId) {
  const response = await fetch('/api/admin/submission/approve.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submission_id: submissionId })
  });

  if (response.ok) {
    alert('Submission approved!');
    location.reload();
  } else {
    alert('Error approving submission');
  }
}

// Reject submission
async function rejectSubmission(submissionId) {
  const notes = prompt('Rejection reason (optional):');
  if (notes === null) return;

  const response = await fetch('/api/admin/submission/reject.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submission_id: submissionId, notes })
  });

  if (response.ok) {
    alert('Submission rejected!');
    location.reload();
  } else {
    alert('Error rejecting submission');
  }
}

// Create show
async function createShow(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData);

  const response = await fetch('/api/admin/show/create.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (response.ok) {
    alert('Show created!');
    location.reload();
  } else {
    const error = await response.json();
    alert('Error: ' + (error.error || 'Unknown error'));
  }
}

// Create story note
async function createStoryNote(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData);

  const response = await fetch('/api/admin/story/create.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (response.ok) {
    alert('Note saved!');
    location.reload();
  } else {
    alert('Error saving note');
  }
}

// Edit wrestler (placeholder)
function editWrestler(wrestlerId) {
  alert('Edit wrestler ' + wrestlerId + ' - coming soon!');
}
</script>
</body>
</html>
