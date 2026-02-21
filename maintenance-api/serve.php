<?php
// serve.php - แสดงรูปภาพจาก NAS
// =========================================================================
// URL: serve.php?entity=vehicle&id=VEH-123&file=image.webp
// Path: /volume1/web/Maintenance api/uploads/<entity>/<id>/<file>
// =========================================================================

// --- CORS Headers ---
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- Configuration ---
$baseDir = '/volume1/web/Maintenance api/uploads';

// --- Helper ---
function respondError($message, $status = 400)
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

// --- Validate Params ---
$entity = isset($_GET['entity']) ? trim($_GET['entity']) : '';
$id = isset($_GET['id']) ? trim($_GET['id']) : '';
$file = isset($_GET['file']) ? trim($_GET['file']) : '';

if ($entity === '' || $id === '' || $file === '') {
    respondError('Missing entity, id, or file', 400);
}

// Sanitize: ป้องกัน path traversal
$entity = preg_replace('/[^a-zA-Z0-9_-]/', '', $entity);
$id = preg_replace('/[^a-zA-Z0-9_.-]/', '', $id);
$file = basename($file); // ป้องกัน directory traversal
$file = str_replace('..', '', $file);

// --- หาไฟล์ ---
$path = rtrim($baseDir, '/') . '/' . $entity . '/' . $id . '/' . $file;

if (!is_file($path)) {
    respondError('File not found: ' . $entity . '/' . $id . '/' . $file, 404);
}

// --- กำหนด Content-Type ---
$ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
$mimeTypes = [
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    'webp' => 'image/webp',
    'gif' => 'image/gif',
];
$mime = isset($mimeTypes[$ext]) ? $mimeTypes[$ext] : 'application/octet-stream';

// --- Cache headers (cache รูป 30 วัน) ---
header('Cache-Control: public, max-age=2592000');
header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($path));

readfile($path);
exit;
