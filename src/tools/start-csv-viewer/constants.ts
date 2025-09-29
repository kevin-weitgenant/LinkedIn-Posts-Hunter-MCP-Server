// Configuration constants for the CSV viewer server
export const CONSTANTS = {
  DEFAULT_PORT: 4327,
  IGNORED_PATTERNS: 'node_modules,.git',
  LOG_LEVEL: 1,
  DISPLAY_NAME_MAX_LENGTH: 100,
  TIMESTAMP_PREFIX_REGEX: /^\d{14}_/,
} as const;
