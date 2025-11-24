-- Trophy Series Running Club Race Management Database Schema
-- Migration: Remove trigger-based calculation (moving to frontend)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop old trigger and function if they exist
DROP TRIGGER IF EXISTS trigger_calculate_positions ON results;
DROP FUNCTION IF EXISTS calculate_positions_and_points();

-- Create runners table
CREATE TABLE IF NOT EXISTS runners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    gender CHAR(1) NOT NULL CHECK (gender IN ('M', 'F')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create races table
CREATE TABLE IF NOT EXISTS races (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    race_date DATE NOT NULL,
    distance TEXT NOT NULL,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(race_id, runner_id)
);

CREATE INDEX IF NOT EXISTS idx_results_race_id ON results(race_id);
CREATE INDEX IF NOT EXISTS idx_results_runner_id ON results(runner_id);

-- Note: Position and points are now calculated in the frontend
-- This provides better reliability and easier debugging
