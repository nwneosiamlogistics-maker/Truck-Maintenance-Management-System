/**
 * imageCompression.ts — บีบอัดรูปฝั่ง client เป็น WebP ก่อนส่งขึ้น NAS
 * ตาม NAS-UPLOAD-GUIDE Step 4
 */

export const compressImageFile = async (
    file: File,
    maxWidth = 800,
    quality = 0.6
): Promise<File> => {
    if (!file.type.startsWith('image/')) return file; // non-image: skip

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

    const blob: Blob | null = await new Promise(resolve =>
        canvas.toBlob(resolve, 'image/webp', quality)
    );
    if (!blob) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], name, { type: 'image/webp' });
};
