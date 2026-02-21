import React, { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { useToast } from './ToastContext'; // Assume ToastContext exists

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  entity: string; // 'vehicle', 'repair', 'purchaseOrder'
  entityId: string;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ photos, onChange, entity, entityId }) => {
  const [uploading, setUploading] = useState(false);
  const { addToast } = useToast();

  const getAuthToken = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    throw new Error('User not authenticated');
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast('ขนาดไฟล์ต้องไม่เกิน 5MB', 'error');
      return;
    }

    setUploading(true);
    try {
      const token = await getAuthToken();
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(`http://nas-server/serve.php?entity=${entity}&id=${entityId}&token=${token}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      if (result.url) {
        onChange([...photos, result.url]);
        addToast('อัปโหลดรูปสำเร็จ', 'success');
      } else {
        throw new Error('No URL returned');
      }
    } catch (error) {
      console.error('Upload error:', error);
      addToast('อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่', 'error');
    } finally {
      setUploading(false);
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
          capture="environment"
          onChange={handleFileChange}
          disabled={uploading}
          aria-label="เลือกรูปภาพ"
          className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
        />
        {uploading && <p className="text-sm text-blue-600 mt-1">กำลังอัปโหลด...</p>}
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {photos.map((url, index) => (
            <div key={index} className="relative">
              <img
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
