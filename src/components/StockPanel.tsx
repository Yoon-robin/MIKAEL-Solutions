'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Search, X, Plus, RefreshCw,
  Bot, Star, ChevronDown, ChevronUp, BarChart2, Loader2,
  Minus, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

/* ── 타입 ── */
interface StockQuote {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  change: number;
  change_pct: number;
  up: boolean;
  prev_close: number;
  high_52w: number;
  low_52w: number;
  volume: number;
  market_cap: number | null;
  sparkline: number[];
  error?: string;
}

interface WatchlistItem { symbol: string; label: string; }

/* ── 기본 관심종목 ── */
const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: '^KS11',    label: 'KOSPI'     },
  { symbol: '^KQ11',    label: 'KOSDAQ'    },
  { symbol: '005930.KS', label: '삼성전자'  },
  { symbol: '000660.KS', label: 'SK하이닉스' },
  { symbol: '005380.KS', label: '현대차'    },
  { symbol: '035420.KS', label: 'NAVER'     },
  { symbol: '035720.KS', label: '카카오'    },
  { symbol: '373220.KS', label: 'LG에너지'  },
];

const KR_SEARCH_MAP: Record<string, { symbol: string; label: string }> = {
  '삼성전자': { symbol: '005930.KS', label: '삼성전자' },
  'SK하이닉스': { symbol: '000660.KS', label: 'SK하이닉스' },
  '현대차': { symbol: '005380.KS', label: '현대차' },
  'NAVER': { symbol: '035420.KS', label: 'NAVER' },
  '카카오': { symbol: '035720.KS', label: '카카오' },
  'LG에너지솔루션': { symbol: '373220.KS', label: 'LG에너지솔루션' },
  '삼성바이오로직스': { symbol: '207940.KS', label: '삼성바이오로직스' },
  '셀트리온': { symbol: '068270.KS', label: '셀트리온' },
  'LG화학': { symbol: '051910.KS', label: 'LG화학' },
  '기아': { symbol: '000270.KS', label: '기아' },
  'POSCO홀딩스': { symbol: '005490.KS', label: 'POSCO홀딩스' },
  '삼성SDI': { symbol: '006400.KS', label: '삼성SDI' },
  '현대모비스': { symbol: '012330.KS', label: '현대모비스' },
  'KB금융': { symbol: '105560.KS', label: 'KB금융' },
  '신한지주': { symbol: '055550.KS', label: '신한지주' },
  '하나금융지주': { symbol: '086790.KS', label: '하나금융지주' },
  '삼성물산': { symbol: '028260.KS', label: '삼성물산' },
  '크래프톤': { symbol: '259960.KS', label: '크래프톤' },
  'S-Oil': { symbol: '010950.KS', label: 'S-Oil' },
  '롯데케미칼': { symbol: '011170.KS', label: '롯데케미칼' },
  // 글로벌
  'Apple': { symbol: 'AAPL', label: 'Apple' },
  'NVIDIA': { symbol: 'NVDA', label: 'NVIDIA' },
  'Tesla': { symbol: 'TSLA', label: 'Tesla' },
  'Microsoft': { symbol: 'MSFT', label: 'Microsoft' },
  'Amazon': { symbol: 'AMZN', label: 'Amazon' },
};

