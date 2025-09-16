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
