<?php
// includes/head.php
// Usage: set $pageTitle and $pageCSS before including.
// $pageCSS = array of CSS filenames relative to assets/css/ (without path)
$pageTitle  = $pageTitle  ?? 'DAW Warehouse LIVE';
$pageDesc   = $pageDesc   ?? 'DAW Warehouse LIVE — WWE 2K26 Universe Mode federation streamed weekly on Twitch.';
$pageCSS    = $pageCSS    ?? [];
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= htmlspecialchars($pageTitle) ?></title>
<meta name="description" content="<?= htmlspecialchars($pageDesc) ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&family=Archivo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/global.css">
<?php foreach ($pageCSS as $css): ?>
<link rel="stylesheet" href="assets/css/<?= htmlspecialchars($css) ?>">
<?php endforeach; ?>
</head>
