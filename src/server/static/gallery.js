import { state } from './state.js';
import { deletePost } from './api.js';
import { getUrlParams, updateUrlParams } from './app.js';

// Current filter state
let filterState = {
    keywords: '',
    applied: 'all', // 'all', 'applied', 'notApplied'
    dateFrom: '',
    dateTo: ''
};

/**
 * Load and display screenshots
 */
async function loadScreenshots() {
    const container = document.getElementById('screenshotsContainer');
    const loadingSpinner = document.getElementById('screenshotsLoadingSpinner');
    const emptyState = document.getElementById('screenshotsEmptyState');
    const errorMessage = document.getElementById('screenshotsErrorMessage');
    
    try {
        // Show loading state
        showScreenshotsLoading(true);
        hideScreenshotsError();
        hideScreenshotsEmpty();
        
        // Initialize filters from URL on first load
        initializeFiltersFromUrl();
        
        // Fetch posts data from API
        const response = await fetch('/api/posts');
        
        if (!response.ok) {
            if (response.status === 404) {
                showScreenshotsEmpty();
                return;
            }
            throw new Error('Failed to load data');
        }
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
            showScreenshotsEmpty();
            return;
        }
        
        // Filter entries that have screenshots
        let entriesWithScreenshots = data.filter(entry => entry.screenshot_path && entry.screenshot_path.trim());
        
        if (entriesWithScreenshots.length === 0) {
            showScreenshotsEmpty();
            return;
        }
        
        // Populate keywords dropdown with unique values
        populateKeywordsDropdown(entriesWithScreenshots);
        
        // Apply filters
        entriesWithScreenshots = applyFilters(entriesWithScreenshots);
        
        if (entriesWithScreenshots.length === 0) {
            showNoResultsMessage();
            return;
        }
        
        // Render screenshot cards
        renderScreenshotCards(entriesWithScreenshots);
        
        // Update filter count
        updateFilterCount(entriesWithScreenshots.length);
        
    } catch (error) {
        showScreenshotsError('Failed to load screenshots: ' + error.message);
    } finally {
        showScreenshotsLoading(false);
    }
}


/**
 * Render screenshot cards in the container
 */
function renderScreenshotCards(entries) {
    const container = document.getElementById('screenshotsContainer');
    container.innerHTML = '';
    
    entries.forEach(entry => {
        const card = createScreenshotCard(entry);
        container.appendChild(card);
    });
}

/**
 * Create a single screenshot card element
 */
function createScreenshotCard(entry) {
    const card = document.createElement('div');
    card.className = 'screenshot-card';
    card.dataset.entryId = entry.id;
    if (entry.applied === 1) {
        card.classList.add('applied');
    }
    
    // Header with metadata
    const header = document.createElement('div');
    header.className = 'screenshot-header';
    
    const metadata = document.createElement('div');
    metadata.className = 'screenshot-metadata';
    
    const idElement = document.createElement('div');
    idElement.className = 'screenshot-id';
    idElement.textContent = `Post #${entry.id}`;
    
    const keywordsElement = document.createElement('div');
    keywordsElement.className = 'screenshot-keywords';
    keywordsElement.textContent = `Keywords: "${entry.search_keywords || 'N/A'}"`;
    
    const dateElement = document.createElement('div');
    dateElement.className = 'screenshot-date';
    dateElement.textContent = formatDate(entry.search_date);
    
    metadata.appendChild(idElement);
    metadata.appendChild(keywordsElement);
    metadata.appendChild(dateElement);
    header.appendChild(metadata);
    
    // Screenshot image container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'screenshot-image-container';
    
    if (entry.screenshot_path && entry.screenshot_path.trim()) {
        const img = document.createElement('img');
        img.className = 'screenshot-image loading';
        
        // Extract filename from path (e.g., "screenshots/filename.png" -> "filename.png")
        const filename = entry.screenshot_path.split('/').pop();
        img.src = `/api/screenshots/${encodeURIComponent(filename)}`;
        img.alt = `Screenshot for post #${entry.id}`;
        
        img.onload = () => {
            img.classList.remove('loading');
        };
        
        img.onerror = () => {
            img.classList.remove('loading');
            imageContainer.innerHTML = '<div class="screenshot-placeholder">Screenshot not available</div>';
        };
        
        imageContainer.appendChild(img);
    } else {
        imageContainer.innerHTML = '<div class="screenshot-placeholder">No screenshot available</div>';
    }
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'screenshot-actions';
    
    // Add applied toggle to actions
    const appliedToggle = createAppliedToggle(entry.id, entry.applied === 1, card);
    
    const visitBtn = document.createElement('button');
    visitBtn.className = 'btn-visit';
    visitBtn.textContent = 'Visit Post';
    visitBtn.onclick = () => window.open(entry.post_link, '_blank');
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => handleRemoveEntry(entry.id, card);
    
    actions.appendChild(appliedToggle);
    actions.appendChild(visitBtn);
    actions.appendChild(removeBtn);
    
    // Assemble card
    card.appendChild(header);
    card.appendChild(imageContainer);
    card.appendChild(actions);
    
    return card;
}

