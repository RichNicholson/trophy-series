export interface Runner {
    id: string;
    name: string;
    gender: 'M' | 'F';
    date_of_birth?: string;
    created_at?: string;
}

export interface Race {
    id: string;
    name: string;
    race_date: string;
    distance: string;
    created_at?: string;
}

export interface Result {
    id: string;
    race_id: string;
    runner_id: string;
    finish_time: string; // stored as interval in DB, displayed as HH:MM:SS
    position?: number;
    points?: number;
    age_graded_percent?: number;
    age_graded_position?: number;
    age_graded_points?: number;
    created_at?: string;
    // Joined data
    runner?: Runner;
    race?: Race;
}

export interface ChampionshipStanding {
    runner_id: string;
    runner_name: string;
    gender: 'M' | 'F';
    total_points: number;
    races_participated: number;
}
