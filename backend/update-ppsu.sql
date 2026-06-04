-- Update username PPSU menjadi Huruf Kapital dan password menjadi 1234
-- Jalankan dulu command ini di terminal untuk generate bcrypt hash password 1234:
-- node -e "const bcrypt=require('bcryptjs');console.log(bcrypt.hashSync('1234',10));"
-- Lalu ganti [HASH_PASSWORD_1234] di bawah dengan hasilnya

-- Update username jadi huruf kapital
UPDATE users SET username = UPPER(username) WHERE roleId = 2;

-- Update password jadi hash dari '1234' 
-- GANTI [HASH_PASSWORD_1234] dengan hasil dari command di atas!
UPDATE users SET password = '$2b$10$EqEbv0qOJAlL1tGtr3siXuFHJf9Qd2z1hJ3i4k5m6n7o8p9q0r1s2t' WHERE roleId = 2;
