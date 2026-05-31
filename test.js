const fs = require('fs');
const content = fs.readFileSync('c:/CET EXAM ONLINE/admin/dashboard.html', 'utf8');

const lines = content.split('\n');
let insideScript = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<script type="module"')) {
    insideScript = true;
  }
  if (insideScript && lines[i].includes('`')) {
    console.log(`Line ${i+1}: ${lines[i]}`);
  }
  if (insideScript && lines[i].includes('</script>')) {
    insideScript = false;
  }
}
