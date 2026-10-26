<?php
/**
 * Dynamic OpenGraph / SEO injector for wc-info.org SPA routes.
 * Reads the compiled Angular index.html and injects dynamic <title>,
 * meta description, OpenGraph, Twitter Card, and Canonical tags
 * for toilet detail and place routes before serving.
 */

$indexFile = __DIR__ . '/index.html';
if (!is_file($indexFile)) {
  http_response_code(500);
  echo 'index.html not found';
  exit;
}

$html = file_get_contents($indexFile);

$siteName = 'wc-info.org';
$baseUrl = 'https://wc-info.org';
$defaultTitle = 'WC-Info – Öffentliche Toiletten in deiner Nähe';
$defaultDesc = 'Finde saubere und barrierefreie öffentliche Toiletten in deiner Nähe auf wc-info.org';
$defaultImage = $baseUrl . '/assets/logo320.png';

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($requestUri, PHP_URL_PATH) ?: '/';
$cleanUrl = $baseUrl . $path;

$title = $defaultTitle;
$description = $defaultDesc;
$image = $defaultImage;

/**
 * Helper to clean a URL slug into a readable name.
 */
function parseReadableSlugName(string $slug): string {
  $decoded = rawurldecode($slug);
  if (strpos($decoded, '---') !== false) {
    $parts = explode('---', $decoded);
    $rawName = $parts[0];
    $suffix = end($parts);
    if (strtoupper($suffix) === 'NEARBY') {
      return 'Aktueller Standort';
    }
    return trim(str_replace('-', ' ', $rawName));
  }
  return trim(str_replace('-', ' ', $decoded));
}

/**
 * Helper to extract numeric toilet ID from a toilet slug or query param.
 */
function extractToiletId(string $slug): ?int {
  $decoded = trim(rawurldecode($slug));
  if (preg_match('/(?:---|--|-)(\d+)$/', $decoded, $m)) {
    return (int)$m[1];
  }
  if (ctype_digit($decoded)) {
    return (int)$decoded;
  }
  return null;
}

/**
 * Helper to fetch toilet JSON from the backend API (if accessible without auth or with optional env key).
 */
function fetchToiletFromApi(int $id): ?array {
  $apiUrl = 'https://api.wc-info.org/toilet/' . $id;
  $headers = ['Accept: application/json'];

  $apiKey = getenv('WC_INFO_API_KEY') ?: ($_ENV['WC_INFO_API_KEY'] ?? '');
  if (!empty($apiKey)) {
    $headers[] = 'Authorization: Bearer ' . $apiKey;
  }

  $ch = curl_init($apiUrl);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 2,
    CURLOPT_CONNECTTIMEOUT => 1,
    CURLOPT_HTTPHEADER => $headers
  ]);
  $res = curl_exec($ch);
  $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($status === 200 && $res) {
    $data = json_decode($res, true);
    if (is_array($data) && !empty($data['id'])) {
      return $data;
    }
  }
  return null;
}

// Match routes:
// 1. /Toilets/:placeSlug/:toiletSlug (or /toiletten/..., /Toilet/..., /toilet/...)
// 2. /Toilets/:placeSlug
// 3. /Urgent
$segments = array_values(array_filter(explode('/', trim($path, '/'))));
$firstSeg = isset($segments[0]) ? strtolower($segments[0]) : '';

$routeLang = 'de';
if (in_array($firstSeg, ['de', 'en', 'nl'], true)) {
  $routeLang = $firstSeg;
  array_shift($segments);
  $firstSeg = isset($segments[0]) ? strtolower($segments[0]) : '';
}

$toiletId = null;
$placeSlug = null;
$toiletSlug = null;

if (in_array($firstSeg, ['toilets', 'toiletten', 'toilet'], true)) {
  $placeSlug = $segments[1] ?? null;
  $toiletSlug = $segments[2] ?? null;
  if ($toiletSlug) {
    $toiletId = extractToiletId($toiletSlug);
  }
} elseif ($firstSeg === 'urgent') {
  if (!empty($_GET['toilet']) && ctype_digit((string)$_GET['toilet'])) {
    $toiletId = (int)$_GET['toilet'];
  } else {
    $title = 'Notfall-Navigation – wc-info.org';
    $description = 'Schnellste Notfall-Navigation zur nächsten barrierefreien öffentlichen Toilette auf wc-info.org.';
  }
}

