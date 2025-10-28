const fs = require('fs');

// Read the file
let content = fs.readFileSync('client/src/locales/zh/admin.json', 'utf8');

// This will restore improperly escaped quotes first
content = content.replace(/\\\\"/g, '"');

// Now replace only Chinese quotation marks (U+201C and U+201D) with escaped ASCII quotes
// These are the curly quotes: " and "
content = content.replace(/"/g, '\\"');
content = content.replace(/"/g, '\\"');

// Write back
fs.writeFileSync('client/src/locales/zh/admin.json', content, 'utf8');

console.log('✅ Fixed Chinese quotation marks');

// Validate JSON
try {
  const data = JSON.parse(content);
  console.log('✅ JSON is now valid!');
} catch (e) {
  console.log('❌ JSON error:', e.message);
  console.log('Position:', e.toString().match(/position (\d+)/)?.[1]);
}
