<?php
// diag.php — Health check endpoint สำหรับ NAS upload probe
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

echo json_encode([
    'success' => true,
    'status'  => 'ok',
    'server'  => 'NAS Maintenance-api',
    'time'    => date('Y-m-d H:i:s'),
], JSON_UNESCAPED_UNICODE);
