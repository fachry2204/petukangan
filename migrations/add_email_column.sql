-- Migration: Add email column to users table
-- Date: 2026-06-06

-- Add email column to users table (after fullname column)
ALTER TABLE users 
ADD COLUMN email VARCHAR(255) NULL AFTER fullname;

-- Add index for email lookup
CREATE INDEX idx_users_email ON users(email);