if (!empty($_GET['toilet']) && ctype_digit((string)$_GET['toilet']) && !$toiletId) {
  $toiletId = (int)$_GET['toilet'];
}

if ($toiletId) {
  $toilet = fetchToiletFromApi($toiletId);
  if ($toilet) {
    $owner = trim((string)($toilet['owner'] ?? ''));
    $name = trim((string)($toilet['name'] ?? ''));
    $address = trim((string)($toilet['address'] ?? ''));

    if ($owner !== '' && $name !== '' && $owner !== $name) {
      $displayTitle = $owner . ' – ' . $name;
    } else {
      $displayTitle = $owner !== '' ? $owner : ($name !== '' ? $name : 'Öffentliche Toilette');
    }

    $title = $displayTitle . ($address !== '' ? ' (' . $address . ')' : '') . ' – wc-info.org';
    $description = ($address !== '' ? $address . ' · ' : '') . $displayTitle . ' – Öffentliche Toilette auf wc-info.org';

    if (!empty($toilet['photos']) && is_array($toilet['photos'])) {
      $firstPhoto = $toilet['photos'][0] ?? null;
      $photoUrl = $firstPhoto['url'] ?? ($firstPhoto['url_thumb'] ?? '');
      if (!empty($photoUrl)) {
        $image = (strpos($photoUrl, 'http') === 0) ? $photoUrl : $baseUrl . '/' . ltrim($photoUrl, '/');
      }
    }
  } else {
    // Fast slug-based fallback if API call is unauthorized or times out
    $readableToilet = $toiletSlug ? parseReadableSlugName($toiletSlug) : ('WC #' . $toiletId);
    $readablePlace = $placeSlug ? parseReadableSlugName($placeSlug) : '';

    if ($readablePlace !== '' && $readablePlace !== 'Aktueller Standort' && stripos($readableToilet, $readablePlace) === false) {
      $title = $readableToilet . ' (' . $readablePlace . ') – wc-info.org';
      $description = 'Öffentliche Toilette: ' . $readableToilet . ' in ' . $readablePlace . ' auf wc-info.org.';
    } else {
      $title = $readableToilet . ' – Öffentliche Toilette auf wc-info.org';
      $description = 'Öffentliche Toilette: ' . $readableToilet . ' auf wc-info.org.';
    }
  }
} elseif ($placeSlug) {
  $readablePlace = parseReadableSlugName($placeSlug);
  if ($readablePlace !== '' && $readablePlace !== 'Aktueller Standort') {
    $title = 'Öffentliche Toiletten in ' . $readablePlace . ' – wc-info.org';
    $description = 'Öffentliche Toiletten und barrierefreie WCs in ' . $readablePlace . ' finden auf wc-info.org.';
  } else {
    $title = 'Toiletten in deiner Nähe – wc-info.org';
  }
}

$escTitle = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
$escDesc = htmlspecialchars($description, ENT_QUOTES, 'UTF-8');
$escImage = htmlspecialchars($image, ENT_QUOTES, 'UTF-8');
$escUrl = htmlspecialchars($cleanUrl, ENT_QUOTES, 'UTF-8');

$localeMap = [
  'de' => 'de_DE',
  'en' => 'en_US',
  'nl' => 'nl_NL'
];
$targetLocale = $localeMap[$routeLang] ?? 'de_DE';

// Replace tags in index.html
$replacements = [
  '/<title>.*?<\/title>/is' => '<title>' . $escTitle . '</title>',
  '/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i' => '<meta name="description" content="' . $escDesc . '">',
  '/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i' => '<meta property="og:title" content="' . $escTitle . '">',
  '/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i' => '<meta property="og:description" content="' . $escDesc . '">',
  '/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i' => '<meta property="og:image" content="' . $escImage . '">',
  '/<meta\s+property="og:locale"\s+content="[^"]*"\s*\/?>/i' => '<meta property="og:locale" content="' . $targetLocale . '">',
  '/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i' => '<meta name="twitter:title" content="' . $escTitle . '">',
  '/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i' => '<meta name="twitter:description" content="' . $escDesc . '">',
  '/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i' => '<meta name="twitter:image" content="' . $escImage . '">',
  '/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i' => '<link rel="canonical" href="' . $escUrl . '"><meta property="og:url" content="' . $escUrl . '">'
];

foreach ($replacements as $pattern => $replacement) {
  $html = preg_replace($pattern, $replacement, $html, 1);
}

header('Content-Type: text/html; charset=utf-8');
echo $html;
