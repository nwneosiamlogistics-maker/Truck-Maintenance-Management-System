# NAS File Upload Integration Guide — Truck Maintenance Management System

## สำหรับ AI Agent
ไฟล์นี้อธิบายสถาปัตยกรรมการอัปโหลดรูปภาพไปยัง Synology NAS
**อ่านก่อนแก้ไขโค้ดใดๆ ที่เกี่ยวกับการอัปโหลดไฟล์**

---

## ข้อมูล NAS Server

| รายการ | ค่า |
|--------|-----|
| NAS Model | Synology DiskStation (DSM 7) |
| Domain | `neosiam.dscloud.biz` |
| Upload Endpoint | `https://neosiam.dscloud.biz/api/upload.php` |
| Serve Endpoint | `https://neosiam.dscloud.biz/api/serve.php?file={path}` |
| API Key | `NAS_UPLOAD_KEY_sansan856` |
| PHP Upload Dir (NAS) | `/tmp/nas-uploads/` |
| PHP Web Dir (NAS) | `/volume1/web/api/` |

> ⚠️ API Key ต้องตรงกับที่กำหนดใน `/web/api/upload.php` บน NAS เสมอ
> ปัจจุบัน upload.php ใช้ Key: `NAS_UPLOAD_KEY_sansan856`

---

## โครงสร้าง Folder บน NAS

```
/tmp/nas-uploads/
└── truck-maintenance/
    ├── vehicle/              ← รูปรถ
    │   └── VEH-001/
    │       └── 1740000000_photo.webp
    ├── repair/               ← รูปงานซ่อม
    │   └── REP-001/
    ├── purchaseOrder/        ← รูปใบสั่งซื้อ
    │   └── PO-001/
    ├── purchaseRequisition/  ← รูปรับของจาก PO
    │   └── PR-001/
    ├── driver/               ← รูปพนักงานขับรถ
    │   └── DRV-001/
    ├── incident/             ← รูปอุบัติเหตุ
    │   └── INC-001/
    ├── insuranceClaim/       ← รูปเคลมประกัน
    │   └── IC-001/
    └── cargoClaim/           ← รูปเคลมสินค้า
        └── CC-001/
```

---

## Flow การทำงาน (ถูกต้อง)

```
ผู้ใช้เลือกรูปใน Component (เช่น PhotoUpload.tsx)
    ↓
uploadFileToStorage(file, path)   ← utils/fileUpload.ts
    ↓
compressImageFile(file)           ← บีบอัดเป็น WebP 800px/q0.6
    ↓
uploadToNAS(compressedFile, path) ← utils/nasUpload.ts
    ↓
POST https://neosiam.dscloud.biz/api/upload.php
    Headers: X-API-Key: NAS_UPLOAD_KEY_sansan856
    Body (FormData):
      file = [ไฟล์ WebP]
      path = "truck-maintenance/vehicle/VEH-001/1740000000_photo.webp"
    ↓
NAS บันทึกไฟล์ที่:
    /tmp/nas-uploads/truck-maintenance/vehicle/VEH-001/1740000000_photo.webp
    ↓
NAS ส่ง URL กลับ:
    { "success": true, "url": "https://neosiam.dscloud.biz/api/serve.php?file=/truck-maintenance/vehicle/VEH-001/1740000000_photo.webp" }
    ↓
เก็บ URL ใน Firebase Realtime Database (ไม่ใช่ Firebase Storage!)
    ↓
แสดงรูปด้วย <img src={url} />
```

---

## ไฟล์สำคัญในโปรเจกต์

| ไฟล์ | หน้าที่ |
|------|---------|
| `utils/nasUpload.ts` | ส่งไฟล์ไป NAS ผ่าน HTTP POST |
| `utils/fileUpload.ts` | รวม compress + upload (ฟังก์ชันหลักที่ Component เรียกใช้) |
| `utils/imageCompression.ts` | บีบอัดรูปเป็น WebP ฝั่ง browser |
| `components/PhotoUpload.tsx` | UI component สำหรับเลือกและอัปโหลดรูป |

---

## โค้ดที่ถูกต้อง — คัดลอกไปแทนที่ไฟล์เดิมได้เลย

