import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Runner, Race, Result } from '../types';
import Layout from '../components/Layout';

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
    const [runnerForm, setRunnerForm] = useState({ name: '', gender: 'M' as 'M' | 'F' });
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
                supabase.from('runners').select('*').order('name'),
                supabase.from('races').select('*').order('race_date', { ascending: false })
            ]);

            if (runnersRes.data) setRunners(runnersRes.data);
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
                .order('position');

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
            setRunnerForm({ name: '', gender: 'M' });
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
            setRunnerForm({ name: '', gender: 'M' });
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
                    finish_time: resultForm.finish_time
                }])
                .select();

            if (error) throw error;
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
                    finish_time: resultForm.finish_time
                })
                .eq('id', editingResult.id);

            if (error) throw error;

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
            if (selectedRaceId) fetchResultsForRace(selectedRaceId);
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
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '1rem', marginBottom: '1rem' }}>
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
                                            setRunnerForm({ name: '', gender: 'M' });
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
                                                            setRunnerForm({ name: runner.name, gender: runner.gender });
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
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1rem', marginBottom: '1rem' }}>
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
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '1rem', marginBottom: '1rem' }}>
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
            </div>
        </Layout>
    );
}
