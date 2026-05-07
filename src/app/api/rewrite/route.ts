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

interface RewriteResponse {
  success: boolean;
  originalText: string;
  rewrittenText: string;
  iterations: number;
  maxIterations: number;
  hasOutOfLevelWords: boolean;
  outOfLevelWords?: string[];
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
 * 策略：提供纯净原文 + 独立的超纲词列表，让 LLM 直接替换
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
        {
          role: 'user',
          content: prompt,
        },
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
 * 文本重写接口 - 基础重写（Base Rewrite）闭环修正工作流
 * POST /api/rewrite
 *
 * 请求体：
 * {
 *   text: string,        // 待修正的原始文本（纯净，无标记）
 *   targetLevel: number  // 目标 HSK 级别
 * }
 *
 * 响应：
 * {
 *   success: boolean,
 *   originalText: string,
 *   rewrittenText: string,
 *   iterations: number,
 *   maxIterations: number,
 *   hasOutOfLevelWords: boolean,
 *   outOfLevelWords?: string[]
 * }
 */
export async function POST(request: Request): Promise<NextResponse> {
  const MAX_ITERATIONS = 3;

  try {
    const body = await request.json();
    const { text, targetLevel } = body;

    // 参数验证
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid request: text is required and must be a string',
        },
        { status: 400 }
      );
    }

    if (!targetLevel || typeof targetLevel !== 'number') {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid request: targetLevel is required and must be a number',
        },
        { status: 400 }
      );
    }

    if (targetLevel < 1 || targetLevel > 9) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request: targetLevel must be between 1 and 9',
        },
        { status: 400 }
      );
    }

    // 初始化 VocabManager
    await ensureVocabManagerInitialized();

    const manager = VocabManager.getInstance();

    const originalText = text;
    let currentText = originalText;
    let iterationCount = 0;
    let finalOutOfLevelWords: string[] = [];
    let hasOutOfLevel = true;

    console.log(`📝 开始基础重写循环 (最多 ${MAX_ITERATIONS} 次)`);
    console.log(`原始文本: ${originalText}`);
    console.log(`目标级别: ${targetLevel}\n`);

    // 闭环修正循环
    while (iterationCount < MAX_ITERATIONS && hasOutOfLevel) {
      iterationCount++;
      console.log(`--- 第 ${iterationCount} 次迭代 ---`);

      // 检查当前文本中的超纲词
      const { words, hasOutOfLevel: stillHasOutOfLevel } =
        extractOutOfLevelWords(manager, currentText, targetLevel);

      if (!stillHasOutOfLevel) {
        hasOutOfLevel = false;
        console.log(`✓ 没有发现超纲词，循环终止`);
        break;
      }

      console.log(`发现超纲词: ${words.join(', ')}`);

      // 基础重写：发送纯净文本 + 独立的超纲词列表
      try {
        const rewrittenText = await callLLMForRewrite(currentText, words, targetLevel);
        console.log(`LLM 输出: ${rewrittenText}`);

        currentText = rewrittenText;
      } catch (error) {
        console.error(`LLM 调用失败 (第 ${iterationCount} 次):`, error);
        finalOutOfLevelWords = words;
        break;
      }

      console.log();
    }

    // 最后一次检查
    const finalCheck = extractOutOfLevelWords(manager, currentText, targetLevel);
    finalOutOfLevelWords = finalCheck.words;
    hasOutOfLevel = finalCheck.hasOutOfLevel;

    if (hasOutOfLevel) {
      console.log(`⚠️ 警告: 经过 ${iterationCount} 次迭代后仍有超纲词`);
      console.log(`残留超纲词: ${finalOutOfLevelWords.join(', ')}`);
    } else {
      console.log(`✅ 成功: 所有超纲词已修正 (用时 ${iterationCount} 次迭代)`);
    }

    const response: RewriteResponse = {
      success: true,
      originalText,
      rewrittenText: currentText,
      iterations: iterationCount,
      maxIterations: MAX_ITERATIONS,
      hasOutOfLevelWords: hasOutOfLevel,
      outOfLevelWords: hasOutOfLevel ? finalOutOfLevelWords : undefined,
    };

    if (hasOutOfLevel) {
      response.message = `经过 ${iterationCount} 次迭代后仍有 ${finalOutOfLevelWords.length} 个超纲词: ${finalOutOfLevelWords.join(', ')}`;
    } else {
      response.message = `成功修正所有超纲词 (第 ${iterationCount} 次迭代)`;
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error in rewrite API:', error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
