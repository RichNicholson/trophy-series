import type { Runner, Race, Result } from '../../types';

export const mockRunners: Runner[] = [
    {
        id: '1',
        name: 'John Doe',
        gender: 'M',
        date_of_birth: '1985-06-15',
        created_at: '2024-01-01T00:00:00Z'
    },
    {
        id: '2',
        name: 'Jane Smith',
        gender: 'F',
        date_of_birth: '1990-03-22',
        created_at: '2024-01-01T00:00:00Z'
    },
    {
        id: '3',
        name: 'Bob Wilson',
        gender: 'M',
        created_at: '2024-01-01T00:00:00Z'
    }
];

export const mockRaces: Race[] = [
    {
        id: 'race1',
        name: 'Spring 5K',
        race_date: '2024-03-15',
        distance: '5',
        created_at: '2024-01-01T00:00:00Z'
    },
    {
        id: 'race2',
        name: 'Summer 10K',
        race_date: '2024-06-20',
        distance: '10',
        created_at: '2024-01-01T00:00:00Z'
    }
];

export const mockResults: Result[] = [
    {
        id: 'result1',
        race_id: 'race1',
        runner_id: '1',
        finish_time: '00:20:30',
        position: 1,
        points: 15,
        age_graded_percent: 0.785,
        age_graded_position: 1,
        age_graded_points: 15,
        created_at: '2024-03-15T00:00:00Z',
        runner: mockRunners[0]
    },
    {
        id: 'result2',
        race_id: 'race1',
        runner_id: '2',
        finish_time: '00:24:15',
        position: 1,
        points: 15,
        age_graded_percent: 0.812,
        age_graded_position: 2,
        age_graded_points: 14,
        created_at: '2024-03-15T00:00:00Z',
        runner: mockRunners[1]
    },
    {
        id: 'result3',
        race_id: 'race1',
        runner_id: '3',
        finish_time: '00:22:45',
        position: 2,
        points: 14,
        created_at: '2024-03-15T00:00:00Z',
        runner: mockRunners[2]
    }
];
