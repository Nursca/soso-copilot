import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.SOSOVALUE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing SOSOVALUE_API_KEY in environment' }, { status: 400 });
  }

  try {
    const headers = { 'Authorization': `Bearer ${apiKey}` };
    const [etfRes, newsRes] = await Promise.allSettled([
      fetch('https://api.sosovalue.com/v1/etfs/summary-history', { headers }),
      fetch('https://api.sosovalue.com/v1/news/hot', { headers })
    ]);

    const data: any = {};
    if (etfRes.status === 'fulfilled' && etfRes.value.ok) {
      data.etf_real = await etfRes.value.json();
    }
    if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
      data.news_real = await newsRes.value.json();
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
