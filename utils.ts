// utils.ts
export const formatHoursToHHMM = (decimalHours: number): string => {
  if (isNaN(decimalHours) || decimalHours < 0) {
    return '0:00';
  }
  
  const hours = Math.floor(decimalHours);
  const minutesFraction = decimalHours % 1;
  const minutes = Math.round(minutesFraction * 60);
  
  const paddedMinutes = String(minutes).padStart(2, '0');
  
  return `${hours}:${paddedMinutes}`;
};

export const formatDateTime24h = (isoString: string | null | undefined): string => {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23' // Explicitly 24-hour clock
    }).replace(',', '');
  } catch {
    return '-';
  }
};

export const promptForPassword = (action: string): boolean => {
    const password = window.prompt(`เพื่อยืนยันการ${action}, โปรดกรอกรหัสผ่าน:`);
    if (password === null) {
        return false;
    }
    if (password === '1234') {
        return true;
    }
    alert('รหัสผ่านไม่ถูกต้อง!');
    return false;
};
