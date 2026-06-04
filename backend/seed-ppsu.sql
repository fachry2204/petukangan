-- SEED DATA: 50 Petugas PPSU dengan Foto
-- Password semua: password123
-- Foto dari randomuser.me (real photos, free for demo use)
-- 40 Laki-laki, 10 Perempuan

-- Hapus data PPSU lama jika ada
DELETE FROM users WHERE roleId = 2;

-- Insert 50 Petugas PPSU
INSERT INTO users (username, password, fullName, gender, photoUrl, roleId, status, createdAt, updatedAt) VALUES
-- 40 Laki-laki (Foto: randomuser.me/api/portraits/men/)
('ppsu001', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Budi Santoso', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/1.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu002', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Andi Wijaya', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/2.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu003', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Agus Salim', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/3.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu004', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Dedi Kurniawan', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/4.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu005', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Eko Prasetyo', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/5.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu006', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Fajar Nugroho', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/6.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu007', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Gilang Ramadhan', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/7.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu008', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Hendra Susanto', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/8.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu009', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Indra Gunawan', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/9.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu010', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Joko Widodo', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/10.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu011', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Kurniawan Setyo', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/11.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu012', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Lukman Hakim', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/12.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu013', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Mulyadi Putra', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/13.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu014', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Nur Hidayat', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/14.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu015', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Oki Setiawan', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/15.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu016', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Prasetyo Adi', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/16.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu017', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Qomaruddin', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/17.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu018', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Rudi Hartono', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/18.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu019', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Samsul Arifin', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/19.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu020', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Teguh Wibowo', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/20.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu021', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Umar Fauzi', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/21.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu022', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Vino Bastian', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/22.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu023', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Wahyu Setiawan', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/23.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu024', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Yudi Pratama', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/24.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu025', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Zainal Arifin', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/25.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu026', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Adi Nugroho', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/26.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu027', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Benny Susanto', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/27.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu028', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Candra Wijaya', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/28.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu029', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Darmawan Putra', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/29.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu030', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Eka Saputra', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/30.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu031', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Ferry Irawan', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/31.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu032', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Guntur Wibowo', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/32.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu033', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Hakim Setya', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/33.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu034', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Iwan Kurniawan', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/34.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu035', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Jamaludin', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/35.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu036', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Khoirul Anwar', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/36.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu037', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Lutfi Hakim', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/37.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu038', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Mirza Fadli', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/38.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu039', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Nugroho Wibowo', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/39.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu040', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Oky Pratama', 'LAKI-LAKI', 'https://randomuser.me/api/portraits/men/40.jpg', 2, 'ACTIVE', NOW(), NOW()),

-- 10 Perempuan (Foto: randomuser.me/api/portraits/women/)
('ppsu041', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Siti Aminah', 'PEREMPUAN', 'https://randomuser.me/api/portraits/women/1.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu042', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Dewi Lestari', 'PEREMPUAN', 'https://randomuser.me/api/portraits/women/2.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu043', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Ratna Wati', 'PEREMPUAN', 'https://randomuser.me/api/portraits/women/3.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu044', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Yanti Sari', 'PEREMPUAN', 'https://randomuser.me/api/portraits/women/4.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu045', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Rina Fitriani', 'PEREMPUAN', 'https://randomuser.me/api/portraits/women/5.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu046', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Indah Permata', 'PEREMPUAN', 'https://randomuser.me/api/portraits/women/6.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu047', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Nur Hasanah', 'PEREMPUAN', 'https://randomuser.me/api/portraits/women/7.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu048', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Mawar Melati', 'PEREMPUAN', 'https://randomuser.me/api/portraits/women/8.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu049', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Citra Dewi', 'PEREMPUAN', 'https://randomuser.me/api/portraits/women/9.jpg', 2, 'ACTIVE', NOW(), NOW()),
('ppsu050', '$2b$10$oaISagdkrLragGByaJxKvOpy2rLjCYJA0F6Gl6r1k2/TseYnifqUC', 'Putri Ayu', 'PEREMPUAN', 'https://randomuser.me/api/portraits/women/10.jpg', 2, 'ACTIVE', NOW(), NOW());

-- Verifikasi
SELECT id, username, fullName, gender, photoUrl, status FROM users WHERE roleId = 2 ORDER BY id;
