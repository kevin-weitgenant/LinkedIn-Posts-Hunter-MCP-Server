import { state, setState } from './state.js';
import { loadPosts, saveChanges } from './api.js';
import { showStatus, showError, showLoading, addNewRow } from './ui.js';

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * Get URL parameters
 */
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        tab: params.get('tab') || 'table',
        filters: params.get('filters') || '',
        postId: params.get('postId') || ''
    };
}

/**
 * Update URL parameters without reloading
 */
function updateUrlParams(params) {
    const url = new URL(window.location);
    Object.keys(params).forEach(key => {
        if (params[key]) {
            url.searchParams.set(key, params[key]);
        } else {
            url.searchParams.delete(key);
        }
    });
    window.history.pushState({}, '', url);
}

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        setupEventListeners();
        
        // Load initial tab from URL
        const urlParams = getUrlParams();
        if (urlParams.tab === 'screenshots') {
            switchToTab('screenshots');
        } else {
            switchToTab('table');
        }
        
        // Automatically load posts from database
        await loadPosts();
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
        
        // Update URL parameter
        updateUrlParams({ tab: 'table' });
    } else if (tabName === 'screenshots') {
        screenshotsTab.classList.add('active', 'border-blue-500', 'text-blue-600');
        screenshotsTab.classList.remove('border-transparent', 'text-gray-500');
        tableTab.classList.remove('active', 'border-blue-500', 'text-blue-600');
        tableTab.classList.add('border-transparent', 'text-gray-500');
        
        screenshotsContent.classList.add('active');
        tableContent.classList.remove('active');
        
        // Update URL parameter
        updateUrlParams({ tab: 'screenshots' });
        
        // Load screenshots when switching to screenshots tab
        if (window.loadScreenshots) {
            window.loadScreenshots();
        }
    }
}

// Export for use in other modules
export { getUrlParams, updateUrlParams };

