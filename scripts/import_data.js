import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load WAVA data
const wavaDataPath = path.resolve(__dirname, '../src/data/wava-standards.json');
const wavaData = JSON.parse(fs.readFileSync(wavaDataPath, 'utf-8'));

// Helper functions for Age Grading (Ported from ageGrading.ts)
function calculateAge(dobStr, raceDateStr) {
    const dob = new Date(dobStr);
    const raceDate = new Date(raceDateStr);
    let age = raceDate.getFullYear() - dob.getFullYear();
    const m = raceDate.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && raceDate.getDate() < dob.getDate())) {
        age--;
    }
    return age;
}

function interpolate(x, x0, x1, y0, y1) {
    if (x1 === x0) return y0;
    return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
}

function getWAVAStandard(distanceKm, gender, wavaData) {
    const data = gender === 'M' ? wavaData.men : wavaData.women;
    const distances = data.distances;
    const standards = data.standards;

    // Find bracketing distances
    let i = 0;
    while (i < distances.length - 1 && distances[i + 1] < distanceKm) {
        i++;
    }

    // Exact match or interpolation
    if (distances[i] === distanceKm) return standards[i];
    if (i >= distances.length - 1) return standards[standards.length - 1]; // Should not happen if within range

    return interpolate(distanceKm, distances[i], distances[i + 1], standards[i], standards[i + 1]);
}

function getWAVAFactor(age, distanceKm, gender, wavaData) {
    const data = gender === 'M' ? wavaData.men : wavaData.women;
    const ageKey = Math.floor(age).toString();

    // If age is outside range (e.g. < 5), use age 5 or 1.0
    if (!data.ageFactors[ageKey]) return 1.0;

    const factors = data.ageFactors[ageKey];
    const distances = data.distances;

    let i = 0;
    while (i < distances.length - 1 && distances[i + 1] < distanceKm) {
        i++;
    }

    if (distances[i] === distanceKm) return factors[i];
    if (i >= distances.length - 1) return factors[factors.length - 1];

    return interpolate(distanceKm, distances[i], distances[i + 1], factors[i], factors[i + 1]);
}

function calculateAgeGradedPercent(distanceKm, timeSeconds, age, gender, wavaData) {
    const standard = getWAVAStandard(distanceKm, gender, wavaData);
    const factor = getWAVAFactor(age, distanceKm, gender, wavaData);

    const runnerSpeed = (distanceKm * 1000) / timeSeconds;
    const ageGradedWRSpeed = (distanceKm * 1000) / standard * factor;

    return runnerSpeed / ageGradedWRSpeed;
}

function intervalToSeconds(interval) {
    // Format: HH:MM:SS or MM:SS
    const parts = interval.split(':').map(Number);
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return 0;
}

function normalizeTime(timeStr) {
    const parts = timeStr.split(':');
    if (parts.length === 2) return `00:${timeStr}`;
    return timeStr;
}

// Date Parsing Helper
const months = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
};

function parseDate(dateStr) {
    // Format: 9/Nov/79
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const monthStr = parts[1];
    let year = parseInt(parts[2], 10);

    // Handle 2-digit year
    if (year < 100) {
        // Pivot: if year < 30, assume 20xx, else 19xx (Adjust as needed)
        // Given the data (79, 82, 00), 30 seems safe.
        year = year < 30 ? 2000 + year : 1900 + year;
    }

    const month = months[monthStr];
    if (month === undefined) return null;

    // Return YYYY-MM-DD formatted directly to avoid timezone issues
    const monthPadded = String(month + 1).padStart(2, '0');
    const dayPadded = String(day).padStart(2, '0');
    return `${year}-${monthPadded}-${dayPadded}`;
}

function parseRaceDate(dateStr) {
    // Format: 25-Jan
    // Assume year 2025
    const parts = dateStr.split('-');
    if (parts.length !== 2) return null;

    const day = parseInt(parts[0], 10);
    const monthStr = parts[1];
    const month = months[monthStr];

    if (month === undefined) return null;

    // Return YYYY-MM-DD formatted directly to avoid timezone issues
    const monthPadded = String(month + 1).padStart(2, '0');
    const dayPadded = String(day).padStart(2, '0');
    return `2025-${monthPadded}-${dayPadded}`;
}

