'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, Satellite, Activity, Radio, Eye,
  Shield, Sun, AlertTriangle, Camera, Flame,
  CloudLightning, Radiation, Tv, Ship,
  ChevronDown, ChevronUp, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface LayerPanelProps {
  data: any;
  activeLayers: any;
  setActiveLayers: React.Dispatch<React.SetStateAction<any>>;
}

const LAYER_GROUPS = [
  {
    label: '항공',
    icon: Plane,
    color: '#00E5FF',
    layers: [
      { key: 'flights', label: '민항기', icon: Plane, color: '#00E5FF', dataKey: 'commercial_flights' },
      { key: 'private', label: '개인 항공기', icon: Plane, color: '#00E676', dataKey: 'private_flights' },
      { key: 'jets', label: '전용기', icon: Plane, color: '#FF69B4', dataKey: 'private_jets' },
      { key: 'military', label: '군용기', icon: Shield, color: '#FF3D3D', dataKey: 'military_flights' },
    ],
  },
  {
    label: '해상·우주',
    icon: Ship,
    color: '#00BCD4',
    layers: [
      { key: 'maritime', label: '해상 / 함정', icon: Ship, color: '#00BCD4', dataKey: 'maritime_ships,maritime_ports,maritime_chokepoints' },
      { key: 'satellites', label: '위성', icon: Satellite, color: '#D4AF37', dataKey: 'satellites' },
    ],
  },
  {
    label: '감시 자산',
    icon: Camera,
    color: '#39FF14',
    layers: [
      { key: 'cctv', label: 'CCTV 카메라', icon: Camera, color: '#39FF14', dataKey: 'cameras' },
      { key: 'live_news', label: '실시간 뉴스', icon: Tv, color: '#FF4081', dataKey: 'live_feeds' },
    ],
  },
  {
    label: '자연재해',
    icon: Activity,
    color: '#FF9500',
    layers: [
      { key: 'earthquakes', label: '지진 (24시간)', icon: Activity, color: '#FF9500', dataKey: 'earthquakes' },
      { key: 'fires', label: '활성 화재', icon: Flame, color: '#FF6B00', dataKey: 'fires' },
      { key: 'weather', label: '악천후', icon: CloudLightning, color: '#E040FB', dataKey: 'weather_events' },
    ],
  },
  {
    label: '위협·인프라',
    icon: AlertTriangle,
    color: '#FF3D3D',
    layers: [
      { key: 'infrastructure', label: '원자력 시설', icon: Radiation, color: '#76FF03', dataKey: 'infrastructure' },
      { key: 'global_incidents', label: '글로벌 사건', icon: AlertTriangle, color: '#FF3D3D', dataKey: 'gdelt' },
      { key: 'gps_jamming', label: 'GPS 교란', icon: Radio, color: '#FF4444', dataKey: 'gps_jamming' },
    ],
  },
  {
    label: '표시',
    icon: Sun,
    color: '#448AFF',
    layers: [
      { key: 'day_night', label: '주야간 경계', icon: Sun, color: '#448AFF', dataKey: '' },
    ],
  },
];

// Flat list for backward compat
const ALL_LAYERS = LAYER_GROUPS.flatMap(g => g.layers);

