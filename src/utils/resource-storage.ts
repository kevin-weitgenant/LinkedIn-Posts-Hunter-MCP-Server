import fs from 'fs';
import path from 'path';
import { getSearchResourcesPath, ensureResourceDirectories } from './paths.js';
import type { PostResult } from '../tools/search-posts.js';

export interface SearchResourceMetadata {
  filename: string;
  uri: string;
  name: string;
  description: string;
  keywords: string;
  resultCount: number;
  createdAt: string;
  mimeType: string;
}

/**
 * Sanitize keywords for use in filename
 */
const sanitizeFilename = (keywords: string): string => {
  return keywords
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 50); // Limit length
};

/**
 * Generate filename for search resource
 */
const generateFilename = (keywords: string): string => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 19).replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
  const keywordsPart = sanitizeFilename(keywords);
  return `${datePart}_${keywordsPart}.csv`;
};

/**
 * Convert PostResult array to CSV content
 */
const convertToCsv = (results: PostResult[]): string => {
  const headers = 'id,post_link,description\n';
  const rows = results.map((post, index) => {
    const description = post.description.replace(/"/g, '""'); // Escape quotes
    return `${index + 1},"${post.link}","${description}"`;
  }).join('\n');
  
  return headers + rows;
};

/**
 * Save search results as CSV resource
 */
export const saveSearchResource = async (
  results: PostResult[], 
  keywords: string
): Promise<SearchResourceMetadata> => {
  ensureResourceDirectories();
  
  const filename = generateFilename(keywords);
  const searchDir = getSearchResourcesPath();
  const filePath = path.join(searchDir, filename);
  const csvContent = convertToCsv(results);
  
  // Save CSV file
  fs.writeFileSync(filePath, csvContent, 'utf8');
  
  // Create metadata
  const metadata: SearchResourceMetadata = {
    filename,
    uri: `file://${filePath.replace(/\\/g, '/')}`, // Normalize path separators for URI
    name: `LinkedIn Search: ${keywords}`,
    description: `LinkedIn search results for '${keywords}' (${results.length} posts found on ${new Date().toLocaleDateString()})`,
    keywords,
    resultCount: results.length,
    createdAt: new Date().toISOString(),
    mimeType: 'text/csv'
  };
  
  // Save metadata to registry
  await updateResourceRegistry(metadata);
  
  return metadata;
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
const updateResourceRegistry = async (newMetadata: SearchResourceMetadata): Promise<void> => {
  const registry = await loadResourceRegistry();
  
  // Add new resource (or replace if same filename exists)
  const existingIndex = registry.findIndex(r => r.filename === newMetadata.filename);
  if (existingIndex >= 0) {
    registry[existingIndex] = newMetadata;
  } else {
    registry.push(newMetadata);
  }
  
  // Sort by creation date (newest first)
  registry.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
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
