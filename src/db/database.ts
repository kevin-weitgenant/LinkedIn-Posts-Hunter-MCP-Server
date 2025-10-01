import Database from 'better-sqlite3';
import path from 'path';
import { getResourcesPath } from '../utils/paths.js';

let db: Database.Database | null = null;

/**
 * Get or create database connection (singleton)
 * Automatically initializes schema on first access
 */
export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(getResourcesPath(), 'linkedin.db');
    // Use stderr to avoid breaking JSON-RPC protocol on stdout
    
    
    db = new Database(dbPath);
    
    // Enable foreign keys for referential integrity
    db.pragma('foreign_keys = ON');
    
    // Initialize schema
    initializeSchema();
  }
  return db;
}

/**
 * Create tables if they don't exist
 * Safe to run multiple times (IF NOT EXISTS)
 */
function initializeSchema(): void {
  db!.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      search_keywords TEXT NOT NULL,
      post_link TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      search_date TEXT NOT NULL,
      applied INTEGER DEFAULT 0,
      profile_image TEXT DEFAULT '',
      author_name TEXT DEFAULT '',
      author_occupation TEXT DEFAULT '',
      post_date TEXT DEFAULT '',
      like_count TEXT DEFAULT '',
      comment_count TEXT DEFAULT ''
    );
    
    CREATE INDEX IF NOT EXISTS idx_posts_link ON posts(post_link);
    CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(search_date);
    CREATE INDEX IF NOT EXISTS idx_posts_applied ON posts(applied);
  `);
}

/**
 * Close database connection (cleanup)
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  
  }
}