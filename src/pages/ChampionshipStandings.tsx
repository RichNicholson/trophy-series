import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { ChampionshipStanding } from '../types';
import Layout from '../components/Layout';

export default function ChampionshipStandings() {
    const [maleStandings, setMaleStandings] = useState<ChampionshipStanding[]>([]);
    const [femaleStandings, setFemaleStandings] = useState<ChampionshipStanding[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStandings();
    }, []);

    const fetchStandings = async () => {
        try {
            // Fetch all results with runner data
            const { data: results } = await supabase
                .from('results')
                .select('points, runner:runners(id, name, gender)');

            if (!results) return;

            // Aggregate points by runner
            const standingsMap = new Map<string, ChampionshipStanding>();

            results.forEach((result: any) => {
                if (!result.runner) return;

                const runnerId = result.runner.id;
                const existing = standingsMap.get(runnerId);

                if (existing) {
                    existing.total_points += result.points || 0;
                    existing.races_participated += 1;
                } else {
                    standingsMap.set(runnerId, {
                        runner_id: runnerId,
                        runner_name: result.runner.name,
                        gender: result.runner.gender,
                        total_points: result.points || 0,
                        races_participated: 1
                    });
                }
            });

            // Convert to arrays and sort
            const allStandings = Array.from(standingsMap.values());
            const males = allStandings
                .filter(s => s.gender === 'M')
                .sort((a, b) => b.total_points - a.total_points);
            const females = allStandings
                .filter(s => s.gender === 'F')
                .sort((a, b) => b.total_points - a.total_points);

            setMaleStandings(males);
            setFemaleStandings(females);
        } catch (error) {
            console.error('Error fetching standings:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="loading">
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    const renderStandingsTable = (standings: ChampionshipStanding[], title: string, color: string) => (
        <div className="card">
            <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', color }}>
                {title}
            </h3>
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Position</th>
                            <th>Runner</th>
                            <th>Total Points</th>
                            <th>Races</th>
                        </tr>
                    </thead>
                    <tbody>
                        {standings.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="empty-state">No results yet</td>
                            </tr>
                        ) : (
                            standings.map((standing, index) => (
                                <tr key={standing.runner_id}>
                                    <td>
                                        {index < 3 ? (
                                            <span className={`position-badge position-${index + 1}`}>
                                                {index + 1}
                                            </span>
                                        ) : (
                                            index + 1
                                        )}
                                    </td>
                                    <td style={{ fontWeight: index < 3 ? 600 : 400 }}>
                                        {standing.runner_name}
                                    </td>
                                    <td>
                                        <strong style={{
                                            fontSize: index < 3 ? '1.125rem' : '1rem',
                                            color: index < 3 ? 'var(--color-accent-primary)' : 'inherit'
                                        }}>
                                            {standing.total_points}
                                        </strong>
                                    </td>
                                    <td>{standing.races_participated}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <Layout>
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">Championship Standings</h1>
                    <p className="page-subtitle">Overall points across all races in the series</p>
                </div>

                {maleStandings.length === 0 && femaleStandings.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <p>No championship data available yet. Results will appear once races are completed.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-2">
                        {renderStandingsTable(maleStandings, '👨 Men\'s Championship', 'var(--color-male)')}
                        {renderStandingsTable(femaleStandings, '👩 Women\'s Championship', 'var(--color-female)')}
                    </div>
                )}
            </div>
        </Layout>
    );
}
