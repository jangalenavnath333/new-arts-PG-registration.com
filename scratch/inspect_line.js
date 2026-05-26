const fs = require('fs');
const content = fs.readFileSync('c:/CET EXAM ONLINE/student/apply.html', 'utf8');
const lines = content.split('\n');
const line222 = lines[221]; // 0-indexed
console.log('Line 222 text:', line222);
console.log('Line 222 hex:', Buffer.from(line222).toString('hex'));
console.log('Length:', line222.length);
