import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import VocabManager from '@/lib/vocab-manager';

interface VocabEntry {
  word: string;
  level: number;
  pinyin?: string;
  definition?: string;
}

interface TokenInfo {
  token: string;
  level: number | null;
  isOutOfLevel: boolean;
}

interface AnalyzeResponse {
  success: boolean;
  originalText: string;
  tokens: TokenInfo[];
  outOfLevelCount: number;
  highlightedText: string;
  message?: string;
}

/**
 * 判断是否是标点符号或空格
 */
function isPunctuation(char: string): boolean {
  // 中文标点、英文标点和空格
  const punctuationRegex = /[\s\p{P}]/u;
  return punctuationRegex.test(char);
}

/**
 * 初始化 VocabManager（如果尚未初始化）
 */
async function ensureVocabManagerInitialized(): Promise<void> {
  const manager = VocabManager.getInstance();

  // 如果已初始化则直接返回
  if (manager.getTotalVocabCount() > 0) {
    return;
  }

  try {
    const vocabPath = path.join(
      process.cwd(),
      'public',
      'hsk3.0_vocab.json'
    );

    const vocabContent = await readFile(vocabPath, 'utf-8');
    const vocabData = JSON.parse(vocabContent) as VocabEntry[];

    await manager.initialize(vocabData);
  } catch (error) {
    console.error('Failed to initialize VocabManager:', error);
    throw new Error('Failed to load vocabulary data');
  }
}

/**
 * NLP 分析接口
 * POST /api/analyze
 * 
 * 请求体：
 * {
 *   text: string,          // 要分析的中文文本
 *   targetLevel: number    // 目标 HSK 级别 (1-9)
 * }
 * 
 * 响应：
 * {
 *   success: boolean,
 *   originalText: string,
 *   tokens: [
 *     {
 *       token: string,
 *       level: number | null,
 *       isOutOfLevel: boolean
 *     }
 *   ],
 *   outOfLevelCount: number,
 *   highlightedText: string
 * }
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { text, targetLevel } = body;

    // 参数验证
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request: text is required and must be a string',
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

    // 对文本进行分词
    const tokens = manager.tokenize(text);

    // 分析每个 token
    const tokenInfos: TokenInfo[] = [];
    let outOfLevelCount = 0;

    tokens.forEach((token) => {
      // 标点符号和空格放行
      if (isPunctuation(token)) {
        tokenInfos.push({
          token,
          level: null,
          isOutOfLevel: false,
        });
        return;
      }

      // 检查词汇等级
      const level = manager.checkWordLevel(token);

      // 库外词（level === null）视为合规，静默放行
      if (level === null) {
        tokenInfos.push({
          token,
          level: null,
          isOutOfLevel: false,
        });
        return;
      }

      // 判断是否超纲
      const isOutOfLevel = level > targetLevel;

      if (isOutOfLevel) {
        outOfLevelCount++;
      }

      tokenInfos.push({
        token,
        level,
        isOutOfLevel,
      });
    });

    // 生成高亮文本：用 **词汇** 标记超纲词
    let highlightedText = '';
    tokenInfos.forEach((tokenInfo) => {
      if (tokenInfo.isOutOfLevel) {
        highlightedText += `**${tokenInfo.token}**`;
      } else {
        highlightedText += tokenInfo.token;
      }
    });

    const response: AnalyzeResponse = {
      success: true,
      originalText: text,
      tokens: tokenInfos,
      outOfLevelCount,
      highlightedText,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error in analyze API:', error);

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
