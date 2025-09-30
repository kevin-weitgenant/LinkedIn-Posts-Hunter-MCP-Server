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
    // Tab switching
    document.getElementById('tableViewTab').addEventListener('click', () => switchToTab('table'));
    document.getElementById('screenshotsTab').addEventListener('click', () => switchToTab('screenshots'));

    // Button clicks
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
 * Switch between tabs
 */
function switchToTab(tabName) {
    // Update tab buttons
    const tableTab = document.getElementById('tableViewTab');
    const screenshotsTab = document.getElementById('screenshotsTab');
    
    // Update tab content
    const tableContent = document.getElementById('tableViewContent');
    const screenshotsContent = document.getElementById('screenshotsViewContent');
    
    if (tabName === 'table') {
        tableTab.classList.add('active', 'border-blue-500', 'text-blue-600');
        tableTab.classList.remove('border-transparent', 'text-gray-500');
        screenshotsTab.classList.remove('active', 'border-blue-500', 'text-blue-600');
        screenshotsTab.classList.add('border-transparent', 'text-gray-500');
        
        tableContent.classList.add('active');
        screenshotsContent.classList.remove('active');
    } else if (tabName === 'screenshots') {
        screenshotsTab.classList.add('active', 'border-blue-500', 'text-blue-600');
        screenshotsTab.classList.remove('border-transparent', 'text-gray-500');
        tableTab.classList.remove('active', 'border-blue-500', 'text-blue-600');
        tableTab.classList.add('border-transparent', 'text-gray-500');
        
        screenshotsContent.classList.add('active');
        tableContent.classList.remove('active');
        
        // Load screenshots when switching to screenshots tab
        if (window.loadScreenshots) {
            window.loadScreenshots();
        }
    }
}

