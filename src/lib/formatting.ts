import { format as dateFnsFormat } from 'date-fns';

export function formatDate(dateString: string, formatStr: string = 'MMM d, yyyy'): string {
    try {
        const date = new Date(dateString);
        return dateFnsFormat(date, formatStr);
    } catch {
        return dateString;
    }
}

export function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatPercentage(value: number, decimals: number = 2): string {
    return `${(value * 100).toFixed(decimals)}%`;
}

export function formatDateInput(dateString: string): string {
    try {
        const date = new Date(dateString);
        return dateFnsFormat(date, 'yyyy-MM-dd');
    } catch {
        return '';
    }
}
