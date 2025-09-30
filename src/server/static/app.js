import { state, setState } from './state.js';
import { loadCsv, saveChanges } from './api.js';
import { showStatus, showError, showLoading, addNewRow } from './ui.js';

const UNIFIED_CSV_FILENAME = 'linkedin_searches.csv';

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        setupEventListeners();
        // Automatically load the unified CSV file
        await loadCsv(UNIFIED_CSV_FILENAME);
    } catch (error) {
        showError('Failed to initialize application: ' + error.message);
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Button clicks
    document.getElementById('refreshBtn').addEventListener('click', () => refreshData());
    document.getElementById('addRowBtn').addEventListener('click', addNewRow);
    document.getElementById('saveBtn').addEventListener('click', saveChanges);

    // Error reload button
    const errorButton = document.querySelector('#errorMessage button');
    if (errorButton) {
        errorButton.addEventListener('click', () => location.reload());
    }

    // Handle page refresh/close with unsaved changes
    window.addEventListener('beforeunload', function(e) {
        if (state.hasUnsavedChanges) {
            const message = 'You have unsaved changes. Are you sure you want to leave?';
            e.returnValue = message;
            return message;
        }
    });
}

/**
 * Refresh the unified CSV data
 */
async function refreshData() {
    if (state.hasUnsavedChanges && !confirm('You have unsaved changes. Refreshing will discard them. Continue?')) {
        return;
    }
    
    try {
        setState({ hasUnsavedChanges: false });
        document.getElementById('saveBtn').disabled = true;
        await loadCsv(UNIFIED_CSV_FILENAME);
        showStatus('Data refreshed successfully', 'success');
    } catch (error) {
        showError('Failed to refresh data: ' + error.message);
    }
}
