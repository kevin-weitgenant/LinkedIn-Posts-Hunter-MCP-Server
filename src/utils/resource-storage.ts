import fs from 'fs';
import path from 'path';
import { getSearchResourcesPath, ensureResourceDirectories } from './paths.js';
import type { PostResult } from '../tools/search-posts.js';

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
 * Convert PostResult array to CSV rows (without headers)
 */
const convertToCsvRows = (results: PostResult[], keywords: string, searchDate: string): string[] => {
  return results.map((post) => {
    const escapedKeywords = keywords.replace(/"/g, '""');
    const escapedLink = post.link.replace(/"/g, '""');
    const escapedDescription = post.description.replace(/"/g, '""');
    return `"${escapedKeywords}","${escapedLink}","${escapedDescription}","${searchDate}"`;
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
    
    // Extract post_link (second column) - basic CSV parsing
    const match = line.match(/"([^"]+)","([^"]+)",/);
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
  
  // Read existing CSV if it exists
  if (fs.existsSync(filePath)) {
    fileExists = true;
    const existingContent = fs.readFileSync(filePath, 'utf8');
    existingLinks = parseExistingCsv(existingContent);
    totalPostsInFile = existingLinks.size;
  }
  
  // Filter out duplicate posts
  const newResults = results.filter(post => !existingLinks.has(post.link));
  const duplicatesSkipped = results.length - newResults.length;
  
  // Convert new results to CSV rows
  const newRows = convertToCsvRows(newResults, keywords, searchDate);
  
  // Write or append to CSV file
  if (!fileExists) {
    // Create new file with headers
    const headers = 'search_keywords,post_link,description,search_date\n';
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
