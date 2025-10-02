import { getDatabase, saveDatabase } from './database.js';

export interface DbPost {
  id: number;
  search_keywords: string;
  post_link: string;
  description: string;
  search_date: string;
  applied: number; // SQLite stores as INTEGER (0 or 1), convert to boolean in code
  saved: number; // SQLite stores as INTEGER (0 or 1), convert to boolean in code
  profile_image: string;
  author_name: string;
  author_occupation: string;
  post_date: string;
  like_count: string;
  comment_count: string;
}

/**
 * Insert a single post into database
 * Returns the inserted post's ID, or null if duplicate (UNIQUE constraint on post_link)
 */
export async function insertPost(
  keywords: string,
  link: string,
  description: string,
  searchDate: string,
  applied: boolean = false,
  profileImage: string = '',
  authorName: string = '',
  authorOccupation: string = '',
  postDate: string = '',
  likeCount: string = '',
  commentCount: string = '',
  saved: boolean = false
): Promise<number | null> {
  const db = await getDatabase();
  
  try {
    db.run(
      `INSERT INTO posts (search_keywords, post_link, description, search_date, applied, saved, profile_image, author_name, author_occupation, post_date, like_count, comment_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        keywords, 
        link, 
        description, 
        searchDate, 
        applied ? 1 : 0,
        saved ? 1 : 0,
        profileImage,
        authorName,
        authorOccupation,
        postDate,
        likeCount,
        commentCount
      ]
    );
    
    // Get the last inserted row ID
    const result = db.exec('SELECT last_insert_rowid() as id');
    saveDatabase();
    
    if (result.length > 0 && result[0].values.length > 0) {
      return result[0].values[0][0] as number;
    }
    return null;
  } catch (error: any) {
    // UNIQUE constraint violation
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return null;
    }
    throw error;
  }
}

/**
 * Get all posts from database, ordered by date (newest first)
 */
export async function getAllPosts(): Promise<DbPost[]> {
  const db = await getDatabase();
  const result = db.exec('SELECT * FROM posts ORDER BY search_date DESC');
  
  if (result.length === 0) {
    return [];
  }
  
  return resultToObjects(result[0]) as DbPost[];
}

/**
 * Count total posts in database with optional filters
 */
export async function countPosts(params?: {
  keyword?: string;
  contains?: string;
  applied?: boolean;
  saved?: boolean;
}): Promise<number> {
  const db = await getDatabase();
  
  let sql = 'SELECT COUNT(*) as count FROM posts WHERE 1=1';
  const bindings: any[] = [];
  
  if (params) {
    // Filter by keyword
    if (params.keyword) {
      sql += ` AND search_keywords LIKE ?`;
      const searchPattern = `%${params.keyword}%`;
      bindings.push(searchPattern);
    }
    
    // Filter by content
    if (params.contains) {
      sql += ` AND description LIKE ?`;
      const searchPattern = `%${params.contains}%`;
      bindings.push(searchPattern);
    }
    
    // Filter by applied status
    if (params.applied !== undefined) {
      sql += ` AND applied = ?`;
      bindings.push(params.applied ? 1 : 0);
    }
    
    // Filter by saved status
    if (params.saved !== undefined) {
      sql += ` AND saved = ?`;
      bindings.push(params.saved ? 1 : 0);
    }
  }
  
  const result = db.exec(sql, bindings);
  
  if (result.length > 0 && result[0].values.length > 0) {
    return result[0].values[0][0] as number;
  }
  return 0;
}

/**
 * Check if a post link already exists in database
 */
export async function postExists(link: string): Promise<boolean> {
  const db = await getDatabase();
  const result = db.exec('SELECT 1 FROM posts WHERE post_link = ?', [link]);
  return result.length > 0 && result[0].values.length > 0;
}

/**
 * Delete a post by ID
 * Returns true if deleted, false if not found
 */
export async function deletePostById(id: number): Promise<boolean> {
  const db = await getDatabase();
  
  // Check if exists first
  const checkResult = db.exec('SELECT 1 FROM posts WHERE id = ?', [id]);
  const exists = checkResult.length > 0 && checkResult[0].values.length > 0;
  
  if (!exists) {
    return false;
  }
  
  db.run('DELETE FROM posts WHERE id = ?', [id]);
  saveDatabase();
  return true;
}

/**
 * Update an existing post's fields
 * Returns true if updated, false if not found
 */
export async function updatePost(post: DbPost): Promise<boolean> {
  const db = await getDatabase();
  
  // Check if exists first
  const checkResult = db.exec('SELECT 1 FROM posts WHERE id = ?', [post.id]);
  const exists = checkResult.length > 0 && checkResult[0].values.length > 0;
  
  if (!exists) {
    return false;
  }
  
  db.run(
    `UPDATE posts 
     SET search_keywords = ?,
         description = ?,
         applied = ?
     WHERE id = ?`,
    [post.search_keywords, post.description, post.applied, post.id]
  );
  
  saveDatabase();
  return true;
}

/**
 * Get a single post by ID
 */
export async function getPostById(id: number): Promise<DbPost | null> {
  const db = await getDatabase();
  const result = db.exec('SELECT * FROM posts WHERE id = ?', [id]);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }
  
  const posts = resultToObjects(result[0]) as DbPost[];
  return posts[0] || null;
}

/**
 * Query posts with filters - supports keyword, contains, IDs, limit, offset, applied status, saved status
 */
export async function queryPosts(params: {
  ids?: number[];
  keyword?: string;
  contains?: string;
  limit?: number;
  offset?: number;
  applied?: boolean;
  saved?: boolean;
}): Promise<DbPost[]> {
  const db = await getDatabase();
  
  let sql = 'SELECT * FROM posts WHERE 1=1';
  const bindings: any[] = [];
  
  // Filter by IDs
  if (params.ids && params.ids.length > 0) {
    const placeholders = params.ids.map(() => '?').join(',');
    sql += ` AND id IN (${placeholders})`;
    bindings.push(...params.ids);
  }
  
  // Filter by keyword (search_keywords column)
  if (params.keyword) {
    sql += ` AND search_keywords LIKE ?`;
    const searchPattern = `%${params.keyword}%`;
    bindings.push(searchPattern);
  }
  
  // Filter by content (description column)
  if (params.contains) {
    sql += ` AND description LIKE ?`;
    const searchPattern = `%${params.contains}%`;
    bindings.push(searchPattern);
  }
  
  // Filter by applied status
  if (params.applied !== undefined) {
    sql += ` AND applied = ?`;
    bindings.push(params.applied ? 1 : 0);
  }
  
  // Filter by saved status
  if (params.saved !== undefined) {
    sql += ` AND saved = ?`;
    bindings.push(params.saved ? 1 : 0);
  }
  
  // Order by date (newest first)
  sql += ' ORDER BY search_date DESC';
  
  // Limit results
  if (params.limit) {
    sql += ' LIMIT ?';
    bindings.push(params.limit);
  }
  
  // Offset for pagination
  if (params.offset) {
    sql += ' OFFSET ?';
    bindings.push(params.offset);
  }
  
  const result = db.exec(sql, bindings);
  
  if (result.length === 0) {
    return [];
  }
  
  return resultToObjects(result[0]) as DbPost[];
}

/**
 * Update multiple posts with new values
 */
export async function updatePostsBulk(
  postIds: number[],
  updates: {
    new_description?: string;
    new_keywords?: string;
    new_applied?: boolean;
    new_saved?: boolean;
  }
): Promise<number> {
  const db = await getDatabase();
  
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
  
  if (updates.new_applied !== undefined) {
    setClauses.push('applied = ?');
    bindings.push(updates.new_applied ? 1 : 0);
  }
  
  if (updates.new_saved !== undefined) {
    setClauses.push('saved = ?');
    bindings.push(updates.new_saved ? 1 : 0);
  }
  
  if (setClauses.length === 0) {
    return 0; // Nothing to update
  }
  
  sql += setClauses.join(', ');
  sql += ' WHERE id IN (' + postIds.map(() => '?').join(',') + ')';
  bindings.push(...postIds);
  
  // Get count before update
  const countBefore = db.exec(
    'SELECT COUNT(*) FROM posts WHERE id IN (' + postIds.map(() => '?').join(',') + ')',
    postIds
  );
  
  db.run(sql, bindings);
  saveDatabase();
  
  if (countBefore.length > 0 && countBefore[0].values.length > 0) {
    return countBefore[0].values[0][0] as number;
  }
  
  return 0;
}

/**
 * Delete multiple posts by IDs
 */
export async function deletePostsBulk(postIds: number[]): Promise<number> {
  const db = await getDatabase();
  
  if (postIds.length === 0) {
    return 0;
  }
  
  // Get count before delete
  const placeholders = postIds.map(() => '?').join(',');
  const countBefore = db.exec(
    `SELECT COUNT(*) FROM posts WHERE id IN (${placeholders})`,
    postIds
  );
  
  db.run(`DELETE FROM posts WHERE id IN (${placeholders})`, postIds);
  saveDatabase();
  
  if (countBefore.length > 0 && countBefore[0].values.length > 0) {
    return countBefore[0].values[0][0] as number;
  }
  
  return 0;
}

/**
 * Update applied status for a specific post
 * Returns true if updated, false if not found
 */
export async function updateAppliedStatus(id: number, applied: boolean): Promise<boolean> {
  const db = await getDatabase();
  
  // Check if exists first
  const checkResult = db.exec('SELECT 1 FROM posts WHERE id = ?', [id]);
  const exists = checkResult.length > 0 && checkResult[0].values.length > 0;
  
  if (!exists) {
    return false;
  }
  
  db.run('UPDATE posts SET applied = ? WHERE id = ?', [applied ? 1 : 0, id]);
  saveDatabase();
  return true;
}

/**
 * Toggle applied status for a specific post
 * Returns the new applied status, or null if post not found
 */
export async function toggleAppliedStatus(id: number): Promise<boolean | null> {
  const post = await getPostById(id);
  if (!post) {
    return null;
  }
  
  // Toggle it
  const newStatus = post.applied === 0;
  await updateAppliedStatus(id, newStatus);
  
  return newStatus;
}

/**
 * Update saved status for a specific post
 * Returns true if updated, false if not found
 */
export async function updateSavedStatus(id: number, saved: boolean): Promise<boolean> {
  const db = await getDatabase();
  
  // Check if exists first
  const checkResult = db.exec('SELECT 1 FROM posts WHERE id = ?', [id]);
  const exists = checkResult.length > 0 && checkResult[0].values.length > 0;
  
  if (!exists) {
    return false;
  }
  
  db.run('UPDATE posts SET saved = ? WHERE id = ?', [saved ? 1 : 0, id]);
  saveDatabase();
  return true;
}

/**
 * Toggle saved status for a specific post
 * Returns the new saved status, or null if post not found
 */
export async function toggleSavedStatus(id: number): Promise<boolean | null> {
  const post = await getPostById(id);
  if (!post) {
    return null;
  }
  
  // Toggle it
  const newStatus = post.saved === 0;
  await updateSavedStatus(id, newStatus);
  
  return newStatus;
}

/**
 * Helper function to convert sql.js QueryExecResult to array of objects
 */
function resultToObjects(result: { columns: string[], values: any[][] }): any[] {
  return result.values.map(row => {
    const obj: any = {};
    result.columns.forEach((col, index) => {
      obj[col] = row[index];
    });
    return obj;
  });
}
