const fs = require('fs');

// Read the corrupted file
let content = fs.readFileSync('client/src/locales/zh/admin.json', 'utf8');

// Step 1: Restore all the escaped quotes back to normal
content = content.replace(/\\\\/g, '\\');  // Replace \\\\ with \
content = content.replace(/\\"/g, '"');     // Replace \\" with "

// Step 2: Now replace ONLY Chinese quotation marks (U+201C " and U+201D ") with escaped quotes
// We need to be careful to only replace these within JSON string values
const lines = content.split('\n');
const fixed = lines.map(line => {
  // Only process lines that contain Chinese quotation marks within values
  if ((line.includes('"') || line.includes('"')) && line.includes(':')) {
    // Replace Chinese quotes that appear after the colon (in the value part)
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const before = line.substring(0, colonIndex + 1);
      const after = line.substring(colonIndex + 1);
      const fixedAfter = after.replace(/"/g, '\\"').replace(/"/g, '\\"');
      return before + fixedAfter;
    }
  }
  return line;
});

content = fixed.join('\n');

// Write back
fs.writeFileSync('client/src/locales/zh/admin.json', content, 'utf8');

console.log('✅ Restored and fixed file');

// Validate JSON
try {
  const data = JSON.parse(content);
  console.log('✅ JSON is now valid!');
} catch (e) {
  console.log('❌ JSON error:', e.message);
  
  // Find approximate line number
  const pos = parseInt(e.toString().match(/position (\d+)/)?.[1]);
  if (pos) {
    const beforeError = content.substring(0, pos);
    const lineNum = (beforeError.match(/\n/g) || []).length + 1;
    console.log(`Error around line ${lineNum}`);
    console.log('Context:', content.substring(pos - 50, pos + 50));
  }
}
