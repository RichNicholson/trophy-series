import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Runner } from '../types';

export function useRunners() {
    const [runners, setRunners] = useState<Runner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRunners = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('runners')
                .select('*')
                .order('name');

            if (fetchError) throw fetchError;
            setRunners(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch runners');
            console.error('Error fetching runners:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const addRunner = useCallback(async (runner: Omit<Runner, 'id' | 'created_at'>) => {
        try {
            const { data, error: insertError } = await supabase
                .from('runners')
                .insert([runner])
                .select()
                .single();

            if (insertError) throw insertError;

            setRunners(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            return { data, error: null };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to add runner';
            setError(errorMessage);
            return { data: null, error: errorMessage };
        }
    }, []);

    const updateRunner = useCallback(async (id: string, updates: Partial<Runner>) => {
        try {
            const { data, error: updateError } = await supabase
                .from('runners')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;

            setRunners(prev => prev.map(r => r.id === id ? data : r).sort((a, b) => a.name.localeCompare(b.name)));
            return { data, error: null };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update runner';
            setError(errorMessage);
            return { data: null, error: errorMessage };
        }
    }, []);

    const deleteRunner = useCallback(async (id: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('runners')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            setRunners(prev => prev.filter(r => r.id !== id));
            return { error: null };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete runner';
            setError(errorMessage);
            return { error: errorMessage };
        }
    }, []);

    return {
        runners,
        loading,
        error,
        fetchRunners,
        addRunner,
        updateRunner,
        deleteRunner
    };
}
