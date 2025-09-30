import { showLoading, showError, showStatus } from './ui.js';
import { parseCsv, convertToCsv } from './csv.js';
import { state, setState } from './state.js';
import { renderCsvTable, showCsvInfo } from './ui.js';

/**
 * Scan for CSV files using API endpoint
 */
export async function scanForCsvFiles() {
    try {
        const response = await fetch('/api/list-csv');
        if (!response.ok) {
            throw new Error('Failed to fetch CSV list');
        }
        const files = await response.json();
        return files;
    } catch (error) {
        console.error('Error scanning for CSV files:', error);
        throw error;
    }
}

/**
 * Load and display the unified CSV file
 */
export async function loadCsv(filename) {
    if (!filename) {
        showError('No CSV file specified');
        return;
    }

    try {
        showLoading(true);

        // Fetch CSV file from API endpoint
        const response = await fetch(`/api/csv/${encodeURIComponent(filename)}`);

        if (!response.ok) {
            if (response.status === 404) {
                // File doesn't exist yet - show empty state
                setState({
                    currentCsvData: [],
                    currentCsvFile: filename,
                    hasUnsavedChanges: false,
                });
                showStatus('No data yet. Run a LinkedIn search to populate the database.', 'info');
                showLoading(false);
                return;
            }
            throw new Error(`Failed to load CSV file: ${response.statusText}`);
        }

        const csvText = await response.text();

        if (!csvText.trim()) {
            setState({
                currentCsvData: [],
                currentCsvFile: filename,
                hasUnsavedChanges: false,
            });
            showStatus('No data yet. Run a LinkedIn search to populate the database.', 'info');
            showLoading(false);
            return;
        }

        const data = parseCsv(csvText);
        setState({
            currentCsvData: data,
            currentCsvFile: filename,
            hasUnsavedChanges: false,
        });

        renderCsvTable();
        showCsvInfo();
        showStatus(`Loaded ${data.length} posts from database`, 'success');

    } catch (error) {
        showError('Failed to load CSV: ' + error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * Save changes back to CSV file
 */
export async function saveChanges() {
    if (!state.currentCsvFile) {
        showError('No file is currently loaded.');
        return;
    }

    try {
        showStatus('Saving changes...', 'info');

        const csvContent = convertToCsv(state.currentCsvData);

        const response = await fetch(`/api/csv/${encodeURIComponent(state.currentCsvFile)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/csv',
            },
            body: csvContent,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save file');
        }

        setState({ hasUnsavedChanges: false });
        document.getElementById('saveBtn').disabled = true;

        // Clear modified styling
        document.querySelectorAll('.modified').forEach(cell => {
            cell.classList.remove('modified');
        });

        showStatus('Changes saved successfully', 'success');

    } catch (error) {
        showError(`Failed to save changes: ${error.message}`);
    }
}
