export const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDuration = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return '0 hours';
  if (totalSeconds < 3600) {
    const minutes = Math.round(totalSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.round(totalSeconds / 3600);
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
};

export const formatShortDuration = (totalSeconds: number): string => {
  if (totalSeconds < 60) return '0m';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);

  if (hours > 0) {
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }
  
  return `${minutes}m`;
};

export const formatAnkiInterval = (interval: number, unit: 'm' | 'd'): string => {
    if (unit === 'm') {
        if (interval < 60) {
            return `${interval}m`;
        }
        const hours = interval / 60;
        return `${parseFloat(hours.toFixed(1))}h`;
    }

    if (unit === 'd') {
        if (interval < 31) {
            return `${interval}d`;
        }
        if (interval < 365) {
            const months = interval / 30.44; // Average days in a month
            return `${parseFloat(months.toFixed(1))}mo`;
        }
        const years = interval / 365.25; // Account for leap years
        return `${parseFloat(years.toFixed(1))}y`;
    }
    
    return '';
};