function LayerPanel({ data, activeLayers, setActiveLayers }: LayerPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    LAYER_GROUPS.forEach(g => { initial[g.label] = true; });
    return initial;
  });

  const toggle = (key: string) => setActiveLayers((prev: any) => ({ ...prev, [key]: !prev[key] }));
  const getCount = (dk: string): number | null => {
    if (!dk) return null;
    let total = 0;
    let found = false;
    for (const k of dk.split(',')) {
      if (data[k] && Array.isArray(data[k])) {
        total += data[k].length;
        found = true;
      }
    }
    return found ? total : null;
  };
  const totalEntities = ALL_LAYERS.reduce((s: number, l: any) => s + (getCount(l.dataKey) || 0), 0);
  const activeCount = Object.values(activeLayers).filter(Boolean).length;

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
  };

  const toggleAllInGroup = (group: typeof LAYER_GROUPS[0]) => {
    const allActive = group.layers.every(l => activeLayers[l.key]);
    setActiveLayers((prev: any) => {
      const next = { ...prev };
      group.layers.forEach(l => { next[l.key] = !allActive; });
      return next;
    });
  };

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="pointer-events-auto">
      <Card className="border-[#272027] bg-[#0E0C10] py-0 gap-0 overflow-hidden rounded-lg mikael-panel">

        {/* ── 패널 헤더 ── */}
        <CardHeader className="px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Eye className="w-4 h-4 text-[var(--gold-primary)]" />
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--alert-green)]" />
              </div>
              <CardTitle className="mikael-brand text-[13px] text-[var(--text-heading)]">
                데이터 레이어
              </CardTitle>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--text-muted)] tabular-nums font-medium">
                {activeCount}/{ALL_LAYERS.length}
              </span>
              <Badge variant="success" className="text-[10px] h-5 px-1.5 rounded font-medium">
                {totalEntities.toLocaleString()}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <Separator className="bg-[#272027]" />

        <CardContent className="px-2 py-2">
          <div className="space-y-0.5">
            {LAYER_GROUPS.map((group) => {
              const isExpanded = expandedGroups[group.label];
              const groupActiveCount = group.layers.filter(l => activeLayers[l.key]).length;
              const allActive = groupActiveCount === group.layers.length;
              const GroupIcon = group.icon;

              return (
                <div key={group.label}>
                  {/* ── 그룹 헤더 — Next.js 사이드바 섹션 스타일 ── */}
                  <div className="flex items-center gap-1 px-1 py-0.5">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.label)}
                      className="flex items-center gap-2 flex-1 py-1.5 px-2 rounded-md hover:bg-[#161018] transition-colors text-left group"
                    >
                      <GroupIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: group.color }} />
                      <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest flex-1">
                        {group.label}
                      </span>
                      <span className="text-[10px] tabular-nums text-[var(--text-muted)] mr-1">
                        {groupActiveCount}/{group.layers.length}
                      </span>
                      {isExpanded
                        ? <ChevronUp className="w-3 h-3 text-[var(--text-muted)]" />
                        : <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAllInGroup(group)}
                      className="p-1 rounded hover:bg-[#161018] transition-colors"
                      title={allActive ? '전체 끄기' : '전체 켜기'}
                    >
                      {allActive
                        ? <ToggleRight className="w-4 h-4" style={{ color: group.color }} />
                        : <ToggleLeft className="w-4 h-4 text-[#3F3F46]" />}
                    </button>
                  </div>

                  {/* ── 레이어 아이템 — Next.js 사이드바 리스트 ── */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-3 pl-3 border-l border-[#272027] space-y-px mb-1">
                          {group.layers.map((layer) => {
                            const Icon = layer.icon;
                            const isActive = activeLayers[layer.key];
                            const count = getCount(layer.dataKey);
                            return (
                              <button
                                key={layer.key}
                                type="button"
                                onClick={() => toggle(layer.key)}
                                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md transition-colors text-left ${
                                  isActive
                                    ? 'bg-[#1A0E0E] text-white mikael-layer-active'
                                    : 'text-[var(--text-muted)] hover:bg-[#161018] hover:text-[var(--text-secondary)]'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isActive ? layer.color : '#52525B' }} />
                                <span className="text-[13px] flex-1 font-medium">{layer.label}</span>
                                {count !== null && (
                                  <span className="text-[11px] tabular-nums text-[#6B5748]">
                                    {count.toLocaleString()}
                                  </span>
                                )}
                                <div className={`layer-toggle flex-shrink-0 ${isActive ? 'active' : ''}`} />
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default memo(LayerPanel);
