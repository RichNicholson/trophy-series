import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Runner, Race, Result } from '../types';
import Layout from '../components/Layout';
import { calculateAge, calculateAgeGradedPercent, intervalToSeconds } from '../lib/ageGrading';
import { parseResultsFile, type ParsedImportData } from '../lib/importUtils';

export default function AdminDashboard() {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();

    // State
    const [runners, setRunners] = useState<Runner[]>([]);
    const [races, setRaces] = useState<Race[]>([]);
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(true);
    const [championshipCountLimit, setChampionshipCountLimit] = useState<number>(5);

    // Selected race for results management
    const [selectedRaceId, setSelectedRaceId] = useState<string>('');

    // Form states
    const [runnerForm, setRunnerForm] = useState({ name: '', gender: 'M' as 'M' | 'F', date_of_birth: '' });
    const [raceForm, setRaceForm] = useState({ name: '', race_date: '', distance: '' });
    const [resultForm, setResultForm] = useState({ runner_id: '', finish_time: '' });

    const [editingRunner, setEditingRunner] = useState<Runner | null>(null);
    const [editingRace, setEditingRace] = useState<Race | null>(null);
    const [editingResult, setEditingResult] = useState<Result | null>(null);

    // Inline editing state for runners
    const [inlineEditingRunnerId, setInlineEditingRunnerId] = useState<string | null>(null);
    const [inlineRunnerForm, setInlineRunnerForm] = useState({ name: '', gender: 'M' as 'M' | 'F', date_of_birth: '' });

    // Inline editing state for races
    const [inlineEditingRaceId, setInlineEditingRaceId] = useState<string | null>(null);
    const [inlineRaceForm, setInlineRaceForm] = useState({ name: '', race_date: '', distance: '' });

    // Import State
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importData, setImportData] = useState<ParsedImportData | null>(null);
    const [isProcessingImport, setIsProcessingImport] = useState(false);

    useEffect(() => {
        if (!isAdmin) {
            navigate('/login');
            return;
        }
        fetchData();
    }, [isAdmin, navigate]);

    const fetchData = async () => {
        try {
            const [runnersRes, racesRes, settingsRes] = await Promise.all([
                supabase.from('runners').select('*'),
                supabase.from('races').select('*').order('race_date', { ascending: true }),
                supabase.from('settings').select('*').eq('key', 'championship_count_limit').single()
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
            if (settingsRes.data) {
                setChampionshipCountLimit(parseInt(settingsRes.data.value, 10));
            }
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

    // Settings Management
    const handleUpdateChampionshipLimit = async (newLimit: number) => {
        try {
            const { error } = await supabase
                .from('settings')
                .update({ value: newLimit.toString() })
                .eq('key', 'championship_count_limit');

            if (error) throw error;
            setChampionshipCountLimit(newLimit);
        } catch (error) {
            console.error('Error updating championship limit:', error);
            alert('Error updating championship limit');
        }
    };

    // Runner Management
    const handleAddRunner = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const { data, error } = await supabase
                .from('runners')
                .insert([{
                    ...runnerForm,
                    date_of_birth: runnerForm.date_of_birth === '' ? null : runnerForm.date_of_birth
                }])
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
                .update({
                    name: runnerForm.name,
                    gender: runnerForm.gender,
                    date_of_birth: runnerForm.date_of_birth === '' ? null : runnerForm.date_of_birth
                })
                .eq('id', editingRunner.id);

            if (error) throw error;

            setRunners(runners.map(r =>
                r.id === editingRunner.id
                    ? {
                        ...r,
                        name: runnerForm.name,
                        gender: runnerForm.gender,
                        date_of_birth: runnerForm.date_of_birth === '' ? undefined : runnerForm.date_of_birth
                    }
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

    // Inline editing handlers for runners
    const handleInlineEditRunner = (runner: Runner) => {
        setInlineEditingRunnerId(runner.id);
        setInlineRunnerForm({ name: runner.name, gender: runner.gender, date_of_birth: runner.date_of_birth || '' });
    };

    const handleSaveInlineRunner = async (runnerId: string) => {
        try {
            const { error } = await supabase
                .from('runners')
                .update({
                    ...inlineRunnerForm,
                    date_of_birth: inlineRunnerForm.date_of_birth === '' ? null : inlineRunnerForm.date_of_birth
                })
                .eq('id', runnerId);

            if (error) throw error;

            setRunners(runners.map(r => r.id === runnerId ? { ...r, ...inlineRunnerForm } : r));
            setInlineEditingRunnerId(null);
            setInlineRunnerForm({ name: '', gender: 'M', date_of_birth: '' });
        } catch (error) {
            console.error('Error updating runner:', error);
            alert('Error updating runner');
        }
    };

    const handleCancelInlineEdit = () => {
        setInlineEditingRunnerId(null);
        setInlineRunnerForm({ name: '', gender: 'M', date_of_birth: '' });
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

    // Inline editing handlers for races
    const handleInlineEditRace = (race: Race) => {
        setInlineEditingRaceId(race.id);
        setInlineRaceForm({ name: race.name, race_date: race.race_date, distance: race.distance });
    };

    const handleSaveInlineRace = async (raceId: string) => {
        try {
            const { error } = await supabase
                .from('races')
                .update(inlineRaceForm)
                .eq('id', raceId);

            if (error) throw error;

            setRaces(races.map(r => r.id === raceId ? { ...r, ...inlineRaceForm } : r));
            setInlineEditingRaceId(null);
            setInlineRaceForm({ name: '', race_date: '', distance: '' });
        } catch (error) {
            console.error('Error updating race:', error);
            alert('Error updating race');
        }
    };

    const handleCancelInlineRaceEdit = () => {
        setInlineEditingRaceId(null);
        setInlineRaceForm({ name: '', race_date: '', distance: '' });
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

    // Import Handlers
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        try {
            setLoading(true);
            const parsed = await parseResultsFile(file, runners, results);
            setImportData(parsed);
            setImportModalOpen(true);

            // Reset input
            e.target.value = '';
        } catch (error) {
            console.error('Error parsing file:', error);
            alert('Error parsing file. Please ensure it is a valid Excel or CSV file.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!importData || !selectedRaceId) return;

        setIsProcessingImport(true);
        try {
            // 1. Create new runners
            const newRunnerMap = new Map<string, string>(); // Name -> ID

            if (importData.newRunners.length > 0) {
                // Prepare new runners with default gender 'M' and null DOB
                const runnersToCreate = importData.newRunners.map(r => ({
                    name: r.name,
                    gender: 'M', // Default as per plan
                    date_of_birth: null
                }));

                const { data: createdRunners, error: createError } = await supabase
                    .from('runners')
                    .insert(runnersToCreate)
                    .select();

                if (createError) throw createError;

                if (createdRunners) {
                    createdRunners.forEach(r => newRunnerMap.set(r.name.toLowerCase(), r.id));
                    // Update local state
                    setRunners(prev => [...prev, ...createdRunners].sort((a, b) => a.name.localeCompare(b.name)));
                }
            }

            // 2. Prepare results to insert
            const resultsToInsert = [];

            // Add existing runners results
            for (const item of importData.existingRunners) {
                resultsToInsert.push({
                    race_id: selectedRaceId,
                    runner_id: item.runner.id,
                    finish_time: normalizeTimeFormat(item.time)
                });
            }

            // Add new runners results
            for (const item of importData.newRunners) {
                const runnerId = newRunnerMap.get(item.name.toLowerCase());
                if (runnerId) {
                    resultsToInsert.push({
                        race_id: selectedRaceId,
                        runner_id: runnerId,
                        finish_time: normalizeTimeFormat(item.time)
                    });
                }
            }

            if (resultsToInsert.length > 0) {
                const { error: resultError } = await supabase
                    .from('results')
                    .insert(resultsToInsert);

                if (resultError) throw resultError;

                // Refresh results
                await fetchResultsForRace(selectedRaceId);
                // Recalculate positions
                await calculateAndUpdatePositions(selectedRaceId);
            }

            setImportModalOpen(false);
            setImportData(null);
            alert(`Successfully imported ${resultsToInsert.length} results!`);

        } catch (error) {
            console.error('Error importing data:', error);
            alert('Error importing data. See console for details.');
        } finally {
            setIsProcessingImport(false);
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

                {/* Settings */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <div className="section-header">
                        <h2 className="section-title">Championship Settings</h2>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <label style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                            Number of races to count towards championship:
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="20"
                            className="form-input"
                            style={{ width: '100px' }}
                            value={championshipCountLimit}
                            onChange={(e) => handleUpdateChampionshipLimit(parseInt(e.target.value, 10))}
                        />
                    </div>
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
                                    <th>Sex</th>
                                    <th>DOB</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {runners.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="empty-state">No runners added yet</td>
                                    </tr>
                                ) : (
                                    runners.map((runner) => (
                                        <tr key={runner.id}>
                                            {inlineEditingRunnerId === runner.id ? (
                                                // Inline edit mode
                                                <>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={inlineRunnerForm.name}
                                                            onChange={(e) => setInlineRunnerForm({ ...inlineRunnerForm, name: e.target.value })}
                                                            style={{ width: '100%' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <select
                                                            className="form-select"
                                                            value={inlineRunnerForm.gender}
                                                            onChange={(e) => setInlineRunnerForm({ ...inlineRunnerForm, gender: e.target.value as 'M' | 'F' })}
                                                            style={{ width: '100%' }}
                                                        >
                                                            <option value="M">Male</option>
                                                            <option value="F">Female</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="date"
                                                            className="form-input"
                                                            value={inlineRunnerForm.date_of_birth}
                                                            onChange={(e) => setInlineRunnerForm({ ...inlineRunnerForm, date_of_birth: e.target.value })}
                                                            style={{ width: '100%' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className="action-icons">
                                                            <button
                                                                className="icon-btn"
                                                                onClick={() => handleSaveInlineRunner(runner.id)}
                                                                title="Save"
                                                            >
                                                                ✅
                                                            </button>
                                                            <button
                                                                className="icon-btn"
                                                                onClick={handleCancelInlineEdit}
                                                                title="Cancel"
                                                            >
                                                                ❌
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                // View mode
                                                <>
                                                    <td>{runner.name}</td>
                                                    <td>
                                                        <span className={`badge ${runner.gender === 'M' ? 'badge-male' : 'badge-female'}`}>
                                                            {runner.gender === 'M' ? 'Male' : 'Female'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {runner.date_of_birth
                                                            ? new Date(runner.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                                            : '-'
                                                        }
                                                    </td>
                                                    <td>
                                                        <div className="action-icons">
                                                            <button
                                                                className="icon-btn"
                                                                onClick={() => handleInlineEditRunner(runner)}
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
                                                </>
                                            )}
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
                                    <th>Race</th>
                                    <th>Date</th>
                                    <th>Dist</th>
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
                                            {inlineEditingRaceId === race.id ? (
                                                // Inline edit mode
                                                <>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={inlineRaceForm.name}
                                                            onChange={(e) => setInlineRaceForm({ ...inlineRaceForm, name: e.target.value })}
                                                            style={{ width: '100%' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="date"
                                                            className="form-input"
                                                            value={inlineRaceForm.race_date}
                                                            onChange={(e) => setInlineRaceForm({ ...inlineRaceForm, race_date: e.target.value })}
                                                            style={{ width: '100%' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={inlineRaceForm.distance}
                                                            onChange={(e) => setInlineRaceForm({ ...inlineRaceForm, distance: e.target.value })}
                                                            style={{ width: '100%' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className="action-icons">
                                                            <button
                                                                className="icon-btn"
                                                                onClick={() => handleSaveInlineRace(race.id)}
                                                                title="Save"
                                                            >
                                                                ✅
                                                            </button>
                                                            <button
                                                                className="icon-btn"
                                                                onClick={handleCancelInlineRaceEdit}
                                                                title="Cancel"
                                                            >
                                                                ❌
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                // View mode
                                                <>
                                                    <td>{race.name}</td>
                                                    <td>{new Date(race.race_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                                    <td>{race.distance}</td>
                                                    <td>
                                                        <div className="action-icons">
                                                            <button
                                                                className="icon-btn"
                                                                onClick={() => handleInlineEditRace(race)}
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
                                                </>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Manage Results */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Manage Results</h2>
                        {selectedRaceId && (
                            <div>
                                <input
                                    type="file"
                                    id="import-file"
                                    accept=".xlsx,.xls,.csv"
                                    style={{ display: 'none' }}
                                    onChange={handleFileSelect}
                                />
                                <label
                                    htmlFor="import-file"
                                    className="btn btn-secondary"
                                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <span>📂</span> Import Excel
                                </label>
                            </div>
                        )}
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
            {/* Import Confirmation Modal */}
            {importModalOpen && importData && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Confirm Import</h2>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <p>Found <strong>{importData.newRunners.length + importData.existingRunners.length}</strong> results to import.</p>

                            {importData.duplicates.length > 0 && (
                                <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
                                    ⚠️ <strong>{importData.duplicates.length}</strong> duplicate results will be skipped.
                                </div>
                            )}

                            {importData.newRunners.length > 0 && (
                                <div className="alert alert-info" style={{ marginTop: '1rem' }}>
                                    🆕 <strong>{importData.newRunners.length}</strong> new runners will be created.
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                                        <strong>Note:</strong> New runners will be set to <strong>Male</strong> by default.
                                        Please update their Gender and Date of Birth after import.
                                    </div>
                                    <ul style={{ marginTop: '0.5rem', maxHeight: '100px', overflowY: 'auto', paddingLeft: '1.5rem' }}>
                                        {importData.newRunners.map((r, i) => (
                                            <li key={i}>{r.name}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {importData.invalidRows.length > 0 && (
                                <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
                                    ❌ <strong>{importData.invalidRows.length}</strong> rows have invalid data and will be skipped.
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setImportModalOpen(false);
                                    setImportData(null);
                                }}
                                disabled={isProcessingImport}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleConfirmImport}
                                disabled={isProcessingImport || (importData.newRunners.length === 0 && importData.existingRunners.length === 0)}
                            >
                                {isProcessingImport ? 'Importing...' : 'Confirm Import'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout >
    );
}
