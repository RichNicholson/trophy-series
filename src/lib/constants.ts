export const CHAMPIONSHIP_COUNT_LIMIT = 5;

export const GENDER_OPTIONS = [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' }
] as const;

export const DISTANCE_OPTIONS = ['5', '10', '21.1', '42.2'] as const;

export const TIME_FORMAT_REGEX = /^(\d{1,2}):([0-5]\d):([0-5]\d)$/;
