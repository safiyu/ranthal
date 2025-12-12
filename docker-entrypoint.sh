#!/bin/sh
set -e

# Get standard USER_ID variable (or default to 1001)
USER_ID=${PUID:-1001}
GROUP_ID=${PGID:-1001}

echo "Starting with UID: $USER_ID, GID: $GROUP_ID"

# Update nextjs user UID/GID if they differ from current
ORIG_UID=$(id -u nextjs)
ORIG_GID=$(id -g nextjs)

if [ "$USER_ID" != "$ORIG_UID" ] || [ "$GROUP_ID" != "$ORIG_GID" ]; then
    groupmod -o -g "$GROUP_ID" nodejs
    usermod -o -u "$USER_ID" -g "$GROUP_ID" nextjs
fi

# Ensure permissions on critical directories
# This ensures the process can write to these even if they are mounted volumes
chown -R nextjs:nodejs /app/db
chown -R nextjs:nodejs /app/public/uploads
chown -R nextjs:nodejs /app/.next

# Run migrations
echo "Running database migrations..."
gosu nextjs node /app/migrate.js

# Wait a moment for file locks to release and FS to sync
echo "Migrations finished. Waiting for DB lock release..."
sleep 1
echo "Starting application..."

# Execute command as nextjs user
exec gosu nextjs "$@"
