import { state } from './state.js';
import { deleteEntry } from './api.js';

const UNIFIED_CSV_FILENAME = 'linkedin_searches.csv';

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
        
        // Fetch CSV data
        const response = await fetch(`/api/csv/${encodeURIComponent(UNIFIED_CSV_FILENAME)}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                showScreenshotsEmpty();
                return;
            }
            throw new Error('Failed to load data');
        }
        
        const csvText = await response.text();
        if (!csvText.trim()) {
            showScreenshotsEmpty();
            return;
        }
        
        // Parse CSV
        const data = parseCsvForScreenshots(csvText);
        
        // Filter entries that have screenshots
        const entriesWithScreenshots = data.filter(entry => entry.screenshot_path && entry.screenshot_path.trim());
        
        if (entriesWithScreenshots.length === 0) {
            showScreenshotsEmpty();
            return;
        }
        
        // Render screenshot cards
        renderScreenshotCards(entriesWithScreenshots);
        
    } catch (error) {
        showScreenshotsError('Failed to load screenshots: ' + error.message);
    } finally {
        showScreenshotsLoading(false);
    }
}

/**
 * Parse CSV text for screenshot data
 */
function parseCsvForScreenshots(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];
    
    const headers = parseCsvRow(lines[0]);
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const row = parseCsvRow(lines[i]);
            const rowObject = {};
            headers.forEach((header, index) => {
                rowObject[header] = row[index] || '';
            });
            data.push(rowObject);
        }
    }
    
    return data;
}

/**
 * Parse a single CSV row
 */
function parseCsvRow(row) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        
        if (char === '"' && (i === 0 || row[i-1] === ',')) {
            inQuotes = true;
        } else if (char === '"' && inQuotes && (i === row.length - 1 || row[i+1] === ',')) {
            inQuotes = false;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else if (!(char === '"' && (row[i-1] === ',' || i === 0 || row[i+1] === ',' || i === row.length - 1))) {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
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
    
    const visitBtn = document.createElement('button');
    visitBtn.className = 'btn-visit';
    visitBtn.textContent = 'Visit Post';
    visitBtn.onclick = () => window.open(entry.post_link, '_blank');
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => handleRemoveEntry(entry.id, card);
    
    actions.appendChild(visitBtn);
    actions.appendChild(removeBtn);
    
    // Assemble card
    card.appendChild(header);
    card.appendChild(imageContainer);
    card.appendChild(actions);
    
    return card;
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
        await deleteEntry(entryId);
        
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

// Export for use in other modules
window.loadScreenshots = loadScreenshots;

export { loadScreenshots };
