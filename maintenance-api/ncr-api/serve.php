<?php
// NCR Serve API - align with NAS-UPLOAD-GUIDE
// Path on NAS: /web/ncr-api/serve.php
// ค้นหาไฟล์จาก Synology Drive ก่อน ถ้าไม่เจอ fallback /tmp/nas-uploads

// -------- Config --------
$UPLOAD_DIRS = [
    '/volume1/Operation/paweewat/subcontractor-truck-management',
    '/tmp/nas-uploads'
];
$MAX_AGE = 3600; // cache 1 hour

header('Access-Control-Allow-Origin: *');

// -------- Helpers --------
function bad($msg, $code = 400) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

$rel = $_GET['file'] ?? ($_GET['path'] ?? ''); // รองรับทั้ง file= (guide) และ path=
if ($rel === '') { bad('Missing file'); }

// sanitize and prevent traversal
$rel = str_replace('..', '', $rel);
$rel = preg_replace('/[^a-zA-Z0-9._\-\/]/', '_', $rel);

$realFile = false;
foreach ($UPLOAD_DIRS as $dir) {
    $candidate = rtrim($dir, '/') . '/' . $rel;
    $realBase = realpath($dir);
    $realCandidate = realpath($candidate);
    if ($realBase !== false && $realCandidate !== false
        && strpos($realCandidate, $realBase) === 0
        && is_file($realCandidate)) {
        $realFile = $realCandidate;
        break;
    }
}

if ($realFile === false) {
    bad('File not found', 404);
}

// MIME
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($realFile) ?: 'application/octet-stream';

// Headers
header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($realFile));
header('Cache-Control: public, max-age=' . $MAX_AGE);
readfile($realFile);
exit;
