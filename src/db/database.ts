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
      screenshot_path TEXT DEFAULT '',
      applied INTEGER DEFAULT 0
    );
    
    CREATE INDEX IF NOT EXISTS idx_posts_link ON posts(post_link);
    CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(search_date);
    CREATE INDEX IF NOT EXISTS idx_posts_applied ON posts(applied);
  `);
  
  // Migration: Add applied column to existing databases
  migrateDatabase();
}

/**
 * Run database migrations for existing databases
 * Adds new columns if they don't exist
 */
function migrateDatabase(): void {
  try {
    // Check if 'applied' column exists
    const tableInfo = db!.prepare("PRAGMA table_info(posts)").all() as Array<{ name: string }>;
    const hasAppliedColumn = tableInfo.some(col => col.name === 'applied');
    
    if (!hasAppliedColumn) {
      // Add applied column with default value
      db!.exec(`
        ALTER TABLE posts ADD COLUMN applied INTEGER DEFAULT 0;
        CREATE INDEX IF NOT EXISTS idx_posts_applied ON posts(applied);
      `);
    }
  } catch (error) {
    // Silently ignore migration errors (e.g., table doesn't exist yet)
  }
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