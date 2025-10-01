import { ensureResourceDirectories } from './paths.js';
import type { PostResult } from '../tools/search-posts/utils/types.js';
import { insertPost, countPosts } from '../db/operations.js';

/**
 * Database save result interface
 */
export interface DbSaveResult {
  totalPosts: number;
  newPostsAdded: number;
  duplicatesSkipped: number;
}

/**
 * Save search results to SQLite database
 * Returns statistics about new posts added and duplicates skipped
 */
export const saveSearchResourceToDb = async (
  results: PostResult[], 
  keywords: string
): Promise<DbSaveResult> => {
  // Ensure resource directories exist before database creation
  ensureResourceDirectories();
  
  const searchDate = new Date().toISOString();
  
  let newPostsAdded = 0;
  let duplicatesSkipped = 0;
  
  // Try to insert each post
  for (const post of results) {
    const id = insertPost(
      keywords,
      post.link,
      post.description,
      searchDate,
      post.screenshotPath || '',
      false, // applied status - default to false for new posts
      post.profileImage || '',
      post.authorName || '',
      post.postDate || '',
      post.likeCount || '',
      post.commentCount || ''
    );
    
    if (id !== null) {
      newPostsAdded++;
    } else {
      // insertPost returns null for duplicates (UNIQUE constraint)
      duplicatesSkipped++;
    }
  }
  
  const totalPosts = countPosts();
  
  return {
    totalPosts,
    newPostsAdded,
    duplicatesSkipped
  };
};
