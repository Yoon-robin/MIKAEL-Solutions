'use client';

import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ViewPresetsProps {
  onNavigate: (lat: number, lng: number, zoom: number) => void;
}

const PRESETS = [
  // ── 한국 우선 ──
  { label: '대한민국',   lat: 36.5,  lng: 127.8,  zoom: 6.5 },
  { label: '서울·수도권', lat: 37.5,  lng: 127.0,  zoom: 9.5 },
  { label: 'DMZ',        lat: 38.3,  lng: 127.1,  zoom: 9.0, hot: true },
  { label: '서해 NLL',   lat: 37.7,  lng: 124.8,  zoom: 8.5, hot: true },
  { label: '부산항',     lat: 35.1,  lng: 129.0,  zoom: 10.0 },
  { label: '제주',       lat: 33.5,  lng: 126.5,  zoom: 9.0 },
  { label: '동북아',     lat: 36.0,  lng: 127.0,  zoom: 4.5 },
  { label: '북한',       lat: 39.5,  lng: 127.0,  zoom: 6.5, hot: true },
  // ── 글로벌 ──
  { label: '전세계',     lat: 20,    lng: 0,      zoom: 2.5 },
  { label: '중동',       lat: 30,    lng: 45,     zoom: 4.5, hot: true },
  { label: '유럽',       lat: 48,    lng: 10,     zoom: 4.0 },
  { label: '우크라이나', lat: 49,    lng: 32,     zoom: 6.0, hot: true },
  { label: '대만해협',   lat: 24.5,  lng: 120.8,  zoom: 7.0, hot: true },
  { label: '남중국해',   lat: 12.0,  lng: 113.0,  zoom: 5.0, hot: true },
  { label: '중동·가자',  lat: 31.5,  lng: 34.5,   zoom: 7.5, hot: true },
  { label: '아메리카',   lat: 25,    lng: -90,    zoom: 3.0 },
];

export default function ViewPresets({ onNavigate }: ViewPresetsProps) {
  const hotCount = PRESETS.filter(p => p.hot).length;
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.7, duration: 0.6 }}
      className="border border-white/[0.07] bg-[#0A0808] rounded-lg p-3 pointer-events-auto"
    >
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-[var(--gold-primary)]" />
        <span className="text-[14px] font-semibold text-white tracking-tight">지역 프리셋</span>
        <Badge variant="danger" className="text-[13px] px-1.5 py-0 ml-auto">
          {hotCount} 주의
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => onNavigate(p.lat, p.lng, p.zoom)}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] font-semibold transition-colors ${
              p.hot
                ? 'text-[var(--alert-red)] hover:bg-[#110E0E]'
                : 'text-[#A1A1AA] hover:bg-[#110E0E] hover:text-white'
            }`}
          >
            <span>{p.label}</span>
            {p.hot && <span className="w-1.5 h-1.5 rounded-full bg-[var(--alert-red)] animate-beacon ml-auto flex-shrink-0" />}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
