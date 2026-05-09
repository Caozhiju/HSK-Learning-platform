import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { OpenAI } from 'openai';
import VocabManager from '@/lib/vocab-manager';

interface VocabEntry {
  word: string;
  level: number;
  pinyin?: string;
  definition?: string;
}

interface WordDetail {
  word: string;
  level: number | null;
  definition?: string;
}

interface RewriteResponse {
  success: boolean;
  originalText: string;
  rewrittenText: string;
  iterations: number;
  maxIterations: number;
  hasOutOfLevelWords: boolean;
  outOfLevelWords?: string[];
  outOfLevelWordDetails?: WordDetail[];
  message?: string;
}

/**
 * 判断是否是标点符号或空格
 */
function isPunctuation(char: string): boolean {
  const punctuationRegex = /[\s\p{P}]/u;
  return punctuationRegex.test(char);
}

/**
 * 将文本按中文标点拆分为句子
 */
function splitSentences(text: string): string[] {
  // 按 。！？.!? 拆分，保留分隔符
  const parts = text.split(/(?<=[。！？.!?])/);
  return parts.filter((s) => s.trim().length > 0).map((s) => s.trim());
}

/**
 * 提取文本中的超纲词
 */
function extractOutOfLevelWords(
  manager: VocabManager,
  text: string,
  targetLevel: number
): { words: string[]; hasOutOfLevel: boolean } {
  const tokens = manager.tokenize(text);
  const outOfLevelWords = new Set<string>();

  tokens.forEach((token) => {
    // 跳过标点和空格
    if (isPunctuation(token)) {
      return;
    }

    const level = manager.checkWordLevel(token);

    // 跳过库外词
    if (level === null) {
      return;
    }

    // 检查是否超纲
    if (level > targetLevel) {
      outOfLevelWords.add(token);
    }
  });

  return {
    words: Array.from(outOfLevelWords),
    hasOutOfLevel: outOfLevelWords.size > 0,
  };
}

/**
 * 初始化 VocabManager
 */
async function ensureVocabManagerInitialized(): Promise<void> {
  const manager = VocabManager.getInstance();

  if (manager.getTotalVocabCount() > 0) {
    return;
  }

  try {
    const vocabPath = path.join(
      process.cwd(),
      'public',
      'hsk3.0_vocab.json'
    );

    let vocabContent = await readFile(vocabPath, 'utf-8');
    // 去除 BOM 标记
    if (vocabContent.charCodeAt(0) === 0xFEFF) {
      vocabContent = vocabContent.slice(1);
    }

    const vocabData = JSON.parse(vocabContent) as VocabEntry[];
    await manager.initialize(vocabData);
  } catch (error) {
    console.error('Failed to initialize VocabManager:', error);
    throw new Error('Failed to load vocabulary data');
  }
}

/**
 * 调用 LLM 进行基础重写（Base Rewrite）
 * 回到 v1 简洁 prompt 格式 + temperature + 等级标注
 */
async function callLLMForRewrite(
  text: string,
  outOfLevelWords: string[],
  targetLevel: number
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set. Please configure it in .env.local'
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });

  const wordList = outOfLevelWords.join('、');

  const prompt = `你是一名专业的国际中文教师。以下原始文本中包含了对于 HSK ${targetLevel} 级学习者来说超纲的词汇。

原始文本：${text}
超纲词列表：${wordList}

请将原始文本改写为纯正的 HSK ${targetLevel} 级（仅限大纲内的基础词）文本。
严格规则：

允许删减：如果超纲词无法用 HSK ${targetLevel} 级词汇自然替换，请直接删除该词或其所在的整个分句。宁可牺牲部分原意，也必须保证句子的绝对自然和简单，绝不能生造病句。

格式禁令：输出的文本必须是干净的纯文本。绝对禁止在输出中使用任何星号 ** 或特殊标记。

防循环禁令：只需输出最终改写好的一段话，严禁重复输出相同的句子。`;

  try {
    const completion = await client.chat.completions.create({
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from LLM');
    }

    return content.trim();
  } catch (error) {
    console.error('LLM API call failed:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to call LLM API'
    );
  }
}

/**
 * 对单条文本执行闭环修正（内部函数）
 */
