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
            // Fetch championship count limit setting
            const { data: settingsData } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'championship_count_limit')
                .single();

            const countLimit = settingsData ? parseInt(settingsData.value, 10) : 5;

            // Fetch all results with runner data
            const { data: results } = await supabase
                .from('results')
                .select('points, runner:runners(id, name, gender)');

            if (!results) return;

            // Aggregate points by runner
            const standingsMap = new Map<string, {
                runner_id: string;
                runner_name: string;
                gender: 'M' | 'F';
                points: number[];
            }>();

            results.forEach((result: any) => {
                if (!result.runner) return;

                const runnerId = result.runner.id;
                const points = result.points || 0;
                const existing = standingsMap.get(runnerId);

                if (existing) {
                    existing.points.push(points);
                } else {
                    standingsMap.set(runnerId, {
                        runner_id: runnerId,
                        runner_name: result.runner.name,
                        gender: result.runner.gender,
                        points: [points]
                    });
                }
            });

            // Calculate totals based on best 6 results
            const allStandings: ChampionshipStanding[] = Array.from(standingsMap.values()).map(entry => {
                // Sort points descending
                const sortedPoints = entry.points.sort((a, b) => b - a);
                // Take top N (use dynamic limit)
                const bestN = sortedPoints.slice(0, countLimit);
                // Sum
                const total_points = bestN.reduce((sum, p) => sum + p, 0);

                return {
                    runner_id: entry.runner_id,
                    runner_name: entry.runner_name,
                    gender: entry.gender,
                    total_points,
                    races_participated: entry.points.length
                };
            });
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

    const renderStandingsTable = (standings: ChampionshipStanding[], title: string, color: string, headerBgColor: string = 'var(--color-bg-tertiary)') => {
        // Calculate positions with tie handling
        const standingsWithPositions = standings.map((standing, index) => {
            let position = index + 1;

            // Check if tied with previous runner
            if (index > 0 && standings[index - 1].total_points === standing.total_points) {
                // Find the position of the first runner in this tie group
                let tierIndex = index - 1;
                while (tierIndex > 0 && standings[tierIndex - 1].total_points === standing.total_points) {
                    tierIndex--;
                }
                position = tierIndex + 1;
            }

            return { ...standing, position };
        });

        return (
            <div className="card">
                <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', color }}>
                    {title}
                </h3>
                <div className="table-container">
                    <table className="table">
                        <thead style={{ background: headerBgColor }}>
                            <tr>
                                <th style={{ color }}>Position</th>
                                <th style={{ color }}>Runner</th>
                                <th style={{ color }}>Total Points</th>
                                <th style={{ color }}>Races</th>
                            </tr>
                        </thead>
                        <tbody>
                            {standings.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="empty-state">No results yet</td>
                                </tr>
                            ) : (
                                standingsWithPositions.map((standing) => (
                                    <tr key={standing.runner_id} style={{ fontWeight: standing.position < 4 ? 700 : 400 }}>
                                        <td>
                                            {standing.position < 4 ? (
                                                <span className={`position-badge position-${standing.position}`}>
                                                    {standing.position}
                                                </span>
                                            ) : (
                                                standing.position
                                            )}
                                        </td>
                                        <td>
                                            {standing.runner_name}
                                        </td>
                                        <td>
                                            <span style={{
                                                fontSize: standing.position < 4 ? '1.125rem' : '1rem',
                                                color: standing.position < 4 ? color : 'inherit'
                                            }}>
                                                {standing.total_points}
                                            </span>
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
    };

    return (
        <Layout>
            <div className="container-wide">
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
                        {renderStandingsTable(maleStandings, '👨 Men\'s Championship', 'var(--color-male)', 'var(--color-bg-tertiary)')}
                        {renderStandingsTable(femaleStandings, '👩 Women\'s Championship', 'var(--color-female)', 'var(--color-brand-green-light)')}
                    </div>
                )}
            </div>
        </Layout>
    );
}
