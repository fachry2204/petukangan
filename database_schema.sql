-- PPSU Smart Monitoring System Database Schema

CREATE DATABASE IF NOT EXISTS ppsu_monitoring;
USE ppsu_monitoring;

-- Roles Table
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    permissions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Roles
INSERT INTO roles (name, permissions) VALUES 
('ADMIN', '{"all": true}'),
('PIMPINAN', '{"view_reports": true, "view_tracking": true}'),
('STAFF', '{"manage_tasks": true, "manage_attendance": true}'),
('PPSU', '{"submit_attendance": true, "submit_tasks": true, "submit_reports": true}');

-- Zones Table
CREATE TABLE zones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    coordinates JSON NOT NULL, -- GeoJSON or Array of points
    color VARCHAR(20) DEFAULT '#FF8C00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shifts Table
CREATE TABLE shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role_id INT,
    zone_id INT,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    last_seen TIMESTAMP NULL,
    device_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (zone_id) REFERENCES zones(id)
);

-- Attendance Table
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('IN', 'BREAK', 'END_BREAK', 'OUT') NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    address TEXT,
    photo_url VARCHAR(255),
    device_info JSON,
    is_mock BOOLEAN DEFAULT FALSE,
    status ENUM('VALID', 'INVALID', 'PENDING_APPROVAL') DEFAULT 'VALID',
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Attendance Requests (Manual Approval)
CREATE TABLE attendance_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('IN', 'OUT') NOT NULL,
    reason TEXT,
    photo_url VARCHAR(255),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Tasks Table
CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    zone_id INT,
    assigned_to INT,
    status ENUM('NEW', 'ON_WAY', 'BEFORE', 'WORKING', 'DONE', 'REJECTED', 'REVISION') DEFAULT 'NEW',
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    deadline DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES zones(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Task Logs (Workflow History)
CREATE TABLE task_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    status ENUM('NEW', 'ON_WAY', 'BEFORE', 'WORKING', 'DONE', 'REJECTED', 'REVISION') NOT NULL,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    address TEXT,
    photo_url VARCHAR(255),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Reports Table (Incident Reports)
CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    address TEXT,
    status ENUM('NEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED') DEFAULT 'NEW',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Report Photos
CREATE TABLE report_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    photo_url VARCHAR(255) NOT NULL,
    FOREIGN KEY (report_id) REFERENCES reports(id)
);

-- GPS Tracking Table (History)
CREATE TABLE gps_tracking (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    speed DECIMAL(5, 2),
    battery_level INT,
    is_mock BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id, timestamp),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Notifications Table
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Activity Logs
CREATE TABLE activity_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(255),
    details JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
