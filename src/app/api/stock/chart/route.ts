import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || '';
  const range  = searchParams.get('range')  || '1mo'; // 1d 1wk 1mo 3mo 6mo 1y

  if (!symbol) return NextResponse.json({ error: '심볼 필요' }, { status: 400 });

  const intervalMap: Record<string, string> = {
    '1d': '5m', '5d': '15m', '1mo': '1d', '3mo': '1d', '6mo': '1wk', '1y': '1wk', '2y': '1mo',
  };
  const interval = intervalMap[range] || '1d';

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!res.ok) throw new Error(`Yahoo ${res.status}`);

    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) throw new Error('데이터 없음');

    const timestamps: number[] = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const closes: (number | null)[] = quotes.close || [];
    const volumes: (number | null)[] = quotes.volume || [];

    const points = timestamps.map((t, i) => ({
      t,
      c: closes[i]  !== null ? Math.round((closes[i]  as number) * 100) / 100 : null,
      v: volumes[i] !== null ? volumes[i] : null,
    })).filter(p => p.c !== null);

    const meta = result.meta;

    return NextResponse.json({
      symbol,
      range,
      interval,
      name:       meta.longName || meta.shortName || symbol,
      currency:   meta.currency || 'KRW',
      current:    meta.regularMarketPrice,
      prev_close: meta.chartPreviousClose,
      points,
      timestamp:  new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
