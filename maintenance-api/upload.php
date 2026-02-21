<?php
// upload.php - รับไฟล์รูปภาพจาก Front-end แล้วเก็บบน NAS Synology
// =========================================================================
// [NAS Path]    /volume1/web/Maintenance api/uploads/<entity>/<id>/
// [Public URL]  https://neosiam.sg3.quickconnect.to/Maintenance%20api/serve.php?entity=...&id=...&file=...
// =========================================================================

// --- CORS Headers (อนุญาตให้ Front-end เรียก API ข้าม domain ได้) ---
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight request (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- Configuration ---
// โฟลเดอร์ที่เก็บรูปจริงบน NAS (volume1/web คือ root ของ Web Station)
$baseDir = '/volume1/web/Maintenance api/uploads';

// URL สำหรับเรียกดูรูปผ่าน serve.php
$serveBaseUrl = 'http://192.168.1.89/Maintenance%20api/serve.php';

// --- Helper ---
function respond($data, $status = 200)
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// --- Validate Query Params ---
$entity = isset($_GET['entity']) ? trim($_GET['entity']) : '';
$id = isset($_GET['id']) ? trim($_GET['id']) : '';

if ($entity === '' || $id === '') {
    respond(['error' => 'Missing entity or id'], 400);
}

// Sanitize: ป้องกัน path traversal
$entity = preg_replace('/[^a-zA-Z0-9_-]/', '', $entity);
$id = preg_replace('/[^a-zA-Z0-9_.-]/', '', $id);

// TODO: Validate Firebase ID token if needed
// $token = $_GET['token'] ?? '';

// --- Validate File ---
if (!isset($_FILES['photo']) || !is_uploaded_file($_FILES['photo']['tmp_name'])) {
    respond(['error' => 'No file uploaded'], 400);
}

$file = $_FILES['photo'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    respond(['error' => 'Upload error: ' . $file['error']], 400);
}

// ตรวจสอบ MIME type (รับเฉพาะรูปภาพ)
$allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']);
if (!in_array($mimeType, $allowedTypes)) {
    respond(['error' => 'Invalid file type. Only images are allowed.'], 400);
}

// จำกัดขนาด 10MB
if ($file['size'] > 10 * 1024 * 1024) {
    respond(['error' => 'File too large. Max 10MB.'], 400);
}

// --- สร้างโฟลเดอร์ ---
$targetDir = rtrim($baseDir, '/') . '/' . $entity . '/' . $id;
if (!is_dir($targetDir)) {
    if (!mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
        respond(['error' => 'Failed to create directory: ' . $targetDir], 500);
    }
}

// --- สร้างชื่อไฟล์ที่ปลอดภัย ---
$originalName = pathinfo($file['name'], PATHINFO_FILENAME);
$originalName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $originalName);
$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$ext = $ext ? strtolower($ext) : 'webp';
$filename = time() . '_' . mt_rand(1000, 9999) . '_' . $originalName . '.' . $ext;
$targetPath = $targetDir . '/' . $filename;

// --- บันทึกไฟล์ ---
if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    respond(['error' => 'Failed to save file to: ' . $targetPath], 500);
}

// --- สร้าง URL สำหรับเรียกดูรูป ---
$url = $serveBaseUrl . '?entity=' . rawurlencode($entity) . '&id=' . rawurlencode($id) . '&file=' . rawurlencode($filename);

respond([
    'url' => $url,
    'filename' => $filename,
    'size' => $file['size'],
    'entity' => $entity,
    'id' => $id,
]);
