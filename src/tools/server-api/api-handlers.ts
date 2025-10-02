import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { 
  getAllPosts, 
  deletePostById, 
  updatePost, 
  getPostById, 
  updateAppliedStatus,
  updateSavedStatus 
} from '../../db/operations.js';
import { getScreenshotsPath } from '../../utils/paths.js';
import { 
  getFilterState, 
  updateFilterState, 
  resetFilterState,
  type FilterState 
} from '../../utils/filter-state.js';
import type { DbPost } from '../../db/operations.js';

/**
 * GET /api/posts - Get all posts from database
 */
export async function handleGetAllPosts(req: Request, res: Response): Promise<void> {
  try {
    const posts = await getAllPosts();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load posts from database' });
  }
}

/**
 * GET /api/posts/:id - Get single post by ID
 */
export async function handleGetSinglePost(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }
    
    const post = await getPostById(id);
    
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
export async function handleBulkUpdatePosts(req: Request, res: Response): Promise<void> {
  try {
    const posts: DbPost[] = req.body;
    
    let updatedCount = 0;
    for (const post of posts) {
      if (await updatePost(post)) {
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
export async function handleDeletePost(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }
    
    const deleted = await deletePostById(id);
    
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
export async function handleUpdateAppliedStatus(req: Request, res: Response): Promise<void> {
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
    
    const updated = await updateAppliedStatus(id, applied);
    
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

/**
 * GET /api/filter-state - Get current filter state
 */
export function handleGetFilterState(req: Request, res: Response): void {
  try {
    const state = getFilterState();
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load filter state' });
  }
}

/**
 * PUT /api/filter-state - Update filter state (partial or full)
 */
export function handleUpdateFilterState(req: Request, res: Response): void {
  try {
    const updates: Partial<FilterState> = req.body;
    
    // Validate that at least one field is being updated
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No updates provided' });
      return;
    }
    
    const newState = updateFilterState(updates);
    res.json(newState);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update filter state';
    res.status(400).json({ error: message });
  }
}

/**
 * DELETE /api/filter-state - Reset filter state to defaults
 */
export function handleResetFilterState(req: Request, res: Response): void {
  try {
    const defaultState = resetFilterState();
    res.json(defaultState);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset filter state' });
  }
}

/**
 * PATCH /api/posts/:id/saved - Update saved status for a post
 */
export async function handleUpdateSavedStatus(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }
    
    const { saved } = req.body;
    
    if (saved === undefined) {
      res.status(400).json({ error: 'Missing saved status in request body' });
      return;
    }
    
    const updated = await updateSavedStatus(id, saved);
    
    if (updated) {
      res.json({ 
        success: true, 
        saved,
        message: `Post marked as ${saved ? 'saved' : 'not saved'}`
      });
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update saved status' });
  }
}