async function rewriteSingleText(
  manager: VocabManager,
  text: string,
  targetLevel: number
): Promise<{
  rewrittenText: string;
  iterations: number;
  outOfLevelWords: string[];
  hasOutOfLevel: boolean;
}> {
  const MAX_ITERATIONS = 1;  // 单轮足够（qwen 多轮无增益，仅增加延迟）
  let currentText = text;
  let iterationCount = 0;
  let finalOutOfLevelWords: string[] = [];
  let hasOutOfLevel = true;

  while (iterationCount < MAX_ITERATIONS && hasOutOfLevel) {
    iterationCount++;

    const { words, hasOutOfLevel: stillHasOutOfLevel } =
      extractOutOfLevelWords(manager, currentText, targetLevel);

    if (!stillHasOutOfLevel) {
      hasOutOfLevel = false;
      break;
    }

    console.log(`  [句] 第 ${iterationCount} 轮超纲词: ${words.join(', ')}`);

    try {
      const rewrittenText = await callLLMForRewrite(currentText, words, targetLevel);
      currentText = rewrittenText;
    } catch (error) {
      console.error(`  [句] LLM 调用失败:`, error);
      finalOutOfLevelWords = words;
      break;
    }
  }

  const finalCheck = extractOutOfLevelWords(manager, currentText, targetLevel);
  return {
    rewrittenText: currentText,
    iterations: iterationCount,
    outOfLevelWords: finalCheck.words,
    hasOutOfLevel: finalCheck.hasOutOfLevel,
  };
}

/**
 * 文本重写接口 - 基础重写（Base Rewrite）闭环修正工作流
 * POST /api/rewrite
 *
 * 请求体：
 * {
 *   text: string,        // 待修正的原始文本（纯净，无标记）
 *   targetLevel: number  // 目标 HSK 级别
 * }
 *
 * 长文本自动拆句，逐句独立修正后再拼接。
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { text, targetLevel } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Invalid request: text is required and must be a string' },
        { status: 400 }
      );
    }

    if (!targetLevel || typeof targetLevel !== 'number' || targetLevel < 1 || targetLevel > 9) {
      return NextResponse.json(
        { success: false, message: 'Invalid request: targetLevel must be a number between 1 and 9' },
        { status: 400 }
      );
    }

    await ensureVocabManagerInitialized();
    const manager = VocabManager.getInstance();

    const sentences = splitSentences(text);

    console.log(`\n📝 开始重写 | 目标: HSK ${targetLevel} | 句子数: ${sentences.length}`);

    let totalIterations = 0;
    const rewrittenParts: string[] = [];
    let allResidualWords: string[] = [];
    let anyHasOutOfLevel = false;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      console.log(`\n句 ${i + 1}/${sentences.length}: "${sentence}"`);

      const result = await rewriteSingleText(manager, sentence, targetLevel);

      rewrittenParts.push(result.rewrittenText);
      totalIterations += result.iterations;

      if (result.hasOutOfLevel) {
        anyHasOutOfLevel = true;
        allResidualWords = allResidualWords.concat(result.outOfLevelWords);
      }
    }

    const rewrittenText = rewrittenParts.join('');
    const uniqueResidual = Array.from(new Set(allResidualWords));

    // 构建残留超纲词的详细信息（含等级和释义）
    const wordDetails: WordDetail[] = uniqueResidual.map((word) => {
      const entry = manager.getVocabEntry(word);
      return {
        word,
        level: manager.checkWordLevel(word),
        definition: entry?.definition || undefined,
      };
    });

    console.log(`\n📊 完成 | 总迭代: ${totalIterations} | 残留: ${uniqueResidual.length} 词`);

    const response: RewriteResponse = {
      success: true,
      originalText: text,
      rewrittenText,
      iterations: totalIterations,
      maxIterations: 3,
      hasOutOfLevelWords: anyHasOutOfLevel,
      outOfLevelWords: anyHasOutOfLevel ? uniqueResidual : undefined,
      outOfLevelWordDetails: anyHasOutOfLevel ? wordDetails : undefined,
    };

    if (anyHasOutOfLevel) {
      response.message = `经过逐句修正后仍有 ${uniqueResidual.length} 个超纲词: ${uniqueResidual.join(', ')}`;
    } else {
      response.message = sentences.length > 1
        ? `成功修正所有句子 (共 ${sentences.length} 句, ${totalIterations} 次迭代)`
        : `成功修正所有超纲词 (${totalIterations} 次迭代)`;
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error in rewrite API:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
