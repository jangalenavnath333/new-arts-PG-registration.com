const fs = require('fs');
const html = fs.readFileSync('admin/dashboard.html', 'utf8');
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let i = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  const content = match[1];
  if (content.trim()) {
    const filename = `scratch/script_${i}.js`;
    fs.writeFileSync(filename, content);
    console.log(`Saved script_${i}.js (length: ${content.length})`);
    try {
      require('child_process').execSync(`node -c ${filename}`, { stdio: 'pipe' });
      console.log(`script_${i}.js syntax is valid.`);
    } catch (e) {
      console.log(`script_${i}.js syntax error:`, e.stderr.toString());
    }
  } else {
    console.log(`script_${i} is empty (probably an external src).`);
  }
  i++;
}
