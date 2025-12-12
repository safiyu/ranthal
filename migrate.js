const { drizzle } = require('drizzle-orm/better-sqlite3');
const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Initialize DB
const dbPath = process.env.DB_PATH || 'sqlite.db';
const migrationsFolder = path.join(__dirname, 'drizzle');

console.log('=== Database Migration Start ===');
console.log(`Database path: ${dbPath}`);
console.log(`Migrations folder: ${migrationsFolder}`);
console.log(`DB file exists: ${fs.existsSync(dbPath)}`);
console.log(`Migrations folder exists: ${fs.existsSync(migrationsFolder)}`);

// Ensure the database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    console.log(`Creating database directory: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

console.log('Database connection established');

try {
    // Run migrations from the 'drizzle' directory
    console.log('Running migrations...');
    migrate(db, { migrationsFolder });
    console.log('Migrations completed successfully.');

    // Verify tables were created
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables in database:', tables.map(t => t.name).join(', '));

    if (tables.length === 0) {
        console.error('WARNING: No tables found after migration!');
    }
} catch (error) {
    console.error('Migration failed:', error);
    console.error('Error stack:', error.stack);
    sqlite.close(); // Close even on error
    process.exit(1);
} finally {
    // Critical: Close the database connection to release locks
    sqlite.close();
    console.log('Database connection closed');
}

console.log('=== Database Migration Complete ===');
// Ensure clean exit
process.exit(0);