import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
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
export function handleGetAllPosts(req: Request, res: Response): void {
  try {
    const posts = getAllPosts();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load posts from database' });
  }
}

/**
 * GET /api/posts/:id - Get single post by ID
 */
export function handleGetSinglePost(req: Request, res: Response): void {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }
    
    const post = getPostById(id);
    
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load post' });
  }
}

/**
 * POST /api/posts/bulk-update - Update multiple posts
 */
export function handleBulkUpdatePosts(req: Request, res: Response): void {
  try {
    const posts: DbPost[] = req.body;
    
    let updatedCount = 0;
    for (const post of posts) {
      if (updatePost(post)) {
        updatedCount++;
      }
    }
    
    res.json({ 
      message: `Successfully updated ${updatedCount} post(s)`,
      updated: updatedCount
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update posts';
    res.status(500).json({ error: message });
  }
}

/**
 * DELETE /api/posts/:id - Delete a post by ID
 */
export function handleDeletePost(req: Request, res: Response): void {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }
    
    const deleted = deletePostById(id);
    
    if (deleted) {
      res.json({ message: 'Post deleted successfully' });
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
}

/**
 * PATCH /api/posts/:id/applied - Update applied status for a post
 */
export function handleUpdateAppliedStatus(req: Request, res: Response): void {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }
    
    const { applied } = req.body;
    
    if (applied === undefined) {
      res.status(400).json({ error: 'Missing applied status in request body' });
      return;
    }
    
    const updated = updateAppliedStatus(id, applied);
    
    if (updated) {
      res.json({ 
        success: true, 
        applied,
        message: `Post marked as ${applied ? 'applied' : 'not applied'}`
      });
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update applied status' });
  }
}

/**
 * GET /api/screenshots/:filename - Serve screenshot images
 */
export function handleGetScreenshot(req: Request, res: Response): void {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const screenshotsDir = getScreenshotsPath();
    const filePath = path.join(screenshotsDir, filename);
    
    // Security check: ensure the file is within the screenshots directory
    const normalizedFilePath = path.normalize(filePath);
    const normalizedScreenshotsDir = path.normalize(screenshotsDir);
    
    if (!normalizedFilePath.startsWith(normalizedScreenshotsDir)) {
      res.status(403).send('Access denied');
      return;
    }
    
    if (!fs.existsSync(filePath)) {
      res.status(404).send('Screenshot not found');
      return;
    }
    
    // Serve the image
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).send('Failed to load screenshot');
  }
}

