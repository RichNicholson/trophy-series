import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Race, Result } from '../types';
import Layout from '../components/Layout';
import { format } from 'date-fns';

export default function RaceResults() {
    const [races, setRaces] = useState<Race[]>([]);
    const [selectedRace, setSelectedRace] = useState<Race | null>(null);
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRaces();
    }, []);

    const fetchRaces = async () => {
        try {
            const { data } = await supabase
                .from('races')
                .select('*')
                .order('race_date', { ascending: true });

            if (data && data.length > 0) {
                setRaces(data);
                setSelectedRace(data[0]);
                fetchResults(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching races:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchResults = async (raceId: string) => {
        try {
            const { data } = await supabase
                .from('results')
                .select('*, runner:runners(*)')
                .eq('race_id', raceId)
                .order('position');

            if (data) setResults(data);
        } catch (error) {
            console.error('Error fetching results:', error);
        }
    };

    const handleRaceSelect = (race: Race) => {
        setSelectedRace(race);
        fetchResults(race.id);
    };

    const getMaleResults = () => results.filter(r => r.runner?.gender === 'M');
    const getFemaleResults = () => results.filter(r => r.runner?.gender === 'F');

    if (loading) {
        return (
            <Layout>
                <div className="loading">
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">Race Results</h1>
                    <p className="page-subtitle">View results from all races in the series</p>
                </div>

                {races.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <p>No races have been added yet.</p>
                        </div>
                    </div>
                ) : (
                    <div className="race-results-grid">
                        {/* Race List Sidebar */}
                        <div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 600 }}>Races</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {races.map((race, index) => (
                                    <button
                                        key={race.id}
                                        onClick={() => handleRaceSelect(race)}
                                        className={`card ${selectedRace?.id === race.id ? 'active' : ''}`}
                                        style={{
                                            padding: '1rem',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            border: selectedRace?.id === race.id ? '2px solid var(--color-accent-primary)' : '1px solid rgba(0, 133, 255, 0.15)',
                                            background: selectedRace?.id === race.id ? 'rgba(0, 133, 255, 0.1)' : 'var(--color-bg-secondary)'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-accent-primary)', marginBottom: '0.25rem', fontWeight: 600 }}>
                                            Race {index + 1}
                                        </div>
                                        <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-primary)' }}>{race.name}</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                            {format(new Date(race.race_date), 'MMM d, yyyy')}
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                            {race.distance}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Results Display */}
                        <div>
                            {selectedRace && (
                                <>
                                    <div style={{ marginBottom: '2rem' }}>
                                        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                                            {selectedRace.name}
                                        </h2>
                                        <p style={{ color: 'var(--color-text-secondary)' }}>
                                            {format(new Date(selectedRace.race_date), 'MMMM d, yyyy')} • {selectedRace.distance}
                                        </p>
                                    </div>

                                    {results.length === 0 ? (
                                        <div className="card">
                                            <div className="empty-state">No results available for this race yet.</div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-2">
                                            {/* Men's Results */}
                                            <div className="card">
                                                <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-male)' }}>
                                                    👨 Men's Results
                                                </h3>
                                                <div className="table-container">
                                                    <table className="table">
                                                        <thead>
                                                            <tr>
                                                                <th>Pos</th>
                                                                <th>Name</th>
                                                                <th>Time</th>
                                                                <th>Points</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {getMaleResults().length === 0 ? (
                                                                <tr>
                                                                    <td colSpan={4} className="empty-state">No male runners</td>
                                                                </tr>
                                                            ) : (
                                                                getMaleResults().map((result) => (
                                                                    <tr key={result.id}>
                                                                        <td>
                                                                            {result.position && result.position <= 3 ? (
                                                                                <span className={`position-badge position-${result.position}`}>
                                                                                    {result.position}
                                                                                </span>
                                                                            ) : (
                                                                                result.position
                                                                            )}
                                                                        </td>
                                                                        <td>{result.runner?.name}</td>
                                                                        <td>{result.finish_time}</td>
                                                                        <td>
                                                                            <strong style={{ color: result.position && result.position <= 3 ? 'var(--color-male)' : 'inherit' }}>
                                                                                {result.points}
                                                                            </strong>
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Women's Results */}
                                            <div className="card">
                                                <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-female)' }}>
                                                    👩 Women's Results
                                                </h3>
                                                <div className="table-container">
                                                    <table className="table">
                                                        <thead>
                                                            <tr>
                                                                <th>Pos</th>
                                                                <th>Name</th>
                                                                <th>Time</th>
                                                                <th>Points</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {getFemaleResults().length === 0 ? (
                                                                <tr>
                                                                    <td colSpan={4} className="empty-state">No female runners</td>
                                                                </tr>
                                                            ) : (
                                                                getFemaleResults().map((result) => (
                                                                    <tr key={result.id}>
                                                                        <td>
                                                                            {result.position && result.position <= 3 ? (
                                                                                <span className={`position-badge position-${result.position}`}>
                                                                                    {result.position}
                                                                                </span>
                                                                            ) : (
                                                                                result.position
                                                                            )}
                                                                        </td>
                                                                        <td>{result.runner?.name}</td>
                                                                        <td>{result.finish_time}</td>
                                                                        <td>
                                                                            <strong style={{ color: result.position && result.position <= 3 ? 'var(--color-female)' : 'inherit' }}>
                                                                                {result.points}
                                                                            </strong>
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Age-Graded Results (Combined) */}
                                    <div className="card" style={{ marginTop: '2rem' }}>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-brand-purple)' }}>
                                            🏆 Age-Graded Results (Combined)
                                        </h3>
                                        <div className="table-container">
                                            <table className="table">
                                                <thead style={{ background: 'var(--color-brand-purple-light)' }}>
                                                    <tr>
                                                        <th style={{ color: 'var(--color-brand-purple)' }}>Pos</th>
                                                        <th style={{ color: 'var(--color-brand-purple)' }}>Name</th>
                                                        <th style={{ color: 'var(--color-brand-purple)' }}>AG %</th>
                                                        <th style={{ color: 'var(--color-brand-purple)' }}>Points</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {results
                                                        .filter(r => r.age_graded_percent !== null && r.age_graded_percent !== undefined)
                                                        .sort((a, b) => (a.age_graded_position || 999) - (b.age_graded_position || 999))
                                                        .length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="empty-state">No age-graded results available</td>
                                                        </tr>
                                                    ) : (
                                                        results
                                                            .filter(r => r.age_graded_percent !== null && r.age_graded_percent !== undefined)
                                                            .sort((a, b) => (a.age_graded_position || 999) - (b.age_graded_position || 999))
                                                            .map((result) => (
                                                                <tr key={result.id}>
                                                                    <td>
                                                                        {result.age_graded_position && result.age_graded_position <= 3 ? (
                                                                            <span className={`position-badge position-${result.age_graded_position}`}>
                                                                                {result.age_graded_position}
                                                                            </span>
                                                                        ) : (
                                                                            result.age_graded_position
                                                                        )}
                                                                    </td>
                                                                    <td>{result.runner?.name}</td>
                                                                    <td>
                                                                        <strong>
                                                                            {result.age_graded_percent
                                                                                ? (result.age_graded_percent * 100).toFixed(2) + '%'
                                                                                : '-'}
                                                                        </strong>
                                                                    </td>
                                                                    <td>
                                                                        <strong style={{ color: result.age_graded_position && result.age_graded_position <= 3 ? 'var(--color-brand-purple)' : 'inherit' }}>
                                                                            {result.age_graded_points}
                                                                        </strong>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
