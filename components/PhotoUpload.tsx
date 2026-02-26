import React, { useRef, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { uploadFileToStorage } from '../utils/fileUpload';

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  entity: string; // 'vehicle', 'repair', 'driver', 'incident', 'insurance', 'cargo'
  entityId: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/bmp'];

const PhotoUpload: React.FC<PhotoUploadProps> = ({ photos, onChange, entity, entityId }) => {
  const [uploadingCount, setUploadingCount] = useState(0);
  const { addToast } = useToast();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    // Validate: กรองเฉพาะรูปภาพ (รองรับ HEIC/HEIF จากกล้อง iOS)
    const validFiles = fileArray.filter(f => {
      const isImage = f.type.startsWith('image/') || ALLOWED_TYPES.includes(f.type.toLowerCase());
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      const isValidExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'bmp'].includes(ext);
      return isImage || isValidExt;
    });

    if (validFiles.length === 0) {
      addToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error');
      return;
    }

    if (validFiles.length < fileArray.length) {
      addToast(`ข้ามไฟล์ที่ไม่ใช่รูป ${fileArray.length - validFiles.length} ไฟล์`, 'warning' as any);
    }

    setUploadingCount(validFiles.length);

    const uploadedUrls: string[] = [];
    let failCount = 0;

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        const base = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '');
        const filename = `${Date.now()}_${i}_${base}.webp`;
        const path = `truck-maintenance/${entity}/${entityId}/${filename}`;
        const url = await uploadFileToStorage(file, path);
        uploadedUrls.push(url);
      } catch (err: any) {
        console.error('Upload error:', err);
        failCount++;
      } finally {
        setUploadingCount(prev => Math.max(0, prev - 1));
      }
    }

    if (uploadedUrls.length > 0) {
      onChange([...photos, ...uploadedUrls]);
      addToast(`อัปโหลดสำเร็จ ${uploadedUrls.length} รูป${failCount > 0 ? ` (ล้มเหลว ${failCount} รูป)` : ''}`, 'success');
    } else {
      addToast('อัปโหลดไม่สำเร็จ กรุณาลองใหม่', 'error');
    }
  };

  const handleCameraChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await uploadFiles(e.target.files);
    e.target.value = '';
  };

  const handleGalleryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await uploadFiles(e.target.files);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  const isUploading = uploadingCount > 0;

  return (
    <div className="space-y-3">
      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraChange}
        className="hidden"
        aria-label="ถ่ายรูปจากกล้อง"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleGalleryChange}
        className="hidden"
        aria-label="เลือกรูปจากแกลเลอรี่"
      />

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isUploading}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-bold rounded-xl transition-all active:scale-95 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          ถ่ายรูป
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={isUploading}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-all active:scale-95 border border-slate-200 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          เลือกรูป
        </button>
      </div>

      {/* Upload progress */}
      {isUploading && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
          <p className="text-sm text-blue-700 font-medium">
            กำลังอัปโหลด{uploadingCount > 1 ? ` (เหลืออีก ${uploadingCount} รูป)` : ''}...
          </p>
        </div>
      )}

      {/* Photo thumbnails */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {photos.map((url, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={url}
                alt={`รูปภาพ ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border border-slate-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md opacity-80 hover:opacity-100 transition-all"
                title="ลบรูป"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && !isUploading && (
        <p className="text-xs text-slate-400 text-center py-1">ยังไม่มีรูปภาพ</p>
      )}
    </div>
  );
};

export default PhotoUpload;
