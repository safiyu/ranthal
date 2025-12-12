const Database = require('better-sqlite3');
const db = new Database(process.env.DB_PATH || 'sqlite.db');

try {
  console.log('Creating login_attempts table...');
  db.prepare(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      ip TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_attempt INTEGER,
      blocked_until INTEGER
    )
  `).run();
  console.log('Migration successful.');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
