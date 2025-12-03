import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Race } from '../types';

export function useRaces() {
    const [races, setRaces] = useState<Race[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRaces = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('races')
                .select('*')
                .order('race_date', { ascending: false });

            if (fetchError) throw fetchError;
            setRaces(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch races');
            console.error('Error fetching races:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const addRace = useCallback(async (race: Omit<Race, 'id' | 'created_at'>) => {
        try {
            const { data, error: insertError } = await supabase
                .from('races')
                .insert([race])
                .select()
                .single();

            if (insertError) throw insertError;

            setRaces(prev => [...prev, data].sort((a, b) =>
                new Date(b.race_date).getTime() - new Date(a.race_date).getTime()
            ));
            return { data, error: null };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to add race';
            setError(errorMessage);
            return { data: null, error: errorMessage };
        }
    }, []);

    const updateRace = useCallback(async (id: string, updates: Partial<Race>) => {
        try {
            const { data, error: updateError } = await supabase
                .from('races')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;

            setRaces(prev => prev.map(r => r.id === id ? data : r).sort((a, b) =>
                new Date(b.race_date).getTime() - new Date(a.race_date).getTime()
            ));
            return { data, error: null };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update race';
            setError(errorMessage);
            return { data: null, error: errorMessage };
        }
    }, []);

    const deleteRace = useCallback(async (id: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('races')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            setRaces(prev => prev.filter(r => r.id !== id));
            return { error: null };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete race';
            setError(errorMessage);
            return { error: errorMessage };
        }
    }, []);

    return {
        races,
        loading,
        error,
        fetchRaces,
        addRace,
        updateRace,
        deleteRace
    };
}
