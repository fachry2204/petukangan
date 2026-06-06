-- Migration: Create izin_petugas table to manage officer leave requests
-- Date: 2026-06-06

CREATE TABLE IF NOT EXISTS izin_petugas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  type ENUM('PERMIT', 'EARLY_OUT') NOT NULL,
  category VARCHAR(100) NOT NULL,
  reason TEXT NOT NULL,
  photoUrl LONGTEXT,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  approvedBy INT NULL,
  rejectionReason TEXT NULL,
  lat DECIMAL(10,8) NULL,
  lng DECIMAL(11,8) NULL,
  address TEXT NULL,
  dateOfLeave DATE NOT NULL,
  createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_userId (userId),
  INDEX idx_status (status),
  INDEX idx_dateOfLeave (dateOfLeave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
