'use client';

import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ViewPresetsProps {
  onNavigate: (lat: number, lng: number, zoom: number) => void;
}

const PRESETS = [
  { label: '전세계', lat: 20, lng: 0, zoom: 2.5, icon: '🌍' },
  { label: '유럽', lat: 48, lng: 10, zoom: 4, icon: '🇪🇺' },
  { label: '중동', lat: 30, lng: 45, zoom: 4.5, icon: '🔥', hot: true },
  { label: '동아시아', lat: 35, lng: 120, zoom: 4, icon: '🌏' },
  { label: '아메리카', lat: 25, lng: -90, zoom: 3, icon: '🌎' },
  { label: '우크라이나', lat: 49, lng: 32, zoom: 6, icon: '⚔️', hot: true },
  { label: '아프리카', lat: 5, lng: 20, zoom: 3.5, icon: '🌍' },
  { label: '동남아', lat: 10, lng: 110, zoom: 4.5, icon: '🌏' },
  { label: '북극권', lat: 75, lng: 0, zoom: 3.5, icon: '❄️' },
  { label: '인도', lat: 22, lng: 78, zoom: 4.5, icon: '🇮🇳' },
  { label: '호주', lat: -25, lng: 134, zoom: 4, icon: '🇦🇺' },
  { label: '수단', lat: 15, lng: 30, zoom: 5.5, icon: '⚠️', hot: true },
];

export default function ViewPresets({ onNavigate }: ViewPresetsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.7, duration: 0.6 }}
      className="border border-white/[0.08] bg-[#0E1018] rounded-xl p-3 pointer-events-auto"
    >
      <div className="flex items-center gap-2 mb-2.5">
        <Globe className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
        <span className="text-[13px] font-semibold text-[var(--text-heading)]">지역 프리셋</span>
        <Badge variant="danger" className="text-[7px] px-1.5 py-0 font-mono ml-auto">
          {PRESETS.filter(p => (p as any).hot).length} 주의
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => onNavigate(p.lat, p.lng, p.zoom)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-mono tracking-wider border border-transparent hover:border-[var(--border-primary)] hover:text-[var(--gold-primary)] transition-all hover:scale-[1.02] active:scale-[0.98] ${(p as any).hot ? 'text-[var(--alert-red)] hover:border-[var(--alert-red)]/30 hover:bg-[var(--alert-red)]/5' : 'text-[var(--text-muted)] hover:bg-[var(--hover-accent)]'}`}
          >
            <span className="text-[11px] flex-shrink-0">{p.icon}</span>
            <span>{p.label}</span>
            {(p as any).hot && <span className="w-1.5 h-1.5 rounded-full bg-[var(--alert-red)] animate-mikael-pulse ml-auto flex-shrink-0" />}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
