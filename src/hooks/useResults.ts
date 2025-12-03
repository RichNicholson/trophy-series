import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Result } from '../types';
import { calculateAge, calculateAgeGradedPercent, intervalToSeconds } from '../lib/ageGrading';

export function useResults(raceId?: string) {
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchResults = useCallback(async (targetRaceId?: string) => {
        const queryRaceId = targetRaceId || raceId;
        if (!queryRaceId) {
            setResults([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('results')
                .select('*, runner:runners(*)')
                .eq('race_id', queryRaceId)
                .order('position');

            if (fetchError) throw fetchError;
            setResults(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch results');
            console.error('Error fetching results:', err);
        } finally {
            setLoading(false);
        }
    }, [raceId]);

    const addResult = useCallback(async (
        targetRaceId: string,
        runnerId: string,
        finishTime: string,
        raceDate: string,
        distance: string
    ) => {
        try {
            // Get runner info for age-grading
            const { data: runner } = await supabase
                .from('runners')
                .select('*')
                .eq('id', runnerId)
                .single();

            if (!runner) throw new Error('Runner not found');

            // Calculate age-graded values
            let ageGradedPercent = null;
            if (runner.date_of_birth) {
                const age = calculateAge(runner.date_of_birth, raceDate);
                const timeInSeconds = intervalToSeconds(finishTime);
                const distanceKm = parseFloat(distance);

                ageGradedPercent = calculateAgeGradedPercent(
                    distanceKm,
                    timeInSeconds,
                    age,
                    runner.gender
                );
            }

            const result = {
                race_id: targetRaceId,
                runner_id: runnerId,
                finish_time: finishTime,
                age_graded_percent: ageGradedPercent
            };

            const { data, error: insertError } = await supabase
                .from('results')
                .insert([result])
                .select('*, runner:runners(*)')
                .single();

            if (insertError) throw insertError;

            setResults(prev => [...prev, data].sort((a, b) => (a.position || 0) - (b.position || 0)));
            return { data, error: null };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to add result';
            setError(errorMessage);
            return { data: null, error: errorMessage };
        }
    }, []);

    const updateResult = useCallback(async (
        id: string,
        updates: Partial<Result>,
        raceDate?: string,
        distance?: string
    ) => {
        try {
            // If updating finish time, recalculate age-grading
            if (updates.finish_time && raceDate && distance) {
                const { data: result } = await supabase
                    .from('results')
                    .select('*, runner:runners(*)')
                    .eq('id', id)
                    .single();

                if (result?.runner?.date_of_birth) {
                    const age = calculateAge(result.runner.date_of_birth, raceDate);
                    const timeInSeconds = intervalToSeconds(updates.finish_time);
                    const distanceKm = parseFloat(distance);

                    updates.age_graded_percent = calculateAgeGradedPercent(
                        distanceKm,
                        timeInSeconds,
                        age,
                        result.runner.gender
                    );
                }
            }

            const { data, error: updateError } = await supabase
                .from('results')
                .update(updates)
                .eq('id', id)
                .select('*, runner:runners(*)')
                .single();

            if (updateError) throw updateError;

            setResults(prev => prev.map(r => r.id === id ? data : r).sort((a, b) => (a.position || 0) - (b.position || 0)));
            return { data, error: null };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update result';
            setError(errorMessage);
            return { data: null, error: errorMessage };
        }
    }, []);

    const deleteResult = useCallback(async (id: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('results')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            setResults(prev => prev.filter(r => r.id !== id));
            return { error: null };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete result';
            setError(errorMessage);
            return { error: errorMessage };
        }
    }, []);

    return {
        results,
        loading,
        error,
        fetchResults,
        addResult,
        updateResult,
        deleteResult
    };
}
