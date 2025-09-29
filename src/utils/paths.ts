import os from 'os';
import path from 'path';
import fs from 'fs';

/**
 * Get the system-wide authentication storage path
 * Windows: %APPDATA%/linkedin-mcp/auth.json
 * Mac/Linux: ~/.linkedin-mcp/auth.json
 */
export const getSystemAuthPath = (): string => {
  const homeDir = os.homedir();
  const configDir = process.platform === 'win32' 
    ? path.join(process.env.APPDATA || homeDir, 'linkedin-mcp')
    : path.join(homeDir, '.linkedin-mcp');
    
  return path.join(configDir, 'auth.json');
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
  const homeDir = os.homedir();
  const configDir = process.platform === 'win32' 
    ? path.join(process.env.APPDATA || homeDir, 'linkedin-mcp')
    : path.join(homeDir, '.linkedin-mcp');
    
  return path.join(configDir, 'resources');
};

/**
 * Get the search resources directory path
 */
export const getSearchResourcesPath = (): string => {
  return path.join(getResourcesPath(), 'searches');
};

/**
 * Ensure resource directories exist
 */
export const ensureResourceDirectories = (): void => {
  const resourcesDir = getResourcesPath();
  const searchesDir = getSearchResourcesPath();
  
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
  }
  
  if (!fs.existsSync(searchesDir)) {
    fs.mkdirSync(searchesDir, { recursive: true });
  }
};