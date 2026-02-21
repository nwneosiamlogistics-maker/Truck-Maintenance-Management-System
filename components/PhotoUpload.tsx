import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import imageCompression from 'browser-image-compression';
import { useToast } from '../context/ToastContext';

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  entity: string; // 'vehicle', 'repair', 'purchaseOrder'
  entityId: string;
}

// ฟังก์ชันอัปโหลดรูปไปยัง PHP script บน NAS
const uploadToNAS = async (file: File, entity: string, entityId: string): Promise<string> => {
  const formData = new FormData();
  formData.append('photo', file);

  // เรียกใช้ upload.php บน NAS
  const response = await fetch(`http://192.168.1.89/Maintenance%20api/upload.php?entity=${encodeURIComponent(entity)}&id=${encodeURIComponent(entityId)}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = 'Upload failed';
    try {
      const errData = await response.json();
      errorMsg = errData.error || errorMsg;
    } catch (e) {
      errorMsg = `Server error ${response.status}`;
    }
    throw new Error(errorMsg);
  }

  const result = await response.json();
  if (result.url) {
    return result.url;
  } else {
    throw new Error('No URL returned from server');
  }
};

// ตรวจสอบว่าเป็น URL ของ NAS หรือไม่
const isNASPath = (url: string) => {
  return url.includes('192.168.1.89') || url.includes('Maintenance%20api');
};

// ดึง URL สำหรับแสดงรูปภาพ
const getNASImageUrl = async (url: string) => {
  // สำหรับการแสดงผล สามารถใช้ URL ที่ได้มาตรงๆ ได้เลย เพราะ serve.php คืนค่าเป็น public URL
  return url;
};

/**
 * Component สำหรับแสดงรูปภาพจาก NAS
 * ถ้า URL เป็น NAS path จะ fetch ผ่าน FileStation API
 * ถ้าเป็น URL ปกติ (http/https/data) จะแสดงตรงๆ
 */
const NASImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isNASPath(src)) {
      setBlobUrl(src);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    getNASImageUrl(src)
      .then((url) => {
        if (!cancelled) {
          setBlobUrl(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load NAS image:', err);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [src]);

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 animate-pulse`}>
        <span className="text-xs text-gray-400">กำลังโหลด...</span>
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className={`${className} flex items-center justify-center bg-red-50 border border-red-200`}>
        <span className="text-xs text-red-400">โหลดรูปไม่ได้</span>
      </div>
    );
  }

  return <img src={blobUrl} alt={alt} className={className} />;
};

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
      // Compress to WebP (max ~5MB, limit dimension to control size)
      const compressed = await imageCompression(file, {
        maxSizeMB: 5,
        maxWidthOrHeight: 2560,
        fileType: 'image/webp',
        initialQuality: 0.8,
      });

      // Safety: reject if still >5MB after compression
      if (compressed.size > 5 * 1024 * 1024) {
        addToast('ขนาดไฟล์หลังบีบอัดยังเกิน 5MB กรุณาลดขนาดรูป', 'error');
        return;
      }

      // สร้างชื่อไฟล์ที่ปลอดภัย (ไม่มีอักขระพิเศษ)
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = `${Date.now()}_${safeName}.webp`;
      const webpFile = new File([compressed], filename, { type: 'image/webp' });

      // อัปโหลดไปยัง NAS ผ่าน FileStation API
      const nasPath = await uploadToNAS(webpFile, entity, entityId);

      // เก็บ NAS path ใน Firebase (ผ่าน onChange)
      onChange([...photos, nasPath]);
      addToast('อัปโหลดรูปไปยัง NAS สำเร็จ', 'success');

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
            <p className="text-sm text-blue-600">กำลังอัปโหลดไปยัง NAS...</p>
          </div>
        )}
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {photos.map((url, index) => (
            <div key={index} className="relative">
              <NASImage
                src={url}
                alt={`รูปภาพ ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border"
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