/* ── SVG 스파크라인 ── */
function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  if (!data || data.length < 2) return <div className="w-16 h-6" />;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const W = 64, H = 24;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 2) - 1;
    return `${x},${y}`;
  }).join(' ');
  const color = up ? '#00E676' : '#FF3D3D';
  return (
    <svg width={W} height={H} className="flex-shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

/* ── 가격 포맷 ── */
function fmtPrice(price: number, currency: string) {
  if (currency === 'KRW') return price.toLocaleString('ko-KR') + '원';
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return '$' + price.toFixed(2);
}

function fmtVolume(v: number) {
  if (v >= 1e8) return (v / 1e8).toFixed(1) + '억';
  if (v >= 1e4) return (v / 1e4).toFixed(0) + '만';
  return v.toLocaleString();
}

/* ── 개별 종목 행 ── */
function StockRow({
  item, quote, onRemove, onAskAI,
}: {
  item: WatchlistItem;
  quote: StockQuote | null | 'loading';
  onRemove: () => void;
  onAskAI: (label: string, quote: StockQuote) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const loading = quote === 'loading';
  const err = quote && quote !== 'loading' && quote.error;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      className="border-b border-white/[0.05] last:border-0"
    >
      {/* 메인 행 */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.03] transition-colors cursor-pointer group"
        onClick={() => quote && quote !== 'loading' && !err && setExpanded(v => !v)}
      >
        {/* 종목명 */}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white truncate">{item.label}</div>
          {!loading && quote && !err && (
            <div className="text-[10px] text-white/30 truncate">{(quote as StockQuote).symbol}</div>
          )}
        </div>

        {/* 가격 + 변동 */}
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 text-white/20 animate-spin" />
        ) : err ? (
          <AlertCircle className="w-3.5 h-3.5 text-white/20" />
        ) : quote ? (
          <>
            <Sparkline data={(quote as StockQuote).sparkline} up={(quote as StockQuote).up} />
            <div className="text-right min-w-[80px]">
              <div className="text-[13px] font-bold text-white tabular-nums">
                {fmtPrice((quote as StockQuote).price, (quote as StockQuote).currency)}
              </div>
              <div className={`text-[11px] font-bold flex items-center justify-end gap-0.5 ${(quote as StockQuote).up ? 'text-[#00E676]' : 'text-[#FF3D3D]'}`}>
                {(quote as StockQuote).up
                  ? <TrendingUp className="w-2.5 h-2.5" />
                  : <TrendingDown className="w-2.5 h-2.5" />}
                {(quote as StockQuote).change_pct > 0 ? '+' : ''}{(quote as StockQuote).change_pct.toFixed(2)}%
              </div>
            </div>
          </>
        ) : null}

        {/* 제거 버튼 */}
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/[0.08] transition-all"
          aria-label="관심종목에서 제거"
        >
          <X className="w-3 h-3 text-white/40" />
        </button>
      </div>

      {/* 펼침 상세 */}
      <AnimatePresence>
        {expanded && quote && quote !== 'loading' && !err && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2.5">
              {/* 상세 지표 */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '전일 종가', value: fmtPrice((quote as StockQuote).prev_close, (quote as StockQuote).currency) },
                  { label: '52주 고', value: fmtPrice((quote as StockQuote).high_52w, (quote as StockQuote).currency) },
                  { label: '52주 저', value: fmtPrice((quote as StockQuote).low_52w, (quote as StockQuote).currency) },
                  { label: '거래량', value: fmtVolume((quote as StockQuote).volume) },
                  { label: '시가총액', value: (quote as StockQuote).market_cap ? fmtVolume((quote as StockQuote).market_cap!) : '—' },
                  { label: '변동액', value: `${(quote as StockQuote).change > 0 ? '+' : ''}${(quote as StockQuote).change.toLocaleString()}` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-[9px] text-white/35 uppercase tracking-wider mb-0.5">{label}</div>
                    <div className="text-[12px] font-semibold text-white/80">{value}</div>
                  </div>
                ))}
              </div>

              {/* AI 분석 버튼 */}
              <button
                onClick={() => onAskAI(item.label, quote as StockQuote)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/25 hover:bg-[#00E5FF]/15 transition-colors text-[12px] font-semibold text-[#00E5FF]"
              >
                <Bot className="w-3.5 h-3.5" />
                MIKAEL AI 분석
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── 메인 패널 ── */
interface StockPanelProps {
  onAskAI?: (message: string) => void;
}

export default function StockPanel({ onAskAI }: StockPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(DEFAULT_WATCHLIST);
  const [quotes, setQuotes] = useState<Record<string, StockQuote | 'loading' | null>>({});
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ symbol: string; label: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /* ── 주식 데이터 로드 ── */
  const fetchQuotes = useCallback(async (list: WatchlistItem[]) => {
    if (!list.length) return;
    const symbols = list.map(i => i.symbol).join(',');
    // 먼저 loading 상태
    setQuotes(prev => {
      const next = { ...prev };
      list.forEach(i => { if (!next[i.symbol]) next[i.symbol] = 'loading'; });
      return next;
    });
    try {
      const res = await fetch(`/api/stock/quote?symbols=${encodeURIComponent(symbols)}`);
      if (!res.ok) return;
      const data = await res.json();
      setQuotes(prev => {
        const next = { ...prev };
        Object.entries(data.quotes).forEach(([key, val]: [string, any]) => {
          // key는 rawList 기준이므로 symbol로 매핑
          const item = list.find(i => i.symbol === key || i.label === key);
          if (item) next[item.symbol] = val;
        });
        return next;
      });
    } catch {}
  }, []);

  /* 초기 로드 + 30초 자동 갱신 */
  useEffect(() => {
    fetchQuotes(watchlist);
    intervalRef.current = setInterval(() => fetchQuotes(watchlist), 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [watchlist, fetchQuotes]);

  /* localStorage 동기화 */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mikael-watchlist');
      if (saved) setWatchlist(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('mikael-watchlist', JSON.stringify(watchlist)); } catch {}
  }, [watchlist]);

  /* 수동 새로고침 */
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchQuotes(watchlist);
    setRefreshing(false);
  };

  /* 검색 */
  const handleSearch = (q: string) => {
    setSearch(q);
    if (!q.trim()) { setSearchResults([]); return; }
    const results = Object.entries(KR_SEARCH_MAP)
      .filter(([name]) => name.toLowerCase().includes(q.toLowerCase()))
      .map(([, v]) => v)
      .slice(0, 6);
    // Yahoo Finance 직접 입력 지원
    if (!results.length && (q.includes('.KS') || q.includes('.KQ') || /^[A-Z]{1,5}$/.test(q.trim()))) {
      results.push({ symbol: q.trim().toUpperCase(), label: q.trim().toUpperCase() });
    }
    setSearchResults(results);
  };

  const addToWatchlist = (item: { symbol: string; label: string }) => {
    if (watchlist.find(w => w.symbol === item.symbol)) return;
    const newList = [...watchlist, item];
    setWatchlist(newList);
    fetchQuotes([item]);
    setSearch('');
    setSearchResults([]);
  };

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist(prev => prev.filter(w => w.symbol !== symbol));
    setQuotes(prev => { const n = { ...prev }; delete n[symbol]; return n; });
  };

  /* AI 분석 요청 */
  const handleAskAI = (label: string, q: StockQuote) => {
    if (!onAskAI) return;
    const msg = `${label}(${q.symbol}) 분석해줘.
현재가: ${fmtPrice(q.price, q.currency)} (${q.change_pct > 0 ? '+' : ''}${q.change_pct.toFixed(2)}%)
전일 대비: ${q.change > 0 ? '+' : ''}${q.change.toLocaleString()}
52주 고/저: ${fmtPrice(q.high_52w, q.currency)} / ${fmtPrice(q.low_52w, q.currency)}
거래량: ${fmtVolume(q.volume)}`;
    onAskAI(msg);
  };

  /* 총 등락 요약 */
  const validQuotes = Object.values(quotes).filter(q => q && q !== 'loading' && !(q as StockQuote).error) as StockQuote[];
  const upCount   = validQuotes.filter(q => q.up).length;
  const downCount = validQuotes.filter(q => !q.up).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="pointer-events-auto"
    >
      <Card className="border-white/[0.07] bg-[#0A0808] py-0 gap-0 overflow-hidden rounded mikael-panel">

        {/* ── 헤더 ── */}
        <CardHeader className="px-3.5 py-3">
          <button
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            aria-label="주식 AI 패널 펼치기/접기"
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2.5">
              <BarChart2 className="w-4 h-4 text-[#00E5FF]" />
              <CardTitle className="text-[15px] font-bold text-white">주식 AI</CardTitle>
              <div className="flex items-center gap-1">
                {upCount > 0 && (
                  <span className="text-[10px] font-bold text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/20 px-1.5 py-0.5 rounded">
                    ▲{upCount}
                  </span>
                )}
                {downCount > 0 && (
                  <span className="text-[10px] font-bold text-[#FF3D3D] bg-[#FF3D3D]/10 border border-[#FF3D3D]/20 px-1.5 py-0.5 rounded">
                    ▼{downCount}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={e => { e.stopPropagation(); handleRefresh(); }}
                disabled={refreshing}
                className="p-1 rounded hover:bg-white/[0.06] transition-colors"
                aria-label="시세 새로고침"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-white/30 hover:text-white/70 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              {expanded
                ? <ChevronUp className="w-4 h-4 text-white/30" />
                : <ChevronDown className="w-4 h-4 text-white/30" />}
            </div>
          </button>
        </CardHeader>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <Separator className="bg-white/[0.07]" />

              {/* ── 검색 ── */}
              <div className="px-3 pt-2.5 pb-1.5 relative">
                <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-2 focus-within:border-white/[0.18] transition-colors">
                  <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                  <input
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="종목명 또는 티커 검색..."
                    className="flex-1 bg-transparent text-[12px] text-white placeholder:text-white/25 outline-none"
                  />
                  {search && (
                    <button onClick={() => { setSearch(''); setSearchResults([]); }}>
                      <X className="w-3 h-3 text-white/30" />
                    </button>
                  )}
                </div>

                {/* 검색 결과 드롭다운 */}
                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute left-3 right-3 top-full z-50 mt-1 bg-[#0D0D14] border border-white/[0.1] rounded-lg overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
                    >
                      {searchResults.map(r => (
                        <button
                          key={r.symbol}
                          onClick={() => addToWatchlist(r)}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.05] transition-colors text-left border-b border-white/[0.05] last:border-0"
                        >
                          <div>
                            <div className="text-[12px] font-semibold text-white">{r.label}</div>
                            <div className="text-[10px] text-white/35">{r.symbol}</div>
                          </div>
                          <Plus className="w-3.5 h-3.5 text-[#00E5FF]" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── 관심종목 리스트 ── */}
              <div className="max-h-[400px] overflow-y-auto styled-scrollbar">
                <AnimatePresence>
                  {watchlist.map(item => (
                    <StockRow
                      key={item.symbol}
                      item={item}
                      quote={quotes[item.symbol] ?? 'loading'}
                      onRemove={() => removeFromWatchlist(item.symbol)}
                      onAskAI={handleAskAI}
                    />
                  ))}
                </AnimatePresence>
                {watchlist.length === 0 && (
                  <div className="px-3 py-8 text-center text-[12px] text-white/30">
                    위 검색창에서 종목을 추가하세요
                  </div>
                )}
              </div>

              {/* ── 바닥 힌트 ── */}
              <div className="px-3 py-2 border-t border-white/[0.05]">
                <p className="text-[10px] text-white/20">종목 클릭 → 상세 · AI 분석 · 30초 자동 갱신</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
