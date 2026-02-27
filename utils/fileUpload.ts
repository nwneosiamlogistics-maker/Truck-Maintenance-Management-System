/**
 * fileUpload.ts — รวม compress + upload ไป NAS (ไม่ใช่ Firebase Storage)
 * ⚠️ อย่าใช้ firebase/storage อีกต่อไป — ใช้ NAS แทน
 */

import { compressImageFile } from './imageCompression';
import { uploadToNAS } from './nasUpload';

/**
 * Upload single file: compress (if image) → NAS → return serve URL
 */
export const uploadFileToStorage = async (file: File, path: string): Promise<string> => {
    const compressed = await compressImageFile(file);
    return uploadToNAS(compressed, path);
};

/**
 * Upload multiple files: compress → upload all → return URL array
 */
export const uploadFilesToStorage = async (files: File[], basePath: string): Promise<string[]> => {
    const promises = files.map((file, index) => {
        const timestamp = Date.now() + index;
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        const isPdf = ext === 'pdf' || file.type === 'application/pdf';
        const finalName = isPdf
            ? `${timestamp}_${safeName}`
            : `${timestamp}_${safeName.replace(/\.[^.]+$/, '')}.webp`;
        const path = `${basePath}/${finalName}`;
        return uploadFileToStorage(file, path);
    });
    return Promise.all(promises);
};
