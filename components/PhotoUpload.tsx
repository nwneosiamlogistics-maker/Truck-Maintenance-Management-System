import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { uploadFileToStorage } from '../utils/fileUpload';

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  entity: string; // 'vehicle', 'repair', 'driver', 'incident', 'insurance', 'cargo'
  entityId: string;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ photos, onChange, entity, entityId }) => {
  const [uploading, setUploading] = useState(false);
  const { addToast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error');
      return;
    }

    setUploading(true);
    try {
      // สร้างชื่อไฟล์ปลอดภัย และใช้ .webp เป็นนามสกุลให้ตรงกับไฟล์ที่บีบอัด
      const base = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '');
      const filename = `${Date.now()}_${base}.webp`;

      // อัปโหลดไปยัง NAS (ตัวช่วยจะบีบอัดเป็น WebP ให้เอง)
      const path = `truck-maintenance/${entity}/${entityId}/${filename}`;
      const imageUrl = await uploadFileToStorage(file, path);

      // เก็บ NAS URL ใน Firebase Realtime Database (ผ่าน onChange)
      onChange([...photos, imageUrl]);
      addToast('อัปโหลดรูปสำเร็จ', 'success');

    } catch (error: any) {
      console.error('Upload error:', error);
      addToast(`อัปโหลดรูปไม่สำเร็จ: ${error.message || 'กรุณาลองใหม่'}`, 'error');
    } finally {
      setUploading(false);
      // Reset input value so the same file can be selected again
      event.target.value = '';
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onChange(newPhotos);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium">รูปภาพ</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          aria-label="เลือกรูปภาพ"
          className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
        />
        {uploading && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-blue-600">กำลังอัปโหลดรูปภาพ...</p>
          </div>
        )}
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {photos.map((url, index) => (
            <div key={index} className="relative">
              <img
                src={url}
                alt={`รูปภาพ ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '';
                  (e.target as HTMLImageElement).alt = 'โหลดรูปไม่ได้';
                }}
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
