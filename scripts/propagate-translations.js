import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Language codes
const languages = ['ar', 'cy', 'de', 'el', 'es', 'fr', 'id', 'it', 'ko', 'nl', 'pt', 'ru', 'zh'];

// Read English common.json
const enCommonPath = path.join(__dirname, '../client/src/locales/en/common.json');
const enCommon = JSON.parse(fs.readFileSync(enCommonPath, 'utf8'));

// Propagate to all languages
languages.forEach(lang => {
  const targetPath = path.join(__dirname, `../client/src/locales/${lang}/common.json`);
  
  try {
    // Read existing translations
    const existing = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    
    // Deep merge new keys (keeping existing translations)
    const merged = deepMerge(existing, enCommon);
    
    // Write back
    fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2) + '\n');
    console.log(`✓ Updated ${lang}/common.json`);
  } catch (err) {
    console.error(`✗ Error updating ${lang}/common.json:`, err.message);
  }
});

function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else if (!(key in result)) {
      // Only add if key doesn't exist
      result[key] = source[key];
    }
  }
  
  return result;
}

console.log('Translation propagation complete!');
