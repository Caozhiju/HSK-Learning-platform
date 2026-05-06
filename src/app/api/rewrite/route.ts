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
 * 高亮超纲词
 */
function highlightOutOfLevelWords(
  manager: VocabManager,
  text: string,
  targetLevel: number
): string {
  const tokens = manager.tokenize(text);
  let highlightedText = '';

  tokens.forEach((token) => {
    if (isPunctuation(token)) {
      highlightedText += token;
      return;
    }

    const level = manager.checkWordLevel(token);

    if (level === null || level <= targetLevel) {
      highlightedText += token;
      return;
    }

    highlightedText += `**${token}**`;
  });

  return highlightedText;
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
 * 调用 LLM 重写文本
 */
async function callLLMForRewrite(
  highlightedText: string,
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

  const prompt = `在以下文本中，被 ** ** 标记的词汇超出了 HSK ${targetLevel} 级的范围。请你分两步思考：第一步，在心里寻找这些词的初级同义词；第二步，仅使用 HSK 1-${targetLevel} 级的基础词汇替换这些高亮词汇，保持原句核心句意不变。请直接输出修改后的纯文本。

文本：
${highlightedText}`;

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
 * 文本重写接口 - 闭环修正工作流
 * POST /api/rewrite
 * 
 * 请求体：
 * {
 *   highlightedText: string,  // 包含超纲词高亮标记 ** ** 的文本
 *   targetLevel: number       // 目标 HSK 级别
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
    const { highlightedText, targetLevel } = body;

    // 参数验证
    if (!highlightedText || typeof highlightedText !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid request: highlightedText is required and must be a string',
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

    // 移除高亮标记获取原始文本
    const originalText = highlightedText.replace(/\*\*/g, '');

    let currentText = originalText;
    let iterationCount = 0;
    let finalOutOfLevelWords: string[] = [];
    let hasOutOfLevel = true;

    console.log(`📝 开始文本重写循环 (最多 ${MAX_ITERATIONS} 次)`);
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

      // 高亮超纲词
      const textToRewrite = highlightOutOfLevelWords(
        manager,
        currentText,
        targetLevel
      );
      console.log(`待重写文本: ${textToRewrite}`);

      // 调用 LLM 重写
      try {
        const rewrittenText = await callLLMForRewrite(textToRewrite, targetLevel);
        console.log(`LLM 输出: ${rewrittenText}`);

        currentText = rewrittenText;
      } catch (error) {
        console.error(`LLM 调用失败 (第 ${iterationCount} 次):`, error);
        // 如果 LLM 调用失败，记录当前的超纲词并终止
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
