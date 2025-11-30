import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function recalculateAllScores() {
    console.log('Starting score recalculation...');

    // 1. Fetch all races
    const { data: races, error: racesError } = await supabase
        .from('races')
        .select('id, name');

    if (racesError) {
        console.error('Error fetching races:', racesError);
        return;
    }

    console.log(`Found ${races.length} races.`);

    for (const race of races) {
        console.log(`Processing race: ${race.name}`);
        await calculateAndUpdatePositions(race.id);
    }

    console.log('Recalculation complete!');
}

// Logic ported from AdminDashboard.tsx
const calculateAndUpdatePositions = async (raceId) => {
    try {
        // Fetch all results for this race with runner info
        const { data: raceResults, error: fetchError } = await supabase
            .from('results')
            .select('*, runner:runners(*)')
            .eq('race_id', raceId);

        if (fetchError) throw fetchError;
        if (!raceResults || raceResults.length === 0) return;

        // Regular positions/points (by gender, separate)
        const regularUpdates = [];

        ['M', 'F'].forEach((gender) => {
            const genderResults = raceResults
                .filter((r) => r.runner?.gender === gender)
                .sort((a, b) => {
                    // Sort by finish_time (string comparison works for HH:MM:SS)
                    const timeA = a.finish_time;
                    const timeB = b.finish_time;
                    return timeA < timeB ? -1 : timeA > timeB ? 1 : 0;
                });

            let currentPosition = 0;
            let prevTime = null;
            let tiedCount = 0;

            genderResults.forEach((result) => {
                if (prevTime === null || result.finish_time !== prevTime) {
                    currentPosition = currentPosition + tiedCount + 1;
                    tiedCount = 0;
                } else {
                    tiedCount = tiedCount + 1;
                }

                const points = Math.max(25 - (currentPosition - 1), 0);

                regularUpdates.push({
                    id: result.id,
                    position: currentPosition,
                    points: points
                });

                prevTime = result.finish_time;
            });
        });

        // Age-graded positions/points (COMBINED M+F, sorted by %)
        const ageGradedUpdates = [];

        // Filter results with age-graded scores and sort by percentage (descending)
        const sortedByAgeGraded = [...raceResults]
            .filter((r) => r.age_graded_percent !== null && r.age_graded_percent !== undefined)
            .sort((a, b) => (b.age_graded_percent || 0) - (a.age_graded_percent || 0));

        let ageGradedPosition = 0;
        let prevPercent = null;
        let agTiedCount = 0;

        sortedByAgeGraded.forEach((result) => {
            // Round to avoid floating point issues
            const roundedPercent = Math.round(result.age_graded_percent * 100000) / 100000;
            const prevRounded = prevPercent !== null ? Math.round(prevPercent * 100000) / 100000 : null;

            if (prevRounded === null || roundedPercent !== prevRounded) {
                ageGradedPosition = ageGradedPosition + agTiedCount + 1;
                agTiedCount = 0;
            } else {
                agTiedCount = agTiedCount + 1;
            }

            const ageGradedPoints = Math.max(25 - (ageGradedPosition - 1), 0);

            ageGradedUpdates.push({
                id: result.id,
                age_graded_position: ageGradedPosition,
                age_graded_points: ageGradedPoints,
                age_graded_percent: result.age_graded_percent
            });

            prevPercent = result.age_graded_percent;
        });

        // Batch update
        for (const result of raceResults) {
            const regularUpdate = regularUpdates.find(u => u.id === result.id);
            const ageGradedUpdate = ageGradedUpdates.find(u => u.id === result.id);

            // Only update if we have something to update
            if (regularUpdate || ageGradedUpdate) {
                const updatePayload = {};
                if (regularUpdate) {
                    updatePayload.position = regularUpdate.position;
                    updatePayload.points = regularUpdate.points;
                }
                if (ageGradedUpdate) {
                    updatePayload.age_graded_position = ageGradedUpdate.age_graded_position;
                    updatePayload.age_graded_points = ageGradedUpdate.age_graded_points;
                }

                await supabase
                    .from('results')
                    .update(updatePayload)
                    .eq('id', result.id);
            }
        }

    } catch (error) {
        console.error(`Error calculating positions for race ${raceId}:`, error);
    }
};

recalculateAllScores().catch(console.error);
