/**
 * 批量测试脚本：对比 HSK 1/2/3 级的超纲词修正效果
 *
 * 1. 每级生成 50 条 ~50 字的汉语文本
 * 2. 逐条调用 /api/analyze 检测超纲词
 * 3. 逐条调用 /api/rewrite 进行 Base Rewrite 修正
 * 4. 输出 xlsx 对比表
 *
 * 用法：node scripts/batch-test.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import OpenAI from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:3000';

// ── 加载 API Key ──────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
let OPENAI_API_KEY = '';
let OPENAI_BASE_URL = '';
let LLM_MODEL = 'gpt-4o-mini';
try {
  const envContent = readFileSync(envPath, 'utf-8');
  const keyMatch = envContent.match(/OPENAI_API_KEY\s*=\s*(.+)/);
  if (keyMatch) OPENAI_API_KEY = keyMatch[1].trim();
  const urlMatch = envContent.match(/OPENAI_BASE_URL\s*=\s*(.+)/);
  if (urlMatch) OPENAI_BASE_URL = urlMatch[1].trim();
  const modelMatch = envContent.match(/LLM_MODEL\s*=\s*(.+)/);
  if (modelMatch) LLM_MODEL = modelMatch[1].trim();
} catch {
  console.error('❌ 无法读取 .env.local');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  baseURL: OPENAI_BASE_URL || undefined,
});

const TEXTS_PER_LEVEL = 50;
const MAX_CONCURRENCY = 5;

/** 按 HSK 等级的典型句子长度约束 */
const LEVEL_LENGTH = {
  1: { chars: 8, desc: '3-8字短句' },
  2: { chars: 18, desc: '10-20字的1-2个短句' },
  3: { chars: 28, desc: '15-30字的2-3个短句' },
};

// ── 工具函数 ──────────────────────────────────────────────────

/** 统计汉字数量（仅中文字符） */
function countChineseChars(text) {
  const matches = text.match(/[一-鿿]/g);
  return matches ? matches.length : 0;
}

/** 统计总字符数 */
function countChars(text) {
  return text.replace(/\s/g, '').length;
}

