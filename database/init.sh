#!/bin/bash
# Database initialization script for Docker

set -e

# Wait for PostgreSQL to be ready
until pg_isready -h postgres -U filecoin_user -d filecoin_backup; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 2
done

echo "PostgreSQL is ready!"

# Run schema creation
echo "Creating database schema..."
psql -h postgres -U filecoin_user -d filecoin_backup -f /app/database/schema.sql

echo "Database initialization complete!"
