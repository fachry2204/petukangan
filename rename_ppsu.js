const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walk(dirPath, callback);
        } else {
            callback(path.join(dir, f));
        }
    });
}

function replaceInFile(filePath) {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.json') && !filePath.endsWith('.js') && !filePath.endsWith('.css')) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Replace "Ppsu" -> "Pjlp"
    content = content.replace(/Ppsu/g, 'Pjlp');
    // Replace "PPSU" -> "PJLP"
    content = content.replace(/PPSU/g, 'PJLP');
    // Replace "ppsu" -> "pjlp"
    content = content.replace(/ppsu/g, 'pjlp');
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

const targetDirs = [
    path.join(__dirname, 'src'),
    path.join(__dirname, 'public')
];

targetDirs.forEach(dir => {
    walk(dir, replaceInFile);
});
