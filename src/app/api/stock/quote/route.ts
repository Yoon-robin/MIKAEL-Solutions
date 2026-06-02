import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 30; // 30초 캐시

// 한국 종목 이름 → Yahoo Finance 티커
export const KR_TICKER_MAP: Record<string, string> = {
  '삼성전자': '005930.KS', 'samsung': '005930.KS',
  'SK하이닉스': '000660.KS', 'skhynix': '000660.KS',
  '현대차': '005380.KS', 'hyundai': '005380.KS',
  'NAVER': '035420.KS', '네이버': '035420.KS', 'naver': '035420.KS',
  '카카오': '035720.KS', 'kakao': '035720.KS',
  'LG에너지솔루션': '373220.KS', 'lges': '373220.KS',
  '삼성바이오로직스': '207940.KS',
  '셀트리온': '068270.KS', 'celltrion': '068270.KS',
  'LG화학': '051910.KS',
  '기아': '000270.KS', 'kia': '000270.KS',
  'POSCO홀딩스': '005490.KS', 'posco': '005490.KS',
  '삼성SDI': '006400.KS',
  '현대모비스': '012330.KS',
  'KB금융': '105560.KS',
  '신한지주': '055550.KS',
  '하나금융지주': '086790.KS',
  '코스피': '^KS11', 'KOSPI': '^KS11', 'kospi': '^KS11',
  '코스닥': '^KQ11', 'KOSDAQ': '^KQ11', 'kosdaq': '^KQ11',
};

async function fetchQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const result = data.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta;
  const closes: number[] = result.indicators?.quote?.[0]?.close?.filter(Boolean) || [];
  const volumes: number[] = result.indicators?.quote?.[0]?.volume?.filter(Boolean) || [];
  const timestamps: number[] = result.timestamp || [];

  const price     = meta.regularMarketPrice || closes[closes.length - 1] || 0;
  const prevClose = meta.chartPreviousClose || meta.previousClose || closes[0] || price;
  const changeAmt = price - prevClose;
  const changePct = prevClose ? (changeAmt / prevClose) * 100 : 0;

  const fiftyTwoHigh = meta.fiftyTwoWeekHigh || Math.max(...closes);
  const fiftyTwoLow  = meta.fiftyTwoWeekLow  || Math.min(...closes);
  const volume       = meta.regularMarketVolume || volumes[volumes.length - 1] || 0;
  const marketCap    = meta.marketCap || null;
  const currency     = meta.currency || 'KRW';
  const name         = meta.longName || meta.shortName || symbol;
  const exchange     = meta.exchangeName || '';

  return {
    symbol,
    name,
    exchange,
    currency,
    price:       Math.round(price * 100) / 100,
    change:      Math.round(changeAmt * 100) / 100,
    change_pct:  Math.round(changePct * 100) / 100,
    up:          changePct >= 0,
    prev_close:  Math.round(prevClose * 100) / 100,
    high_52w:    Math.round(fiftyTwoHigh * 100) / 100,
    low_52w:     Math.round(fiftyTwoLow  * 100) / 100,
    volume,
    market_cap:  marketCap,
    // 스파크라인용 최근 5일 종가
    sparkline:   closes.slice(-5).map(v => Math.round(v * 100) / 100),
    timestamps:  timestamps.slice(-5),
    timestamp:   new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw     = searchParams.get('symbols') || '';
  const rawList = raw.split(',').map(s => s.trim()).filter(Boolean);

  if (!rawList.length) {
    return NextResponse.json({ error: '종목 심볼을 입력하세요 (?symbols=005930.KS,000660.KS)' }, { status: 400 });
  }

  // 한글 이름 → 티커 변환
  const symbols = rawList.map(s => KR_TICKER_MAP[s] || s);

  const results = await Promise.allSettled(symbols.map(fetchQuote));

  const quotes: Record<string, any> = {};
  symbols.forEach((sym, i) => {
    const r = results[i];
    quotes[rawList[i] || sym] = r.status === 'fulfilled' && r.value ? r.value : { error: '조회 실패', symbol: sym };
  });

  return NextResponse.json({ quotes, timestamp: new Date().toISOString() });
}
