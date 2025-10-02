import fs from 'fs';
import { getSystemAuthPath, ensureAuthDirectory, getTempAuthPath } from '../utils/paths.js';

export interface AuthData {
  cookies: any[];
  origins: any[];
  localStorage: any[];
  timestamp: number;
  lastValidated?: number;
}

/**
 * Save authentication data to system storage
 */
export const saveAuthData = async (storageState: any): Promise<void> => {
  ensureAuthDirectory();
  
  const authData: AuthData = {
    ...storageState,
    timestamp: Date.now(),
    lastValidated: Date.now()
  };
  
  const authPath = getSystemAuthPath();
  const tempPath = getTempAuthPath();
  
  // Write to temp file first, then rename for atomic operation
  try {
    fs.writeFileSync(tempPath, JSON.stringify(authData, null, 2));
    fs.renameSync(tempPath, authPath);
  } catch (error) {
    // Clean up temp file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }
};

/**
 * Load authentication data from system storage
 */
export const loadAuthData = async (): Promise<AuthData | null> => {
  const authPath = getSystemAuthPath();
  
  if (!fs.existsSync(authPath)) {
    return null;
  }
  
  try {
    const data = fs.readFileSync(authPath, 'utf8');
    return JSON.parse(data) as AuthData;
  } catch (error) {
    return null;
  }
};

/**
 * Clear stored authentication data
 */
export const clearAuthData = async (): Promise<void> => {
  const authPath = getSystemAuthPath();
  
  if (fs.existsSync(authPath)) {
    fs.unlinkSync(authPath);
  }
};

/**
 * Check if authentication data exists
 */
export const hasAuthData = async (): Promise<boolean> => {
  const authPath = getSystemAuthPath();
  return fs.existsSync(authPath);
};

/**
 * Basic validation of authentication data structure
 */
export const isAuthDataValid = async (authData: AuthData | null): Promise<boolean> => {
  if (!authData) return false;
  
  // Check required structure
  if (!authData.cookies || !Array.isArray(authData.cookies)) {
    return false;
  }
  
  // Check for LinkedIn authentication cookie
  const hasLinkedInCookie = authData.cookies.some(
    (cookie: any) => cookie.name === 'li_at' && cookie.domain?.includes('linkedin.com')
  );
  
  if (!hasLinkedInCookie) {
    return false;
  }
  
  // Check if auth is not too old (30 days)
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
  const age = Date.now() - (authData.timestamp || 0);
  
  return age < maxAge;
};

/**
 * Get authentication status information
 */
export const getAuthStatus = async (): Promise<{
  hasAuth: boolean;
  isValid: boolean;
  createdAt?: Date;
  lastValidated?: Date;
  age?: string;
}> => {
  const authData = await loadAuthData();
  const hasAuth = !!authData;
  const isValid = await isAuthDataValid(authData);
  
  if (!authData) {
    return { hasAuth: false, isValid: false };
  }
  
  const createdAt = new Date(authData.timestamp);
  const lastValidated = authData.lastValidated ? new Date(authData.lastValidated) : undefined;
  const ageMs = Date.now() - authData.timestamp;
  const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  const age = ageDays === 0 ? 'Less than 1 day' : `${ageDays} day${ageDays === 1 ? '' : 's'}`;
  
  return {
    hasAuth,
    isValid,
    createdAt,
    lastValidated,
    age
  };
};
