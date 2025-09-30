import { getDatabase } from './database.js';

export interface DbPost {
  id: number;
  search_keywords: string;
  post_link: string;
  description: string;
  search_date: string;
  screenshot_path: string;
}

/**
 * Insert a single post into database
 * Returns the inserted post's ID, or null if duplicate (UNIQUE constraint on post_link)
 */
export function insertPost(
  keywords: string,
  link: string,
  description: string,
  searchDate: string,
  screenshotPath: string = ''
): number | null {
  const db = getDatabase();
  
  try {
    const stmt = db.prepare(`
      INSERT INTO posts (search_keywords, post_link, description, search_date, screenshot_path)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(keywords, link, description, searchDate, screenshotPath);
    return result.lastInsertRowid as number;
  } catch (error: any) {
    // SQLITE_CONSTRAINT_UNIQUE means duplicate post_link
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return null;
    }
    throw error;
  }
}

/**
 * Get all posts from database, ordered by date (newest first)
 */
export function getAllPosts(): DbPost[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM posts ORDER BY search_date DESC');
  return stmt.all() as DbPost[];
}

/**
 * Count total posts in database
 */
export function countPosts(): number {
  const db = getDatabase();
  const result = db.prepare('SELECT COUNT(*) as count FROM posts').get() as { count: number };
  return result.count;
}

/**
 * Check if a post link already exists in database
 */
export function postExists(link: string): boolean {
  const db = getDatabase();
  const result = db.prepare('SELECT 1 FROM posts WHERE post_link = ?').get(link);
  return result !== undefined;
}

/**
 * Delete a post by ID
 * Returns true if deleted, false if not found
 */
export function deletePostById(id: number): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM posts WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Update an existing post's fields
 * Returns true if updated, false if not found
 */
export function updatePost(post: DbPost): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE posts 
    SET search_keywords = ?,
        description = ?,
        screenshot_path = ?
    WHERE id = ?
  `);
  const result = stmt.run(
    post.search_keywords,
    post.description,
    post.screenshot_path,
    post.id
  );
  return result.changes > 0;
}

/**
 * Get a single post by ID
 */
export function getPostById(id: number): DbPost | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM posts WHERE id = ?');
  const result = stmt.get(id);
  return result ? (result as DbPost) : null;
}
