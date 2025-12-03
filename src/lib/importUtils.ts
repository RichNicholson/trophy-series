import { read, utils } from 'xlsx';
import { TIME_FORMAT_REGEX } from './constants';
import type { Runner, Result } from '../types';

export interface ImportRow {
    name: string;
    time: string;
    originalRow: number;
}

export interface ParsedImportData {
    newRunners: ImportRow[];
    existingRunners: { runner: Runner; time: string }[];
    duplicates: { runner: Runner; time: string; existingResult: Result }[];
    invalidRows: { row: number; error: string; data: any }[];
}

export async function parseResultsFile(
    file: File,
    existingRunners: Runner[],
    currentRaceResults: Result[]
): Promise<ParsedImportData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert to array of arrays
                const jsonData = utils.sheet_to_json<any[]>(worksheet, { header: 1 });

                const parsedData: ParsedImportData = {
                    newRunners: [],
                    existingRunners: [],
                    duplicates: [],
                    invalidRows: []
                };

                // Skip header row if it looks like a header (contains "Name" or "Time")
                let startIndex = 0;
                if (jsonData.length > 0) {
                    const firstRow = jsonData[0];
                    if (firstRow[0] && typeof firstRow[0] === 'string' &&
                        (firstRow[0].toLowerCase().includes('name') || firstRow[0].toLowerCase().includes('runner'))) {
                        startIndex = 1;
                    }
                }

                for (let i = startIndex; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || row.length < 2) continue;

                    const name = String(row[0]).trim();
                    let time = String(row[1]).trim();

                    // Basic validation
                    if (!name) continue;

                    // Normalize time format (e.g. handle Excel numeric dates if needed, but assuming string for now)
                    // If Excel exports time as a fraction of a day, we might need conversion. 
                    // For now, assuming text input as requested: "h:mm:ss or mm:ss"

                    // Fix mm:ss to 00:mm:ss if needed for regex check, or just validate
                    if (!TIME_FORMAT_REGEX.test(time)) {
                        // Try to fix common format issues
                        if (/^\d{1,2}:\d{2}$/.test(time)) {
                            time = `00:${time}`;
                        } else {
                            parsedData.invalidRows.push({
                                row: i + 1,
                                error: 'Invalid time format. Use HH:MM:SS or MM:SS',
                                data: row
                            });
                            continue;
                        }
                    }

                    // Check if runner exists
                    // Normalize names for comparison (case insensitive)
                    const existingRunner = existingRunners.find(r =>
                        r.name.toLowerCase() === name.toLowerCase()
                    );

                    if (existingRunner) {
                        // Check for duplicate result in this race
                        const duplicateResult = currentRaceResults.find(r => r.runner_id === existingRunner.id);

                        if (duplicateResult) {
                            parsedData.duplicates.push({
                                runner: existingRunner,
                                time,
                                existingResult: duplicateResult
                            });
                        } else {
                            parsedData.existingRunners.push({
                                runner: existingRunner,
                                time
                            });
                        }
                    } else {
                        parsedData.newRunners.push({
                            name,
                            time,
                            originalRow: i + 1
                        });
                    }
                }

                resolve(parsedData);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}
