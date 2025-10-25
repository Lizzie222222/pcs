import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Language codes
const languages = ['ar', 'cy', 'de', 'el', 'es', 'fr', 'id', 'it', 'ko', 'nl', 'pt', 'ru', 'zh'];

// JSON files to propagate
const jsonFiles = ['common.json', 'resources.json', 'admin.json', 'dashboard.json', 'landing.json'];

// Propagate all JSON files
jsonFiles.forEach(jsonFile => {
  console.log(`\nProcessing ${jsonFile}...`);
  
  const enPath = path.join(__dirname, `../client/src/locales/en/${jsonFile}`);
  
  if (!fs.existsSync(enPath)) {
    console.log(`  ⚠ Skipping ${jsonFile} - not found in /en/`);
    return;
  }
  
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  
  // Propagate to all languages
  languages.forEach(lang => {
    const targetPath = path.join(__dirname, `../client/src/locales/${lang}/${jsonFile}`);
    
    try {
      // Read existing translations
      const existing = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      
      // Deep merge new keys (keeping existing translations)
      const merged = deepMerge(existing, enData);
      
      // Write back
      fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2) + '\n');
      console.log(`  ✓ Updated ${lang}/${jsonFile}`);
    } catch (err) {
      console.error(`  ✗ Error updating ${lang}/${jsonFile}:`, err.message);
    }
  });
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

console.log('\n✅ Translation propagation complete!');
