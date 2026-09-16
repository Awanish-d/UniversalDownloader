const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "database.sqlite");

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        message TEXT,
        file_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
`);

// Safe migration for existing databases
const columns = db
    .prepare("PRAGMA table_info(jobs)")
    .all();

const hasFilePath = columns.some(
    (column) => column.name === "file_path"
);

if (!hasFilePath) {
    db.exec(`
        ALTER TABLE jobs
        ADD COLUMN file_path TEXT;
    `);
}

module.exports = db;