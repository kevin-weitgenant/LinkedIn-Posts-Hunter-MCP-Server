import fs from 'fs';
import path from 'path';
import { getSearchResourcesPath, ensureResourceDirectories } from './paths.js';
import type { PostResult } from '../tools/search-posts.js';
import { insertPost, countPosts } from '../db/operations.js';

export interface SearchResourceMetadata {
  filename: string;
  uri: string;
  name: string;
  description: string;
  totalSearches: number;
  totalPosts: number;
  lastUpdated: string;
  mimeType: string;
}

/**
 * Get the unified CSV filename
 */
const getUnifiedCsvFilename = (): string => {
  return 'linkedin_searches.csv';
};

/**
 * Get the next available ID from existing CSV
 */
const getNextId = (csvContent: string): number => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length <= 1) {
    return 1; // First entry
  }
  
  let maxId = 0;
  
  // Skip header (line 0), parse IDs from remaining lines
  for (let i = 1; i < lines.length; i++) {
    const firstComma = lines[i].indexOf(',');
    if (firstComma > 0) {
      const idStr = lines[i].substring(0, firstComma);
      const id = parseInt(idStr);
      if (!isNaN(id) && id > maxId) {
        maxId = id;
      }
    }
  }
  
  return maxId + 1;
};

/**
 * Convert PostResult array to CSV rows (without headers)
 */
