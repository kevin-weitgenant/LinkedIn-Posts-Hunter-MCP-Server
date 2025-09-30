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

/**
 * Query posts with filters - supports search_text, date range, IDs, limit
 */
export function queryPosts(params: {
  ids?: number[];
  search_text?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}): DbPost[] {
  const db = getDatabase();
  
  let sql = 'SELECT * FROM posts WHERE 1=1';
  const bindings: any[] = [];
  
  // Filter by IDs
  if (params.ids && params.ids.length > 0) {
    const placeholders = params.ids.map(() => '?').join(',');
    sql += ` AND id IN (${placeholders})`;
    bindings.push(...params.ids);
  }
  
  // Filter by search text (searches in keywords and description)
  if (params.search_text) {
    sql += ` AND (search_keywords LIKE ? OR description LIKE ?)`;
    const searchPattern = `%${params.search_text}%`;
    bindings.push(searchPattern, searchPattern);
  }
  
  // Filter by date range
  if (params.date_from) {
    sql += ` AND search_date >= ?`;
    bindings.push(params.date_from);
  }
  
  if (params.date_to) {
    sql += ` AND search_date <= ?`;
    bindings.push(params.date_to);
  }
  
  // Order by date (newest first)
  sql += ' ORDER BY search_date DESC';
  
  // Limit results
  if (params.limit) {
    sql += ' LIMIT ?';
    bindings.push(params.limit);
  }
  
  const stmt = db.prepare(sql);
  return stmt.all(...bindings) as DbPost[];
}

/**
 * Update multiple posts with new values
 */
export function updatePostsBulk(
  postIds: number[],
  updates: {
    new_description?: string;
    new_keywords?: string;
  }
): number {
  const db = getDatabase();
  
  let sql = 'UPDATE posts SET ';
  const setClauses: string[] = [];
  const bindings: any[] = [];
  
  if (updates.new_description) {
    setClauses.push('description = ?');
    bindings.push(updates.new_description);
  }
  
  if (updates.new_keywords) {
    setClauses.push('search_keywords = ?');
    bindings.push(updates.new_keywords);
  }
  
  if (setClauses.length === 0) {
    return 0; // Nothing to update
  }
  
  sql += setClauses.join(', ');
  sql += ' WHERE id IN (' + postIds.map(() => '?').join(',') + ')';
  bindings.push(...postIds);
  
  const stmt = db.prepare(sql);
  const result = stmt.run(...bindings);
  return result.changes;
}

/**
 * Delete multiple posts by IDs
 */
export function deletePostsBulk(postIds: number[]): number {
  const db = getDatabase();
  
  if (postIds.length === 0) {
    return 0;
  }
  
  const placeholders = postIds.map(() => '?').join(',');
  const sql = `DELETE FROM posts WHERE id IN (${placeholders})`;
  
  const stmt = db.prepare(sql);
  const result = stmt.run(...postIds);
  return result.changes;
}