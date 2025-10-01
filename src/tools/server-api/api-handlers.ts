import fs from 'fs';
import path from 'path';
import { 
  HttpRequest, 
  HttpResponse,
  sendJson, 
  sendError, 
  sendImage,
  sendText,
  parseJsonBody,
  extractIdFromUrl,
  getUrlSegments
} from './http-utils.js';
import { 
  getAllPosts, 
  deletePostById, 
  updatePost, 
  getPostById, 
  updateAppliedStatus 
} from '../../db/operations.js';
import { getScreenshotsPath } from '../../utils/paths.js';
import type { DbPost } from '../../db/operations.js';

/**
 * GET /api/posts - Get all posts from database
 */
export function handleGetAllPosts(req: HttpRequest, res: HttpResponse): void {
  try {
    const posts = getAllPosts();
    sendJson(res, 200, posts);
  } catch (error) {
    sendError(res, 500, 'Failed to load posts from database');
  }
}

/**
 * GET /api/posts/:id - Get single post by ID
 */
export function handleGetSinglePost(req: HttpRequest, res: HttpResponse): void {
  try {
    if (!req.url) {
      throw new Error('Request URL not found');
    }
    
    const id = extractIdFromUrl(req.url, '/api/posts/');
    
    if (id === null) {
      sendError(res, 400, 'Invalid post ID');
      return;
    }
    
    const post = getPostById(id);
    
    if (!post) {
      sendError(res, 404, 'Post not found');
      return;
    }
    
    sendJson(res, 200, post);
  } catch (error) {
    sendError(res, 500, 'Failed to load post');
  }
}

/**
 * POST /api/posts/bulk-update - Update multiple posts
 */
export async function handleBulkUpdatePosts(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const posts: DbPost[] = await parseJsonBody(req);
    
    let updatedCount = 0;
    for (const post of posts) {
      if (updatePost(post)) {
        updatedCount++;
      }
    }
    
    sendJson(res, 200, { 
      message: `Successfully updated ${updatedCount} post(s)`,
      updated: updatedCount
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update posts';
    sendError(res, 500, message);
  }
}

/**
 * DELETE /api/posts/:id - Delete a post by ID
 */
export function handleDeletePost(req: HttpRequest, res: HttpResponse): void {
  try {
    if (!req.url) {
      throw new Error('Request URL not found');
    }
    
    const id = extractIdFromUrl(req.url, '/api/posts/');
    
    if (id === null) {
      sendError(res, 400, 'Invalid post ID');
      return;
    }
    
    const deleted = deletePostById(id);
    
    if (deleted) {
      sendJson(res, 200, { message: 'Post deleted successfully' });
    } else {
      sendError(res, 404, 'Post not found');
    }
  } catch (error) {
    sendError(res, 500, 'Failed to delete post');
  }
}

/**
 * PATCH /api/posts/:id/applied - Update applied status for a post
 */
export async function handleUpdateAppliedStatus(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    if (!req.url) {
      throw new Error('Request URL not found');
    }
    
    const segments = getUrlSegments(req.url);
    const id = parseInt(segments[2]); // /api/posts/:id/applied
    
    if (isNaN(id)) {
      sendError(res, 400, 'Invalid post ID');
      return;
    }
    
    const data = await parseJsonBody<{ applied?: boolean }>(req);
    
    if (data.applied === undefined) {
      sendError(res, 400, 'Missing applied status in request body');
      return;
    }
    
    const updated = updateAppliedStatus(id, data.applied);
    
    if (updated) {
      sendJson(res, 200, { 
        success: true, 
        applied: data.applied,
        message: `Post marked as ${data.applied ? 'applied' : 'not applied'}`
      });
    } else {
      sendError(res, 404, 'Post not found');
    }
  } catch (error) {
    const message = error instanceof Error && error.message === 'Invalid JSON in request body' 
      ? 'Invalid request body' 
      : 'Failed to update applied status';
    sendError(res, error instanceof Error && error.message === 'Invalid JSON in request body' ? 400 : 500, message);
  }
}

/**
 * GET /api/screenshots/:filename - Serve screenshot images
 */
export function handleGetScreenshot(req: HttpRequest, res: HttpResponse): void {
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
      sendText(res, 403, 'Access denied');
      return;
    }
    
    if (!fs.existsSync(filePath)) {
      sendText(res, 404, 'Screenshot not found');
      return;
    }
    
    // Read and serve the image
    const imageBuffer = fs.readFileSync(filePath);
    sendImage(res, imageBuffer);
  } catch (error) {
    sendText(res, 500, 'Failed to load screenshot');
  }
}

