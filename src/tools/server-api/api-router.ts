import { Router } from 'express';
import {
  handleGetAllPosts,
  handleGetSinglePost,
  handleBulkUpdatePosts,
  handleDeletePost,
  handleUpdateAppliedStatus,
  handleUpdateSavedStatus,
  handleGetScreenshot,
  handleGetFilterState,
  handleUpdateFilterState,
  handleResetFilterState
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
  router.patch('/posts/:id/saved', handleUpdateSavedStatus);
  
  // Screenshot routes
  router.get('/screenshots/:filename', handleGetScreenshot);
  
  // Filter state routes
  router.get('/filter-state', handleGetFilterState);
  router.put('/filter-state', handleUpdateFilterState);
  router.delete('/filter-state', handleResetFilterState);
  
  return router;
}
