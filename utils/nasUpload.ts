/**
 * nasUpload.ts — อัปโหลดรูปภาพไปยัง NAS ผ่าน PHP upload.php
 * ตามไกด์: เลือก BASE URL แบบ fallback + cache 10 นาที
 */

const NAS_API_KEY = import.meta.env.VITE_NAS_API_KEY || 'NAS_UPLOAD_KEY_sansan856';

let cachedBase: string | null = null;
const getCandidates = (): string[] => {
  const overrides: string[] = [];
  const envOverride = (import.meta as any).env?.VITE_NAS_API_BASE_OVERRIDE as string | undefined;
  if (envOverride) overrides.push(envOverride);
  if (typeof window !== 'undefined') {
    const o = window.localStorage?.getItem('NAS_API_BASE_OVERRIDE');
    const t = window.localStorage?.getItem('NAS_API_TUNNEL');
    if (o) overrides.push(o);
    if (t) overrides.push(t);
  }
  return [
    ...overrides,
    'https://neosiam.dscloud.biz/Maintenance-api',
    'http://192.168.1.82/Maintenance-api',
  ];
};

const probe = async (base: string): Promise<boolean> => {
  try {
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), 2500);
    const res = await fetch(`${base}/diag.php`, { method: 'GET', cache: 'no-store', signal: c.signal });
    clearTimeout(timer);
    return res.ok;
  } catch { return false; }
};

const resolveBaseUrl = async (): Promise<string> => {
  if (cachedBase) return cachedBase;
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage?.getItem('NAS_API_BASE_CACHE');
      if (raw) {
        const { base, ts } = JSON.parse(raw);
        if (base && ts && Date.now() - Number(ts) < 10 * 60 * 1000) {
          cachedBase = base; return cachedBase;
        }
      }
    } catch {}
  }
  for (const base of getCandidates()) {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && base.startsWith('http://')) continue;
    if (await probe(base)) {
      cachedBase = base;
      if (typeof window !== 'undefined') {
        try { window.localStorage?.setItem('NAS_API_BASE_CACHE', JSON.stringify({ base, ts: Date.now() })); } catch {}
      }
      return cachedBase;
    }
  }
  throw new Error('No NAS endpoint reachable');
};

/**
 * อัปโหลดไฟล์ไปยัง NAS
 * รองรับ 2 รูปแบบ:
 *   uploadToNAS(file, 'truck-maintenance/vehicle/VEH-001/photo.webp')  — path โดยตรง
 *   uploadToNAS(file, 'vehicle', 'VEH-001')                            — entity/entityId (สร้าง path อัตโนมัติ)
 */
export const uploadToNAS = async (
  file: File | Blob,
  entityOrPath: string,
  entityId?: string
): Promise<string> => {
  const fileName = file instanceof File ? file.name : `${Date.now()}.webp`;
  const path = entityId ? `truck-maintenance/${entityOrPath}/${entityId}/${fileName}` : entityOrPath;

  const formData = new FormData();
  formData.append('file', file, fileName);
  formData.append('path', path);

  const base = await resolveBaseUrl();
  const response = await fetch(`${base}/upload.php`, {
    method: 'POST',
    headers: { 'X-API-Key': NAS_API_KEY },
    body: formData,
  });

  const text = await response.text();
  let result: any; try { result = JSON.parse(text); } catch { throw new Error(`NAS upload: invalid JSON response: ${text.substring(0, 200)}`); }
  if (!result?.success || !result?.url) { throw new Error(`NAS upload failed: ${result?.error || 'unknown error'}`); }
  return result.url as string;
};

/** ตรวจสอบว่า URL เป็นรูปจาก NAS หรือไม่ */
export const isNASPath = (url: string): boolean => {
  return url.includes('neosiam.dscloud.biz/api/serve.php?file=');
};
