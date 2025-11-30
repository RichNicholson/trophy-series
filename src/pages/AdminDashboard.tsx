import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Runner, Race, Result } from '../types';
import Layout from '../components/Layout';
import { calculateAge, calculateAgeGradedPercent, intervalToSeconds } from '../lib/ageGrading';

export default function AdminDashboard() {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();

    // State
    const [runners, setRunners] = useState<Runner[]>([]);
    const [races, setRaces] = useState<Race[]>([]);
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(true);

    // Selected race for results management
    const [selectedRaceId, setSelectedRaceId] = useState<string>('');

    // Form states
    const [runnerForm, setRunnerForm] = useState({ name: '', gender: 'M' as 'M' | 'F', date_of_birth: '' });
    const [raceForm, setRaceForm] = useState({ name: '', race_date: '', distance: '' });
    const [resultForm, setResultForm] = useState({ runner_id: '', finish_time: '' });

    const [editingRunner, setEditingRunner] = useState<Runner | null>(null);
    const [editingRace, setEditingRace] = useState<Race | null>(null);
    const [editingResult, setEditingResult] = useState<Result | null>(null);

    useEffect(() => {
        if (!isAdmin) {
            navigate('/login');
            return;
        }
        fetchData();
    }, [isAdmin, navigate]);

    const fetchData = async () => {
        try {
            const [runnersRes, racesRes] = await Promise.all([
                supabase.from('runners').select('*'),
                supabase.from('races').select('*').order('race_date', { ascending: true })
            ]);

            if (runnersRes.data) {
                // Sort runners by surname (last name)
                const sorted = runnersRes.data.sort((a, b) => {
                    const aLastName = a.name.split(' ').pop() || '';
                    const bLastName = b.name.split(' ').pop() || '';
                    return aLastName.localeCompare(bLastName);
                });
                setRunners(sorted);
            }
            if (racesRes.data) setRaces(racesRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchResultsForRace = async (raceId: string) => {
        try {
            const { data } = await supabase
                .from('results')
                .select('*, runner:runners(*)')
                .eq('race_id', raceId)
                .order('finish_time');

            if (data) setResults(data);
        } catch (error) {
            console.error('Error fetching results:', error);
        }
    };

    // Runner Management
    const handleAddRunner = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const { data, error } = await supabase
                .from('runners')
                .insert([runnerForm])
                .select();

            if (error) throw error;
            if (data) setRunners([...runners, ...data]);
            setRunnerForm({ name: '', gender: 'M', date_of_birth: '' });
        } catch (error) {
            console.error('Error adding runner:', error);
            alert('Error adding runner');
        }
    };

    const handleUpdateRunner = async (e: FormEvent) => {
        e.preventDefault();
        if (!editingRunner) return;

        try {
            const { error } = await supabase
                .from('runners')
                .update({ name: runnerForm.name, gender: runnerForm.gender })
                .eq('id', editingRunner.id);

            if (error) throw error;

            setRunners(runners.map(r =>
                r.id === editingRunner.id
                    ? { ...r, name: runnerForm.name, gender: runnerForm.gender }
                    : r
            ));

            setEditingRunner(null);
            setRunnerForm({ name: '', gender: 'M', date_of_birth: '' });
        } catch (error) {
            console.error('Error updating runner:', error);
            alert('Error updating runner');
        }
    };

    const handleDeleteRunner = async (id: string) => {
        if (!confirm('Are you sure you want to delete this runner?')) return;

        try {
            const { error } = await supabase.from('runners').delete().eq('id', id);
            if (error) throw error;
            setRunners(runners.filter(r => r.id !== id));
        } catch (error) {
            console.error('Error deleting runner:', error);
            alert('Error deleting runner');
        }
    };

    // Race Management
    const handleAddRace = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const { data, error } = await supabase
                .from('races')
                .insert([raceForm])
                .select();

            if (error) throw error;
            if (data) setRaces([...data, ...races]);
            setRaceForm({ name: '', race_date: '', distance: '' });
        } catch (error) {
            console.error('Error adding race:', error);
            alert('Error adding race');
        }
    };

    const handleUpdateRace = async (e: FormEvent) => {
        e.preventDefault();
        if (!editingRace) return;

        try {
            const { error } = await supabase
                .from('races')
                .update(raceForm)
                .eq('id', editingRace.id);

            if (error) throw error;

            setRaces(races.map(r =>
                r.id === editingRace.id ? { ...r, ...raceForm } : r
            ));

            setEditingRace(null);
            setRaceForm({ name: '', race_date: '', distance: '' });
        } catch (error) {
            console.error('Error updating race:', error);
            alert('Error updating race');
        }
    };

    const handleDeleteRace = async (id: string) => {
        if (!confirm('Are you sure you want to delete this race?')) return;

        try {
            const { error } = await supabase.from('races').delete().eq('id', id);
            if (error) throw error;
            setRaces(races.filter(r => r.id !== id));
        } catch (error) {
            console.error('Error deleting race:', error);
            alert('Error deleting race');
        }
    };

    // Helper function to normalize time format for PostgreSQL INTERVAL
    const normalizeTimeFormat = (time: string): string => {
        // If format is MM:SS, convert to HH:MM:SS
        const parts = time.split(':');
        if (parts.length === 2) {
            return `00:${time}`;
        }
        return time;
    };

    // Calculate and update positions and points for a race
    const calculateAndUpdatePositions = async (raceId: string) => {
        try {
            // Fetch race details (for distance and date)
            const { data: race, error: raceError } = await supabase
                .from('races')
                .select('distance, race_date')
                .eq('id', raceId)
                .single();

            if (raceError) throw raceError;
            if (!race) return;

            // Fetch all results for this race with runner info
            const { data: raceResults, error: fetchError } = await supabase
                .from('results')
                .select('*, runner:runners(*)')
                .eq('race_id', raceId);

            if (fetchError) throw fetchError;
            if (!raceResults) return;

            // Calculate age-graded percentages for all results
            const resultsWithAgeGraded = raceResults.map((result: any) => {
                let ageGradedPercent = null;

                // Only calculate if runner has date_of_birth
                if (result.runner?.date_of_birth) {
                    const age = calculateAge(result.runner.date_of_birth, race.race_date);
                    const timeInSeconds = intervalToSeconds(result.finish_time);
                    const distanceKm = parseFloat(race.distance);

                    ageGradedPercent = calculateAgeGradedPercent(
                        distanceKm,
                        timeInSeconds,
                        age,
                        result.runner.gender === 'M' ? 'M' : 'F'
                    );
                }

                return { ...result, ageGradedPercent };
            });

            // Regular positions/points (by gender, separate)
            const regularUpdates: Array<{ id: string; position: number; points: number }> = [];

            ['M', 'F'].forEach((gender) => {
                const genderResults = resultsWithAgeGraded
                    .filter((r: any) => r.runner?.gender === gender)
                    .sort((a: any, b: any) => {
                        const timeA = a.finish_time;
                        const timeB = b.finish_time;
                        return timeA < timeB ? -1 : timeA > timeB ? 1 : 0;
                    });

                let currentPosition = 0;
                let prevTime: string | null = null;
                let tiedCount = 0;

                genderResults.forEach((result: any) => {
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
            const ageGradedUpdates: Array<{ id: string; age_graded_position: number; age_graded_points: number; age_graded_percent: number | null }> = [];

            // Filter results with age-graded scores and sort by percentage (descending)
            const sortedByAgeGraded = [...resultsWithAgeGraded]
                .filter((r: any) => r.ageGradedPercent !== null)
                .sort((a: any, b: any) => (b.ageGradedPercent || 0) - (a.ageGradedPercent || 0));

            let ageGradedPosition = 0;
            let prevPercent: number | null = null;
            let agTiedCount = 0;

            sortedByAgeGraded.forEach((result: any) => {
                const roundedPercent = Math.round(result.ageGradedPercent * 100000) / 100000; // Round to avoid floating point issues
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
                    age_graded_percent: result.ageGradedPercent
                });

                prevPercent = result.ageGradedPercent;
            });

            // Handle results without age-graded scores (no DOB)
            resultsWithAgeGraded
                .filter((r: any) => r.ageGradedPercent === null)
                .forEach((result: any) => {
                    ageGradedUpdates.push({
                        id: result.id,
                        age_graded_position: null as any,
                        age_graded_points: null as any,
                        age_graded_percent: null
                    });
                });

            // Batch update: combine regular and age-graded updates
            for (const result of resultsWithAgeGraded) {
                const regularUpdate = regularUpdates.find(u => u.id === result.id);
                const ageGradedUpdate = ageGradedUpdates.find(u => u.id === result.id);

                await supabase
                    .from('results')
                    .update({
                        position: regularUpdate?.position,
                        points: regularUpdate?.points,
                        age_graded_percent: ageGradedUpdate?.age_graded_percent,
                        age_graded_position: ageGradedUpdate?.age_graded_position,
                        age_graded_points: ageGradedUpdate?.age_graded_points
                    })
                    .eq('id', result.id);
            }

        } catch (error) {
            console.error('Error calculating positions:', error);
        }
    };

    // Result Management
    const handleAddResult = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedRaceId) return;

        try {
            const { error } = await supabase
                .from('results')
                .insert([{
                    race_id: selectedRaceId,
                    runner_id: resultForm.runner_id,
                    finish_time: normalizeTimeFormat(resultForm.finish_time)
                }])
                .select();

            if (error) throw error;

            // Recalculate positions and points for this race
            await calculateAndUpdatePositions(selectedRaceId);

            setResultForm({ runner_id: '', finish_time: '' });
            fetchResultsForRace(selectedRaceId);
        } catch (error) {
            console.error('Error adding result:', error);
            alert('Error adding result');
        }
    };

    const handleUpdateResult = async (e: FormEvent) => {
        e.preventDefault();
        if (!editingResult || !selectedRaceId) return;

        try {
            const { error } = await supabase
                .from('results')
                .update({
                    runner_id: resultForm.runner_id,
                    finish_time: normalizeTimeFormat(resultForm.finish_time)
                })
                .eq('id', editingResult.id);

            if (error) throw error;

            // Recalculate positions and points for this race
            await calculateAndUpdatePositions(selectedRaceId);

            setEditingResult(null);
            setResultForm({ runner_id: '', finish_time: '' });
            fetchResultsForRace(selectedRaceId);
        } catch (error) {
            console.error('Error updating result:', error);
            alert('Error updating result');
        }
    };

    const handleDeleteResult = async (id: string) => {
        if (!confirm('Are you sure you want to delete this result?')) return;

        try {
            const { error } = await supabase.from('results').delete().eq('id', id);
            if (error) throw error;

            // Recalculate positions and points for this race
            if (selectedRaceId) {
                await calculateAndUpdatePositions(selectedRaceId);
                fetchResultsForRace(selectedRaceId);
            }
        } catch (error) {
            console.error('Error deleting result:', error);
            alert('Error deleting result');
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

    return (
        <Layout>
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">Admin Dashboard</h1>
                    <p className="page-subtitle">Manage runners, races, and results</p>
                </div>

                {/* Manage Runners */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <div className="section-header">
                        <h2 className="section-title">Manage Runners</h2>
                    </div>

                    <form onSubmit={editingRunner ? handleUpdateRunner : handleAddRunner}>
                        <div className="runner-form-grid">
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Runner name"
                                value={runnerForm.name}
                                onChange={(e) => setRunnerForm({ ...runnerForm, name: e.target.value })}
                                required
                            />
                            <select
                                className="form-select"
                                value={runnerForm.gender}
                                onChange={(e) => setRunnerForm({ ...runnerForm, gender: e.target.value as 'M' | 'F' })}
                            >
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                            </select>
                            <input
                                type="date"
                                className="form-input"
                                placeholder="Date of Birth"
                                value={runnerForm.date_of_birth}
                                onChange={(e) => setRunnerForm({ ...runnerForm, date_of_birth: e.target.value })}
                            />
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="submit" className="btn btn-primary">
                                    {editingRunner ? 'Update' : 'Add Runner'}
                                </button>
                                {editingRunner && (
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setEditingRunner(null);
                                            setRunnerForm({ name: '', gender: 'M', date_of_birth: '' });
                                        }}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Gender</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {runners.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="empty-state">No runners added yet</td>
                                    </tr>
                                ) : (
                                    runners.map((runner) => (
                                        <tr key={runner.id}>
                                            <td>{runner.name}</td>
                                            <td>
                                                <span className={`badge ${runner.gender === 'M' ? 'badge-male' : 'badge-female'}`}>
                                                    {runner.gender === 'M' ? 'Male' : 'Female'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-icons">
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => {
                                                            setEditingRunner(runner);
                                                            setRunnerForm({ name: runner.name, gender: runner.gender, date_of_birth: runner.date_of_birth || '' });
                                                        }}
                                                        title="Edit"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        className="icon-btn danger"
                                                        onClick={() => handleDeleteRunner(runner.id)}
                                                        title="Delete"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Manage Races */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <div className="section-header">
                        <h2 className="section-title">Manage Races</h2>
                    </div>

                    <form onSubmit={editingRace ? handleUpdateRace : handleAddRace}>
                        <div className="race-form-grid">
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Race name"
                                value={raceForm.name}
                                onChange={(e) => setRaceForm({ ...raceForm, name: e.target.value })}
                                required
                            />
                            <input
                                type="date"
                                className="form-input"
                                value={raceForm.race_date}
                                onChange={(e) => setRaceForm({ ...raceForm, race_date: e.target.value })}
                                required
                            />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Distance (e.g., 5K)"
                                value={raceForm.distance}
                                onChange={(e) => setRaceForm({ ...raceForm, distance: e.target.value })}
                                required
                            />
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="submit" className="btn btn-primary">
                                    {editingRace ? 'Update' : 'Add Race'}
                                </button>
                                {editingRace && (
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setEditingRace(null);
                                            setRaceForm({ name: '', race_date: '', distance: '' });
                                        }}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Race Name</th>
                                    <th>Date</th>
                                    <th>Distance</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {races.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="empty-state">No races added yet</td>
                                    </tr>
                                ) : (
                                    races.map((race) => (
                                        <tr key={race.id}>
                                            <td>{race.name}</td>
                                            <td>{new Date(race.race_date).toLocaleDateString()}</td>
                                            <td>{race.distance}</td>
                                            <td>
                                                <div className="action-icons">
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => {
                                                            setEditingRace(race);
                                                            setRaceForm({ name: race.name, race_date: race.race_date, distance: race.distance });
                                                        }}
                                                        title="Edit"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        className="icon-btn danger"
                                                        onClick={() => handleDeleteRace(race.id)}
                                                        title="Delete"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Manage Results */}
                <div className="card">
                    <div className="section-header">
                        <h2 className="section-title">Manage Results</h2>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Select Race</label>
                        <select
                            className="form-select"
                            value={selectedRaceId}
                            onChange={(e) => {
                                setSelectedRaceId(e.target.value);
                                if (e.target.value) fetchResultsForRace(e.target.value);
                            }}
                        >
                            <option value="">-- Select a race --</option>
                            {races.map((race) => (
                                <option key={race.id} value={race.id}>
                                    {race.name} - {new Date(race.race_date).toLocaleDateString()}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedRaceId && (
                        <>
                            <form onSubmit={editingResult ? handleUpdateResult : handleAddResult}>
                                <div className="result-form-grid">
                                    <select
                                        className="form-select"
                                        value={resultForm.runner_id}
                                        onChange={(e) => setResultForm({ ...resultForm, runner_id: e.target.value })}
                                        required
                                    >
                                        <option value="">-- Select runner --</option>
                                        {runners.map((runner) => (
                                            <option key={runner.id} value={runner.id}>
                                                {runner.name} ({runner.gender})
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="HH:MM:SS or MM:SS"
                                        value={resultForm.finish_time}
                                        onChange={(e) => setResultForm({ ...resultForm, finish_time: e.target.value })}
                                        pattern="^([0-9]{1,2}:)?[0-5][0-9]:[0-5][0-9]$"
                                        title="Format: HH:MM:SS or MM:SS"
                                        required
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button type="submit" className="btn btn-primary">
                                            {editingResult ? 'Update' : 'Add Result'}
                                        </button>
                                        {editingResult && (
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    setEditingResult(null);
                                                    setResultForm({ runner_id: '', finish_time: '' });
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </form>

                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Position</th>
                                            <th>Runner</th>
                                            <th>Time</th>
                                            <th>Points</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="empty-state">No results for this race yet</td>
                                            </tr>
                                        ) : (
                                            results.map((result) => (
                                                <tr key={result.id}>
                                                    <td>{result.position}</td>
                                                    <td>
                                                        {result.runner?.name}
                                                        <span className={`badge ${result.runner?.gender === 'M' ? 'badge-male' : 'badge-female'}`} style={{ marginLeft: '0.5rem' }}>
                                                            {result.runner?.gender}
                                                        </span>
                                                    </td>
                                                    <td>{result.finish_time}</td>
                                                    <td><strong>{result.points}</strong></td>
                                                    <td>
                                                        <div className="action-icons">
                                                            <button
                                                                className="icon-btn"
                                                                onClick={() => {
                                                                    setEditingResult(result);
                                                                    setResultForm({
                                                                        runner_id: result.runner_id,
                                                                        finish_time: result.finish_time
                                                                    });
                                                                }}
                                                                title="Edit"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                className="icon-btn danger"
                                                                onClick={() => handleDeleteResult(result.id)}
                                                                title="Delete"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div >
        </Layout >
    );
}
