import liveServer from 'live-server';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSearchResourcesPath } from '../utils/paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CsvViewerResult {
  port: number;
  status: string;
  url: string;
  message: string;
}

/**
 * Start the CSV viewer server using live-server
 * Opens browser automatically and watches CSV files for changes
 */
export async function startCsvViewer(): Promise<CsvViewerResult> {
  const port = 3000;
  // Point to source directory since static files aren't copied during build
  // __dirname will be build/tools/ so we go up one level to build/, then up again to project root
  const projectRoot = path.resolve(__dirname, '..', '..');
  const staticRoot = path.join(projectRoot, 'src', 'server', 'static');
  const csvWatchPath = getSearchResourcesPath();
  
  const params = {
    port,
    root: staticRoot,
    open: true,
    file: 'index.html',
    watch: [csvWatchPath], // Watch CSV directory for changes
    ignore: 'node_modules,.git', // Comma-separated string
    logLevel: 1 as 0 | 1 | 2, // Minimal logging
    middleware: [
      // Custom middleware to serve CSV files as JSON if needed
      function(req: any, res: any, next: any) {
        if (req.url.startsWith('/api/')) {
          // Handle API requests in the future
          res.setHeader('Access-Control-Allow-Origin', '*');
        }
        next();
      }
    ]
  };
  
  try {
    liveServer.start(params);
    
    return {
      port,
      status: 'started',
      url: `http://localhost:${port}`,
      message: `CSV viewer started at http://localhost:${port}. Browser should open automatically. Watching ${csvWatchPath} for changes.`
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
