
const fs = require('fs');
const path = require('path');

const storesDir = path.join(__dirname, 'stores');
const utilsImport = "import { generateUUID } from '../utils/uuidUtils';";

fs.readdirSync(storesDir).forEach(file => {
    if (!file.endsWith('.ts')) return;

    const filePath = path.join(storesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Check if file uses crypto.randomUUID
    if (content.includes('crypto.randomUUID()')) {
        console.log(`Fixing ${file}...`);

        // Replace method call
        content = content.replace(/crypto\.randomUUID\(\)/g, 'generateUUID()');

        // Add import if missing
        if (!content.includes(utilsImport) && !content.includes('from \'../utils/uuidUtils\'')) {
            content = utilsImport + '\n' + content;
        }

        fs.writeFileSync(filePath, content);
    }
});

console.log('UUID Fix Complete.');
