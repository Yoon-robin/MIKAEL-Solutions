import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * MIKAEL Solutions — 뉴스 인텔리전스 API (한국 우선)
 * 한국 공개 RSS + 글로벌 OSINT 피드 + Telegram fallback
 */

export const dynamic = 'force-dynamic';
export const revalidate = 300;

// ── 한국 RSS 소스 (실제 200 + items 확인된 것만) ───────────────────────────
const KR_FEEDS = [
  { url: 'https://www.yna.co.kr/rss/news.xml',             source: '연합뉴스',   priority: 10 },
  { url: 'https://www.yna.co.kr/rss/northkorea.xml',       source: '연합뉴스-북한', priority: 10 },
  { url: 'https://www.yna.co.kr/rss/politics.xml',         source: '연합뉴스-정치', priority: 9  },
  { url: 'https://www.yna.co.kr/rss/society.xml',          source: '연합뉴스-사회', priority: 9  },
  { url: 'https://www.yna.co.kr/rss/economy.xml',          source: '연합뉴스-경제', priority: 8  },
  { url: 'https://www.yna.co.kr/rss/international.xml',    source: '연합뉴스-국제', priority: 7  },
  { url: 'https://fs.jtbc.co.kr/RSS/newsflash.xml',        source: 'JTBC',       priority: 9  },
  { url: 'https://imnews.imbc.com/rss/news/news_00.xml',   source: 'MBC',        priority: 9  },
  { url: 'https://www.hani.co.kr/rss/',                    source: '한겨레',     priority: 8  },
  { url: 'https://www.khan.co.kr/rss/rssdata/total_news.xml', source: '경향신문', priority: 8  },
  { url: 'https://www.hankyung.com/feed/all-news',          source: '한국경제',   priority: 7  },
  { url: 'https://www.mk.co.kr/rss/30000001/',              source: '매일경제',   priority: 7  },
  { url: 'https://www.asiae.co.kr/rss/all.htm',             source: '아시아경제', priority: 6  },
  { url: 'https://www.dailysecu.com/rss/allArticle.xml',   source: '데일리시큐', priority: 8  },
];

// ── 글로벌 fallback ────────────────────────────────────────────────────────
const GLOBAL_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',  source: 'BBC World' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml',    source: 'Al Jazeera' },
  { url: 'https://www.gdacs.org/xml/rss.xml',            source: 'GDACS' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'NYT World' },
];

// ── Telegram OSINT 채널 ───────────────────────────────────────────────────
const TELEGRAM_CHANNELS = ['OSINTtechnical', 'Faytuks', 'CyberKnow'];

// ── 카테고리 키워드 ────────────────────────────────────────────────────────
const CATEGORY_MAP: [string, string[]][] = [
  ['북한', ['북한','평양','김정은','미사일','탄도미사일','핵','icbm','slbm','오물풍선','군사분계선','dmz','합참','주한미군','dprk','north korea','pyongyang','kim jong']],
  ['안보', ['국방부','한미연합','방위','군사','전작권','방산','해군','공군','육군','무기','훈련','기동','침투','작전']],
  ['사이버', ['해킹','랜섬웨어','침해','개인정보 유출','피싱','디도스','ddos','악성코드','보안 취약점','cve','kisa','사이버','해커','랜섬']],
  ['재난', ['화재','폭발','붕괴','침수','산사태','지진','태풍','호우','대설','폭염','한파','사고','실종','구조','재난','홍수','산불']],
  ['기상', ['기상청','기온','강수','태풍','황사','미세먼지','폭설','한파','폭염','예보','날씨']],
  ['동북아', ['중국','일본','대만','러시아','미국','한중','한일','한미','북미','중미','대만해협']],
  ['경제', ['환율','코스피','코스닥','금리','물가','부동산','수출','반도체','배터리','원전','유가','주식','금융','경제','gdp','인플레']],
  ['정치', ['대통령','국회','여당','야당','총리','장관','선거','정당','민주당','국힘','정책','입법','법안']],
  ['사회', ['경찰','검찰','범죄','사건','사고','교육','복지','의료','파업','시위','집회']],
  ['에너지', ['원전','태양광','풍력','가스','석유','전력','에너지','발전','탄소','배출권']],
  ['교통', ['철도','ktx','지하철','버스','항공','공항','교통','도로','고속도로','항만']],
  ['보건', ['감염병','코로나','독감','백신','의료','병원','질병','cdc','질병청','방역','바이러스']],
  ['국제', ['유엔','nato','미국','유럽','중동','이스라엘','이란','우크라이나','전쟁','분쟁']],
];

