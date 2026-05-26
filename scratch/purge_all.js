const fs = require('fs');

const files = [
    'header_demo.html',
    'index.html',
    'admin/dashboard.html',
    'admin/login.html',
    'student/apply.html',
    'student/dashboard.html',
    'student/exam.html',
    'student/forgot.html',
    'student/login.html',
    'student/receipt.html',
    'student/result.html'
];

files.forEach(file => {
    const path = `c:/CET EXAM ONLINE/${file}`;
    if (!fs.existsSync(path)) return;
    const buffer = fs.readFileSync(path);
    let content = buffer.toString('utf8');

    // Strip all C1 control characters (U+0080 to U+009F)
    // and other dangerous control characters
    content = content.replace(/[\u0080-\u009F\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

    // Also manually fix the specific arrow issues
    content = content.split('←').join('&larr;');
    content = content.split('→').join('&rarr;');

    fs.writeFileSync(path, content, 'utf8');
    console.log(`Purged ${file}`);
});
console.log('All files purged.');