/** 按并发数并行执行 */
async function parallelLimit(tasks, limit) {
  const results = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      try {
        results[i] = await tasks[i]();
      } catch (err) {
        results[i] = { error: err.message };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

/** 延迟 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── 第 1 步：生成文本 ─────────────────────────────────────────

const TOPICS = [
  '日常生活', '家庭', '学校', '购物', '交通',
  '饮食', '天气', '爱好', '工作', '旅行',
  '朋友', '健康', '节日', '运动', '音乐',
  '动物', '颜色', '数字', '时间', '地点',
];

async function generateTextsForLevel(level, count) {
  const texts = [];
  const batchSize = 10;
  const batches = Math.ceil(count / batchSize);
  const cfg = LEVEL_LENGTH[level] || { chars: 30, desc: '中等长度文本' };

  console.log(`\n📝 生成 HSK ${level} 级样本 (目标 ${count} 条, 每条约 ${cfg.chars} 字, ${cfg.desc})...`);

  for (let b = 0; b < batches; b++) {
    const need = Math.min(batchSize, count - texts.length);
    const topicSlice = TOPICS.slice((b * 3) % TOPICS.length, (b * 3) % TOPICS.length + 3);

    const prompt = level <= 2
      ? `请生成 ${need} 个 HSK ${level} 级中文学习者能阅读的短句，每个约 ${cfg.chars} 个汉字。

主题方向：${topicSlice.join('、')}

要求：
- 每个是一个自然的日常短句（不一定是完整段落）
- 每个约 ${cfg.chars} 个汉字
- 语言贴近学习者水平，但不必刻意回避稍难的词

请直接输出，每行一个句子，不要编号，不要加引号。`
      : `请生成 ${need} 个面向 HSK ${level} 级中文学习者的短文本，每个约 ${cfg.chars} 个汉字。

主题方向：${topicSlice.join('、')}

要求：
- 语言自然，贴近日常生活
- 每个文本约 ${cfg.chars} 个汉字（1-3个短句）
- 不需要刻意限制词汇等级

请直接输出，每行一个文本，不要编号，不要加引号。`;

    try {
      const completion = await openai.chat.completions.create({
        model: LLM_MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = completion.choices[0]?.message?.content || '';
      const minLen = level === 1 ? 3 : level === 2 ? 8 : 12;
      const lines = content
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length >= minLen && /[一-鿿]/.test(l));

      for (const line of lines) {
        if (texts.length >= count) break;
        texts.push(line);
      }

      console.log(`  批次 ${b + 1}/${batches}: 获取 ${lines.length} 条, 累计 ${texts.length}/${count}`);
    } catch (err) {
      console.error(`  批次 ${b + 1} 生成失败:`, err.message);
    }

    if (b < batches - 1) await sleep(500);
  }

  return texts.slice(0, count);
}

// ── 第 2 步：分析文本 ─────────────────────────────────────────

async function analyzeText(text, targetLevel) {
  const res = await fetch(`${BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLevel }),
  });
  return res.json();
}

// ── 第 3 步：重写文本 ─────────────────────────────────────────

async function rewriteText(text, targetLevel) {
  const res = await fetch(`${BASE_URL}/api/rewrite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLevel }),
  });
  return res.json();
}

// ── 主流程 ────────────────────────────────────────────────────

async function main() {
  console.log('🧪 HSK 超纲词修正 批量对比测试');
  console.log('═'.repeat(60));
  console.log(`配置: ${TEXTS_PER_LEVEL} 条/级 × 3 级 = ${TEXTS_PER_LEVEL * 3} 条样本`);
  console.log(`并发: ${MAX_CONCURRENCY}\n`);

  const levels = [1, 2, 3];
  const allData = {}; // { level: [{ text, analysis, rewrite }] }

  // ═══ 生成全部文本 ═══
  const allTexts = {};
  for (const level of levels) {
    allTexts[level] = await generateTextsForLevel(level, TEXTS_PER_LEVEL);
    console.log(`  ✓ HSK ${level}: 最终 ${allTexts[level].length} 条`);
  }

  // ═══ 分析全部文本 ═══
  console.log('\n📊 开始分析超纲词...');
  for (const level of levels) {
    const texts = allTexts[level];
    console.log(`\n  分析 HSK ${level} 级 (${texts.length} 条)...`);

    const tasks = texts.map((text) => () => analyzeText(text, level));
    const results = await parallelLimit(tasks, MAX_CONCURRENCY);

    allData[level] = texts.map((text, i) => ({
      text,
      analysis: results[i]?.success ? results[i] : null,
      rewrite: null,
    }));

    const analyzed = allData[level].filter((d) => d.analysis).length;
    const totalOOV = allData[level].reduce((sum, d) => sum + (d.analysis?.outOfLevelCount || 0), 0);
    console.log(`  ✓ 完成 ${analyzed}/${texts.length}, 共 ${totalOOV} 个超纲词`);
  }

  // ═══ 重写有超纲词的文本 ═══
  console.log('\n🤖 开始 Base Rewrite 修正...');
  for (const level of levels) {
    const items = allData[level];
    const toRewrite = items.filter((d) => d.analysis && d.analysis.outOfLevelCount > 0);
    console.log(`\n  修正 HSK ${level} 级 (${toRewrite.length}/${items.length} 条需修正)...`);

    if (toRewrite.length === 0) {
      console.log('  ✓ 无需修正，全部合规');
      continue;
    }

    const tasks = toRewrite.map((item) => () => rewriteText(item.text, level));
    const results = await parallelLimit(tasks, MAX_CONCURRENCY);

    let rewrittenCount = 0;
    let totalIterations = 0;
    let remainingOOV = 0;

    results.forEach((res, i) => {
      if (res?.success) {
        toRewrite[i].rewrite = res;
        rewrittenCount++;
        totalIterations += res.iterations || 0;
        if (res.hasOutOfLevelWords) {
          remainingOOV += (res.outOfLevelWords || []).length;
        }
      }
    });

    console.log(`  ✓ 修正 ${rewrittenCount}/${toRewrite.length} 条`);
    console.log(`    总迭代次数: ${totalIterations}, 残留超纲词: ${remainingOOV}`);
  }

  // ═══ 输出 xlsx ═══
  console.log('\n📋 生成 xlsx 对比表...');

  const rows = [];
  const header = [
    '目标等级',
    '样本编号',
    '原始文本',
    '原始字数',
    '原始超纲词数',
    '原始超纲词及等级',
    '修正后文本',
    '修正后字数',
    '修正后超纲词数',
    '修正后超纲词及等级',
    '迭代次数',
  ];

  for (const level of levels) {
    for (let i = 0; i < allData[level].length; i++) {
      const d = allData[level][i];
      const a = d.analysis;
      const r = d.rewrite;

      // 原始超纲词详情
      let origOOVDetail = '';
      if (a && a.outOfLevelCount > 0) {
        const oovTokens = a.tokens.filter((t) => t.isOutOfLevel);
        const seen = new Set();
        const unique = [];
        for (const t of oovTokens) {
          if (!seen.has(t.token)) {
            seen.add(t.token);
            unique.push(`${t.token}(L${t.level})`);
          }
        }
        origOOVDetail = unique.join(', ');
      }

      // 修正后超纲词详情
      let rewOOVDetail = '';
      if (r && r.hasOutOfLevelWords && r.outOfLevelWords) {
        rewOOVDetail = r.outOfLevelWords.join(', ');
      }

      rows.push([
        `HSK ${level}`,
        i + 1,
        d.text,
        countChars(d.text),
        a ? a.outOfLevelCount : '-',
        origOOVDetail || '-',
        r ? r.rewrittenText : (a && a.outOfLevelCount === 0 ? '(无需修正)' : '(未修正)'),
        r ? countChars(r.rewrittenText) : '',
        r ? (r.hasOutOfLevelWords ? (r.outOfLevelWords || []).length : 0) : '',
        rewOOVDetail || (r && !r.hasOutOfLevelWords ? '✓ 全部清除' : ''),
        r ? r.iterations : '',
      ]);
    }
  }

  // 创建工作簿
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

  // 设置列宽
  ws['!cols'] = [
    { wch: 8 },   // 目标等级
    { wch: 8 },   // 样本编号
    { wch: 50 },  // 原始文本
    { wch: 8 },   // 原始字数
    { wch: 10 },  // 原始超纲词数
    { wch: 40 },  // 原始超纲词及等级
    { wch: 50 },  // 修正后文本
    { wch: 8 },   // 修正后字数
    { wch: 10 },  // 修正后超纲词数
    { wch: 40 },  // 修正后超纲词及等级
    { wch: 8 },   // 迭代次数
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'HSK超纲词修正对比');

  const outPath = path.join(__dirname, '..', 'public', 'hsk-rewrite-comparison.xlsx');
  XLSX.writeFile(wb, outPath);
  console.log(`\n✅ 文件已保存: ${outPath}`);
  console.log(`   下载地址: ${BASE_URL}/hsk-rewrite-comparison.xlsx`);

  // ═══ 汇总 ═══
  console.log('\n📊 汇总统计');
  console.log('═'.repeat(60));
  for (const level of levels) {
    const items = allData[level];
    const analyzed = items.filter((d) => d.analysis).length;
    const totalOrigOOV = items.reduce((sum, d) => sum + (d.analysis?.outOfLevelCount || 0), 0);
    const rewritten = items.filter((d) => d.rewrite?.success).length;
    const totalRewOOV = items.reduce((sum, d) => {
      if (d.rewrite?.hasOutOfLevelWords) return sum + (d.rewrite.outOfLevelWords || []).length;
      return sum;
    }, 0);
    const totalIters = items.reduce((sum, d) => sum + (d.rewrite?.iterations || 0), 0);

    console.log(`\nHSK ${level} 级:`);
    console.log(`  样本数: ${analyzed}`);
    console.log(`  原始超纲词总数: ${totalOrigOOV}`);
    console.log(`  修正后残留超纲词: ${totalRewOOV}`);
    console.log(`  清除率: ${totalOrigOOV > 0 ? ((1 - totalRewOOV / totalOrigOOV) * 100).toFixed(1) : '100'}%`);
    console.log(`  总迭代次数: ${totalIters}`);
    console.log(`  已修正: ${rewritten}/${analyzed}`);
  }
}

main().catch((err) => {
  console.error('❌ 脚本出错:', err);
  process.exit(1);
});
