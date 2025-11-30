import wavaData from '../data/wava-standards.json';

/**
 * Calculate integer age on a specific date
 */
export function calculateAge(dateOfBirth: Date | string, raceDate: Date | string): number {
    const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
    const raceDay = typeof raceDate === 'string' ? new Date(raceDate) : raceDate;

    let age = raceDay.getFullYear() - dob.getFullYear();
    const monthDiff = raceDay.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && raceDay.getDate() < dob.getDate())) {
        age--;
    }

    return age;
}

/**
 * Linear interpolation between two values
 */
function interpolate(x: number, x0: number, x1: number, y0: number, y1: number): number {
    if (x1 === x0) return y0;
    return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
}

/**
 * Find the indices of the two distances that bracket the target distance
 */
function findBracketingIndices(distance: number, distances: number[]): [number, number] {
    // If distance is less than or equal to the smallest distance
    if (distance <= distances[0]) {
        return [0, Math.min(1, distances.length - 1)];
    }

    // If distance is greater than or equal to the largest distance
    if (distance >= distances[distances.length - 1]) {
        return [Math.max(0, distances.length - 2), distances.length - 1];
    }

    // Find the bracketing indices
    for (let i = 0; i < distances.length - 1; i++) {
        if (distance >= distances[i] && distance <= distances[i + 1]) {
            return [i, i + 1];
        }
    }

    // Fallback (should never reach here)
    return [0, 1];
}

/**
 * Interpolate a value based on distance
 */
function interpolateByDistance(
    distance: number,
    distances: number[],
    values: number[]
): number {
    const [idx0, idx1] = findBracketingIndices(distance, distances);

    if (idx0 === idx1) {
        return values[idx0];
    }

    return interpolate(distance, distances[idx0], distances[idx1], values[idx0], values[idx1]);
}

/**
 * Get WAVA standard time (in seconds) for a given distance and gender
 */
export function getWAVAStandard(distanceKm: number, sex: 'M' | 'F'): number {
    const data = sex === 'M' ? wavaData.men : wavaData.women;
    return interpolateByDistance(distanceKm, data.distances, data.standards);
}

/**
 * Get WAVA age factor for a given distance, age, and gender
 */
export function getWAVAFactor(distanceKm: number, age: number, sex: 'M' | 'F'): number {
    const data = sex === 'M' ? wavaData.men : wavaData.women;

    // Clamp age to valid range
    const clampedAge = Math.max(5, Math.min(100, age));

    // Get age factors for this age
    const ageKey = Math.floor(clampedAge).toString();
    const ageFactorsForAge = (data.ageFactors as Record<string, number[]>)[ageKey];

    if (!ageFactorsForAge) {
        console.warn(`No age factors found for age ${clampedAge}, defaulting to 1.0`);
        return 1.0;
    }

    // Interpolate by distance
    const factor = interpolateByDistance(distanceKm, data.distances, ageFactorsForAge);

    // If we need to interpolate between ages (for fractional ages)
    if (clampedAge !== Math.floor(clampedAge)) {
        const lowerAge = Math.floor(clampedAge);
        const upperAge = Math.min(100, lowerAge + 1);
        const upperAgeKey = upperAge.toString();
        const upperAgeFactorsForAge = (data.ageFactors as Record<string, number[]>)[upperAgeKey];

        if (upperAgeFactorsForAge) {
            const upperFactor = interpolateByDistance(distanceKm, data.distances, upperAgeFactorsForAge);
            return interpolate(clampedAge, lowerAge, upperAge, factor, upperFactor);
        }
    }

    return factor;
}

/**
 * Calculate age-graded performance percentage
 * 
 * @param distanceKm - Race distance in kilometers
 * @param timeSeconds - Runner's finish time in seconds
 * @param age - Runner's age (integer age on race day)
 * @param sex - Runner's gender ('M' or 'F')
 * @returns Age-graded percentage (e.g., 0.75 for 75%)
 */
export function calculateAgeGradedPercent(
    distanceKm: number,
    timeSeconds: number,
    age: number,
    sex: 'M' | 'F'
): number {
    // Runner's speed in m/s
    const runnerSpeed = (distanceKm * 1000) / timeSeconds;

    // Age-adjusted world record speed
    const standard = getWAVAStandard(distanceKm, sex);
    const factor = getWAVAFactor(distanceKm, age, sex);
    const ageGradedWRSpeed = (distanceKm * 1000) / standard * factor;

    // Return as percentage (decimal form)
    return runnerSpeed / ageGradedWRSpeed;
}

/**
 * Convert PostgreSQL INTERVAL to seconds
 */
export function intervalToSeconds(interval: string): number {
    // Format: HH:MM:SS or MM:SS
    const parts = interval.split(':').map(Number);

    if (parts.length === 3) {
        // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        // MM:SS
        return parts[0] * 60 + parts[1];
    }

    return 0;
}
