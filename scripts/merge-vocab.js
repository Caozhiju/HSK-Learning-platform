const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const files = fs.readdirSync(publicDir).filter(f => f.startsWith('最新hsk3.0大纲') && f.endsWith('.json'));

const allVocab = [];

files.forEach(file => {
  const content = fs.readFileSync(path.join(publicDir, file), 'utf-8');
  const data = JSON.parse(content);
  data.forEach(entry => {
    allVocab.push({
      word: entry.word,
      level: parseInt(entry.level, 10),
      pinyin: entry.pinyin || undefined,
      definition: entry.pos || undefined,
    });
  });
});

// Remove duplicates by word (keep first occurrence / lowest level)
const seen = new Set();
const unique = allVocab.filter(v => {
  if (seen.has(v.word)) return false;
  seen.add(v.word);
  return true;
});

const outputPath = path.join(publicDir, 'hsk3.0_vocab.json');
fs.writeFileSync(outputPath, JSON.stringify(unique, null, 2), 'utf-8');
console.log(`Merged ${allVocab.length} entries (${unique.length} unique) from ${files.length} files`);
console.log(`Output: ${outputPath}`);