/**
 * Create an applied status toggle button for screenshot card
 */
function createAppliedToggle(postId, isApplied, cardElement) {
    const button = document.createElement('button');
    button.className = `applied-toggle ${isApplied ? 'active' : 'inactive'}`;
    button.setAttribute('data-post-id', postId);
    button.title = isApplied ? 'Mark as not applied' : 'Mark as applied';

    const icon = document.createElement('span');
    icon.className = 'toggle-icon';
    icon.textContent = isApplied ? '✓' : '○';
    button.appendChild(icon);

    const text = document.createElement('span');
    text.className = 'toggle-text';
    text.textContent = isApplied ? ' Applied' : ' Not Applied';
    button.appendChild(text);

    button.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleAppliedToggle(postId, !isApplied, button, cardElement);
    });

    return button;
}

/**
 * Handle applied toggle action on screenshot card
 */
async function handleAppliedToggle(postId, newStatus, button, cardElement) {
    button.classList.add('loading');
    button.disabled = true;

    try {
        const { toggleAppliedStatus } = await import('./api.js');
        const applied = await toggleAppliedStatus(postId, newStatus);

        // Update button visuals
        button.classList.remove('loading', 'active', 'inactive');
        button.classList.add(applied ? 'active' : 'inactive');
        button.title = applied ? 'Mark as not applied' : 'Mark as applied';
        const icon = button.querySelector('.toggle-icon');
        const text = button.querySelector('.toggle-text');
        icon.textContent = applied ? '✓' : '○';
        text.textContent = applied ? ' Applied' : ' Not Applied';

        // Update card highlight
        if (applied) {
            cardElement.classList.add('applied');
        } else {
            cardElement.classList.remove('applied');
        }
    } catch (error) {
        alert('Failed to update applied status: ' + error.message);
    } finally {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

/**
 * Handle removing an entry
 */
async function handleRemoveEntry(entryId, cardElement) {
    if (!confirm('Are you sure you want to remove this post? This action cannot be undone.')) {
        return;
    }
    
    try {
        // Disable buttons
        const buttons = cardElement.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = true);
        
        // Delete entry via API
        await deletePost(entryId);
        
        // Remove card from DOM with animation
        cardElement.style.opacity = '0';
        cardElement.style.transform = 'scale(0.95)';
        cardElement.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            cardElement.remove();
            
            // Check if there are any cards left
            const container = document.getElementById('screenshotsContainer');
            if (container.children.length === 0) {
                showScreenshotsEmpty();
            }
        }, 300);
        
    } catch (error) {
        alert('Failed to remove entry: ' + error.message);
        // Re-enable buttons
        const buttons = cardElement.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = false);
    }
}

/**
 * Format date string
 */
