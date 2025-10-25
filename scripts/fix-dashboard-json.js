import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const languages = ['ar', 'cy', 'de', 'el', 'es', 'fr', 'id', 'it', 'ko', 'nl', 'pt', 'ru', 'zh'];

languages.forEach(lang => {
  const filePath = path.join(__dirname, `../client/src/locales/${lang}/dashboard.json`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const fixed = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Skip duplicate closing braces pattern
      if (trimmed === '},') {
        const nextLine = lines[i + 1];
        if (nextLine && (nextLine.trim() === '  "accessibility":' || nextLine.trim() === '  "units":')) {
          // Don't skip, keep this line but check if it's valid
          fixed.push(line);
        } else if (nextLine && (nextLine.trim() === '},' || nextLine.trim() === '}')) {
          // Skip this duplicate closing brace
          continue;
        } else {
          fixed.push(line);
        }
      } else {
        fixed.push(line);
      }
    }
    
    const fixedContent = fixed.join('\n');
    
    // Try to parse to validate
    JSON.parse(fixedContent);
    
    fs.writeFileSync(filePath, fixedContent);
    console.log(`✓ Fixed ${lang}/dashboard.json`);
  } catch (err) {
    console.error(`✗ Error fixing ${lang}/dashboard.json:`, err.message);
  }
});

console.log('Done!');
