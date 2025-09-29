// Global variables
let currentCsvData = [];
let currentCsvFile = '';
let hasUnsavedChanges = false;
let csvFiles = [];

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
        showStatus('Ready to load CSV files', 'info');
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
        if (hasUnsavedChanges && !confirm('You have unsaved changes. Continue anyway?')) {
            this.value = currentCsvFile;
            return;
        }
        hasUnsavedChanges = false;
        saveBtn.disabled = true;
    });

    // Handle page refresh/close with unsaved changes
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges) {
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
        
        // For now, we'll scan the resources directory via a simple approach
        // Since live-server doesn't provide built-in directory listing,
        // we'll try to load a known list or scan common patterns
        
        // This is a simplified approach - in a real implementation,
        // we might have the MCP tool generate an index file
        csvFiles = await scanForCsvFiles();
        
        const select = document.getElementById('csvSelect');
        select.innerHTML = '<option value="">Choose a CSV file...</option>';
        
        csvFiles.forEach(file => {
            const option = document.createElement('option');
            option.value = file.filename;
            option.textContent = file.displayName;
            select.appendChild(option);
        });
        
        showLoading(false);
        
    } catch (error) {
        showError('Failed to load CSV file list: ' + error.message);
        showLoading(false);
    }
}

/**
 * Scan for CSV files (simplified approach)
 */
async function scanForCsvFiles() {
    // Since we can't easily list directory contents from the browser,
    // we'll try a few common patterns or load from a manifest
    const commonPatterns = [
        '20241229_software_engineer.csv',
        '20241229_ai_engineer.csv',
        'linkedin_posts.csv'
    ];
    
    const availableFiles = [];
    
    for (const pattern of commonPatterns) {
        try {
            const response = await fetch(`../../scripts/${pattern}`);
            if (response.ok) {
                availableFiles.push({
                    filename: pattern,
                    displayName: pattern.replace(/^\d{8}_/, '').replace('.csv', '').replace(/_/g, ' ')
                });
            }
        } catch (e) {
            // File doesn't exist, continue
        }
    }
    
    return availableFiles;
}

/**
 * Load and display a CSV file
 */
