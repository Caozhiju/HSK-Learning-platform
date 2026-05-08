/**
 * 利用新华字典 (word.json + ci.json) 为 HSK 词汇批量补充释义
 * 用法：node scripts/add-definitions-from-dict.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── 加载新华字典 ──────────────────────────────────────────
console.log('📖 加载新华字典...');
const wordData = JSON.parse(readFileSync('d:/word.json', 'utf-8'));
const ciData = JSON.parse(readFileSync('d:/ci.json', 'utf-8'));
console.log(`  word.json: ${wordData.length} 字`);
console.log(`  ci.json:   ${ciData.length} 词`);

// ── 构建联合查找表 ────────────────────────────────────────
const lookup = new Map();

// ci.json 优先（多字词的释义通常更准确）
for (const entry of ciData) {
  if (entry.ci && entry.explanation) {
    lookup.set(entry.ci, entry.explanation);
  }
}

// word.json 补充单字
for (const entry of wordData) {
  if (entry.word && entry.explanation) {
    if (!lookup.has(entry.word)) {
      lookup.set(entry.word, entry.explanation);
    }
  }
}
console.log(`  联合查找表: ${lookup.size} 条\n`);

// ── 提取精简释义 ──────────────────────────────────────────

/**
 * 从新华字典的冗长解释中提取一句精简释义（3-25字）
 */
function extractShortDef(rawExplanation) {
  if (!rawExplanation) return null;

  // 清理：去掉换行标记和多余空白
  let text = rawExplanation.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

  // 策略1：找 "⒈..." 或 "①..." 格式
  const numMatch = text.match(/(?:⒈|①|1[.、．])\s*(.+?)(?:[。；]|$)/);
  if (numMatch) {
    const def = numMatch[1].trim();
    if (def.length >= 2 && def.length <= 30) return cleanDef(def);
  }

  // 策略2：找 "〈名〉..." "〈动〉..." 等词性标注后的释义
  const posMatch = text.match(/〈[^〉]+〉\s*(.+?)(?:[。；]|$)/);
  if (posMatch) {
    const def = posMatch[1].trim();
    if (def.length >= 2 && def.length <= 30) return cleanDef(def);
  }

  // 策略3：取第一个句号前的内容（截取前30字）
  const firstSentence = text.split(/[。；] /)[0].trim();
  if (firstSentence.length >= 2 && firstSentence.length <= 30) {
    return cleanDef(firstSentence);
  }

  // 策略4：直接截取前25字
  const short = text.substring(0, 25).replace(/[，。；、]$/, '').trim();
  if (short.length >= 2) return cleanDef(short);

  return null;
}

/** 清理释义中的标记和冗余内容 */
function cleanDef(text) {
  return text
    .replace(/〈[^〉]*〉/g, '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/如"([^"]*)"[^。；]*/g, '')
    .replace(/例如[^。；]*/g, '')
    .replace(/^[①②③④⑤⒈⒉⒊\d][、.．\s]*/, '')
    .replace(/^[，。；：、]/, '')
    .replace(/[，。；：、]$/, '')
    .replace(/["""「」『』]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/** 判断释义质量是否合格 */
function isGoodDefinition(text) {
  if (!text || text.length < 2 || text.length > 40) return false;
  // 排除纯词性标签
  if (isPOSOnly(text)) return false;
  // 排除学术化/字源解释
  const badPatterns = [
    '象形', '甲骨', '形声', '会意', '指事', '转注', '假借',
    '部首', '笔画', '笔顺', '说文', '康熙', '郑码', 'gbk',
    '编码', 'ㄚˉ', 'ㄚˊ', 'ㄚˇ', 'ㄚ╝',
    '同啊', '同阿', '表示', '古时含义', '古代指',
    '见"', '见《',
  ];
  for (const p of badPatterns) {
    if (text.includes(p)) return false;
  }
  return true;
}

// ── 是否已有真实释义（非词性标签） ────────────────────────
const POS_TAGS = new Set([
  '动', '名', '形', '副', '代', '数', '量', '介', '连', '助', '叹', '拟',
  '头', '尾', '缀', '数词', '量词', '动词', '名词', '形容词', '副词',
  '代词', '介词', '连词', '助词', '叹词', '拟声词', '前缀', '后缀',
]);

function isPOSOnly(def) {
  const d = (def || '').trim();
  if (!d) return true;
  // 纯词性标签（≤4字，不含括号的组合）
  const clean = d.replace(/[（）()【】\[\]]/g, '').trim();
  if (clean.length <= 4 && [...clean].every(c => /[一-鿿]/.test(c))) {
    const parts = clean.split(/[,，、/]/);
    if (parts.every(p => POS_TAGS.has(p.trim()))) return true;
  }
  return false;
}

// ── 主流程 ──────────────────────────────────────────────────

const hskPath = path.join(__dirname, '..', 'public', 'hsk3.0_vocab.json');
const hskData = JSON.parse(readFileSync(hskPath, 'utf-8'));

let dictFound = 0;
let dictUpdated = 0;
let skipped = 0;

const levels = [...new Set(hskData.map(e => e.level))].sort();
for (const level of levels) {
  const items = hskData.filter(e => e.level === level);
  let levelFound = 0;
  let levelUpdated = 0;

  for (const entry of items) {
    // 跳过已有真实释义的词
    if (!isPOSOnly(entry.definition)) {
      skipped++;
      continue;
    }

    const rawDef = lookup.get(entry.word);
    if (!rawDef) continue;

    levelFound++;
    const shortDef = extractShortDef(rawDef);
    if (shortDef && isGoodDefinition(shortDef)) {
      entry.definition = shortDef;
      levelUpdated++;
    }
  }

  dictFound += levelFound;
  dictUpdated += levelUpdated;
  console.log(`HSK ${level}: 字典匹配 ${levelFound}, 成功提取 ${levelUpdated}/${items.length}`);
}

// 保存
writeFileSync(hskPath, JSON.stringify(hskData, null, 2), 'utf-8');

console.log(`\n✅ 完成！`);
console.log(`  字典找到: ${dictFound} 词`);
console.log(`  成功提取: ${dictUpdated} 词`);
console.log(`  已有释义跳过: ${skipped} 词`);
console.log(`  字典未收录: ${hskData.length - dictFound - skipped} 词`);
console.log(`  文件: ${hskPath}`);
