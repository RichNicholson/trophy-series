-- Trophy Series Running Club Race Management Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Function to calculate positions and points for a race
-- Groups by gender and handles ties correctly
CREATE OR REPLACE FUNCTION calculate_positions_and_points()
RETURNS TRIGGER AS $$
DECLARE
    gender_rec RECORD;
    result_rec RECORD;
    current_position INTEGER;
    prev_time INTERVAL;
    tied_count INTEGER;
    target_race_id UUID;
BEGIN
    -- Get the race_id we're working with
    IF TG_OP = 'DELETE' THEN
        target_race_id := OLD.race_id;
    ELSE
        target_race_id := NEW.race_id;
    END IF;

    -- Calculate for both genders separately
    FOR gender_rec IN 
        SELECT DISTINCT r.gender
        FROM results res
        JOIN runners r ON res.runner_id = r.id
        WHERE res.race_id = target_race_id
    LOOP
        current_position := 0;
        prev_time := NULL;
        tied_count := 0;

        -- Update positions and points for this gender
        FOR result_rec IN
            SELECT res.id, res.finish_time
            FROM results res
            JOIN runners r ON res.runner_id = r.id
            WHERE res.race_id = target_race_id
            AND r.gender = gender_rec.gender
            ORDER BY res.finish_time ASC
        LOOP
            IF prev_time IS NULL OR result_rec.finish_time != prev_time THEN
                -- New position (not a tie)
                current_position := current_position + tied_count + 1;
                tied_count := 0;
            ELSE
                -- This is a tie
                tied_count := tied_count + 1;
            END IF;

            -- Calculate points: 25 for 1st, 24 for 2nd, etc., minimum 0
            UPDATE results
            SET 
                position = current_position,
                points = GREATEST(25 - (current_position - 1), 0)
            WHERE id = result_rec.id;

            prev_time := result_rec.finish_time;
        END LOOP;
    END LOOP;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_calculate_positions ON results;

-- Create trigger to automatically calculate positions after insert/update/delete
CREATE TRIGGER trigger_calculate_positions
AFTER INSERT OR UPDATE OR DELETE ON results
FOR EACH ROW
EXECUTE FUNCTION calculate_positions_and_points();
