import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  targetLevel: number;
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

    const systemPrompt = `你是一个中文学习助手。请使用 HSK ${targetLevel} 级及以下的基础词汇进行回复。保持句子简短、清晰、易懂。如果必须使用高级词汇，请在后面用括号注释简单解释。`;

    // Call LLM for chat
    const completion = await client.chat.completions.create({
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      max_tokens: 1024,
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
        highlightedText: rawReply,
        targetLevel,
      });

      // Call our own rewrite endpoint internally
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
      // If rewrite fails, use the original reply
      console.warn('Rewrite step failed, using original LLM reply');
    }

    return NextResponse.json({
      success: true,
      reply: finalReply,
      originalReply: rawReply,
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
