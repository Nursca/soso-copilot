import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Anthropic API Key in environment' }, { status: 400 });
    }

    const result = streamText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      messages: [{ role: 'user', content: prompt }],
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
