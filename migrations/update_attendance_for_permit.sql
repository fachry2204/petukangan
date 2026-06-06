-- Migration: Update attendance table to support PERMIT and EARLY_OUT types
-- Date: 2026-06-06

-- First, make sure attendance table has all the required columns with correct names (camelCase)
-- and update the type enum to include PERMIT and EARLY_OUT

-- 1. Modify attendance table
ALTER TABLE attendance 
MODIFY COLUMN type ENUM('IN', 'BREAK', 'END_BREAK', 'OUT', 'PERMIT', 'EARLY_OUT') NOT NULL;

-- 2. Ensure all required columns exist with correct names and types
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS reason TEXT AFTER address,
ADD COLUMN IF NOT EXISTS isMock BOOLEAN DEFAULT FALSE AFTER reason,
ADD COLUMN IF NOT EXISTS rejectionReason TEXT AFTER status,
ADD COLUMN IF NOT EXISTS isOutsideSchedule BOOLEAN DEFAULT FALSE AFTER status,
ADD COLUMN IF NOT EXISTS deviceInfo JSON AFTER rejectionReason,
MODIFY COLUMN userId INT NOT NULL AFTER id,
MODIFY COLUMN photoUrl LONGTEXT AFTER address,
MODIFY COLUMN status ENUM('VALID', 'INVALID', 'PENDING', 'REJECTED') DEFAULT 'PENDING';

-- 3. Do the same for lembur table (since it's also used for approved requests)
ALTER TABLE lembur 
MODIFY COLUMN type ENUM('IN', 'BREAK', 'END_BREAK', 'OUT', 'PERMIT', 'EARLY_OUT') NOT NULL;

ALTER TABLE lembur 
ADD COLUMN IF NOT EXISTS reason TEXT AFTER address,
ADD COLUMN IF NOT EXISTS isMock BOOLEAN DEFAULT FALSE AFTER reason,
ADD COLUMN IF NOT EXISTS rejectionReason TEXT AFTER status,
ADD COLUMN IF NOT EXISTS isOutsideSchedule BOOLEAN DEFAULT FALSE AFTER status,
ADD COLUMN IF NOT EXISTS deviceInfo JSON AFTER rejectionReason,
MODIFY COLUMN userId INT NOT NULL AFTER id,
MODIFY COLUMN photoUrl LONGTEXT AFTER address,
MODIFY COLUMN status ENUM('VALID', 'INVALID', 'PENDING', 'REJECTED') DEFAULT 'PENDING';
