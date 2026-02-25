<?php
// serve.php — แสดงไฟล์จาก NAS
// =========================================================================
// URL: serve.php?file=truck-maintenance/vehicle/VEH-001/photo.webp
// ค้นหาจาก Synology Drive ก่อน แล้ว fallback ไป /tmp/nas-uploads
// ตาม NAS-UPLOAD-GUIDE
// =========================================================================

// --- CORS Headers ---
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- Configuration ---
$DRIVE_BASE = '/volume1/Operation/paweewat/subcontractor-truck-management';
$TMP_BASE   = '/tmp/nas-uploads';

// --- Helper: JSON error (200 เสมอ ตาม guide) ---
function respondError($message) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

// --- Validate ?file= param ---
$fileParam = isset($_GET['file']) ? trim($_GET['file']) : '';
if ($fileParam === '') {
    respondError('Missing file parameter');
}

// --- Sanitize: ป้องกัน path traversal ---
if (strpos($fileParam, '..') !== false) {
    respondError('Invalid file path');
}
$fileParam = ltrim(preg_replace('/[^a-zA-Z0-9\/_.\-]/', '', $fileParam), '/');
if ($fileParam === '') {
    respondError('Invalid file path after sanitize');
}

// --- ค้นหาไฟล์: Synology Drive ก่อน → fallback /tmp ---
global $DRIVE_BASE, $TMP_BASE;
$candidates = [
    $DRIVE_BASE . '/' . $fileParam,
    $TMP_BASE   . '/' . $fileParam,
];

$filePath = null;
foreach ($candidates as $candidate) {
    if (is_file($candidate)) {
        $filePath = $candidate;
        break;
    }
}

if ($filePath === null) {
    respondError('File not found: ' . $fileParam);
}

// --- กำหนด MIME type ---
$ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
$mimeMap = [
    'webp' => 'image/webp',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png'  => 'image/png',
    'gif'  => 'image/gif',
    'pdf'  => 'application/pdf',
];
$mime = isset($mimeMap[$ext]) ? $mimeMap[$ext] : 'application/octet-stream';

// --- ส่งไฟล์ ---
header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: public, max-age=2592000');
header('X-Served-From: ' . (strpos($filePath, $TMP_BASE) === 0 ? 'tmp' : 'drive'));

readfile($filePath);
exit;
