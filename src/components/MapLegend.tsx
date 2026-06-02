'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, ChevronDown, ChevronUp } from 'lucide-react';

interface MapLegendProps {
  activeLayers: Record<string, boolean>;
}

const LEGEND_ITEMS = [
  // 항공
  { color: '#00E5FF', label: '민항기',     key: 'flights',   shape: 'circle' },
  { color: '#00E676', label: '개인 항공기', key: 'private',   shape: 'circle' },
  { color: '#FF69B4', label: '전용기',     key: 'jets',      shape: 'circle' },
  { color: '#FF3D3D', label: '군용기',     key: 'military',  shape: 'circle' },
  // 해상/우주
  { color: '#00BCD4', label: '해상 선박',  key: 'maritime',  shape: 'circle' },
  { color: '#94A3B8', label: '위성',       key: 'satellites', shape: 'circle' },
  // 감시
  { color: '#39FF14', label: 'CCTV',       key: 'cctv',      shape: 'circle' },
  { color: '#FF4081', label: '실시간 뉴스', key: 'live_news', shape: 'circle' },
  // 자연재해
  { color: '#FF9500', label: '지진',       key: 'earthquakes', shape: 'circle', size: 'lg' },
  { color: '#FF6B00', label: '활성 화재',  key: 'fires',     shape: 'circle' },
  { color: '#E040FB', label: '악천후',     key: 'weather',   shape: 'circle' },
  // 위협/인프라
  { color: '#76FF03', label: '원자력 시설', key: 'infrastructure', shape: 'square' },
  { color: '#FF3D3D', label: '글로벌 사건', key: 'global_incidents', shape: 'triangle' },
  { color: '#FF4444', label: 'GPS 교란',   key: 'gps_jamming', shape: 'circle' },
];

export default function MapLegend({ activeLayers }: MapLegendProps) {
  const [open, setOpen] = useState(false);

  // 활성화된 레이어만 필터
  const visible = LEGEND_ITEMS.filter(item => {
    const key = item.key;
    return activeLayers[key] ||
      (key === 'maritime' && (activeLayers.maritime)) ||
      (key === 'live_news' && activeLayers.live_news) ||
      (key === 'global_incidents' && activeLayers.global_incidents);
  });

  return (
    <div className="pointer-events-auto">
      {/* 토글 버튼 */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label="지도 범례 열기/닫기"
        className="flex items-center gap-1.5 glass-panel px-2.5 py-1.5 rounded-lg border border-white/[0.1] hover:border-white/[0.2] transition-colors text-[11px] font-semibold text-white/60 hover:text-white/90"
      >
        <Map className="w-3 h-3" />
        범례
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {/* 범례 패널 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-0 glass-panel border border-white/[0.1] rounded-xl p-3 min-w-[160px] shadow-[0_8px_32px_rgba(0,0,0,0.7)]"
          >
            <div className="text-[10px] font-bold text-white/30 tracking-widest mb-2 uppercase">지도 범례</div>
            <div className="space-y-1.5">
              {visible.length === 0 ? (
                <div className="text-[11px] text-white/30">활성 레이어 없음</div>
              ) : (
                visible.map(item => (
                  <div key={item.key} className="flex items-center gap-2">
                    {/* 도형 */}
                    {item.shape === 'triangle' ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" className="flex-shrink-0">
                        <polygon points="5,1 9,9 1,9" fill={item.color} opacity="0.9" />
                      </svg>
                    ) : item.shape === 'square' ? (
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                    ) : (
                      <div
                        className="rounded-full flex-shrink-0"
                        style={{
                          width: item.size === 'lg' ? '10px' : '8px',
                          height: item.size === 'lg' ? '10px' : '8px',
                          backgroundColor: item.color,
                          boxShadow: `0 0 4px ${item.color}80`,
                        }}
                      />
                    )}
                    <span className="text-[12px] font-medium text-white/75">{item.label}</span>
                  </div>
                ))
              )}
            </div>

            {/* 크기 설명 */}
            <div className="mt-2.5 pt-2 border-t border-white/[0.07]">
              <div className="text-[10px] text-white/30 leading-relaxed">
                큰 원 = 규모 클수록 크게 표시<br/>
                삼각형 = 분쟁·사건
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
