const fs = require('fs');
const path = 'c:/CET EXAM ONLINE/student/apply.html';
let content = fs.readFileSync(path, 'utf8');

// Replace corrupted arrow sequences
content = content.replace(/â† /g, '←');
content = content.replace(/â†’/g, '→');
content = content.replace(/â€”/g, '—');
content = content.replace(/â‚¹/g, '₹');
content = content.replace(/âš /g, '⚠');
content = content.replace(/âœ…/g, '✅');
content = content.replace(/â ³/g, '⌛');

fs.writeFileSync(path, content, 'utf8');
console.log('Cleanup complete.');
