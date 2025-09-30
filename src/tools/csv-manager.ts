import fs from 'fs';
import path from 'path';
import { getSearchResourcesPath } from '../utils/paths.js';

export interface CsvManagerParams {
  action: 'read' | 'update' | 'delete';
  ids?: number[];
  search_text?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  
  // For updates only
  new_description?: string;
  new_keywords?: string;
}

interface CsvEntry {
  id: number;
  search_keywords: string;
  post_link: string;
  description: string;
  search_date: string;
}

/**
 * Parse CSV line handling quoted fields with commas and newlines
 */
const parseCsvLine = (line: string): string[] => {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  fields.push(current);
  return fields;
};

/**
 * Read and parse CSV file
 */
const readCsvFile = (): CsvEntry[] => {
  const csvPath = path.join(getSearchResourcesPath(), 'linkedin_searches.csv');
  
  if (!fs.existsSync(csvPath)) {
    return [];
  }
  
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length <= 1) {
    return [];
  }
  
  const entries: CsvEntry[] = [];
  
  // Skip header (line 0)
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    
    if (fields.length >= 5) {
      entries.push({
        id: parseInt(fields[0]),
        search_keywords: fields[1],
        post_link: fields[2],
        description: fields[3],
        search_date: fields[4]
      });
    }
  }
  
  return entries;
};

/**
 * Write entries back to CSV
 */
const writeCsvFile = (entries: CsvEntry[]): void => {
  const csvPath = path.join(getSearchResourcesPath(), 'linkedin_searches.csv');
  
  const escapeCsvField = (field: string): string => {
    return `"${field.replace(/"/g, '""')}"`;
  };
  
  const lines = [
    'id,search_keywords,post_link,description,search_date',
    ...entries.map(e => 
      `${e.id},${escapeCsvField(e.search_keywords)},${escapeCsvField(e.post_link)},${escapeCsvField(e.description)},${escapeCsvField(e.search_date)}`
    )
  ];
  
  fs.writeFileSync(csvPath, lines.join('\n') + '\n', 'utf8');
};

/**
 * Filter entries based on parameters
 */
const filterEntries = (entries: CsvEntry[], params: CsvManagerParams): CsvEntry[] => {
  let filtered = entries;
  
  // Filter by IDs
  if (params.ids && params.ids.length > 0) {
    filtered = filtered.filter(e => params.ids!.includes(e.id));
  }
  
  // Filter by search text (searches in keywords and description)
  if (params.search_text) {
    const searchLower = params.search_text.toLowerCase();
    filtered = filtered.filter(e => 
      e.search_keywords.toLowerCase().includes(searchLower) ||
      e.description.toLowerCase().includes(searchLower)
    );
  }
  
  // Filter by date range
  if (params.date_from) {
    const fromDate = new Date(params.date_from);
    filtered = filtered.filter(e => new Date(e.search_date) >= fromDate);
  }
  
  if (params.date_to) {
    const toDate = new Date(params.date_to);
    filtered = filtered.filter(e => new Date(e.search_date) <= toDate);
  }
  
  return filtered;
};

/**
 * Format entry for display
 */
const formatEntry = (entry: CsvEntry, truncateDesc: boolean = true): string => {
  const maxDescLength = 300;
  let desc = entry.description;
  
  if (truncateDesc && desc.length > maxDescLength) {
    desc = desc.substring(0, maxDescLength) + '...';
  }
  
  const date = new Date(entry.search_date).toISOString().split('T')[0];
  
  return `#${entry.id} | Keywords: ${entry.search_keywords}
     Link: ${entry.post_link}
     Desc: ${desc}
     Date: ${date}`;
};

/**
 * Handle read action
 */
const handleRead = (params: CsvManagerParams): string => {
  const allEntries = readCsvFile();
  const filtered = filterEntries(allEntries, params);
  
  const limit = params.limit ?? 10;
  const limited = filtered.slice(0, limit);
  
  if (filtered.length === 0) {
    return `No entries found matching your criteria.\n\nTotal entries in database: ${allEntries.length}`;
  }
  
  let result = `Found ${filtered.length} of ${allEntries.length} total entries`;
  
  if (filtered.length > limit) {
    result += ` (showing first ${limit})`;
  }
  
  result += ':\n\n';
  
  limited.forEach(entry => {
    result += formatEntry(entry) + '\n\n';
  });
  
  if (filtered.length > limit) {
    result += `💡 ${filtered.length - limit} more entries match. Increase 'limit' or add more filters to see them.`;
  } else {
    result += `💡 Use IDs to update/delete specific entries.`;
  }
  
  return result;
};

/**
 * Handle update action
 */
const handleUpdate = (params: CsvManagerParams): string => {
  if (!params.new_description && !params.new_keywords) {
    return 'Error: Must provide new_description or new_keywords for update action.';
  }
  
  const allEntries = readCsvFile();
  const toUpdate = filterEntries(allEntries, params);
  
  if (toUpdate.length === 0) {
    return 'No entries found matching your criteria. No updates made.';
  }
  
  let updateCount = 0;
  
  allEntries.forEach(entry => {
    const shouldUpdate = toUpdate.some(u => u.id === entry.id);
    
    if (shouldUpdate) {
      if (params.new_description) {
        entry.description = params.new_description;
      }
      if (params.new_keywords) {
        entry.search_keywords = params.new_keywords;
      }
      updateCount++;
    }
  });
  
  writeCsvFile(allEntries);
  
  return `✓ Updated ${updateCount} ${updateCount === 1 ? 'entry' : 'entries'} (IDs: ${toUpdate.map(e => e.id).join(', ')})`;
};

/**
 * Handle delete action
 */
const handleDelete = (params: CsvManagerParams): string => {
  const allEntries = readCsvFile();
  const toDelete = filterEntries(allEntries, params);
  
  if (toDelete.length === 0) {
    return 'No entries found matching your criteria. No deletions made.';
  }
  
  const deleteIds = new Set(toDelete.map(e => e.id));
  const remaining = allEntries.filter(e => !deleteIds.has(e.id));
  
  writeCsvFile(remaining);
  
  return `✓ Deleted ${toDelete.length} ${toDelete.length === 1 ? 'entry' : 'entries'} (IDs: ${Array.from(deleteIds).join(', ')})`;
};

/**
 * Main handler for CSV manager tool
 */
export const handleLinkedInManageCsv = async (params: CsvManagerParams) => {
  try {
    let result: string;
    
    switch (params.action) {
      case 'read':
        result = handleRead(params);
        break;
        
      case 'update':
        result = handleUpdate(params);
        break;
        
      case 'delete':
        result = handleDelete(params);
        break;
        
      default:
        result = `Error: Unknown action "${params.action}". Use: read, update, or delete.`;
    }
    
    return {
      content: [{
        type: "text" as const,
        text: result
      }]
    };
    
  } catch (error) {
    return {
      content: [{
        type: "text" as const,
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      }]
    };
  }
};
