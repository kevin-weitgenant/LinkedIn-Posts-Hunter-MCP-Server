import { 
  getFilterState, 
  updateFilterState, 
  resetFilterState, 
  type FilterState 
} from '../utils/filter-state.js';

/**
 * MCP tool parameters for setting filters
 */
interface SetFiltersParams {
  keyword?: string;
  applied_status?: 'all' | 'applied' | 'not-applied';
  start_date?: string; // ISO date string (YYYY-MM-DD)
  end_date?: string;   // ISO date string (YYYY-MM-DD)
  ids?: string;        // Comma-separated IDs (e.g., "1,5,10")
  reset?: boolean;     // Clear all filters
}

/**
 * Handle MCP tool call for managing filter state
 */
export async function handleLinkedInSetFilters(params: SetFiltersParams): Promise<{
  content: Array<{ type: string; text: string }>;
}> {
  try {
    // If reset is requested, clear all filters
    if (params.reset) {
      const defaultState = resetFilterState();
      return {
        content: [{
          type: "text",
          text: `✅ All filters have been reset to defaults.\n\nCurrent filter state:\n${formatFilterState(defaultState)}`
        }]
      };
    }
    
    // Build update object
    const updates: Partial<FilterState> = {};
    
    if (params.keyword !== undefined) {
      updates.keywordFilter = params.keyword;
    }
    
    if (params.applied_status !== undefined) {
      updates.appliedFilter = params.applied_status;
    }
    
    if (params.start_date !== undefined) {
      // Validate date format
      if (params.start_date && !isValidDate(params.start_date)) {
        throw new Error(`Invalid start_date format: ${params.start_date}. Use YYYY-MM-DD format.`);
      }
      updates.startDate = params.start_date || null;
    }
    
    if (params.end_date !== undefined) {
      // Validate date format
      if (params.end_date && !isValidDate(params.end_date)) {
        throw new Error(`Invalid end_date format: ${params.end_date}. Use YYYY-MM-DD format.`);
      }
      updates.endDate = params.end_date || null;
    }
    
    if (params.ids !== undefined) {
      updates.idFilter = params.ids;
    }
    
    // Check if any updates were provided
    if (Object.keys(updates).length === 0) {
      const currentState = getFilterState();
      return {
        content: [{
          type: "text",
          text: `ℹ️ No filter updates provided.\n\nCurrent filter state:\n${formatFilterState(currentState)}`
        }]
      };
    }
    
    // Apply updates
    const newState = updateFilterState(updates);
    
    // Build response message
    const changedFilters: string[] = [];
    if (updates.keywordFilter !== undefined) {
      changedFilters.push(`- Keyword: "${updates.keywordFilter || 'All Keywords'}"`);
    }
    if (updates.appliedFilter !== undefined) {
      changedFilters.push(`- Applied Status: ${formatAppliedFilter(updates.appliedFilter)}`);
    }
    if (updates.startDate !== undefined) {
      changedFilters.push(`- Start Date: ${updates.startDate || 'None'}`);
    }
    if (updates.endDate !== undefined) {
      changedFilters.push(`- End Date: ${updates.endDate || 'None'}`);
    }
    if (updates.idFilter !== undefined) {
      changedFilters.push(`- ID Filter: ${updates.idFilter || 'None'}`);
    }
    
    return {
      content: [{
        type: "text",
        text: `✅ Filter state updated successfully!\n\nChanged filters:\n${changedFilters.join('\n')}\n\n📊 Current filter state:\n${formatFilterState(newState)}\n\nThe React viewer will automatically update within 1-2 seconds.`
      }]
    };
    
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `❌ Failed to update filter state: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    };
  }
}

/**
 * Format filter state for display
 */
function formatFilterState(state: FilterState): string {
  return [
    `  • Keyword: "${state.keywordFilter || 'All Keywords'}"`,
    `  • Applied Status: ${formatAppliedFilter(state.appliedFilter)}`,
    `  • Date Range: ${state.startDate || 'Any'} to ${state.endDate || 'Any'}`,
    `  • ID Filter: ${state.idFilter || 'None'}`
  ].join('\n');
}

/**
 * Format applied filter for display
 */
function formatAppliedFilter(filter: 'all' | 'applied' | 'not-applied'): string {
  switch (filter) {
    case 'all':
      return 'All';
    case 'applied':
      return 'Applied Only';
    case 'not-applied':
      return 'Not Applied Only';
  }
}

/**
 * Validate ISO date format (YYYY-MM-DD)
 */
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}


