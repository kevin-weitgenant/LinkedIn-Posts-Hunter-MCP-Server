import liveServer from 'live-server';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';
import open from 'open';
import { createApiMiddleware } from './server-api/api-router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ViteViewerResult {
  port: number;
  status: 'started' | 'already_running';
  url: string;
  message: string;
}

// Module-level state tracking for singleton pattern
let activeViteServer: {
  server: any;
  port: number;
  url: string;
} | null = null;

/**
 * Start the Vite static viewer using live-server
 * Serves pre-built static files from dist/ with API middleware
 * Reuses existing server if already running
 */
export async function startViteViewer(): Promise<ViteViewerResult> {
  // Check if server is already running
  if (activeViteServer) {
    // Open browser again for convenience
    await open(activeViteServer.url);
    
    return {
      port: activeViteServer.port,
      status: 'already_running',
      url: activeViteServer.url,
      message: `Vite viewer already running at ${activeViteServer.url}. Browser opened again.`
    };
  }
  
  const PORT = 4327;
  
  // Get the dist directory path (build/client-vite/dist/)
  const buildRoot = path.resolve(__dirname, '..');
  const distDir = path.join(buildRoot, 'client-vite', 'dist');
  
  // Check if dist directory exists
  if (!fs.existsSync(distDir)) {
    throw new Error(`Dist directory not found: ${distDir}. Did you run 'npm run build'?`);
  }
  
  // Build live-server config
  const serverConfig = {
    port: PORT,
    root: distDir,  // Serve pre-built static files
    open: true,     // Open browser automatically
    file: 'index.html',
    watch: [],      // Don't watch files - React polling handles updates
    logLevel: 0 as 0 | 1 | 2,    // Silent mode
    middleware: [createApiMiddleware()]  // API endpoints for database access
  };
  
  // Wrap in promise to wait for server to start and get actual port
  return new Promise((resolve, reject) => {
    try {
      // live-server.start() returns the server but types say void - cast to correct type
      const server = liveServer.start(serverConfig) as unknown as http.Server;
      
      // Wait for server to finish binding
      server.addListener('listening', () => {
        const address = server.address() as { port: number; family: string; address: string };
        const actualPort = address.port;
        const url = `http://localhost:${actualPort}`;
        
        // Store active server info for singleton pattern
        activeViteServer = {
          server,
          port: actualPort,
          url
        };
        
        resolve({
          port: actualPort,
          status: 'started',
          url: url,
          message: `Vite viewer started at ${url}. Browser opened automatically.\n\nReact app auto-polls for updates every 3 seconds - no page reloads needed!`
        });
      });
      
      // Handle server errors
      server.addListener('error', (error: Error) => {
        reject(new Error(`Failed to start Vite viewer: ${error.message}`));
      });
      
    } catch (error) {
      reject(new Error(`Failed to start Vite viewer: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

/**
 * Stop the Vite viewer server
 * Shuts down the active server and clears the singleton state
 */
export function stopViteViewer(): { success: boolean; message: string } {
  if (!activeViteServer) {
    return {
      success: false,
      message: 'No Vite viewer server is currently running.'
    };
  }
  
  try {
    liveServer.shutdown();
    const url = activeViteServer.url;
    activeViteServer = null;
    
    return {
      success: true,
      message: `Vite viewer server at ${url} has been stopped.`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to stop Vite viewer: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
