import { state, setState } from './state.js';
import { scanForCsvFiles, loadCsv, saveChanges } from './api.js';
import { showStatus, showError, showLoading, addNewRow } from './ui.js';

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        await refreshCsvList();
        setupEventListeners();

        // Check for file in URL
        const urlParams = new URLSearchParams(window.location.search);
        const fileToLoad = urlParams.get('file');
        if (fileToLoad) {
            loadCsv(fileToLoad);
        } else {
            showStatus('Ready to load CSV files', 'info');
        }
    } catch (error) {
        showError('Failed to initialize application: ' + error.message);
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // CSV selection change
    document.getElementById('csvSelect').addEventListener('change', function() {
        const saveBtn = document.getElementById('saveBtn');
        if (state.hasUnsavedChanges && !confirm('You have unsaved changes. Continue anyway?')) {
            this.value = state.currentCsvFile;
            return;
        }
        setState({ hasUnsavedChanges: false });
        saveBtn.disabled = true;
    });

    // Button clicks
    document.getElementById('loadBtn').addEventListener('click', () => loadCsv());
    document.getElementById('refreshBtn').addEventListener('click', refreshCsvList);
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
 * Refresh the list of available CSV files
 */
async function refreshCsvList() {
    try {
        showLoading(true);
        
        const files = await scanForCsvFiles();
        setState({ csvFiles: files });
        
        const select = document.getElementById('csvSelect');
        select.innerHTML = '<option value="">Choose a CSV file...</option>';
        
        state.csvFiles.forEach(file => {
            const option = document.createElement('option');
            option.value = file.filename;
            option.textContent = file.displayName;
            select.appendChild(option);
        });
        
    } catch (error) {
        showError('Failed to load CSV file list: ' + error.message);
    } finally {
        showLoading(false);
    }
}