async function loadCsv() {
    const select = document.getElementById('csvSelect');
    const filename = select.value;
    
    if (!filename) {
        showError('Please select a CSV file first');
        return;
    }
    
    try {
        showLoading(true);
        hideError();
        
        // Try multiple possible locations for the CSV file
        let csvText = '';
        let found = false;
        
        const possiblePaths = [
            `../../scripts/${filename}`,
            `../../resources/searches/${filename}`,
            `../${filename}`,
            filename
        ];
        
        for (const path of possiblePaths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    csvText = await response.text();
                    found = true;
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (!found) {
            throw new Error('CSV file not found in any expected location');
        }
        
        if (!csvText.trim()) {
            throw new Error('CSV file is empty');
        }
        
        currentCsvData = parseCsv(csvText);
        currentCsvFile = filename;
        hasUnsavedChanges = false;
        
        renderCsvTable();
        showCsvInfo();
        showStatus(`Loaded ${currentCsvData.length} rows from ${filename}`, 'success');
        
    } catch (error) {
        showError('Failed to load CSV: ' + error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * Parse CSV text into array of objects
 */
function parseCsv(csvText) {
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
 * Parse a single CSV row handling quotes and commas
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
 * Render the CSV data as an editable table
 */
function renderCsvTable() {
    if (currentCsvData.length === 0) {
        showEmptyState();
        return;
    }
    
    const table = document.getElementById('csvTable');
    const headers = Object.keys(currentCsvData[0]);
    
    // Render headers
    const thead = table.querySelector('thead');
    thead.innerHTML = '';
    const headerRow = document.createElement('tr');
    
    headers.forEach(header => {
        const th = document.createElement('th');
        th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
        th.textContent = header.replace(/_/g, ' ');
        headerRow.appendChild(th);
    });
    
    // Add action column
    const actionTh = document.createElement('th');
    actionTh.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
    actionTh.textContent = 'Actions';
    headerRow.appendChild(actionTh);
    
    thead.appendChild(headerRow);
    
    // Render body
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    currentCsvData.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';
        
        headers.forEach((header, colIndex) => {
            const td = document.createElement('td');
            td.className = 'px-6 py-4 text-sm text-gray-900 editable-cell';
            td.textContent = row[header] || '';
            td.onclick = () => makeEditable(td, rowIndex, header);
            tr.appendChild(td);
        });
        
        // Add action cell
        const actionTd = document.createElement('td');
        actionTd.className = 'px-6 py-4 text-sm text-gray-900';
        actionTd.innerHTML = `
            <button onclick="deleteRow(${rowIndex})" 
                    class="text-red-600 hover:text-red-900 text-xs font-medium">
                Delete
            </button>
        `;
        tr.appendChild(actionTd);
        
        tbody.appendChild(tr);
    });
    
    showCsvTable();
}

/**
 * Make a table cell editable
 */
function makeEditable(cell, rowIndex, columnKey) {
    if (cell.querySelector('input')) return; // Already editing
    
    const currentValue = cell.textContent;
    const input = document.createElement('input');
    input.className = 'cell-editor';
    input.value = currentValue;
    
    input.onblur = () => finishEditing(cell, input, rowIndex, columnKey, currentValue);
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            cell.textContent = currentValue;
            cell.classList.remove('modified');
        }
    };
    
    cell.innerHTML = '';
    cell.appendChild(input);
    input.focus();
    input.select();
}

/**
 * Finish editing a cell
 */
function finishEditing(cell, input, rowIndex, columnKey, originalValue) {
    const newValue = input.value;
    cell.textContent = newValue;
    
    if (newValue !== originalValue) {
        currentCsvData[rowIndex][columnKey] = newValue;
        cell.classList.add('modified');
        markAsModified();
    }
}

/**
 * Add a new empty row
 */
function addNewRow() {
    if (currentCsvData.length === 0) return;
    
    const headers = Object.keys(currentCsvData[0]);
    const newRow = {};
    headers.forEach(header => {
        newRow[header] = '';
    });
    
    currentCsvData.push(newRow);
    renderCsvTable();
    markAsModified();
    
    // Scroll to the new row
    const table = document.getElementById('csvTable');
    const tbody = table.querySelector('tbody');
    const lastRow = tbody.lastElementChild;
    lastRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Delete a row
 */
function deleteRow(rowIndex) {
    if (confirm('Are you sure you want to delete this row?')) {
        currentCsvData.splice(rowIndex, 1);
        renderCsvTable();
        markAsModified();
    }
}

/**
 * Mark data as modified
 */
function markAsModified() {
    hasUnsavedChanges = true;
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = false;
    showStatus('You have unsaved changes', 'warning');
}

/**
 * Save changes back to CSV file
 */
async function saveChanges() {
    try {
        showStatus('Saving changes...', 'info');
        
        const csvContent = convertToCsv(currentCsvData);
        
        // For this demo, we'll show a message since we can't easily write files from browser
        // In a real implementation, this would POST to an API endpoint
        
        alert('Save functionality would be implemented here.\n\nGenerated CSV content:\n\n' + 
              csvContent.substring(0, 200) + '...\n\n' +
              'In the full implementation, this would save to the file system.');
        
        hasUnsavedChanges = false;
        document.getElementById('saveBtn').disabled = true;
        
        // Clear modified styling
        document.querySelectorAll('.modified').forEach(cell => {
            cell.classList.remove('modified');
        });
        
        showStatus('Changes saved successfully', 'success');
        
    } catch (error) {
        showError('Failed to save changes: ' + error.message);
    }
}

/**
 * Convert data array back to CSV format
 */
function convertToCsv(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
        const csvRow = headers.map(header => {
            const value = row[header] || '';
            return value.includes(',') || value.includes('"') || value.includes('\n') 
                ? `"${value.replace(/"/g, '""')}"` 
                : value;
        });
        csvRows.push(csvRow.join(','));
    });
    
    return csvRows.join('\n');
}

/**
 * Show CSV info
 */
function showCsvInfo() {
    const info = document.getElementById('csvInfo');
    const rowCount = document.getElementById('rowCount');
    const lastModified = document.getElementById('lastModified');
    
    rowCount.textContent = currentCsvData.length;
    lastModified.textContent = 'Last loaded: ' + new Date().toLocaleTimeString();
    
    info.classList.remove('hidden');
}

/**
 * UI State Management
 */
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.remove('hidden');
        hideError();
        hideCsvTable();
        hideEmptyState();
    } else {
        spinner.classList.add('hidden');
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    errorText.textContent = message;
    errorDiv.classList.remove('hidden');
    hideCsvTable();
    hideEmptyState();
}

function hideError() {
    document.getElementById('errorMessage').classList.add('hidden');
}

function showCsvTable() {
    document.getElementById('csvTableContainer').classList.remove('hidden');
    hideEmptyState();
    hideError();
}

function hideCsvTable() {
    document.getElementById('csvTableContainer').classList.add('hidden');
}

function showEmptyState() {
    document.getElementById('emptyState').classList.remove('hidden');
    hideCsvTable();
    hideError();
}

function hideEmptyState() {
    document.getElementById('emptyState').classList.add('hidden');
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('saveStatus');
    statusDiv.textContent = message;
    statusDiv.className = `text-sm ${
        type === 'success' ? 'text-green-600' :
        type === 'warning' ? 'text-yellow-600' :
        type === 'error' ? 'text-red-600' :
        'text-gray-600'
    }`;
}
