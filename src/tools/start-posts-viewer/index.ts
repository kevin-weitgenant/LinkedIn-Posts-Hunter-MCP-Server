import liveServer from 'live-server';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getSearchResourcesPath, getScreenshotsPath, getResourcesPath } from '../../utils/paths.js';
import {
  PostViewerResult,
  MiddlewareRequest,
  MiddlewareResponse,
  NextFunction
} from './types.js';
import { CONSTANTS } from './constants.js';
import { formatPostDisplayName, validateFilePath } from './util.js';
import { getAllPosts, deletePostById, updatePost, getPostById, updateAppliedStatus } from '../../db/operations.js';
import type { DbPost } from '../../db/operations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Re-export types for external consumers
export type { PostViewerResult } from './types.js';

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
 * Build the live-server configuration object
 */
function buildServerConfig(port: number, staticRoot: string, resourcesWatchPath: string, dbPath: string) {
  return {
    port,
    root: staticRoot,
    open: true,
    file: 'index.html',
    watch: [resourcesWatchPath, dbPath], // Watch resources directory and database file for changes
    ignore: CONSTANTS.IGNORED_PATTERNS,
    logLevel: CONSTANTS.LOG_LEVEL as 0 | 1 | 2,
    middleware: [createApiMiddleware()]
  };
}

/**
 * Start the post viewer server using live-server
 * Opens browser automatically and watches database for changes
 */
export async function startPostViewer(): Promise<PostViewerResult> {
  // Point to source directory since static files aren't copied during build
  // __dirname will be build/tools/start-post-viewer/ so we go up to build/tools/, then build/, then project root
  const projectRoot = path.resolve(__dirname, '..', '..', '..');
  const staticRoot = path.join(projectRoot, 'src', 'server', 'static');
  const resourcesWatchPath = getSearchResourcesPath();
  const dbPath = path.join(getResourcesPath(), 'linkedin.db');
  
  const serverConfig = buildServerConfig(CONSTANTS.DEFAULT_PORT, staticRoot, resourcesWatchPath, dbPath);
  
  try {
    liveServer.start(serverConfig);
    
    return {
      port: CONSTANTS.DEFAULT_PORT,
      status: 'started',
      url: `http://localhost:${CONSTANTS.DEFAULT_PORT}`,
      message: `Post viewer started at http://localhost:${CONSTANTS.DEFAULT_PORT}. Browser should open automatically. Watching ${resourcesWatchPath} and database for changes.`
    };
  } catch (error) {
    throw new Error(`Failed to start post viewer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Stop the post viewer server
 */
export function stopPostViewer(): void {
  liveServer.shutdown();
}
