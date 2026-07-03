const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function initializeDatabase() {
    // Create authentication tables the first time the server runs.
    const dataDirectory = path.join(__dirname, '..', 'data');
    fs.mkdirSync(dataDirectory, { recursive: true });

    // Open or create a persistent SQLite database file.
    const dbPath = path.join(dataDirectory, "smart_home.db");
    const db = new DatabaseSync(dbPath);

    db.exec("PRAGMA foreign_keys = ON");

    // Create the events table the first time the server runs.
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
        created_at TEXT NOT NULL,
        disabled_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    `);
    return db;
}

module.exports = {
  initializeDatabase,
}