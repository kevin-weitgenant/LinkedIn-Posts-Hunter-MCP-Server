import liveServer from 'live-server';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';
import open from 'open';
import { getSearchResourcesPath, getScreenshotsPath, getResourcesPath } from '../utils/paths.js';
import { getAllPosts, deletePostById, updatePost, getPostById, updateAppliedStatus } from '../db/operations.js';
import type { DbPost } from '../db/operations.js';
import { IncomingMessage, ServerResponse } from 'http';

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

type MiddlewareRequest = IncomingMessage;
type MiddlewareResponse = ServerResponse;
type NextFunction = () => void;

/**
 * Handle the /api/posts endpoint - returns all posts from database as JSON
 */
function handleGetPostsRequest(res: MiddlewareResponse): void {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const posts = getAllPosts();
    res.writeHead(200);
    res.end(JSON.stringify(posts));
  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Failed to load posts from database' }));
  }
}

/**
 * Handle the GET /api/posts/:id endpoint - get single post by ID
 */
function handleGetSinglePostRequest(req: MiddlewareRequest, res: MiddlewareResponse): void {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    if (!req.url) {
      throw new Error('Request URL not found');
    }
    const id = parseInt(decodeURIComponent(req.url.replace('/api/posts/', '')));
    
    if (isNaN(id)) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid post ID' }));
      return;
    }
    
    const post = getPostById(id);
    
    if (!post) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Post not found' }));
      return;
    }
    
    res.writeHead(200);
    res.end(JSON.stringify(post));
  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Failed to load post' }));
  }
}

/**
 * Handle POST /api/posts/bulk-update endpoint - updates multiple posts
 */
function handleBulkUpdatePostsRequest(req: MiddlewareRequest, res: MiddlewareResponse): void {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const posts: DbPost[] = JSON.parse(body);
      
      let updatedCount = 0;
      for (const post of posts) {
        if (updatePost(post)) {
          updatedCount++;
        }
      }
      
      res.writeHead(200);
      res.end(JSON.stringify({ 
        message: `Successfully updated ${updatedCount} post(s)`,
        updated: updatedCount
      }));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to update posts' }));
    }
  });
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
    const normalizedFilePath = path.normalize(filePath);
    const normalizedScreenshotsDir = path.normalize(screenshotsDir);
    if (!normalizedFilePath.startsWith(normalizedScreenshotsDir)) {
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
 * Handle DELETE /api/posts/:id endpoint - deletes a post from database by ID
 */
function handleDeletePostRequest(req: MiddlewareRequest, res: MiddlewareResponse): void {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    if (!req.url) {
      throw new Error('Request URL not found');
    }
    const id = parseInt(decodeURIComponent(req.url.replace('/api/posts/', '')));
    
    if (isNaN(id)) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid post ID' }));
      return;
    }
    
    const deleted = deletePostById(id);
    
    if (deleted) {
      res.writeHead(200);
      res.end(JSON.stringify({ message: 'Post deleted successfully' }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Post not found' }));
    }
    
  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Failed to delete post' }));
  }
}

/**
 * Handle PATCH /api/posts/:id/applied endpoint - updates applied status for a post
 */
function handleUpdateAppliedRequest(req: MiddlewareRequest, res: MiddlewareResponse): void {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    if (!req.url) {
      throw new Error('Request URL not found');
    }
    
    const urlParts = req.url.split('/');
    const id = parseInt(urlParts[3]); // /api/posts/:id/applied
    
    if (isNaN(id)) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid post ID' }));
      return;
    }
    
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {};
        const applied = data.applied !== undefined ? data.applied : undefined;
        
        if (applied === undefined) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing applied status in request body' }));
          return;
        }
        
        const updated = updateAppliedStatus(id, applied);
        
        if (updated) {
          res.writeHead(200);
          res.end(JSON.stringify({ 
            success: true, 
            applied: applied,
            message: `Post marked as ${applied ? 'applied' : 'not applied'}`
          }));
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Post not found' }));
        }
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
    
  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Failed to update applied status' }));
  }
}

/**
 * Create middleware function to handle API requests
 */
function createApiMiddleware() {
  return function(req: MiddlewareRequest, res: MiddlewareResponse, next: NextFunction) {
    // GET /api/posts - Get all posts
    if (req.url === '/api/posts' && req.method === 'GET') {
      handleGetPostsRequest(res);
      return;
    }
    
    // POST /api/posts/bulk-update - Update multiple posts
    if (req.url === '/api/posts/bulk-update' && req.method === 'POST') {
      handleBulkUpdatePostsRequest(req, res);
      return;
    }
    
    // PATCH /api/posts/:id/applied - Update applied status
    if (req.url?.match(/^\/api\/posts\/\d+\/applied$/) && req.method === 'PATCH') {
      handleUpdateAppliedRequest(req, res);
      return;
    }
    
    // GET /api/posts/:id - Get single post
    if (req.url?.startsWith('/api/posts/') && req.method === 'GET' && !req.url.includes('bulk-update')) {
      handleGetSinglePostRequest(req, res);
      return;
    }
    
    // DELETE /api/posts/:id - Delete post
    if (req.url?.startsWith('/api/posts/') && req.method === 'DELETE') {
      handleDeletePostRequest(req, res);
      return;
    }
    
    // Handle screenshot requests
    if (req.url?.startsWith('/api/screenshots/')) {
      handleScreenshotRequest(req, res);
      return;
    }
    
    next();
  };
}

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
