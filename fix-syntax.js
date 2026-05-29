const fs = require('fs');
const file = 'student/apply.html';
let content = fs.readFileSync(file, 'utf8');

// Replace any occurrence of single quotes containing ${} with backticks
const replaced = content.replace(/'([^']*\$\{[^}]*\}[^']*)'/g, '`$1`');

if (replaced !== content) {
  fs.writeFileSync(file, replaced, 'utf8');
  console.log('Fixed syntax errors in apply.html');
} else {
  console.log('No single quotes with ${} found.');
}
