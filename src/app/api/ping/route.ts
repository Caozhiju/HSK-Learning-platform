import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    hasKey: !!process.env.OPENAI_API_KEY,
    hasUrl: !!process.env.OPENAI_BASE_URL,
    model: process.env.LLM_MODEL || 'not set',
    baseUrl: (process.env.OPENAI_BASE_URL || '').substring(0, 40),
  });
}
