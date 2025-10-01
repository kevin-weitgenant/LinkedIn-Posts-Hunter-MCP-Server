import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';
import open from 'open';
import cors from 'cors';
import { createApiRouter } from './server-api/api-router.js';

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
  server: http.Server;
  port: number;
  url: string;
} | null = null;

/**
 * Start the Vite static viewer using Express
 * Serves pre-built static files from dist/ with API routes
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
  
  // Create Express app
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  
  // API routes
  app.use('/api', createApiRouter());
  
  // Serve static files from dist directory
  app.use(express.static(distDir));
  
  // SPA fallback - serve index.html for all other routes
  app.get('/*splat', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
  
  // Create HTTP server
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    
    // Handle server errors
    server.on('error', (error: Error) => {
      reject(new Error(`Failed to start Vite viewer: ${error.message}`));
    });
    
    // Start listening
    server.listen(PORT, () => {
      const url = `http://localhost:${PORT}`;
      
      // Store active server info for singleton pattern
      activeViteServer = {
        server,
        port: PORT,
        url
      };
      
      // Open browser
      open(url).catch(() => {
        // Ignore browser open errors
      });
      
      resolve({
        port: PORT,
        status: 'started',
        url: url,
        message: `Vite viewer started at ${url}. Browser opened automatically.\n\nReact app auto-polls for updates every 3 seconds - no page reloads needed!`
      });
    });
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
    const url = activeViteServer.url;
    activeViteServer.server.close();
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
