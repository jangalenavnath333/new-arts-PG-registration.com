const fs = require('fs');
const { execSync } = require('child_process');

const content = fs.readFileSync('c:/CET EXAM ONLINE/admin/dashboard.html', 'utf8');
const scripts = [...content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];

for (let i = 0; i < scripts.length; i++) {
  fs.writeFileSync('scratch' + i + '.js', scripts[i][1]);
  try {
    execSync('node -c scratch' + i + '.js', { stdio: 'inherit' });
    console.log(`Script ${i} is OK.`);
  } catch(e) {
    console.error(`Script ${i} has an error!`);
    break; // stop on first error
  }
}
