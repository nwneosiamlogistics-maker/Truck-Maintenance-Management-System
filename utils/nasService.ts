/**
 * nasService.ts — Synology FileStation API Service
 * ใช้สำหรับอัปโหลดและดึงรูปภาพจาก NAS ผ่าน QuickConnect
 * 
 * API ที่ใช้:
 * - SYNO.API.Auth (Login)
 * - SYNO.FileStation.Upload (อัปโหลดไฟล์)
 * - SYNO.FileStation.Download (ดาวน์โหลด/แสดงรูป)
 */

// ใช้ proxy จาก Vite dev server เพื่อหลีกเลี่ยง CORS
const NAS_API_BASE = '/nas-api';

// โฟลเดอร์บน NAS ที่เก็บรูปภาพ
const NAS_UPLOAD_BASE_PATH = '/web/Maintenance api/uploads';

// --- Session Management ---
let currentSid: string | null = null;
let loginPromise: Promise<string> | null = null;

/**
 * Login เข้า Synology DSM ผ่าน FileStation API
 * ใช้ credentials จาก environment variables
 */
async function ensureSession(): Promise<string> {
    if (currentSid) return currentSid;

    // ป้องกันการ login ซ้อนกันหลาย request
    if (loginPromise) return loginPromise;

    const account = import.meta.env.VITE_NAS_ACCOUNT || '';
    const password = import.meta.env.VITE_NAS_PASSWORD || '';

    if (!account || !password) {
        throw new Error('ยังไม่ได้ตั้งค่า NAS credentials ใน .env (VITE_NAS_ACCOUNT, VITE_NAS_PASSWORD)');
    }

    loginPromise = (async () => {
        try {
            const params = new URLSearchParams({
                api: 'SYNO.API.Auth',
                version: '6',
                method: 'login',
                account,
                passwd: password,
                session: 'FileStation',
                format: 'sid',
            });

            const res = await fetch(`${NAS_API_BASE}/auth.cgi?${params.toString()}`);
            const data = await res.json();

            if (!data.success) {
                const errorCode = data.error?.code || 'unknown';
                throw new Error(`NAS login failed (error: ${errorCode})`);
            }

            currentSid = data.data.sid;
            console.log('[NAS] Login successful');
            return currentSid!;
        } finally {
            loginPromise = null;
        }
    })();

    return loginPromise;
}

/**
 * ล้าง session (เรียกเมื่อ session หมดอายุ)
 */
function clearSession() {
    currentSid = null;
}

/**
 * อัปโหลดไฟล์ไปยัง NAS
 * @param file - ไฟล์ที่จะอัปโหลด
 * @param entity - ประเภท (vehicle, repair, purchaseOrder)
 * @param entityId - ID ของ entity
 * @returns NAS path ของไฟล์ที่อัปโหลด
 */
export async function uploadToNAS(
    file: File,
    entity: string,
    entityId: string
): Promise<string> {
    const sid = await ensureSession();

    // สร้าง path ปลายทาง: /web/Maintenance api/uploads/<entity>/<entityId>/
    const destPath = `${NAS_UPLOAD_BASE_PATH}/${entity}/${entityId}`;

    const formData = new FormData();
    formData.append('api', 'SYNO.FileStation.Upload');
    formData.append('version', '2');
    formData.append('method', 'upload');
    formData.append('path', destPath);
    formData.append('create_parents', 'true');
    formData.append('overwrite', 'skip');
    formData.append('file', file, file.name);

    const res = await fetch(`${NAS_API_BASE}/entry.cgi?_sid=${sid}`, {
        method: 'POST',
        body: formData,
    });

    const data = await res.json();

    if (!data.success) {
        // Error code 119 = session expired
        if (data.error?.code === 119) {
            console.log('[NAS] Session expired, re-login...');
            clearSession();
            return uploadToNAS(file, entity, entityId); // retry once
        }
        throw new Error(`NAS upload failed (error: ${JSON.stringify(data.error)})`);
    }

    // คืนค่า path ของไฟล์บน NAS (จะถูกเก็บใน Firebase)
    const nasPath = `${destPath}/${file.name}`;
    console.log('[NAS] Upload successful:', nasPath);
    return nasPath;
}

// --- Image Display ---
// Cache blob URLs เพื่อไม่ต้อง fetch ซ้ำ
const blobCache = new Map<string, string>();

/**
 * ดึงรูปภาพจาก NAS แล้วสร้าง blob URL สำหรับแสดงผล
 * @param nasPath - path ของไฟล์บน NAS
 * @returns blob URL ที่ใช้ได้ใน <img src="...">
 */
export async function getNASImageUrl(nasPath: string): Promise<string> {
    // เช็ค cache ก่อน
    if (blobCache.has(nasPath)) {
        return blobCache.get(nasPath)!;
    }

    const sid = await ensureSession();

    const params = new URLSearchParams({
        api: 'SYNO.FileStation.Download',
        version: '2',
        method: 'download',
        path: nasPath,
        mode: 'open',
        _sid: sid,
    });

    const res = await fetch(`${NAS_API_BASE}/entry.cgi?${params.toString()}`);

    if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
            clearSession();
        }
        throw new Error(`Failed to fetch NAS image (${res.status})`);
    }

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    // เก็บ cache
    blobCache.set(nasPath, blobUrl);

    return blobUrl;
}

/**
 * ตรวจสอบว่า URL เป็น NAS path หรือไม่
 */
export function isNASPath(url: string): boolean {
    return url.startsWith('/web/Maintenance api/uploads/');
}

/**
 * ล้าง blob cache (เรียกเมื่อ component unmount)
 */
export function clearBlobCache() {
    blobCache.forEach((blobUrl) => URL.revokeObjectURL(blobUrl));
    blobCache.clear();
}
