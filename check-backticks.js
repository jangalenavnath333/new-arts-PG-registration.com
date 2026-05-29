const fs = require('fs');
const content = fs.readFileSync('student/apply.html', 'utf8');

const regex = /<script.*?>([\s\S]*?)<\/script>/gi;
let match;
while ((match = regex.exec(content)) !== null) {
  const scriptContent = match[1];
  const backticks = (scriptContent.match(/`/g) || []).length;
  console.log('Script block has ' + backticks + ' backticks');
}
