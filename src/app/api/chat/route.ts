import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  targetLevel: number;
}

export const maxDuration = 30; // Vercel serverless 最大 30s

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

    const levelConfig: Record<number, { maxChars: number; maxTokens: number; desc: string }> = {
      1: { maxChars: 10, maxTokens: 80,  desc: '只回复单个词或短词组' },
      2: { maxChars: 20, maxTokens: 120, desc: '回复简单短句' },
      3: { maxChars: 40, maxTokens: 200, desc: '回复1-2个短句' },
      4: { maxChars: 80, maxTokens: 350, desc: '回复简短段落' },
      5: { maxChars: 150, maxTokens: 600, desc: '回复中等段落' },
    };
    const cfg = levelConfig[targetLevel] || { maxChars: 300, maxTokens: 1024, desc: '自然对话' };

    const systemPrompt = `你是中文教师。只用 HSK ${targetLevel} 级及以下词汇。每次回复不超过 ${cfg.maxChars} 字。${cfg.desc}。`;

    const completion = await client.chat.completions.create({
      model: process.env.LLM_MODEL || 'qwen2.5:3b',
      max_tokens: cfg.maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const reply = completion.choices[0]?.message?.content;
    if (!reply) {
      throw new Error('Empty response from LLM');
    }

    return NextResponse.json({
      success: true,
      reply: reply.trim(),
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
