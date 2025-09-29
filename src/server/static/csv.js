/**
 * Parse CSV text into array of objects
 */
export function parseCsv(csvText) {
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
 * Convert data array back to CSV format
 */
export function convertToCsv(data) {
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