// Main Import Function
async function importData() {
    const csvPath = path.resolve(__dirname, '../data_sources/results.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split(/\r?\n/);

    // Parse Headers
    // Row 1: Names (skip first 4 cols)
    const raceNames = lines[0].split(',').slice(4).filter(Boolean);
    // Row 2: Distances
    const raceDistances = lines[1].split(',').slice(4).filter(Boolean);
    // Row 3: Dates
    const raceDates = lines[2].split(',').slice(4).filter(Boolean);

    console.log(`Found ${raceNames.length} races.`);

    // 1. Insert Races
    const raceIds = [];
    for (let i = 0; i < raceNames.length; i++) {
        const name = raceNames[i];
        const distance = parseFloat(raceDistances[i]);
        const dateStr = raceDates[i];
        const date = parseRaceDate(dateStr);

        console.log(`Processing Race: ${name} (${distance}km) on ${date}`);

        // Check if exists
        const { data: existing } = await supabase
            .from('races')
            .select('id')
            .eq('name', name)
            .eq('race_date', date)
            .single();

        if (existing) {
            raceIds.push(existing.id);
        } else {
            const { data, error } = await supabase
                .from('races')
                .insert([{ name, distance, race_date: date }])
                .select()
                .single();

            if (error) {
                console.error(`Error inserting race ${name}:`, error);
                raceIds.push(null);
            } else {
                raceIds.push(data.id);
            }
        }
    }

    // 2. Process Runners and Results
    // Start from line 3 (index 3, 4th line)
    for (let i = 3; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Split by comma, handling potential quotes? 
        // Simple split for now as data looks clean
        const cols = line.split(',');

        const firstName = cols[0].trim();
        const surname = cols[1].trim();
        const genderCode = cols[2].trim(); // 0 or 1
        const dobStr = cols[3].trim();

        if (!firstName || !surname) continue;

        const name = `${firstName} ${surname}`;
        const gender = genderCode === '1' ? 'M' : 'F';
        const dob = parseDate(dobStr);

        // Insert/Get Runner
        let runnerId = null;
        const { data: existingRunner } = await supabase
            .from('runners')
            .select('id')
            .eq('name', name)
            .single();

        if (existingRunner) {
            runnerId = existingRunner.id;
            // Update DOB if missing?
            if (dob) {
                await supabase.from('runners').update({ date_of_birth: dob }).eq('id', runnerId);
            }
        } else {
            const { data, error } = await supabase
                .from('runners')
                .insert([{ name, gender, date_of_birth: dob }])
                .select()
                .single();

            if (error) {
                console.error(`Error inserting runner ${name}:`, error);
                continue;
            }
            runnerId = data.id;
        }

        // Process Results for this runner
        for (let r = 0; r < raceIds.length; r++) {
            const raceId = raceIds[r];
            if (!raceId) continue;

            const timeStr = cols[4 + r]?.trim();
            if (timeStr) {
                const finishTime = normalizeTime(timeStr);
                const timeSeconds = intervalToSeconds(finishTime);

                // Calculate Age Grade
                let ageGradedPercent = null;
                if (dob) {
                    // Calculate age on race day
                    const raceDate = parseRaceDate(raceDates[r]);
                    const age = calculateAge(dob, raceDate);
                    const distance = parseFloat(raceDistances[r]);

                    ageGradedPercent = calculateAgeGradedPercent(distance, timeSeconds, age, gender, wavaData);
                }

                // Insert Result
                // Check if exists
                const { data: existingResult } = await supabase
                    .from('results')
                    .select('id')
                    .eq('race_id', raceId)
                    .eq('runner_id', runnerId)
                    .single();

                if (!existingResult) {
                    const { error } = await supabase
                        .from('results')
                        .insert([{
                            race_id: raceId,
                            runner_id: runnerId,
                            finish_time: finishTime,
                            age_graded_percent: ageGradedPercent
                        }]);

                    if (error) console.error(`Error inserting result for ${name} in race ${r}:`, error);
                }
            }
        }
    }
    console.log('Import complete!');
}

importData().catch(console.error);