// ── 한국 좌표 매핑 ────────────────────────────────────────────────────────
const KR_COORDS: Record<string, [number, number]> = {
  '서울': [37.566, 126.978], '용산': [37.538, 126.994], '광화문': [37.576, 126.977],
  '여의도': [37.525, 126.924], '강남': [37.498, 127.028], '인천': [37.456, 126.705],
  '인천공항': [37.460, 126.440], '부산': [35.180, 129.075], '울산': [35.538, 129.311],
  '대구': [35.872, 128.601], '대전': [36.351, 127.385], '광주': [35.160, 126.852],
  '세종': [36.480, 127.289], '제주': [33.489, 126.498], '수원': [37.263, 127.029],
  '성남': [37.420, 127.127], '고양': [37.658, 126.832], '창원': [35.228, 128.681],
  'dmz': [38.310, 127.143], '판문점': [37.953, 126.675], '백령도': [37.970, 124.707],
  '연평도': [37.673, 125.683], '독도': [37.241, 131.869], '울릉도': [37.485, 130.905],
  '평양': [39.019, 125.738], '신의주': [40.099, 124.398], '개성': [37.970, 126.556],
  '원산': [39.154, 127.435], '함흥': [39.918, 127.536], '청진': [41.794, 129.781],
  '부산항': [35.098, 129.040], '인천항': [37.460, 126.614], '광양항': [34.935, 127.697],
  '울산항': [35.501, 129.387], '평택항': [36.958, 126.820],
  '월성원전': [35.713, 129.477], '고리원전': [35.325, 129.296],
  '한빛원전': [35.414, 126.426], '한울원전': [37.095, 129.385],
  '포항': [36.019, 129.343], '경주': [35.856, 129.225],
  '김포': [37.558, 126.791], '김해': [35.177, 128.939], '청주공항': [36.717, 127.499],
  // 글로벌
  '우크라이나': [49.487, 31.272], '가자': [31.416, 34.333], '이란': [32.427, 53.688],
  '중국': [35.861, 104.195], '일본': [36.204, 138.252], '대만': [23.697, 120.960],
  '러시아': [61.524, 105.318], '미국': [38.907, -77.036],
};

function classify(text: string): string {
  const lower = text.toLowerCase();
  for (const [cat, kws] of CATEGORY_MAP) {
    if (kws.some(k => lower.includes(k))) return cat;
  }
  return '기타';
}

function scoreKorea(text: string, source: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  // 소스가 한국 매체면 기본 점수
  const krSources = ['연합뉴스','jtbc','mbc','한겨레','경향','한국경제','매일경제','아시아경제','데일리시큐'];
  if (krSources.some(s => source.includes(s))) score += 5;
  // 한국/북한 키워드
  const highKw = ['북한','평양','김정은','미사일','dprk','한국','서울','한미','주한','코스피','코스닥'];
  const midKw = ['중국','일본','대만','동북아','한반도','한일','한중'];
  for (const kw of highKw) if (lower.includes(kw)) score += 2;
  for (const kw of midKw) if (lower.includes(kw)) score += 1;
  return Math.min(score, 10);
}

function scoreRisk(text: string, category: string): number {
  const lower = text.toLowerCase();
  let score = 3;
  if (['북한','안보'].includes(category)) score += 4;
  if (category === '사이버') score += 3;
  if (['재난','기상'].includes(category)) score += 3;
  const crisis = ['미사일','핵','침해','해킹','화재','지진','폭발','전쟁','침공','사망','사고'];
  for (const kw of crisis) if (lower.includes(kw)) score += 1;
  return Math.min(score, 10);
}

function extractCoords(text: string): [number, number] | null {
  const lower = text.toLowerCase();
  for (const [kw, coords] of Object.entries(KR_COORDS)) {
    if (lower.includes(kw.toLowerCase())) return coords;
  }
  return null;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').trim();
}

function parseRss(xml: string, source: string, maxItems = 20): any[] {
  const items: any[] = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  for (const block of blocks.slice(0, maxItems)) {
    const getField = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>(?:<\\!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'));
      return m ? stripHtml(m[1]) : '';
    };
    const title = getField('title');
    const link  = getField('link') || block.match(/<link>([^<]+)<\/link>/i)?.[1]?.trim() || '';
    const pub   = getField('pubDate') || getField('dc:date') || new Date().toISOString();
    if (!title || !link) continue;
    const combined = title;
    const category = classify(combined);
    const korea_relevance = scoreKorea(combined, source);
    const risk_score = scoreRisk(combined, category);
    const coords = extractCoords(combined);
    items.push({
      id: crypto.createHash('md5').update(link).digest('hex').slice(0, 8),
      title, link, source, published: pub,
      category, korea_relevance, risk_score,
      ...(coords ? { coords } : {}),
      machine_assessment: risk_score >= 8 ? `[${category}] 고위험 신호 감지됨` : null,
      locale: 'ko-KR',
    });
  }
  return items;
}

