import { TIME_FORMAT_REGEX } from './constants';

export interface ValidationResult {
    valid: boolean;
    errors: Record<string, string>;
}

export interface RunnerFormData {
    name: string;
    gender: 'M' | 'F';
    date_of_birth?: string;
}

export interface RaceFormData {
    name: string;
    race_date: string;
    distance: string;
}

export interface ResultFormData {
    runner_id: string;
    finish_time: string;
}

export function validateRunner(data: RunnerFormData): ValidationResult {
    const errors: Record<string, string> = {};

    if (!data.name || data.name.trim().length === 0) {
        errors.name = 'Name is required';
    }

    if (data.name && data.name.length > 100) {
        errors.name = 'Name must be less than 100 characters';
    }

    if (!data.gender || !['M', 'F'].includes(data.gender)) {
        errors.gender = 'Gender must be M or F';
    }

    if (data.date_of_birth) {
        const date = new Date(data.date_of_birth);
        if (isNaN(date.getTime())) {
            errors.date_of_birth = 'Invalid date format';
        }
        if (date > new Date()) {
            errors.date_of_birth = 'Date of birth cannot be in the future';
        }
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

export function validateRace(data: RaceFormData): ValidationResult {
    const errors: Record<string, string> = {};

    if (!data.name || data.name.trim().length === 0) {
        errors.name = 'Race name is required';
    }

    if (!data.race_date) {
        errors.race_date = 'Race date is required';
    } else {
        const date = new Date(data.race_date);
        if (isNaN(date.getTime())) {
            errors.race_date = 'Invalid date format';
        }
    }

    if (!data.distance) {
        errors.distance = 'Distance is required';
    } else {
        const distance = parseFloat(data.distance);
        if (isNaN(distance) || distance <= 0) {
            errors.distance = 'Distance must be a positive number';
        }
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

export function validateFinishTime(time: string): boolean {
    if (!time) return false;
    return TIME_FORMAT_REGEX.test(time);
}

export function validateResult(data: ResultFormData): ValidationResult {
    const errors: Record<string, string> = {};

    if (!data.runner_id) {
        errors.runner_id = 'Runner selection is required';
    }

    if (!data.finish_time) {
        errors.finish_time = 'Finish time is required';
    } else if (!validateFinishTime(data.finish_time)) {
        errors.finish_time = 'Finish time must be in format HH:MM:SS';
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}
