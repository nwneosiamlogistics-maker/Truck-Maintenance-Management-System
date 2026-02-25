<?php
// NCR Upload API - align with NAS-UPLOAD-GUIDE
// วางที่ /web/ncr-api/upload.php
// อัปโหลดลง /tmp/nas-uploads แล้วให้ serve.php คืนไฟล์ตาม path

// ===== CONFIG =====
$API_KEY     = 'neosiam-nas-2026-secret';
$UPLOAD_DIR  = '/tmp/nas-uploads'; // PHP http user เขียนได้
$BASE_URL    = 'https://neosiam.dscloud.biz/api/serve.php?file='; // serve.php จะดึงจาก /tmp + Synology Drive
$MAX_SIZE    = 10 * 1024 * 1024; // 10MB
$ALLOWED_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

// ===== CORS =====
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; } // 200 เสมอ

// ===== Helper (ตอบกลับเสมอ 200) =====
function respond($data) {
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// ===== Auth =====
$reqKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
if ($reqKey !== $API_KEY) {
    respond(['success' => false, 'error' => 'Unauthorized']);
}

// ===== Validate method =====
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'error' => 'Method not allowed']);
}

// ===== Validate file =====
if (!isset($_FILES['file'])) {
    respond(['success' => false, 'error' => 'No file uploaded']);
}
$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    respond(['success' => false, 'error' => 'Upload error', 'code' => $file['error']]);
}
if ($file['size'] > $MAX_SIZE) {
    respond(['success' => false, 'error' => 'File too large', 'max' => $MAX_SIZE]);
}

// MIME type check
$mimeType = $file['type'];
if (function_exists('finfo_open')) {
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
}
if (!in_array($mimeType, $ALLOWED_TYPES, true)) {
    respond(['success' => false, 'error' => 'File type not allowed', 'type' => $mimeType]);
}

// ===== Path handling =====
$rawPath = isset($_POST['path']) ? trim($_POST['path']) : '';
if ($rawPath === '' || str_contains($rawPath, '..')) {
    respond(['success' => false, 'error' => 'Invalid path']);
}
$segments = array_filter(explode('/', ltrim($rawPath, '/')), 'strlen');
$safeSegments = [];
foreach ($segments as $seg) {
    $clean = preg_replace('/[^a-zA-Z0-9._-]/', '_', $seg);
    if ($clean === '' || $clean === '.' || $clean === '..') {
        respond(['success' => false, 'error' => 'Invalid path segment']);
    }
    $safeSegments[] = $clean;
}
$subPath = implode('/', $safeSegments);

// fallback ชื่อไฟล์ถ้าไม่มี path (ไม่น่ามีใน flow นี้)
if ($subPath === '') {
    $extMap = [
        'image/webp' => 'webp', 'image/jpeg' => 'jpg', 'image/png' => 'png',
        'image/gif' => 'gif', 'application/pdf' => 'pdf'
    ];
    $ext = $extMap[$mimeType] ?? 'bin';
    $subPath = 'misc/' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
}

$fullPath = rtrim($UPLOAD_DIR, '/') . '/' . $subPath;
$dir = dirname($fullPath);
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

if (!move_uploaded_file($file['tmp_name'], $fullPath)) {
    respond(['success' => false, 'error' => 'Failed to save file']);
}
@chmod($fullPath, 0644);

$url = rtrim($BASE_URL, '/') . '/' . $subPath;

respond([
    'success' => true,
    'url'     => $url,
    'path'    => $subPath,
    'size'    => $file['size'],
    'type'    => $mimeType,
]);