const convertToCsvRows = (results: PostResult[], keywords: string, searchDate: string, startId: number): string[] => {
  return results.map((post, index) => {
    const id = startId + index;
    const escapedKeywords = keywords.replace(/"/g, '""');
    const escapedLink = post.link.replace(/"/g, '""');
    const escapedDescription = post.description.replace(/"/g, '""');
    const escapedScreenshotPath = (post.screenshotPath || '').replace(/"/g, '""');
    return `${id},"${escapedKeywords}","${escapedLink}","${escapedDescription}","${searchDate}","${escapedScreenshotPath}"`;
  });
};

/**
 * Parse existing CSV content and extract post links
 */
const parseExistingCsv = (csvContent: string): Set<string> => {
  const lines = csvContent.split('\n').slice(1); // Skip header
  const existingLinks = new Set<string>();
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Extract post_link (third column after id) - basic CSV parsing
    // Format: id,"keywords","link","description","date","screenshot_path"
    const match = line.match(/^\d+,"([^"]+)","([^"]+)",/);
    if (match && match[2]) {
      existingLinks.add(match[2]);
    }
  }
  
  return existingLinks;
};

/**
 * Save search results as CSV resource
 */
export const saveSearchResource = async (
  results: PostResult[], 
  keywords: string
): Promise<SearchResourceMetadata & { newPostsAdded: number; duplicatesSkipped: number }> => {
  ensureResourceDirectories();
  
  const filename = getUnifiedCsvFilename();
  const searchDir = getSearchResourcesPath();
  const filePath = path.join(searchDir, filename);
  const searchDate = new Date().toISOString();
  
  let existingLinks = new Set<string>();
  let fileExists = false;
  let totalPostsInFile = 0;
  let nextId = 1;
  
  // Read existing CSV if it exists
  if (fs.existsSync(filePath)) {
    fileExists = true;
    const existingContent = fs.readFileSync(filePath, 'utf8');
    existingLinks = parseExistingCsv(existingContent);
    totalPostsInFile = existingLinks.size;
    nextId = getNextId(existingContent);
  }
  
  // Filter out duplicate posts
  const newResults = results.filter(post => !existingLinks.has(post.link));
  const duplicatesSkipped = results.length - newResults.length;
  
  // Convert new results to CSV rows with IDs
  const newRows = convertToCsvRows(newResults, keywords, searchDate, nextId);
  
  // Write or append to CSV file
  if (!fileExists) {
    // Create new file with headers
    const headers = 'id,search_keywords,post_link,description,search_date,screenshot_path\n';
    const csvContent = headers + newRows.join('\n') + '\n';
    fs.writeFileSync(filePath, csvContent, 'utf8');
  } else if (newRows.length > 0) {
    // Append new rows
    const appendContent = newRows.join('\n') + '\n';
    fs.appendFileSync(filePath, appendContent, 'utf8');
  }
  
  totalPostsInFile += newResults.length;
  
  // Create metadata
  const metadata: SearchResourceMetadata = {
    filename,
    uri: `file://${filePath.replace(/\\/g, '/')}`,
    name: 'LinkedIn Search Results (Unified)',
    description: `All LinkedIn search results in one file. Total: ${totalPostsInFile} posts. Last updated: ${new Date().toLocaleDateString()}`,
    totalSearches: 0, // Will be updated by registry
    totalPosts: totalPostsInFile,
    lastUpdated: searchDate,
    mimeType: 'text/csv'
  };
  
  // Update metadata in registry
  await updateResourceRegistry(metadata, keywords);
  
  return {
    ...metadata,
    newPostsAdded: newResults.length,
    duplicatesSkipped
  };
};

/**
 * Get resource registry file path
 */
const getRegistryPath = (): string => {
  const searchDir = getSearchResourcesPath();
  return path.join(searchDir, 'registry.json');
};

/**
 * Load resource registry
 */
const loadResourceRegistry = async (): Promise<SearchResourceMetadata[]> => {
  const registryPath = getRegistryPath();
  
  if (!fs.existsSync(registryPath)) {
    return [];
  }
  
  try {
    const data = fs.readFileSync(registryPath, 'utf8');
    return JSON.parse(data) as SearchResourceMetadata[];
  } catch (error) {
    console.warn('Failed to load resource registry:', error);
    return [];
  }
};

/**
 * Update resource registry with new metadata
 */
const updateResourceRegistry = async (newMetadata: SearchResourceMetadata, keywords: string): Promise<void> => {
  const registry = await loadResourceRegistry();
  
  // Find or create entry for unified CSV
  const existingIndex = registry.findIndex(r => r.filename === newMetadata.filename);
  
  if (existingIndex >= 0) {
    // Update existing entry
    registry[existingIndex] = {
      ...newMetadata,
      totalSearches: registry[existingIndex].totalSearches + 1
    };
  } else {
    // Create new entry
    registry.push({
      ...newMetadata,
      totalSearches: 1
    });
  }
  
  const registryPath = getRegistryPath();
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
};

/**
 * List all search resources
 */
export const listSearchResources = async (): Promise<SearchResourceMetadata[]> => {
  return await loadResourceRegistry();
};

/**
 * Read specific search resource file
 */
export const readSearchResource = async (filename: string): Promise<string | null> => {
  const searchDir = getSearchResourcesPath();
  const filePath = path.join(searchDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.warn('Failed to read search resource:', error);
    return null;
  }
};

/**
 * Delete search resource
 */
export const deleteSearchResource = async (filename: string): Promise<boolean> => {
  const searchDir = getSearchResourcesPath();
  const filePath = path.join(searchDir, filename);
  
  try {
    // Delete file if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Update registry
    const registry = await loadResourceRegistry();
    const updatedRegistry = registry.filter(r => r.filename !== filename);
    
    const registryPath = getRegistryPath();
    fs.writeFileSync(registryPath, JSON.stringify(updatedRegistry, null, 2), 'utf8');
    
    return true;
  } catch (error) {
    console.warn('Failed to delete search resource:', error);
    return false;
  }
};

/**
 * Database save result interface
 */
export interface DbSaveResult {
  totalPosts: number;
  newPostsAdded: number;
  duplicatesSkipped: number;
}

/**
 * Save search results to SQLite database
 * Returns statistics about new posts added and duplicates skipped
 */
export const saveSearchResourceToDb = async (
  results: PostResult[], 
  keywords: string
): Promise<DbSaveResult> => {
  // Ensure resource directories exist before database creation
  ensureResourceDirectories();
  
  const searchDate = new Date().toISOString();
  
  let newPostsAdded = 0;
  let duplicatesSkipped = 0;
  
  // Try to insert each post
  for (const post of results) {
    const id = insertPost(
      keywords,
      post.link,
      post.description,
      searchDate,
      post.screenshotPath || ''
    );
    
    if (id !== null) {
      newPostsAdded++;
    } else {
      // insertPost returns null for duplicates (UNIQUE constraint)
      duplicatesSkipped++;
    }
  }
  
  const totalPosts = countPosts();
  
  return {
    totalPosts,
    newPostsAdded,
    duplicatesSkipped
  };
};
