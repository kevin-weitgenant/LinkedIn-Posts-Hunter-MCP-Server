import { state, setState } from './state.js';

/**
 * Render the CSV data as an editable table
 */
export function renderCsvTable() {
    if (state.currentData.length === 0) {
        showEmptyState();
        return;
    }
    
    const table = document.getElementById('csvTable');
    const headers = Object.keys(state.currentData[0]);
    
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
    
    state.currentData.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';
        
        headers.forEach((header) => {
            const td = document.createElement('td');
            td.className = 'px-6 py-4 text-sm text-gray-900 editable-cell';
            td.textContent = row[header] || '';
            td.addEventListener('click', () => makeEditable(td, rowIndex, header));
            tr.appendChild(td);
        });
        
        // Add action cell
        const actionTd = document.createElement('td');
        actionTd.className = 'px-6 py-4 text-sm text-gray-900';
        const deleteButton = document.createElement('button');
        deleteButton.className = 'text-red-600 hover:text-red-900 text-xs font-medium';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteRow(rowIndex));
        actionTd.appendChild(deleteButton);
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
        state.currentData[rowIndex][columnKey] = newValue;
        cell.classList.add('modified');
        markAsModified();
    }
}

/**
 * Add a new empty row
 */
export function addNewRow() {
    if (state.currentData.length === 0) return;
    
    const headers = Object.keys(state.currentData[0]);
    const newRow = {};
    headers.forEach(header => {
        newRow[header] = '';
    });
    
    state.currentData.push(newRow);
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
async function deleteRow(rowIndex) {
    if (!confirm('Are you sure you want to delete this row?')) {
        return;
    }
    
    try {
        const post = state.currentData[rowIndex];
        const postId = post.id;
        
        // Import deletePost dynamically to avoid circular dependency
        const { deletePost } = await import('./api.js');
        await deletePost(postId);
        
        // Data will be reloaded by deletePost function
    } catch (error) {
        showError('Failed to delete post: ' + error.message);
    }
}

/**
 * Mark data as modified
 */
function markAsModified() {
    setState({ hasUnsavedChanges: true });
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = false;
    showStatus('You have unsaved changes', 'warning');
}

/**
 * Show CSV info
 */
export function showCsvInfo() {
    const rowCount = document.getElementById('rowCount');
    const lastModified = document.getElementById('lastModified');
    
    rowCount.textContent = state.currentData.length;
    lastModified.textContent = 'Last loaded: ' + new Date().toLocaleTimeString();
}

/**
 * UI State Management
 */
export function showLoading(show) {
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

export function showError(message) {
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

export function showStatus(message, type) {
    const statusDiv = document.getElementById('saveStatus');
    statusDiv.textContent = message;
    statusDiv.className = `text-sm ${
        type === 'success' ? 'text-green-600' :
        type === 'warning' ? 'text-yellow-600' :
        type === 'error' ? 'text-red-600' :
        'text-gray-600'
    }`;
}
