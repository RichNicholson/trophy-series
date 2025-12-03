import { describe, it, expect } from 'vitest';
import { calculateAge, calculateAgeGradedPercent, intervalToSeconds } from '../ageGrading';

describe('intervalToSeconds', () => {
    it('should convert HH:MM:SS to seconds', () => {
        expect(intervalToSeconds('01:30:45')).toBe(5445);
        expect(intervalToSeconds('00:20:30')).toBe(1230);
        expect(intervalToSeconds('02:00:00')).toBe(7200);
    });

    it('should handle edge cases', () => {
        expect(intervalToSeconds('00:00:00')).toBe(0);
        expect(intervalToSeconds('00:00:01')).toBe(1);
    });

    it('should handle invalid formats gracefully', () => {
        expect(intervalToSeconds('')).toBe(0);
        expect(intervalToSeconds('invalid')).toBe(0);
    });
});

describe('calculateAge', () => {
    it('should calculate age correctly', () => {
        const birthDate = '1985-06-15';
        const raceDate = '2024-03-15';
        const age = calculateAge(birthDate, raceDate);

        expect(age).toBe(38);
    });

    it('should handle birthday before race date in same year', () => {
        const birthDate = '1990-01-15';
        const raceDate = '2024-03-15';
        const age = calculateAge(birthDate, raceDate);

        expect(age).toBe(34);
    });

    it('should handle birthday after race date in same year', () => {
        const birthDate = '1990-06-15';
        const raceDate = '2024-03-15';
        const age = calculateAge(birthDate, raceDate);

        expect(age).toBe(33);
    });

    it('should handle invalid date', () => {
        const age = calculateAge('invalid-date', '2024-03-15');
        expect(isNaN(age)).toBe(true);
    });
});

describe('calculateAgeGradedPercent', () => {
    it('should calculate age-graded percentage for male 5K', () => {
        const result = calculateAgeGradedPercent(5, 1230, 38, 'M');

        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThan(2);
    });

    it('should calculate age-graded percentage for female 10K', () => {
        const result = calculateAgeGradedPercent(10, 2730, 34, 'F');

        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThan(2);
    });

    it('should handle very young runners', () => {
        const result = calculateAgeGradedPercent(5, 1500, 10, 'M');

        expect(result).toBeGreaterThan(0);
    });

    it('should handle senior runners', () => {
        const result = calculateAgeGradedPercent(5, 1800, 75, 'M');

        expect(result).toBeGreaterThan(0);
    });
});
