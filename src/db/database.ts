import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { getResourcesPath } from '../utils/paths.js';

let db: Database | null = null;
let dbPath: string;

/**
 * Get or create database connection (singleton)
 * Automatically initializes schema on first access
 */
export async function getDatabase(): Promise<Database> {
  if (!db) {
    dbPath = path.join(getResourcesPath(), 'linkedin.db');
    
    // Initialize sql.js
    const SQL = await initSqlJs();
    
    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
    
    // Initialize schema
    initializeSchema();
  }
  return db;
}

/**
 * Save database to disk
 */
export function saveDatabase(): void {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

/**
 * Create tables if they don't exist
 * Safe to run multiple times (IF NOT EXISTS)
 */
function initializeSchema(): void {
  if (!db) return;
  
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      search_keywords TEXT NOT NULL,
      post_link TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      search_date TEXT NOT NULL,
      applied INTEGER DEFAULT 0,
      saved INTEGER DEFAULT 0,
      profile_image TEXT DEFAULT '',
      author_name TEXT DEFAULT '',
      author_occupation TEXT DEFAULT '',
      post_date TEXT DEFAULT '',
      like_count TEXT DEFAULT '',
      comment_count TEXT DEFAULT ''
    );
  `);
  
  // Migration: Add saved column if it doesn't exist (for existing databases)
  try {
    db.run(`ALTER TABLE posts ADD COLUMN saved INTEGER DEFAULT 0;`);
  } catch (error) {
    // Column already exists, ignore error
  }
  
  db.run(`CREATE INDEX IF NOT EXISTS idx_posts_link ON posts(post_link);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(search_date);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_posts_applied ON posts(applied);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_posts_saved ON posts(saved);`);
  
  // Save after schema creation
  saveDatabase();
}

/**
 * Close database connection (cleanup)
 */
export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}
