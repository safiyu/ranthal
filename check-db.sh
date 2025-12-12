#!/bin/bash
# Script to check SQLite database status

DB_PATH="${1:-./db/sqlite.db}"

echo "=== Database Status Check ==="
echo "Database path: $DB_PATH"
echo ""

if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database file does not exist!"
    exit 1
fi

echo "✅ Database file exists"
echo "File size: $(du -h "$DB_PATH" | cut -f1)"
echo ""

echo "Tables in database:"
sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table';" | while read table; do
    if [ -n "$table" ]; then
        count=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM $table;")
        echo "  - $table: $count rows"
    fi
done

echo ""
echo "=== End of Database Status ==="
