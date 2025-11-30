-- Trophy Series Running Club Race Management Database Schema
-- Combined migration including age-graded trophy support

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create runners table
CREATE TABLE IF NOT EXISTS runners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    gender CHAR(1) NOT NULL CHECK (gender IN ('M', 'F')),
    date_of_birth DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create races table
CREATE TABLE IF NOT EXISTS races (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    race_date DATE NOT NULL,
    distance DECIMAL(10,6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create results table
CREATE TABLE IF NOT EXISTS results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    race_id UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,
    runner_id UUID NOT NULL REFERENCES runners(id) ON DELETE CASCADE,
    finish_time INTERVAL NOT NULL,
    position INTEGER,
    points INTEGER,
    age_graded_percent DECIMAL(5,4),
    age_graded_position INTEGER,
    age_graded_points INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(race_id, runner_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_results_race_id ON results(race_id);
CREATE INDEX IF NOT EXISTS idx_results_runner_id ON results(runner_id);
CREATE INDEX IF NOT EXISTS idx_runners_date_of_birth ON runners(date_of_birth);

-- Note: Position, points, and age-graded values are calculated in the frontend
-- This provides better reliability and easier debugging
