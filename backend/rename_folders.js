const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function run() {
  const c = await mysql.createConnection({user:'root', password:'', database:'ppsu_monitoring'});
  const [rows] = await c.query('SELECT id, username, fullName, photoUrl FROM users WHERE photoUrl IS NOT NULL');
  
  const basePath = 'd:/xampp/htdocs/petukangan/public';
  let updatedCount = 0;

  for(const user of rows) {
    if (!user.photoUrl.startsWith('/gambar/petugas/')) continue;
    
    // Original photoUrl: /gambar/petugas/Sutrisno_Firmansyah/foto.jpg 
    
    const parts = user.photoUrl.split('/');
    if (parts.length < 5) continue;
    
    const oldFolderName = parts[3];
    const fileName = parts[4];
    
    const cleanUsername = user.username ? user.username.replace(/[^a-zA-Z0-9]/g, '_') : 'ID';
    const cleanFullName = user.fullName ? user.fullName.replace(/[^a-zA-Z0-9]/g, '_') : 'Nama';
    const newFolderName = `${cleanUsername}_${cleanFullName}`;
    
    if (oldFolderName === newFolderName) continue;
    
    const oldDirPath = path.join(basePath, 'gambar', 'petugas', oldFolderName);
    const newDirPath = path.join(basePath, 'gambar', 'petugas', newFolderName);
    
    try {
      if (fs.existsSync(oldDirPath)) {
        if (!fs.existsSync(newDirPath)) {
           fs.renameSync(oldDirPath, newDirPath);
        } else {
           // Move file to new dir if it exists
           fs.copyFileSync(path.join(basePath, user.photoUrl), path.join(newDirPath, fileName));
        }
        
        const newPhotoUrl = `/gambar/petugas/${newFolderName}/${fileName}`;
        await c.query('UPDATE users SET photoUrl = ? WHERE id = ?', [newPhotoUrl, user.id]);
        updatedCount++;
        console.log(`Updated: ${oldFolderName} -> ${newFolderName}`);
      }
    } catch (e) {
      console.error(`Failed to rename ${oldFolderName}`, e);
    }
  }
  
  console.log(`Finished renaming ${updatedCount} folders.`);
  c.end();
}
run();
