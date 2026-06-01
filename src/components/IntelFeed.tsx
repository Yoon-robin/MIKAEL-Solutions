'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, ChevronDown, ChevronUp, ExternalLink, MapPin, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

/* ═══════════════════════════════════════════════════════════════
   MIKAEL Solutions — Intelligence Feed
   SIGINT-style news aggregation with risk scoring
   ═══════════════════════════════════════════════════════════════ */

interface IntelFeedProps {
  data: any;
  onLocate?: (lat: number, lng: number) => void;
}

function getRiskClass(score: number): string {
  if (score >= 8) return 'risk-critical';
  if (score >= 6) return 'risk-high';
  if (score >= 4) return 'risk-medium';
  return 'risk-low';
}

function getRiskLabel(score: number): string {
  if (score >= 8) return '긴급';
  if (score >= 6) return '높음';
  if (score >= 4) return '주의';
  return '낮음';
}

function timeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}분 전`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}시간 전`;
    return `${Math.floor(hrs / 24)}일 전`;
  } catch {
    return '';
  }
}

export default function IntelFeed({ data, onLocate }: IntelFeedProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const news = data.news || [];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.6 }}
      className="pointer-events-auto"
    >
      <Card className="border-[#272027] bg-[#0E0C10] py-0 gap-0 overflow-hidden rounded-lg">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between px-4 py-3.5 w-full hover:bg-[#161018] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Newspaper className="w-4 h-4 text-[var(--gold-primary)]" />
            <span className="text-[14px] font-semibold text-white tracking-tight">정보 피드</span>
            <Badge variant="cyan" className="text-[10px] h-5 px-1.5 rounded font-medium">{news.length}</Badge>
            {news.some((n: any) => n.risk_score >= 8) && (
              <Badge variant="danger" className="text-[10px] h-5 px-1.5 rounded font-medium">경보</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--alert-green)]" />
            {expanded
              ? <ChevronUp className="w-4 h-4 text-[#6B5748]" />
              : <ChevronDown className="w-4 h-4 text-[#6B5748]" />}
          </div>
        </button>

        {/* 뉴스 목록 */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <Separator className="bg-[#272027]" />
              <div className="max-h-[400px] overflow-y-auto styled-scrollbar divide-y divide-[var(--border-secondary)]">
                {news.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <span className="text-[11px] text-[var(--text-muted)] tracking-widest">
                      정보 수집 대기 중...
                    </span>
                  </div>
                ) : (
                  news.slice(0, 25).map((item: any, i: number) => (
                    <div
                      key={i}
                      role="button"
                      tabIndex={0}
                      className="px-4 py-3 hover:bg-[#161018] transition-colors cursor-pointer"
                      onClick={() => {
                        if (item.link) window.open(item.link, '_blank', 'noopener,noreferrer');
                        else setSelectedIdx(selectedIdx === i ? null : i);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && item.link)
                          window.open(item.link, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      {/* 상단 행: 위험도 + 출처 + 시간 */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-bold tracking-widest ${getRiskClass(item.risk_score)}`}>
                          {getRiskLabel(item.risk_score)}
                        </span>
                        <span className="text-[11px] text-[#6B5748] bg-[#161018] px-1.5 py-0.5 rounded-md font-medium">
                          {item.source}
                        </span>
                        {item.coords && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onLocate?.(item.coords[0], item.coords[1]);
                            }}
                            className="text-[var(--text-muted)] hover:text-[var(--cyan-primary)] transition-colors"
                          >
                            <MapPin className="w-2.5 h-2.5" />
                          </button>
                        )}
                        <span className="text-[8px] text-[var(--text-muted)] ml-auto">
                          {timeAgo(item.published)}
                        </span>
                      </div>

                      {/* 제목 */}
                      <h4 className="text-[13px] text-white leading-snug line-clamp-2 font-medium">
                        {item.title}
                      </h4>

                      {/* 기계 평가 (긴급일 경우) */}
                      {item.machine_assessment && (
                        <div className="mt-1.5 flex items-start gap-1.5 bg-red-950/20 border border-red-900/20 rounded px-2 py-1">
                          <Zap className="w-2.5 h-2.5 text-red-400 flex-shrink-0 mt-0.5" />
                          <span className="text-[9px] text-red-400/80 leading-relaxed">
                            {item.machine_assessment}
                          </span>
                        </div>
                      )}

                      {/* 펼침 상세 */}
                      <AnimatePresence>
                        {selectedIdx === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-2 overflow-hidden"
                          >
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] text-[var(--cyan-primary)] hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              원문 열기
                            </a>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
