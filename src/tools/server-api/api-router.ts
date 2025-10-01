import { Router } from 'express';
import {
  handleGetAllPosts,
  handleGetSinglePost,
  handleBulkUpdatePosts,
  handleDeletePost,
  handleUpdateAppliedStatus,
  handleGetScreenshot
} from './api-handlers.js';

/**
 * Create Express router with all API routes
 */
export function createApiRouter(): Router {
  const router = Router();
  
  // Post routes
  router.get('/posts', handleGetAllPosts);
  router.get('/posts/:id', handleGetSinglePost);
  router.post('/posts/bulk-update', handleBulkUpdatePosts);
  router.delete('/posts/:id', handleDeletePost);
  router.patch('/posts/:id/applied', handleUpdateAppliedStatus);
  
  // Screenshot routes
  router.get('/screenshots/:filename', handleGetScreenshot);
  
  return router;
}
