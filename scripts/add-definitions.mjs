/**
 * 为 HSK 词汇批量生成中文释义
 * 用法：node scripts/add-definitions.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import OpenAI from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── 加载配置 ──────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
let OPENAI_API_KEY = '';
let OPENAI_BASE_URL = '';
let LLM_MODEL = 'gpt-4o-mini';
try {
  const envContent = readFileSync(envPath, 'utf-8');
  const km = envContent.match(/OPENAI_API_KEY\s*=\s*(.+)/);
  if (km) OPENAI_API_KEY = km[1].trim();
  const um = envContent.match(/OPENAI_BASE_URL\s*=\s*(.+)/);
  if (um) OPENAI_BASE_URL = um[1].trim();
  const mm = envContent.match(/LLM_MODEL\s*=\s*(.+)/);
  if (mm) LLM_MODEL = mm[1].trim();
} catch { console.error('❌ 无法读取 .env.local'); process.exit(1); }

const openai = new OpenAI({ apiKey: OPENAI_API_KEY, baseURL: OPENAI_BASE_URL || undefined });

// ── 判断是否为仅词性的定义 ────────────────────────────────
// 词性标签：动、名、形、副、代、数、量、介、连、助、叹、拟、头、尾、缀
const POS_TAGS = new Set([
  '动', '名', '形', '副', '代', '数', '量', '介', '连', '助', '叹', '拟',
  '头', '尾', '缀', '数词', '量词', '动词', '名词', '形容词', '副词',
  '代词', '介词', '连词', '助词', '叹词', '拟声词', '前缀', '后缀',
]);

function needsDefinition(entry) {
  const def = (entry.definition || '').trim();
  if (!def) return true;
  // 如果定义只有词性标签（≤4 个汉字且全是词性词）
  if (def.length <= 4 && POS_TAGS.has(def)) return true;
  return false;
}

// ── 批量生成释义 ──────────────────────────────────────────

async function generateDefinitions(batch, level) {
  const wordList = batch.map((e) => e.word).join('、');

  const prompt = `你是中文词典编辑。请为以下 HSK ${level} 级词汇写出简洁的中文释义（每个释义 3-10 个字，适合二语学习者理解）。

词汇：${wordList}

请严格按以下格式输出（每行一个，不要编号）：
词汇：释义

示例：
爱：对人或事物有很深的感情
爸爸：父亲，口语
八：数字，七加一`;

  const completion = await openai.chat.completions.create({
    model: LLM_MODEL,
    max_tokens: 1024,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = completion.choices[0]?.message?.content || '';
  const result = {};

  for (const line of content.split('\n')) {
    const colonIdx = line.indexOf('：');
    if (colonIdx === -1) continue;
    const word = line.substring(0, colonIdx).trim().replace(/["""]/g, '');
    const def = line.substring(colonIdx + 1).trim();
    if (word && def && def.length >= 2) {
      result[word] = def;
    }
  }

  return result;
}

// ── 主流程 ────────────────────────────────────────────────

async function main() {
  const vocabPath = path.join(__dirname, '..', 'public', 'hsk3.0_vocab.json');
  const vocabData = JSON.parse(readFileSync(vocabPath, 'utf-8'));

  // 按等级分组，找出需要释义的词
  const levelGroups = {};
  for (const entry of vocabData) {
    if (!levelGroups[entry.level]) levelGroups[entry.level] = [];
    levelGroups[entry.level].push(entry);
  }

  // 仅处理指定等级（留空=全部）
  const ONLY_LEVELS = [2, 3, 4];  // HSK 2-4 优先
  const levels = (ONLY_LEVELS.length > 0 ? ONLY_LEVELS : Object.keys(levelGroups).map(Number)).sort((a, b) => a - b);
  let totalNeedsDef = 0;
  let totalGenerated = 0;

  console.log('📖 HSK 词汇释义批量生成');
  console.log('═'.repeat(50));
  console.log(`模型: ${LLM_MODEL}`);
  console.log(`总词汇: ${vocabData.length}`);
  if (ONLY_LEVELS.length > 0) console.log(`⚠ 仅处理 HSK ${ONLY_LEVELS.join(',')} 级`);
  console.log('');

  for (const level of levels) {
    const entries = levelGroups[level];
    const needsDef = entries.filter(needsDefinition);
    if (needsDef.length === 0) continue;

    totalNeedsDef += needsDef.length;
    console.log(`\nHSK ${level} 级: ${needsDef.length}/${entries.length} 个词需要释义`);

    const BATCH_SIZE = 30;
    for (let i = 0; i < needsDef.length; i += BATCH_SIZE) {
      const batch = needsDef.slice(i, i + BATCH_SIZE);
      console.log(`  批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(needsDef.length / BATCH_SIZE)} (${batch.length} 词)...`);

      let success = false;
      for (let retry = 0; retry < 3 && !success; retry++) {
        try {
          const definitions = await generateDefinitions(batch, level);

          // 写回数据
          for (const entry of batch) {
            if (definitions[entry.word]) {
              entry.definition = definitions[entry.word];
              totalGenerated++;
            }
          }

          console.log(`    ✓ 生成 ${Object.keys(definitions).length} 条释义`);
          success = true;
        } catch (err) {
          const msg = err.message || '';
          if (msg.includes('429') && retry < 2) {
            const wait = (retry + 1) * 5000;
            console.log(`    ⏳ 频率限制，${wait/1000}s 后重试...`);
            await new Promise((r) => setTimeout(r, wait));
          } else {
            console.error(`    ✗ 批次失败:`, msg.substring(0, 60));
          }
        }
      }

      // 避免请求过快
      await new Promise((r) => setTimeout(r, 10000));
    }
  }

  // 保存
  writeFileSync(vocabPath, JSON.stringify(vocabData, null, 2), 'utf-8');
  console.log(`\n✅ 完成！共 ${totalGenerated}/${totalNeedsDef} 个词添加了释义`);
  console.log(`   文件: ${vocabPath}`);
}

main().catch((err) => { console.error('❌', err); process.exit(1); });