function formatDate(dateString) {
    if (!dateString) return 'Date unknown';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

/**
 * UI state management
 */
function showScreenshotsLoading(show) {
    const spinner = document.getElementById('screenshotsLoadingSpinner');
    const container = document.getElementById('screenshotsContainer');
    
    if (show) {
        spinner.classList.remove('hidden');
        container.innerHTML = '';
    } else {
        spinner.classList.add('hidden');
    }
}

function showScreenshotsError(message) {
    const errorDiv = document.getElementById('screenshotsErrorMessage');
    const errorText = document.getElementById('screenshotsErrorText');
    errorText.textContent = message;
    errorDiv.classList.remove('hidden');
    
    hideScreenshotsEmpty();
    document.getElementById('screenshotsContainer').innerHTML = '';
}

function hideScreenshotsError() {
    document.getElementById('screenshotsErrorMessage').classList.add('hidden');
}

function showScreenshotsEmpty() {
    document.getElementById('screenshotsEmptyState').classList.remove('hidden');
    document.getElementById('screenshotsContainer').innerHTML = '';
    hideScreenshotsError();
}

function hideScreenshotsEmpty() {
    document.getElementById('screenshotsEmptyState').classList.add('hidden');
}

/**
 * Populate keywords dropdown with unique values from entries
 */
function populateKeywordsDropdown(entries) {
    const keywordsSelect = document.getElementById('filterKeywords');
    if (!keywordsSelect) return;
    
    // Extract unique keywords
    const keywordsSet = new Set();
    entries.forEach(entry => {
        if (entry.search_keywords && entry.search_keywords.trim()) {
            keywordsSet.add(entry.search_keywords.trim());
        }
    });
    
    // Sort keywords alphabetically
    const uniqueKeywords = Array.from(keywordsSet).sort((a, b) => 
        a.toLowerCase().localeCompare(b.toLowerCase())
    );
    
    // Keep the "All Keywords" option and current selection
    const currentValue = keywordsSelect.value;
    keywordsSelect.innerHTML = '<option value="">All Keywords</option>';
    
    // Add unique keywords as options
    uniqueKeywords.forEach(keyword => {
        const option = document.createElement('option');
        option.value = keyword;
        option.textContent = keyword;
        keywordsSelect.appendChild(option);
    });
    
    // Restore selection if it still exists
    if (currentValue && uniqueKeywords.includes(currentValue)) {
        keywordsSelect.value = currentValue;
    } else if (currentValue) {
        // If the stored filter value doesn't exist in options, keep it in filterState
        // but reset the dropdown to "All Keywords"
        keywordsSelect.value = '';
    }
}

/**
 * Initialize filters from URL parameters
 */
function initializeFiltersFromUrl() {
    const urlParams = getUrlParams();
    if (urlParams.filters) {
        const filterPairs = urlParams.filters.split(',');
        filterPairs.forEach(pair => {
            const [key, value] = pair.split(':');
            if (key && value) {
                filterState[key] = decodeURIComponent(value);
            }
        });
    }
    
    // Update filter UI inputs
    updateFilterInputs();
}

/**
 * Update filter inputs with current state
 */
function updateFilterInputs() {
    const keywordsInput = document.getElementById('filterKeywords');
    const appliedSelect = document.getElementById('filterApplied');
    const dateFromInput = document.getElementById('filterDateFrom');
    const dateToInput = document.getElementById('filterDateTo');
    
    if (keywordsInput) keywordsInput.value = filterState.keywords;
    if (appliedSelect) appliedSelect.value = filterState.applied;
    if (dateFromInput) dateFromInput.value = filterState.dateFrom;
    if (dateToInput) dateToInput.value = filterState.dateTo;
}

/**
 * Apply filters to entries
 */
function applyFilters(entries) {
    return entries.filter(entry => {
        // Filter by keywords (exact match)
        if (filterState.keywords) {
            const searchKeywords = (entry.search_keywords || '').trim();
            if (searchKeywords !== filterState.keywords) {
                return false;
            }
        }
        
        // Filter by applied status
        if (filterState.applied === 'applied' && entry.applied !== 1) {
            return false;
        }
        if (filterState.applied === 'notApplied' && entry.applied === 1) {
            return false;
        }
        
        // Filter by date from
        if (filterState.dateFrom) {
            const entryDate = new Date(entry.search_date);
            const filterDate = new Date(filterState.dateFrom);
            if (entryDate < filterDate) {
                return false;
            }
        }
        
        // Filter by date to
        if (filterState.dateTo) {
            const entryDate = new Date(entry.search_date);
            const filterDate = new Date(filterState.dateTo);
            // Set time to end of day for 'to' date
            filterDate.setHours(23, 59, 59, 999);
            if (entryDate > filterDate) {
                return false;
            }
        }
        
        return true;
    });
}

/**
 * Handle filter change
 */
function handleFilterChange() {
    // Update filter state from inputs
    const keywordsInput = document.getElementById('filterKeywords');
    const appliedSelect = document.getElementById('filterApplied');
    const dateFromInput = document.getElementById('filterDateFrom');
    const dateToInput = document.getElementById('filterDateTo');
    
    filterState.keywords = keywordsInput?.value || '';
    filterState.applied = appliedSelect?.value || 'all';
    filterState.dateFrom = dateFromInput?.value || '';
    filterState.dateTo = dateToInput?.value || '';
    
    // Update URL parameters
    updateFiltersInUrl();
    
    // Reload screenshots with filters
    loadScreenshots();
}

/**
 * Clear all filters
 */
function clearFilters() {
    filterState = {
        keywords: '',
        applied: 'all',
        dateFrom: '',
        dateTo: ''
    };
    
    updateFilterInputs();
    updateFiltersInUrl();
    loadScreenshots();
}

/**
 * Update filters in URL
 */
function updateFiltersInUrl() {
    const filterParts = [];
    
    if (filterState.keywords) {
        filterParts.push(`keywords:${encodeURIComponent(filterState.keywords)}`);
    }
    if (filterState.applied !== 'all') {
        filterParts.push(`applied:${filterState.applied}`);
    }
    if (filterState.dateFrom) {
        filterParts.push(`dateFrom:${filterState.dateFrom}`);
    }
    if (filterState.dateTo) {
        filterParts.push(`dateTo:${filterState.dateTo}`);
    }
    
    const urlParams = getUrlParams();
    updateUrlParams({
        tab: urlParams.tab,
        filters: filterParts.length > 0 ? filterParts.join(',') : ''
    });
}

/**
 * Update filter count display
 */
function updateFilterCount(count) {
    const filterCount = document.getElementById('filterCount');
    if (filterCount) {
        filterCount.textContent = `Showing ${count} post${count !== 1 ? 's' : ''}`;
    }
}

/**
 * Show no results message
 */
function showNoResultsMessage() {
    const container = document.getElementById('screenshotsContainer');
    container.innerHTML = `
        <div class="p-12 text-center text-gray-500">
            <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
            <p>Try adjusting your filters to see more posts.</p>
            <button onclick="window.clearScreenshotFilters()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Clear Filters
            </button>
        </div>
    `;
}

/**
 * Setup filter event listeners
 */
function setupFilterListeners() {
    const keywordsSelect = document.getElementById('filterKeywords');
    const appliedSelect = document.getElementById('filterApplied');
    const dateFromInput = document.getElementById('filterDateFrom');
    const dateToInput = document.getElementById('filterDateTo');
    const clearBtn = document.getElementById('clearFiltersBtn');
    
    if (keywordsSelect) keywordsSelect.addEventListener('change', handleFilterChange);
    if (appliedSelect) appliedSelect.addEventListener('change', handleFilterChange);
    if (dateFromInput) dateFromInput.addEventListener('change', handleFilterChange);
    if (dateToInput) dateToInput.addEventListener('change', handleFilterChange);
    if (clearBtn) clearBtn.addEventListener('click', clearFilters);
}

// Setup filter listeners when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFilterListeners);
} else {
    setupFilterListeners();
}

// Export for use in other modules
window.loadScreenshots = loadScreenshots;
window.clearScreenshotFilters = clearFilters;

export { loadScreenshots };
