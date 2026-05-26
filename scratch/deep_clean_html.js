const fs = require('fs');
const path = 'c:/CET EXAM ONLINE/student/apply.html';
let content = fs.readFileSync(path, 'utf8');

// Aggressively replace all known corrupted sequences
const map = {
  'â† ': '← ',
  'â†': '←',
  'â†’': '→',
  'â€”': '—',
  'â‚¹': '₹',
  'âš ': '⚠',
  'âœ…': '✅',
  'â ³': '⌛',
  'ðŸš€': '🚀',
  'ðŸ“‹': '📋',
  'ðŸ“²': '📱',
  'ðŸ“±': '📱',
  'ðŸŸ£': '🟣',
  'ðŸ”µ': '🔵',
  'ðŸ”·': '🟠',
  'ðŸ ¦': '🏦',
  'ðŸ“¸': '📸',
  'ðŸ“¤': '📤',
  'ðŸ‘¤': '👤',
  'ðŸŽ“': '🎓',
  'ðŸ’³': '💳',
  'ðŸ“„': '📄',
  'ðŸªª': '🪪',
  'ðŸ“œ': '📜',
  'ðŸ–¼ï¸ ': '🖼️',
  'Â·': '•',
  'â€¢': '•',
  'â€“': '–',
  'â€™': "'",
  'â€œ': '"',
  'â€ ': '"',
  'â€¦': '...',
  'ðŸ“·': '📸'
};

for (const [corrupted, clean] of Object.entries(map)) {
  content = content.split(corrupted).join(clean);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Deep Cleanup complete.');
