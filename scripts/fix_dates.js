import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Date Parsing Helper (Fixed version)
const months = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
};

function parseDate(dateStr) {
    // Format: 9/Nov/79
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const monthStr = parts[1];
    let year = parseInt(parts[2], 10);

    // Handle 2-digit year
    if (year < 100) {
        year = year < 30 ? 2000 + year : 1900 + year;
    }

    const month = months[monthStr];
    if (month === undefined) return null;

    // Return YYYY-MM-DD formatted directly to avoid timezone issues
    const monthPadded = String(month + 1).padStart(2, '0');
    const dayPadded = String(day).padStart(2, '0');
    return `${year}-${monthPadded}-${dayPadded}`;
}

async function fixDates() {
    const csvPath = path.resolve(__dirname, '../data_sources/results.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split(/\r?\n/);

    let updatedCount = 0;
    let skippedCount = 0;

    // Start from line 3 (index 3, 4th line) - skip header rows
    for (let i = 3; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const cols = line.split(',');

        const firstName = cols[0].trim();
        const surname = cols[1].trim();
        const dobStr = cols[3].trim();

        if (!firstName || !surname || !dobStr) continue;

        const name = `${firstName} ${surname}`;
        const correctDob = parseDate(dobStr);

        if (!correctDob) {
            console.log(`⚠️  Could not parse DOB for ${name}: ${dobStr}`);
            continue;
        }

        // Find runner in database
        const { data: runner, error: fetchError } = await supabase
            .from('runners')
            .select('id, date_of_birth')
            .eq('name', name)
            .single();

        if (fetchError || !runner) {
            console.log(`⚠️  Runner not found: ${name}`);
            skippedCount++;
            continue;
        }

        // Check if date needs updating
        if (runner.date_of_birth === correctDob) {
            console.log(`✓ ${name}: Already correct (${correctDob})`);
            skippedCount++;
            continue;
        }

        // Update the date
        const { error: updateError } = await supabase
            .from('runners')
            .update({ date_of_birth: correctDob })
            .eq('id', runner.id);

        if (updateError) {
            console.error(`❌ Error updating ${name}:`, updateError);
        } else {
            console.log(`✅ Updated ${name}: ${runner.date_of_birth} → ${correctDob}`);
            updatedCount++;
        }
    }

    console.log('\n=== Summary ===');
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log('Done!');
}

fixDates().catch(console.error);
