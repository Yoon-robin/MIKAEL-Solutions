'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, ChevronDown, ChevronUp, BarChart3,
  Zap, Shield, Droplets, Gem, Bitcoin, LineChart,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface MarketsPanelProps { data: any; spaceWeather?: any; }

const SECTIONS = [
  { key: 'indices', label: '지수', icon: LineChart },
  { key: 'stocks', label: '방산', icon: Shield },
  { key: 'oil', label: '에너지', icon: Droplets },
  { key: 'commodities', label: '원자재', icon: Gem },
  { key: 'crypto', label: '암호자산', icon: Bitcoin },
];

function Ticker({ name, data: d }: { name: string; data: any }) {
  if (!d) return null;
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-[var(--hover-accent)] transition-colors">
      <span className="text-[10px] font-mono text-[var(--text-secondary)] tracking-wide">{name}</span>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-mono font-bold text-[var(--text-primary)] tabular-nums">
          {d.price >= 1000 ? `${(d.price / 1000).toFixed(1)}K` : d.price?.toFixed(2)}
        </span>
        <span className={`text-[9px] font-mono font-bold flex items-center gap-0.5 ${d.up ? 'text-[var(--alert-green)]' : 'text-[var(--alert-red)]'}`}>
          {d.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {d.change_percent > 0 ? '+' : ''}{d.change_percent?.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

export default function MarketsPanel({ data, spaceWeather }: MarketsPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeSection, setActiveSection] = useState('stocks');
  const markets = data.markets || {};

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.6 }}
      className="pointer-events-auto"
    >
      <Card className="glass-panel mikael-glow border-[var(--border-primary)] bg-[var(--card)] py-0 gap-0 overflow-hidden">
        <CardHeader className="px-3 py-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
              <CardTitle className="hud-text text-[12px] text-[var(--text-primary)] tracking-widest">
                시장·정보
              </CardTitle>
              <Badge variant="success" className="text-[7px] px-1.5 py-0 font-mono">실시간</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--alert-green)] animate-mikael-pulse" />
              {expanded
                ? <ChevronUp className="w-3 h-3 text-[var(--text-muted)]" />
                : <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />}
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
              <Separator className="bg-[var(--border-secondary)]" />
              <CardContent className="px-3 py-2">
                {/* 우주기상 배너 */}
                {spaceWeather && (
                  <div
                    className="mb-2 p-2 rounded-lg border"
                    style={{
                      borderColor: `${spaceWeather.storm_color}33`,
                      background: `${spaceWeather.storm_color}08`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3" style={{ color: spaceWeather.storm_color }} />
                        <span className="text-[10px] font-mono tracking-widest text-[var(--text-muted)]">우주기상</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold" style={{ color: spaceWeather.storm_color }}>
                        Kp {spaceWeather.kp_index} — {spaceWeather.storm_level}
                      </span>
                    </div>
                    {spaceWeather.solar_flares?.length > 0 && (
                      <div className="mt-1 text-[8px] font-mono text-[var(--text-muted)]">
                        최근 태양 플레어: {spaceWeather.solar_flares[0].class}
                      </div>
                    )}
                  </div>
                )}

                {/* 섹션 탭 */}
                <div className="flex gap-0.5 mb-2 overflow-x-auto">
                  {SECTIONS.map(s => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.key}
                        onClick={() => setActiveSection(s.key)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[9px] font-mono tracking-wider whitespace-nowrap transition-all ${
                          activeSection === s.key
                            ? 'bg-[var(--hover-accent)] text-[var(--gold-primary)] border border-[var(--border-primary)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {s.label}
                      </button>
                    );
                  })}
                </div>

                {/* 시세 목록 */}
                <div className="space-y-0.5 max-h-[200px] overflow-y-auto styled-scrollbar">
                  {markets[activeSection] &&
                    Object.entries(markets[activeSection]).map(([name, d]) => (
                      <Ticker key={name} name={name} data={d} />
                    ))}
                  {(!markets[activeSection] ||
                    Object.keys(markets[activeSection]).length === 0) && (
                    <div className="text-center py-3 text-[10px] font-mono text-[var(--text-muted)]">
                      {activeSection} 불러오는 중...
                    </div>
                  )}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
