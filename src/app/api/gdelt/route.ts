import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5분 캐시

/**
 * MIKAEL Solutions — Global Incidents API
 * GDELT v2 GKG (Global Knowledge Graph) + DOC API (무료, 키 불필요)
 * Fallback: RSS geo-mapping
 */

// GDELT DOC API — 한국/동북아 우선 쿼리
const GDELT_KR_URL = 'https://api.gdeltproject.org/api/v2/doc/doc?query=%22South%20Korea%22%20OR%20%22North%20Korea%22%20OR%20Seoul%20OR%20DPRK%20OR%20Pyongyang%20OR%20missile%20OR%20DMZ%20OR%20%22Korean%20Peninsula%22%20OR%20Japan%20OR%20China%20OR%20Taiwan%20OR%20nuclear&mode=artlist&maxrecords=50&format=json&sort=DateDesc&timespan=24h';
const GDELT_DOC_URL = 'https://api.gdeltproject.org/api/v2/doc/doc?query=conflict%20OR%20war%20OR%20attack%20OR%20military&mode=artlist&maxrecords=40&format=json&sort=DateDesc&timespan=24h';

// RSS Fallback
const RSS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'NYT World' },
];

const GEO_DICT: Record<string, [number, number]> = {
  'ukraine': [31.1656, 48.3794], 'kyiv': [30.5234, 50.4501],
  'russia': [37.6173, 55.7558], 'moscow': [37.6173, 55.7558],
  'gaza': [34.4668, 31.5017], 'israel': [34.8516, 31.0461],
  'palestine': [35.2332, 31.9522], 'west bank': [35.2332, 31.9522],
  'iran': [53.6880, 32.4279], 'tehran': [51.3890, 35.6892],
  'syria': [38.9968, 34.8021], 'damascus': [36.2765, 33.5138],
  'lebanon': [35.8623, 33.8547], 'beirut': [35.5018, 33.8938],
  'yemen': [47.5868, 15.5527], 'houthi': [44.2066, 15.3694],
  'sudan': [30.2176, 12.8628], 'khartoum': [32.5599, 15.5007],
  'china': [116.4074, 39.9042], 'beijing': [116.3912, 39.9057],
  'taiwan': [120.9605, 23.6978], 'taipei': [121.5654, 25.0330],
  'north korea': [127.5101, 40.3399], 'pyongyang': [125.7625, 39.0194],
  'myanmar': [95.9560, 21.9162], 'naypyidaw': [96.1297, 19.7633],
  'ethiopia': [40.4897, 9.1450], 'addis ababa': [38.7468, 9.0250],
  'somalia': [46.1996, 5.1521], 'mogadishu': [45.3418, 2.0469],
  'mali': [-1.5616, 17.5707], 'sahel': [-1.5616, 17.5707],
  'nigeria': [8.6753, 9.0820], 'abuja': [7.4898, 9.0579],
  'afghanistan': [67.7100, 33.9391], 'kabul': [69.1762, 34.5553],
  'pakistan': [30.3753, 69.3451], 'islamabad': [73.0479, 33.6844],
  'india': [78.9629, 20.5937], 'new delhi': [77.2090, 28.6139],
  'turkey': [35.2433, 38.9637], 'ankara': [32.8597, 39.9334],
  'iraq': [43.6793, 33.2232], 'baghdad': [44.3661, 33.3152],
  'saudi arabia': [45.0792, 23.8859], 'riyadh': [46.7219, 24.6877],
  'usa': [-77.0369, 38.9072], 'washington': [-77.0369, 38.9072],
  'mexico': [-102.5528, 23.6345], 'haiti': [-72.2852, 18.9712],
  'venezuela': [-66.5897, 6.4238], 'colombia': [-74.2973, 4.5709],
  'france': [2.2137, 46.2276], 'paris': [2.3522, 48.8566],
  'germany': [10.4515, 51.1657], 'berlin': [13.4050, 52.5200],
  'uk': [-3.4359, 55.3781], 'london': [-0.1276, 51.5074],
  'brazil': [-51.9253, -14.2350], 'congo': [23.6560, -3.3869],
};