### `utils/nasUpload.ts` (แก้ API Key บรรทัด 9)
```typescript
/**
 * nasUpload.ts — อัปโหลดรูปภาพไปยัง NAS ผ่าน PHP upload.php
 * Endpoint: https://neosiam.dscloud.biz/api/upload.php
 */
const NAS_API_URL = import.meta.env.VITE_NAS_UPLOAD_URL || 'https://neosiam.dscloud.biz/api/upload.php';
const NAS_API_KEY = import.meta.env.VITE_NAS_API_KEY || 'NAS_UPLOAD_KEY_sansan856';
// ⚠️ Key ต้องตรงกับ upload.php บน NAS: NAS_UPLOAD_KEY_sansan856

export const uploadToNAS = async (
    file: File | Blob,
    entityOrPath: string,
    entityId?: string
): Promise<string> => {
    const fileName = file instanceof File ? file.name : `${Date.now()}.webp`;
    const path = entityId
        ? `truck-maintenance/${entityOrPath}/${entityId}/${fileName}`
        : entityOrPath;

    const formData = new FormData();
    formData.append('file', file, fileName);
    formData.append('path', path);

    const response = await fetch(NAS_API_URL, {
        method: 'POST',
        headers: { 'X-API-Key': NAS_API_KEY },
        body: formData,
    });

    const text = await response.text();
    let result: any;
    try {
        result = JSON.parse(text);
    } catch {
        throw new Error(`NAS upload: invalid JSON response: ${text.substring(0, 200)}`);
    }

    if (!result.success || !result.url) {
        throw new Error(`NAS upload failed: ${result.error || JSON.stringify(result)}`);
    }

    return result.url;
};

export const isNASPath = (url: string): boolean => {
    return url.includes('neosiam.dscloud.biz/api/serve.php?file=');
};
```

### `utils/fileUpload.ts` (เปลี่ยนจาก Firebase Storage → NAS)
```typescript
/**
 * fileUpload.ts — compress + upload ไป NAS (ไม่ใช่ Firebase Storage)
 * ⚠️ อย่าใช้ firebase/storage อีกต่อไป — ใช้ NAS แทน
 */
import { compressImageFile } from './imageCompression';
import { uploadToNAS } from './nasUpload';

export const uploadFileToStorage = async (file: File, path: string): Promise<string> => {
    const compressed = await compressImageFile(file);
    return uploadToNAS(compressed, path);
};

export const uploadFilesToStorage = async (files: File[], basePath: string): Promise<string[]> => {
    const promises = files.map((file, index) => {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${basePath}/${timestamp}_${index}_${safeName.replace(/\.[^.]+$/, '')}.webp`;
        return uploadFileToStorage(file, path);
    });
    return Promise.all(promises);
};
```

---

## ข้อควรระวัง (สำคัญมาก)

1. **อย่าลบ Firebase** — ยังใช้ Firebase **Realtime Database** เก็บข้อมูล entity ทั้งหมด (ไม่ใช่ Firebase Storage)
2. **URL ที่เก็บใน DB** ต้องเป็น `https://neosiam.dscloud.biz/api/serve.php?file=...` เท่านั้น
3. **ห้ามใช้** `firebase/storage` (`uploadBytes`, `getDownloadURL`) สำหรับรูปภาพอีกต่อไป
4. **ขนาดไฟล์สูงสุด** 10MB ต่อไฟล์ (กำหนดใน upload.php บน NAS)
5. **ประเภทไฟล์ที่รองรับ**: `image/webp`, `image/jpeg`, `image/png`, `image/gif`, `application/pdf`
6. **Path บน NAS** ต้องขึ้นต้นด้วย `truck-maintenance/` เสมอ เพื่อแยกจากโปรเจกต์อื่น
7. **upload.php** ใช้ร่วมกับโปรเจกต์ `subcontractor-truck-management` — ห้ามแก้ไข API Key ใน upload.php โดยไม่แจ้งโปรเจกต์อื่น

---

## การทดสอบ

หลังแก้ไขโค้ดแล้ว ทดสอบโดย:
1. เปิดหน้าเพิ่มรถ (Vehicle) แล้วลองอัปโหลดรูป
2. เปิด Browser DevTools → Network tab → ดู request ไปที่ `upload.php`
3. ถ้าสำเร็จจะเห็น response: `{"success":true,"url":"https://neosiam.dscloud.biz/api/serve.php?file=..."}`
4. ถ้าได้ `{"success":false,"error":"Unauthorized"}` → API Key ไม่ตรง ให้ตรวจสอบ Key ใน `nasUpload.ts`
5. ถ้าได้ Network Error / CORS Error → NAS ไม่ได้เปิด Port 80/443 หรือ Port Forwarding บน Router ยังไม่ได้ตั้งค่า

---

## ประวัติการแก้ไข

| วันที่ | รายการ |
|--------|--------|
| 2026-02-23 | สร้าง Guide นี้ + แก้ไข fileUpload.ts ให้ส่งไป NAS แทน Firebase Storage |
| 2026-02-23 | แก้ไข nasUpload.ts API Key ให้ตรงกับ upload.php บน NAS |
