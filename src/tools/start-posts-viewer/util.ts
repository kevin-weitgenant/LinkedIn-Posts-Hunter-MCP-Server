import path from 'path';
import { CONSTANTS } from './constants.js';

/**
 * Format a post filename for display by removing timestamp and cleaning up
 */
export function formatPostDisplayName(filename: string): string {
  return filename
    .replace(CONSTANTS.TIMESTAMP_PREFIX_REGEX, '') // Remove timestamp prefix
    .replace('.csv', '')
    .replace(/_/g, ' ')
    .substring(0, CONSTANTS.DISPLAY_NAME_MAX_LENGTH); // Limit length for display
}

/**
 * Validate that a file path is within the allowed base directory
 */
export function validateFilePath(filePath: string, baseDir: string): boolean {
  const normalizedPath = path.normalize(filePath);
  return normalizedPath.startsWith(baseDir);
}
