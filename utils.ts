// utils.ts
import type { StockStatus } from './types';

export const WORK_START_HOUR = 8;
export const WORK_END_HOUR = 17;
export const LUNCH_START_HOUR = 12;
export const LUNCH_END_HOUR = 13;

export const calculateFinishTime = (startDate: Date, durationHours: number, holidays: string[] = []): Date => {
    if (isNaN(startDate.getTime()) || durationHours <= 0) {
        return startDate;
    }

    let remainingMinutes = durationHours * 60;
    let currentTime = new Date(startDate.getTime());

    while (remainingMinutes > 0) {
        const dayOfWeek = currentTime.getDay(); // 0 = Sunday, 6 = Saturday
        const hour = currentTime.getHours();
        const dateString = currentTime.toISOString().split('T')[0];

        // Check for non-working days (Sunday or Holiday)
        const isHoliday = holidays.includes(dateString);
        if (dayOfWeek === 0 || isHoliday) {
            currentTime.setDate(currentTime.getDate() + 1);
            currentTime.setHours(WORK_START_HOUR, 0, 0, 0);
            continue;
        }

        // Check if outside working hours or during lunch
        if (hour < WORK_START_HOUR) {
            currentTime.setHours(WORK_START_HOUR, 0, 0, 0);
            continue;
        }
        if (hour >= WORK_END_HOUR) {
            currentTime.setDate(currentTime.getDate() + 1);
            currentTime.setHours(WORK_START_HOUR, 0, 0, 0);
            continue;
        }
        if (hour >= LUNCH_START_HOUR && hour < LUNCH_END_HOUR) {
            currentTime.setHours(LUNCH_END_HOUR, 0, 0, 0);
            continue;
        }

        // It's a valid working minute
        remainingMinutes--;
        currentTime.setMinutes(currentTime.getMinutes() + 1);
    }

    return currentTime;
};


// utils.ts
export const formatHoursToHHMM = (decimalHours: number): string => {
  if (isNaN(decimalHours)) {
    return '0:00';
  }
  
  const absDecimalHours = Math.abs(decimalHours);
  const hours = Math.floor(absDecimalHours);
  const minutesFraction = absDecimalHours % 1;
  const minutes = Math.round(minutesFraction * 60);
  
  const paddedMinutes = String(minutes).padStart(2, '0');
  
  return `${hours}:${paddedMinutes}`;
};

export const formatHoursDescriptive = (decimalHours: number): string => {
    if (isNaN(decimalHours)) {
        return '-';
    }

    const sign = decimalHours < 0 ? '-' : '';
    const totalMinutes = Math.round(Math.abs(decimalHours) * 60);
    if (totalMinutes === 0) {
        return '0 นาที';
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const parts: string[] = [];
    if (hours > 0) {
        parts.push(`${hours} ชั่วโมง`);
    }
    if (minutes > 0) {
        parts.push(`${minutes} นาที`);
    }

    return sign + parts.join(' ');
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

export const calculateStockStatus = (quantity: number, minStock: number, maxStock: number | null): StockStatus => {
    const numQuantity = Number(quantity);
    const numMinStock = Number(minStock);

    if (numQuantity <= 0) {
        return 'หมดสต็อก';
    }
    if (numQuantity <= numMinStock) {
        // FIX: Corrected typo from "สต๊อกต่ำ" to "สต็อกต่ำ" to match StockStatus type.
        return 'สต็อกต่ำ';
    }
    if (maxStock !== null && maxStock > 0 && numQuantity > Number(maxStock)) {
        return 'สต๊อกเกิน';
    }
    return 'ปกติ';
};

export const calculateDurationHours = (start: string | null | undefined, end: string | null | undefined): number => {
    if (!start || !end) return 0;
    try {
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        if (isNaN(startTime) || isNaN(endTime)) return 0;
        return (endTime - startTime) / (1000 * 60 * 60);
    } catch {
        return 0;
    }
};