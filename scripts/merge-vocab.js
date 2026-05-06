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

// Keep all entries, sort by level then word
allVocab.sort((a, b) => a.level - b.level || a.word.localeCompare(b.word, 'zh'));

const outputPath = path.join(publicDir, 'hsk3.0_vocab.json');
fs.writeFileSync(outputPath, JSON.stringify(allVocab, null, 2), 'utf-8');
console.log(`Merged ${allVocab.length} total entries from ${files.length} files`);
console.log(`Output: ${outputPath}`);
