import { createServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ViteViewerResult {
  port: number;
  status: 'started';
  url: string;
  message: string;
}

/**
 * Start the Vite development server for the React post viewer
 * Uses Vite's programmatic API to run in-process (like live-server)
 */
export async function startViteViewer(): Promise<ViteViewerResult> {
  const PORT = 5173;
  const URL = `http://localhost:${PORT}`;
  
  // Get the client directory path
  const buildRoot = path.resolve(__dirname, '..');
  const clientDir = path.join(buildRoot, 'client-vite');
  
  // Check if client directory exists
  if (!fs.existsSync(clientDir)) {
    throw new Error(`Client directory not found: ${clientDir}. Did you run 'npm run build'?`);
  }
  
  try {
    // Create Vite dev server using programmatic API (runs in-process)
    const server = await createServer({
      root: clientDir,
      server: {
        port: PORT,
        strictPort: false, // Find another port if 5173 is taken
        open: false // We'll open the browser manually
      },
      logLevel: 'error' // Only show errors to keep output clean
    });
    
    // Start the server
    await server.listen();
    
    // Get the actual port (in case 5173 was taken)
    const actualPort = server.config.server.port || PORT;
    const actualURL = `http://localhost:${actualPort}`;
    
    // Open browser after server is ready
    await open(actualURL);
    
    return {
      port: actualPort,
      status: 'started',
      url: actualURL,
      message: `Vite dev server started at ${actualURL}. Browser opened automatically.\n\nThe server runs in-process (no terminal needed). Hot reload is enabled!`
    };
  } catch (error) {
    throw new Error(`Failed to start Vite server: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

