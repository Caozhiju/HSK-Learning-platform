import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { OpenAI } from 'openai';
import VocabManager from '@/lib/vocab-manager';

interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  targetLevel: number;
}

interface TokenInfo {
  token: string;
  level: number | null;
  isOutOfLevel: boolean;
  definition?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ChatRequest;
    const { messages, targetLevel } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, message: 'messages is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!targetLevel || typeof targetLevel !== 'number' || targetLevel < 1 || targetLevel > 9) {
      return NextResponse.json(
        { success: false, message: 'targetLevel must be a number between 1 and 9' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'OPENAI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });

    // 按等级设置生成长度约束
    const levelConfig: Record<number, { maxChars: number; maxTokens: number; desc: string }> = {
      1: { maxChars: 10, maxTokens: 80,  desc: '单个词语或极短词组（如"你好""谢谢""我是学生"）' },
      2: { maxChars: 20, maxTokens: 120, desc: '简单短句，单句为主（如"我今天去商店买东西了"）' },
      3: { maxChars: 40, maxTokens: 200, desc: '1-2 个短句（如"虽然下雨了，但是我还是去了学校"）' },
      4: { maxChars: 80, maxTokens: 350, desc: '2-3 个句子组成的简短段落' },
      5: { maxChars: 150, maxTokens: 600, desc: '中等长度段落' },
    };
    const cfg = levelConfig[targetLevel] || { maxChars: 300, maxTokens: 1024, desc: '自然长度的对话回复' };

    const systemPrompt = `你是一名中文教师，正在和一位 HSK ${targetLevel} 级的中文学习者对话。

严格规则：
1. 只使用 HSK ${targetLevel} 级及以下的基础词汇。
2. 每次回复控制在 ${cfg.maxChars} 个字以内。${cfg.desc}。
3. 句子要简单自然，像老师在课堂上对学生说话。
4. 如果学生用了超纲词，用简单的方式回应，不要纠正。

请直接用简洁的中文回复，不要加任何解释或标记。`;

    // Call LLM for chat
    const completion = await client.chat.completions.create({
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      max_tokens: cfg.maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const rawReply = completion.choices[0]?.message?.content;
    if (!rawReply) {
      throw new Error('Empty response from LLM');
    }

    // Step 2: Run rewrite to ensure compliance with target HSK level
    let finalReply = rawReply;
    try {
      const rewriteBody = JSON.stringify({
        text: rawReply,
        targetLevel,
      });

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const rewriteRes = await fetch(`${baseUrl}/api/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rewriteBody,
      });

      if (rewriteRes.ok) {
        const rewriteData = await rewriteRes.json();
        if (rewriteData.success) {
          finalReply = rewriteData.rewrittenText;
        }
      }
    } catch {
      console.warn('Rewrite step failed, using original LLM reply');
    }

    // Step 3: 分析回复中每个词的 HSK 等级
    let tokens: TokenInfo[] | null = null;
    try {
      const manager = VocabManager.getInstance();
      if (manager.getTotalVocabCount() === 0) {
        const vocabPath = path.join(process.cwd(), 'public', 'hsk3.0_vocab.json');
        let vocabContent = await readFile(vocabPath, 'utf-8');
        if (vocabContent.charCodeAt(0) === 0xFEFF) vocabContent = vocabContent.slice(1);
        const vocabData = JSON.parse(vocabContent);
        await manager.initialize(vocabData);
      }

      const rawTokens = manager.tokenize(finalReply);
      tokens = rawTokens.map((token) => {
        const ch = manager.checkWordLevel(token);
        const entry = manager.getVocabEntry(token);
        return {
          token,
          level: ch,
          isOutOfLevel: ch !== null && ch > targetLevel,
          definition: entry?.definition || undefined,
        };
      });
    } catch (err) {
      console.warn('Token analysis failed:', err);
    }

    return NextResponse.json({
      success: true,
      reply: finalReply,
      originalReply: rawReply,
      tokens,
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
