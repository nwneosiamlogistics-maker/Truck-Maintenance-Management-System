
import type { StockStatus } from './types';

export function promptForPassword(action: string): boolean {
    const password = window.prompt(`โปรดยืนยันรหัสผ่านเพื่อดำเนินการ '${action}':`);
    if (password === '1234') {
        return true;
    }
    if (password !== null) { // User didn't click cancel
        alert('รหัสผ่านไม่ถูกต้อง!');
    }
    return false;
}

export function calculateStockStatus(quantity: number, minStock: number, maxStock: number | null): StockStatus {
    if (quantity <= 0) return 'หมดสต็อก';
    if (quantity <= minStock) return 'สต็อกต่ำ';
    if (maxStock !== null && quantity > maxStock) return 'สต๊อกเกิน';
    return 'ปกติ';
}

export function formatDateTime24h(isoString: string | null | undefined): string {
    if (!isoString) return '-';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleString('th-TH', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    } catch {
        return '-';
    }
}

export function calculateDurationHours(start: string | null, end: string | null): number {
    if (!start || !end) return 0;
    try {
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
        const diffMillis = endDate.getTime() - startDate.getTime();
        return diffMillis / (1000 * 60 * 60);
    } catch {
        return 0;
    }
}

export function formatHoursDescriptive(totalHours: number): string {
    if (isNaN(totalHours) || !isFinite(totalHours)) {
        return 'N/A';
    }

    const sign = totalHours < 0 ? '-' : '';
    const absHours = Math.abs(totalHours);

    // Assuming an 8-hour workday for 'day' calculation
    const days = Math.floor(absHours / 8);
    const remainingHoursAfterDays = absHours % 8;
    const hours = Math.floor(remainingHoursAfterDays);
    const minutes = Math.round((remainingHoursAfterDays - hours) * 60);

    const parts = [];
    if (days > 0) parts.push(`${days} วัน`);
    if (hours > 0) parts.push(`${hours} ชั่วโมง`);
    if (minutes > 0) parts.push(`${minutes} นาที`);

    if (parts.length === 0) return '0 นาที';

    return sign + parts.join(' ');
}


