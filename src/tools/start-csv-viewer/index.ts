import liveServer from 'live-server';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getSearchResourcesPath } from '../../utils/paths.js';
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
