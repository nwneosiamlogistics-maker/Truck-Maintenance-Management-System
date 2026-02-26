/**
 * imageCompression.ts — บีบอัดรูปฝั่ง client เป็น WebP ก่อนส่งขึ้น NAS
 * ตาม NAS-UPLOAD-GUIDE Step 4
 * รองรับ HEIC/HEIF (กล้อง iOS) โดย fallback เป็นไฟล์เดิมถ้าบีบอัดไม่ได้
 */

export const compressImageFile = async (
    file: File,
    maxWidth = 1200,
    quality = 0.75
): Promise<File> => {
    // non-image extension: skip compression
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'bmp'].includes(ext);
    if (!isImage) return file;

    try {
        // createImageBitmap อาจ throw สำหรับ HEIC/HEIF บนบางบราวเซอร์ → ใช้ try/catch
        const bitmap = await createImageBitmap(file);
        const ratio = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
        const w = Math.round(bitmap.width * ratio);
        const h = Math.round(bitmap.height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;
        ctx.drawImage(bitmap, 0, 0, w, h);
        bitmap.close?.();

        const blob: Blob | null = await new Promise(resolve =>
            canvas.toBlob(resolve, 'image/webp', quality)
        );
        if (!blob) return file;

        const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
        return new File([blob], name, { type: 'image/webp' });
    } catch {
        // Fallback: ส่งไฟล์เดิมถ้าบีบอัดไม่สำเร็จ (เช่น HEIC บน iOS Safari)
        console.warn('[imageCompression] fallback to original:', file.name);
        return file;
    }
};