export function formatHoursToHHMM(hours: number): string {
    if (isNaN(hours) || !isFinite(hours)) return '00:00';
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function calculateFinishTime(startDate: Date, durationHours: number, holidays: string[]): Date {
    let finishDate = new Date(startDate.getTime());
    let remainingHours = durationHours;

    const workDayStart = 8;
    const lunchStart = 12;
    const lunchEnd = 13;
    const workDayEnd = 17;

    while (remainingHours > 0) {
        const dayOfWeek = finishDate.getDay();
        const currentDateStr = finishDate.toISOString().split('T')[0];

        // Skip weekends and holidays
        if (dayOfWeek === 0 || dayOfWeek === 6 || holidays.includes(currentDateStr)) {
            finishDate.setDate(finishDate.getDate() + 1);
            finishDate.setHours(workDayStart, 0, 0, 0);
            continue;
        }

        let currentHour = finishDate.getHours();
        let currentMinute = finishDate.getMinutes();

        // Adjust to start of working hours if before
        if (currentHour < workDayStart) {
            currentHour = workDayStart;
            currentMinute = 0;
        }

        // Adjust to after lunch if during lunch
        if (currentHour >= lunchStart && currentHour < lunchEnd) {
            currentHour = lunchEnd;
            currentMinute = 0;
        }

        // Move to next day if already past work hours
        if (currentHour >= workDayEnd) {
            finishDate.setDate(finishDate.getDate() + 1);
            finishDate.setHours(workDayStart, 0, 0, 0);
            continue;
        }

        finishDate.setHours(currentHour, currentMinute);

        const hoursInFloat = currentHour + currentMinute / 60;
        const morningHoursLeft = Math.max(0, lunchStart - hoursInFloat);
        const afternoonHoursLeft = Math.max(0, workDayEnd - Math.max(hoursInFloat, lunchEnd));

        const hoursAvailableToday = morningHoursLeft + afternoonHoursLeft;

        if (remainingHours <= hoursAvailableToday) {
            let hoursToAdd = remainingHours;
            let finalHourFloat = hoursInFloat;

            // Add to morning if possible
            const addInMorning = Math.min(hoursToAdd, morningHoursLeft);
            finalHourFloat += addInMorning;
            hoursToAdd -= addInMorning;

            // If still hours left, skip lunch break and add to afternoon
            if (hoursToAdd > 0) {
                if (finalHourFloat < lunchEnd) {
                    finalHourFloat = lunchEnd;
                }
                finalHourFloat += hoursToAdd;
            }

            const finalH = Math.floor(finalHourFloat);
            const finalM = Math.round((finalHourFloat - finalH) * 60);
            finishDate.setHours(finalH, finalM);
            remainingHours = 0;

        } else {
            remainingHours -= hoursAvailableToday;
            finishDate.setDate(finishDate.getDate() + 1);
            finishDate.setHours(workDayStart, 0, 0, 0);
        }
    }
    return finishDate;
}

export function numberToThaiWords(num: number): string {
    const units = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const tens = ['', 'สิบ', 'ยี่สิบ', 'สามสิบ', 'สี่สิบ', 'ห้าสิบ', 'หกสิบ', 'เจ็ดสิบ', 'แปดสิบ', 'เก้าสิบ'];
    const places = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    let numStr = String(Math.floor(num));
    let decimalStr = String(num).split('.')[1];
    let result = '';

    const convertInteger = (integerPart: string) => {
        let output = '';
        if (integerPart === '0') return 'ศูนย์';
        for (let i = 0; i < integerPart.length; i++) {
            const digit = parseInt(integerPart[i]);
            const placeIndex = integerPart.length - 1 - i;
            if (digit > 0) {
                if (placeIndex % 6 === 1) { // Tens place
                    output += tens[digit];
                } else if (placeIndex % 6 === 0 && digit === 1 && integerPart.length > 1 && parseInt(integerPart[i - 1]) !== 0) {
                    output += 'เอ็ด';
                } else {
                    output += units[digit] + places[placeIndex % 6];
                }
            }
            if (placeIndex % 6 === 0 && placeIndex > 0) {
                const isMillionPlace = Math.floor(placeIndex / 6) > 0;
                if (isMillionPlace) {
                    output += places[6]; // ล้าน
                }
            }
        }
        return output.replace(/ล้าน+/g, 'ล้าน');
    }

    result = convertInteger(numStr) + 'บาท';

    if (decimalStr) {
        let decimalNum = parseInt(decimalStr.slice(0, 2), 10);
        // Ensure 2 digits
        if (decimalStr.length === 1) decimalNum *= 10;

        if (decimalNum > 0) {
            result += convertInteger(String(decimalNum)) + 'สตางค์' + 'ถ้วน';
        } else {
            result += 'ถ้วน';
        }
    } else {
        result += 'ถ้วน';
    }

    return result;
}

export function isToday(dateString: string | null | undefined): boolean {
    if (!dateString) return false;
    try {
        const date = new Date(dateString);
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    } catch {
        return false;
    }
};

export const isYesterday = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false;
    try {
        const date = new Date(dateString);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        return date.getDate() === yesterday.getDate() &&
            date.getMonth() === yesterday.getMonth() &&
            date.getFullYear() === yesterday.getFullYear();
    } catch {
        return false;
    }
};

export const calculateDateDifference = (startDateStr: string | null | undefined, endDateStr: string | null | undefined): string => {
    if (!startDateStr || !endDateStr) {
        return '-';
    }
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
        return '-';
    }
    let years = endDate.getFullYear() - startDate.getFullYear();
    let months = endDate.getMonth() - startDate.getMonth();
    let days = endDate.getDate() - startDate.getDate();
    if (days < 0) {
        months--;
        const lastDayOfPreviousMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0).getDate();
        days += lastDayOfPreviousMonth;
    }
    if (months < 0) {
        years--;
        months += 12;
    }
    const parts = [];
    if (years > 0) parts.push(`${years} ปี`);
    if (months > 0) parts.push(`${months} เดือน`);
    if (days > 0) parts.push(`${days} วัน`);
    return parts.length > 0 ? parts.join(' ') : '0 วัน';
};

export const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '0.00';
    }
    return amount.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};
