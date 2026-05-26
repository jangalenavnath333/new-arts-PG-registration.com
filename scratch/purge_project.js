const fs = require('fs');
const paths = ['c:/CET EXAM ONLINE/student/apply.html', 'c:/CET EXAM ONLINE/js/db.js'];

paths.forEach(path => {
  const buffer = fs.readFileSync(path);
  let content = buffer.toString('utf8');
  content = content.replace(/[\u0080-\u009F\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  fs.writeFileSync(path, content, 'utf8');
});
console.log('Project Purge complete.');