function extractCoords(text: string): [number, number] | null {
  const lower = text.toLowerCase();
  for (const [kw, coords] of Object.entries(GEO_DICT)) {
    if (lower.includes(kw)) return coords;
  }
  return null;
}

function jitter(v: number, amount = 0.8): number {
  return v + (Math.random() - 0.5) * amount;
}

// GDELT DOC API — 한국 우선, 글로벌 fallback 합산
async function fetchGdeltUrl(url: string, tag: string): Promise<any[]> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'MIKAEL-OSINT/1.0' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const articles: any[] = data?.articles || [];
    return articles
      .map((a: any) => {
        const coords = a.geolocation
          ? [parseFloat(a.geolocation.lon), parseFloat(a.geolocation.lat)] as [number, number]
          : extractCoords(`${a.title} ${a.domain}`);
        if (!coords) return null;
        return {
          id:          `gdelt-${a.url?.slice(-12) || Math.random()}`,
          title:       a.title || '',
          description: a.title || '',
          source:      tag === 'kr' ? `GDELT-KR / ${a.domain || ''}` : (a.domain || 'GDELT'),
          url:         a.url || '',
          lat:         jitter(coords[1], 0.5),
          lng:         jitter(coords[0], 0.5),
          time:        a.seendate || new Date().toISOString(),
          severity:    tag === 'kr' ? 'HIGH' : 'ELEVATED',
          type:        tag === 'kr' ? 'korea-priority' : 'conflict',
          korea_priority: tag === 'kr',
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchGdelt(): Promise<any[]> {
  const [krItems, globalItems] = await Promise.all([
    fetchGdeltUrl(GDELT_KR_URL, 'kr'),
    fetchGdeltUrl(GDELT_DOC_URL, 'global'),
  ]);
  // 한국 우선, 중복 URL 제거
  const seen = new Set<string>();
  const merged = [...krItems, ...globalItems].filter(it => {
    if (seen.has(it.url)) return false;
    seen.add(it.url);
    return true;
  });
  return merged.slice(0, 80);
}

// RSS fallback
async function fetchRss(): Promise<any[]> {
  const results: any[] = [];
  let id = 0;
  for (const feed of RSS_FEEDS) {
    try {
      const res = await fetch(feed.url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
      for (const item of items.slice(0, 20)) {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] ||
                      item.match(/<title>(.*?)<\/title>/)?.[1] || '';
        const link  = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
        const desc  = item.match(/<description><!\[CDATA\[(.*?)\]\]>/)?.[1] ||
                      item.match(/<description>(.*?)<\/description>/)?.[1] || '';
        const pub   = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || new Date().toISOString();
        const text  = `${title} ${desc}`.toLowerCase();
        const hasConflict = ['attack', 'strike', 'war', 'troops', 'military', 'killed',
                             'bomb', 'clash', 'conflict', 'crisis', 'protest', 'riot',
                             'missile', 'drone', 'forces', 'invasion'].some(k => text.includes(k));
        if (!hasConflict) continue;
        const coords = extractCoords(text);
        if (!coords) continue;
        results.push({
          id: `rss-${id++}`,
          title, description: desc.slice(0, 200),
          source: feed.source, url: link,
          lat: jitter(coords[1]), lng: jitter(coords[0]),
          time: pub, severity: 'ELEVATED', type: 'conflict',
        });
      }
    } catch { continue; }
  }
  return results;
}

export async function GET() {
  // GDELT 먼저, 실패하면 RSS fallback
  let events = await fetchGdelt();
  const usedGdelt = events.length > 0;
  if (!usedGdelt) events = await fetchRss();

  return NextResponse.json({
    events,
    total: events.length,
    source: usedGdelt ? 'GDELT v2 DOC API (Korea-priority)' : 'RSS Geo-mapping (GDELT fallback)',
    priority_region: 'KR',
    timestamp: new Date().toISOString(),
  });
}
