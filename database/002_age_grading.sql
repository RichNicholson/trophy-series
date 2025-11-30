-- Migration: Add Age-Graded Trophy Support
-- Adds date of birth to runners, converts distance to numeric, adds age-graded columns to results

-- 1. Add date of birth to runners table
ALTER TABLE runners 
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- 2. Convert distance from TEXT to DECIMAL in races table
-- This assumes existing data is already numeric strings (e.g., "5", "10", "21.0975")
ALTER TABLE races 
ALTER COLUMN distance TYPE DECIMAL(10,6) USING CAST(distance AS DECIMAL(10,6));

-- 3. Add age-graded columns to results table
ALTER TABLE results 
ADD COLUMN IF NOT EXISTS age_graded_percent DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS age_graded_position INTEGER,
ADD COLUMN IF NOT EXISTS age_graded_points INTEGER;

-- 4. Create index on date_of_birth for faster age calculations
CREATE INDEX IF NOT EXISTS idx_runners_date_of_birth ON runners(date_of_birth);

-- Note: Existing results will have NULL age-graded values until recalculated
-- The frontend will calculate these when results are added/updated
