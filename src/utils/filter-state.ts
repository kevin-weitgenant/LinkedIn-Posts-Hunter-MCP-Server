import fs from 'fs';
import path from 'path';
import { getDataDirectory } from './paths.js';

/**
 * Filter state interface matching React App filter state
 */
export interface FilterState {
  keywordFilter: string;
  appliedFilter: 'all' | 'applied' | 'not-applied';
  startDate: string | null; // ISO date string
  endDate: string | null;   // ISO date string
  idFilter: string;
}

/**
 * Default filter state (all filters cleared)
 */
const DEFAULT_FILTER_STATE: FilterState = {
  keywordFilter: '',
  appliedFilter: 'all',
  startDate: null,
  endDate: null,
  idFilter: ''
};

/**
 * Get the path to the filter state JSON file
 */
function getFilterStatePath(): string {
  const dataDir = getDataDirectory();
  return path.join(dataDir, 'filter-state.json');
}

/**
 * Read the current filter state from disk
 * Returns default state if file doesn't exist or is invalid
 */
export function getFilterState(): FilterState {
  const filePath = getFilterStatePath();
  
  try {
    if (!fs.existsSync(filePath)) {
      return { ...DEFAULT_FILTER_STATE };
    }
    
    const data = fs.readFileSync(filePath, 'utf-8');
    const state = JSON.parse(data) as Partial<FilterState>;
    
    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_FILTER_STATE,
      ...state
    };
  } catch (error) {
    console.error('Failed to read filter state, using defaults:', error);
    return { ...DEFAULT_FILTER_STATE };
  }
}

/**
 * Update filter state (partial or full update)
 * Merges with existing state
 */
export function updateFilterState(updates: Partial<FilterState>): FilterState {
  const currentState = getFilterState();
  const newState: FilterState = {
    ...currentState,
    ...updates
  };
  
  // Validate appliedFilter enum
  if (updates.appliedFilter && !['all', 'applied', 'not-applied'].includes(updates.appliedFilter)) {
    throw new Error(`Invalid appliedFilter value: ${updates.appliedFilter}`);
  }
  
  // Write to disk
  const filePath = getFilterStatePath();
  const dataDir = path.dirname(filePath);
  
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, JSON.stringify(newState, null, 2), 'utf-8');
  
  return newState;
}

/**
 * Reset filter state to defaults
 */
export function resetFilterState(): FilterState {
  const filePath = getFilterStatePath();
  const newState = { ...DEFAULT_FILTER_STATE };
  
  const dataDir = path.dirname(filePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, JSON.stringify(newState, null, 2), 'utf-8');
  
  return newState;
}

/**
 * Delete filter state file (resets to defaults on next read)
 */
export function deleteFilterState(): void {
  const filePath = getFilterStatePath();
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}


