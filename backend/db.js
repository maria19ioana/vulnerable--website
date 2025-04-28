const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./clubsy.db');

db.serialize(() => {
  // Add is_superuser BOOLEAN DEFAULT 0 to users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    password TEXT,
    email TEXT,
    role TEXT,
    is_superuser BOOLEAN DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS clubs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    owner_id INTEGER,
    description TEXT,
    category TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER,
    title TEXT,
    description TEXT,
    private BOOLEAN
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER,
    email TEXT,
    token TEXT,
    role TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS club_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER,
    user_id INTEGER,
    join_date TEXT,
    role TEXT DEFAULT 'member',
    UNIQUE(club_id, user_id)
  )`);

  db.run(`INSERT OR IGNORE INTO club_members (club_id, user_id, join_date, role)
    SELECT id, owner_id, datetime('now'), 'owner' FROM clubs`);

  // Add the is_superuser column safely if the table already exists
  db.run(`ALTER TABLE users ADD COLUMN is_superuser BOOLEAN DEFAULT 0`, [], (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding is_superuser column:', err.message);
    }
  });
});

module.exports = db;
