-- This script runs when the container starts for the first time

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Grant necessary permissions to the admin user
GRANT USAGE ON SCHEMA public TO admin;
GRANT CREATE ON SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON SCHEMA public TO admin;

-- Create a function to calculate cosine similarity (optional, since pgvector provides operators)
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector)
RETURNS float8
LANGUAGE sql
IMMUTABLE STRICT
AS $$
  SELECT 1 - (a <=> b);
$$;

-- Set some pgvector-specific settings for better performance
-- These settings can be adjusted based on your needs
ALTER SYSTEM SET shared_preload_libraries = 'vector';
ALTER SYSTEM SET max_connections = 100;

-- Restart is needed for shared_preload_libraries to take effect
-- but since this is during initialization, it will be applied on first start