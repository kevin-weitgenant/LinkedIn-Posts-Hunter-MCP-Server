import liveServer from 'live-server';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getSearchResourcesPath, getScreenshotsPath } from '../../utils/paths.js';
import {
  CsvViewerResult,
  MiddlewareRequest,
  MiddlewareResponse,
  NextFunction
} from './types.js';
import { CONSTANTS } from './constants.js';
import { formatCsvDisplayName, validateFilePath } from './util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Re-export types for external consumers
export type { CsvViewerResult } from './types.js';

/**
 * Handle the /api/list-csv endpoint - returns list of available CSV files
 */
function handleListCsvRequest(res: MiddlewareResponse): void {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const searchDir = getSearchResourcesPath();
    const files = fs.readdirSync(searchDir)
      .filter(file => file.endsWith('.csv'))
      .map(file => ({
        filename: file,
        displayName: formatCsvDisplayName(file)
      }));
    
    res.writeHead(200);
    res.end(JSON.stringify(files));
  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Failed to list CSV files' }));
  }
}

/**
 * Handle the /api/csv/:filename endpoint - serves CSV file content
 */
function handleCsvFileRequest(req: MiddlewareRequest, res: MiddlewareResponse): void {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    if (!req.url) {
      throw new Error('Request URL not found');
    }
    const filename = decodeURIComponent(req.url.replace('/api/csv/', ''));
    const searchDir = getSearchResourcesPath();
    const filePath = path.join(searchDir, filename);
    
    // Security check: ensure the file is within the search directory
    if (!validateFilePath(filePath, searchDir)) {
      res.writeHead(403);
      res.end('Access denied');
      return;
    }
    
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }
    
    const csvContent = fs.readFileSync(filePath, 'utf8');
    res.writeHead(200);
    res.end(csvContent);
  } catch (error) {
    res.writeHead(500);
    res.end('Failed to read CSV file');
  }
}

/**
 * Handle POST /api/csv/:filename endpoint - saves CSV file content
 */
function handleSaveCsvRequest(req: MiddlewareRequest, res: MiddlewareResponse): void {
  try {
    if (!req.url) {
      throw new Error('Request URL not found');
    }
    const filename = decodeURIComponent(req.url.replace('/api/csv/', ''));
    const searchDir = getSearchResourcesPath();
    const filePath = path.join(searchDir, filename);

    if (!validateFilePath(filePath, searchDir)) {
      res.writeHead(403);
      res.end('Access denied');
      return;
    }

    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        fs.writeFileSync(filePath, body, 'utf8');
        res.writeHead(200);
        res.end(JSON.stringify({ message: 'File saved successfully' }));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to save file' }));
      }
    });

  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Invalid request' }));
  }
}

/**
 * Handle the /api/screenshots/:filename endpoint - serves screenshot images
 */
function handleScreenshotRequest(req: MiddlewareRequest, res: MiddlewareResponse): void {
  try {
    if (!req.url) {
      throw new Error('Request URL not found');
    }
    const filename = decodeURIComponent(req.url.replace('/api/screenshots/', ''));
    const screenshotsDir = getScreenshotsPath();
    const filePath = path.join(screenshotsDir, filename);
    
    // Security check: ensure the file is within the screenshots directory
    if (!validateFilePath(filePath, screenshotsDir)) {
      res.writeHead(403);
      res.end('Access denied');
      return;
    }
    
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('Screenshot not found');
      return;
    }
    
    // Read and serve the image
    const imageBuffer = fs.readFileSync(filePath);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200);
    res.end(imageBuffer);
  } catch (error) {
    res.writeHead(500);
    res.end('Failed to load screenshot');
  }
}

/**
 * Handle DELETE /api/entry/:id endpoint - deletes an entry from CSV by ID
 */
function handleDeleteEntryRequest(req: MiddlewareRequest, res: MiddlewareResponse): void {
  try {
    if (!req.url) {
      throw new Error('Request URL not found');
    }
    const id = decodeURIComponent(req.url.replace('/api/entry/', ''));
    const searchDir = getSearchResourcesPath();
    const filename = 'linkedin_searches.csv';
    const filePath = path.join(searchDir, filename);
    
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'CSV file not found' }));
      return;
    }
    
    // Read and parse CSV
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const lines = csvContent.split('\n');
    
    if (lines.length <= 1) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'No entries to delete' }));
      return;
    }
    
    // Filter out the entry with matching ID
    const header = lines[0];
    const filteredLines = lines.slice(1).filter(line => {
      if (!line.trim()) return false;
      const firstComma = line.indexOf(',');
      if (firstComma > 0) {
        const lineId = line.substring(0, firstComma);
        return lineId !== id;
      }
      return true;
    });
    
    // Write back to file
    const newContent = header + '\n' + filteredLines.join('\n');
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200);
    res.end(JSON.stringify({ message: 'Entry deleted successfully' }));
    
  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Failed to delete entry' }));
  }
}

/**
 * Create middleware function to handle API requests
 */
function createApiMiddleware() {
  return function(req: MiddlewareRequest, res: MiddlewareResponse, next: NextFunction) {
    // API endpoint to list available CSV files
    if (req.url === '/api/list-csv') {
      handleListCsvRequest(res);
      return;
    }
    
    // Handle GET and POST for CSV files
    if (req.url?.startsWith('/api/csv/')) {
      if (req.method === 'POST') {
        handleSaveCsvRequest(req, res);
      } else {
        handleCsvFileRequest(req, res);
      }
      return;
    }
    
    // Handle screenshot requests
    if (req.url?.startsWith('/api/screenshots/')) {
      handleScreenshotRequest(req, res);
      return;
    }
    
    // Handle delete entry requests
    if (req.url?.startsWith('/api/entry/') && req.method === 'DELETE') {
      handleDeleteEntryRequest(req, res);
      return;
    }
    
    next();
  };
}

/**
 * Build the live-server configuration object
 */
function buildServerConfig(port: number, staticRoot: string, csvWatchPath: string) {
  return {
    port,
    root: staticRoot,
    open: true,
    file: 'index.html',
    watch: [csvWatchPath], // Watch CSV directory for changes
    ignore: CONSTANTS.IGNORED_PATTERNS,
    logLevel: CONSTANTS.LOG_LEVEL as 0 | 1 | 2,
    middleware: [createApiMiddleware()]
  };
}

/**
 * Start the CSV viewer server using live-server
 * Opens browser automatically and watches CSV files for changes
 */
export async function startCsvViewer(): Promise<CsvViewerResult> {
  // Point to source directory since static files aren't copied during build
  // __dirname will be build/tools/start-csv-viewer/ so we go up to build/tools/, then build/, then project root
  const projectRoot = path.resolve(__dirname, '..', '..', '..');
  const staticRoot = path.join(projectRoot, 'src', 'server', 'static');
  const csvWatchPath = getSearchResourcesPath();
  
  const serverConfig = buildServerConfig(CONSTANTS.DEFAULT_PORT, staticRoot, csvWatchPath);
  
  try {
    liveServer.start(serverConfig);
    
    return {
      port: CONSTANTS.DEFAULT_PORT,
      status: 'started',
      url: `http://localhost:${CONSTANTS.DEFAULT_PORT}`,
      message: `CSV viewer started at http://localhost:${CONSTANTS.DEFAULT_PORT}. Browser should open automatically. Watching ${csvWatchPath} for changes.`
    };
  } catch (error) {
    throw new Error(`Failed to start CSV viewer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Stop the CSV viewer server
 */
export function stopCsvViewer(): void {
  liveServer.shutdown();
}
