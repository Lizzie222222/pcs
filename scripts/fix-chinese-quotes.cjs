const fs = require('fs');

// Read the file
let content = fs.readFileSync('client/src/locales/zh/admin.json', 'utf8');

// Replace all Chinese quotation marks with escaped ASCII quotes
// " (U+201C) and " (U+201D) -> \"
content = content.replace(/"/g, '\\"').replace(/"/g, '\\"');

// Write back
fs.writeFileSync('client/src/locales/zh/admin.json', content, 'utf8');

console.log('✅ Fixed all Chinese quotation marks');

// Validate JSON
try {
  const data = JSON.parse(content);
  console.log('✅ JSON is now valid!');
} catch (e) {
  console.log('❌ JSON still has errors:', e.message);
}