async function fetchRss(url: string, source: string, maxItems = 20): Promise<{ items: any[]; ok: boolean }> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MIKAEL-RSS/1.0)', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
    });
    if (!res.ok) return { items: [], ok: false };
    const xml = await res.text();
    return { items: parseRss(xml, source, maxItems), ok: true };
  } catch {
    return { items: [], ok: false };
  }
}

async function fetchTelegram(channel: string): Promise<any[]> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://t.me/s/${channel}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const msgs = [...html.matchAll(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g)].slice(0, 8);
    return msgs.map(m => {
      const text = stripHtml(m[1]).slice(0, 300);
      if (!text || text.length < 20) return null;
      return {
        id: crypto.createHash('md5').update(text).digest('hex').slice(0, 8),
        title: text.slice(0, 120),
        link: `https://t.me/${channel}`,
        source: `Telegram/${channel}`,
        published: new Date().toISOString(),
        category: classify(text),
        korea_relevance: scoreKorea(text, channel),
        risk_score: scoreRisk(text, classify(text)),
        coords: extractCoords(text),
        locale: 'en',
      };
    }).filter(Boolean);
  } catch {
    return [];
  }
}

// 중복 제거
function dedup(items: any[]): any[] {
  const seen = new Set<string>();
  return items.filter(it => {
    const key = it.link || it.title?.slice(0, 60) || it.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET() {
  const sourceStatus: Record<string, 'ok' | 'fail'> = {};

  // 1. 한국 RSS 병렬 수집
  const krResults = await Promise.allSettled(
    KR_FEEDS.map(f => fetchRss(f.url, f.source, 15))
  );
  const krItems: any[] = [];
  KR_FEEDS.forEach((f, i) => {
    const r = krResults[i];
    if (r.status === 'fulfilled' && r.value.ok) {
      sourceStatus[f.source] = 'ok';
      krItems.push(...r.value.items);
    } else {
      sourceStatus[f.source] = 'fail';
    }
  });

  // 2. 글로벌 RSS (병렬, 제한)
  const globalResults = await Promise.allSettled(
    GLOBAL_FEEDS.map(f => fetchRss(f.url, f.source, 8))
  );
  const globalItems: any[] = [];
  GLOBAL_FEEDS.forEach((f, i) => {
    const r = globalResults[i];
    if (r.status === 'fulfilled' && r.value.ok) {
      sourceStatus[f.source] = 'ok';
      globalItems.push(...r.value.items);
    } else {
      sourceStatus[f.source] = 'fail';
    }
  });

  // 3. Telegram (병렬)
  const tgResults = await Promise.allSettled(TELEGRAM_CHANNELS.map(fetchTelegram));
  const tgItems: any[] = [];
  tgResults.forEach((r, i) => {
    sourceStatus[`Telegram/${TELEGRAM_CHANNELS[i]}`] = r.status === 'fulfilled' ? 'ok' : 'fail';
    if (r.status === 'fulfilled') tgItems.push(...r.value);
  });

  // 4. 정렬: korea_relevance DESC → risk_score DESC → published DESC
  const all = dedup([...krItems, ...tgItems, ...globalItems])
    .filter(it => it.title?.length > 5)
    .sort((a, b) => {
      if (b.korea_relevance !== a.korea_relevance) return b.korea_relevance - a.korea_relevance;
      if (b.risk_score !== a.risk_score) return b.risk_score - a.risk_score;
      return new Date(b.published).getTime() - new Date(a.published).getTime();
    })
    .slice(0, 100);

  const okCount = Object.values(sourceStatus).filter(v => v === 'ok').length;
  const failCount = Object.values(sourceStatus).filter(v => v === 'fail').length;

  return NextResponse.json({
    news: all,
    total: all.length,
    locale: 'ko-KR',
    priority_region: 'KR',
    sources: Object.keys(sourceStatus),
    source_status: { ok: okCount, fail: failCount },
    timestamp: new Date().toISOString(),
  });
}
