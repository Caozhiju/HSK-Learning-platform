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

/**
 * 初始化词汇数据的 API 路由
 * GET /api/vocab/init - 初始化词汇管理器
 * POST /api/vocab/check - 检查单个词的 HSK 等级
 */

export async function GET(request: Request) {
  try {
    const manager = VocabManager.getInstance();

    // 从 public 目录加载词汇 JSON 文件
    const vocabPath = path.join(
      process.cwd(),
      'public',
      'hsk3.0_vocab.json'
    );

    const vocabContent = await readFile(vocabPath, 'utf-8');
    const vocabData = JSON.parse(vocabContent) as VocabEntry[];

    // 初始化管理器
    await manager.initialize(vocabData);

    // 获取统计信息
    const stats = manager.getLevelStats();
    const uniqueCount = manager.getTotalVocabCount();
    const totalEntries = manager.getTotalEntriesLoaded();
    const duplicateCount = totalEntries - uniqueCount;

    return NextResponse.json(
      {
        success: true,
        message: 'Vocabulary manager initialized successfully',
        totalEntries,
        uniqueWords: uniqueCount,
        duplicateWords: duplicateCount,
        note: duplicateCount > 0
          ? `${duplicateCount} words appear at multiple HSK levels. The highest level is retained for each word (e.g. if "打" is at level 1 and level 3, it is stored as level 3).`
          : undefined,
        levelStats: stats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error initializing vocabulary:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize vocabulary manager',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { word, action } = await request.json();
    const manager = VocabManager.getInstance();

    if (!word) {
      return NextResponse.json(
        { error: 'Word parameter is required' },
        { status: 400 }
      );
    }

    if (action === 'check-level') {
      const level = manager.checkWordLevel(word);
      return NextResponse.json(
        {
          word,
          level,
          found: level !== null,
        },
        { status: 200 }
      );
    }

    if (action === 'get-entry') {
      const entry = manager.getVocabEntry(word);
      return NextResponse.json(
        {
          word,
          entry,
          found: entry !== null,
        },
        { status: 200 }
      );
    }

    if (action === 'tokenize') {
      const tokens = manager.tokenize(word);
      return NextResponse.json(
        {
          text: word,
          tokens,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
