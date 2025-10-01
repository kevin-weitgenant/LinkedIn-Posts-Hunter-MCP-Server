import os from 'os';
import path from 'path';
import fs from 'fs';

/**
 * Get the base data directory for all linkedin-mcp data
 * Windows: %APPDATA%/linkedin-mcp/
 * Mac/Linux: ~/.linkedin-mcp/
 */
export const getDataDirectory = (): string => {
  const homeDir = os.homedir();
  const configDir = process.platform === 'win32' 
    ? path.join(process.env.APPDATA || homeDir, 'linkedin-mcp')
    : path.join(homeDir, '.linkedin-mcp');
    
  return configDir;
};

/**
 * Get the system-wide authentication storage path
 * Windows: %APPDATA%/linkedin-mcp/auth.json
 * Mac/Linux: ~/.linkedin-mcp/auth.json
 */
export const getSystemAuthPath = (): string => {
  return path.join(getDataDirectory(), 'auth.json');
};

/**
 * Ensure the auth directory exists
 */
export const ensureAuthDirectory = (): void => {
  const authPath = getSystemAuthPath();
  const authDir = path.dirname(authPath);
  
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
};

/**
 * Get temporary storage path for auth operations
 */
export const getTempAuthPath = (): string => {
  const authPath = getSystemAuthPath();
  return authPath.replace('.json', '.tmp.json');
};

/**
 * Get the resources storage directory path
 * Windows: %APPDATA%/linkedin-mcp/resources/
 * Mac/Linux: ~/.linkedin-mcp/resources/
 */
export const getResourcesPath = (): string => {
  return path.join(getDataDirectory(), 'resources');
};

/**
 * Get the search resources directory path
 */
export const getSearchResourcesPath = (): string => {
  return path.join(getResourcesPath(), 'searches');
};

/**
 * Get the screenshots directory path
 */
export const getScreenshotsPath = (): string => {
  return path.join(getResourcesPath(), 'screenshots');
};

/**
 * Ensure resource directories exist
 */
export const ensureResourceDirectories = (): void => {
  const resourcesDir = getResourcesPath();
  const searchesDir = getSearchResourcesPath();
  const screenshotsDir = getScreenshotsPath();
  
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
  }
  
  if (!fs.existsSync(searchesDir)) {
    fs.mkdirSync(searchesDir, { recursive: true });
  }
  
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
};