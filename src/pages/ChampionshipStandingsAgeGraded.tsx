import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { ChampionshipStanding } from '../types';
import Layout from '../components/Layout';

export default function ChampionshipStandingsAgeGraded() {
    const [standings, setStandings] = useState<ChampionshipStanding[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStandings();
    }, []);

    const fetchStandings = async () => {
        try {
            // Fetch all results with runner data
            const { data: results } = await supabase
                .from('results')
                .select('age_graded_points, runner:runners(id, name, gender)');

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

                // Only count if they have age graded points (meaning they have DOB)
                if (result.age_graded_points === null || result.age_graded_points === undefined) return;

                const runnerId = result.runner.id;
                const points = result.age_graded_points || 0;
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
            const sortedStandings: ChampionshipStanding[] = Array.from(standingsMap.values()).map(entry => {
                // Sort points descending
                const sortedPoints = entry.points.sort((a, b) => b - a);
                // Take top 6
                const best6 = sortedPoints.slice(0, 6);
                // Sum
                const total_points = best6.reduce((sum, p) => sum + p, 0);

                return {
                    runner_id: entry.runner_id,
                    runner_name: entry.runner_name,
                    gender: entry.gender,
                    total_points,
                    races_participated: entry.points.length
                };
            }).sort((a, b) => b.total_points - a.total_points);

            setStandings(sortedStandings);
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
        <Layout>
            <div className="container-wide">
                <div className="page-header">
                    <h1 className="page-title">🏆 Age-Graded Championship</h1>
                    <p className="page-subtitle">Overall standings based on WAVA age-graded performance</p>
                </div>

                <div className="card">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Pos</th>
                                    <th>Runner</th>
                                    <th>Gender</th>
                                    <th>Total Points</th>
                                    <th>Races</th>
                                </tr>
                            </thead>
                            <tbody>
                                {standings.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="empty-state">No age-graded results yet</td>
                                    </tr>
                                ) : (
                                    standingsWithPositions.map((standing) => (
                                        <tr key={standing.runner_id}>
                                            <td>
                                                {standing.position < 4 ? (
                                                    <span className={`position-badge position-${standing.position}`}>
                                                        {standing.position}
                                                    </span>
                                                ) : (
                                                    standing.position
                                                )}
                                            </td>
                                            <td style={{ fontWeight: standing.position < 4 ? 600 : 400 }}>
                                                {standing.runner_name}
                                            </td>
                                            <td>{standing.gender}</td>
                                            <td>
                                                <strong style={{
                                                    fontSize: standing.position < 4 ? '1.125rem' : '1rem',
                                                    color: standing.position < 4 ? 'var(--color-accent-primary)' : 'inherit'
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
            </div>
        </Layout>
    );
}
