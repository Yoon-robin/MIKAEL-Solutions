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
      <Card className="border-white/[0.08] bg-[#0E1018] py-0 gap-0 overflow-hidden">
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative rounded-md border border-white/[0.08] bg-white/[0.04] p-1.5">
                <Eye className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--alert-green)] animate-mikael-pulse" />
              </div>
              <div>
                <CardTitle className="text-[13px] font-semibold text-[var(--text-heading)]">데이터 레이어</CardTitle>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">레이어 제어 시스템</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant={activeCount > 10 ? 'danger' : activeCount > 5 ? 'gold' : 'success'} className="text-[8px] px-1.5 py-0 font-mono">
                {activeCount}/{ALL_LAYERS.length}
              </Badge>
              <Badge variant="cyan" className="text-[7px] px-1.5 py-0 font-mono">{totalEntities.toLocaleString()}개</Badge>
            </div>
          </div>
        </CardHeader>
        <Separator className="bg-white/[0.06]" />
        <CardContent className="px-3 py-2">
          {/* Groups */}
          <div className="space-y-1">
        {LAYER_GROUPS.map((group) => {
          const isExpanded = expandedGroups[group.label];
          const groupActiveCount = group.layers.filter(l => activeLayers[l.key]).length;
          const allActive = groupActiveCount === group.layers.length;
          const GroupIcon = group.icon;

          return (
            <div key={group.label}>
              {/* Group Header */}
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleGroup(group.label)}
                  className="h-8 flex-1 justify-start gap-2 px-2 text-[var(--text-secondary)] hover:bg-white/[0.03] hover:text-[var(--text-primary)]"
                >
                  <GroupIcon className="w-3 h-3 flex-shrink-0" style={{ color: group.color }} />
                  <span className="text-[9px] font-mono tracking-[0.15em] font-bold flex-1 text-left">{group.label}</span>
                  <span className="text-[8px] font-mono tabular-nums" style={{ color: groupActiveCount > 0 ? group.color : 'var(--text-muted)' }}>
                    {groupActiveCount}/{group.layers.length}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-3 h-3 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
                  )}
                </Button>
                {/* Toggle all in group */}
                <Button
                  type="button"
                  variant="hud"
                  size="icon-sm"
                  onClick={() => toggleAllInGroup(group)}
                  title={allActive ? '전체 끄기' : '전체 켜기'}
                >
                  {allActive ? (
                    <ToggleRight className="w-3.5 h-3.5" style={{ color: group.color }} />
                  ) : (
                    <ToggleLeft className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  )}
                </Button>
              </div>

              {/* Layer items */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-2 pl-2 border-l border-[var(--border-secondary)]/40 space-y-px">
                      {group.layers.map((layer) => {
                        const Icon = layer.icon;
                        const isActive = activeLayers[layer.key];
                        const count = getCount(layer.dataKey);
                        return (
                          <Button
                            type="button"
                            variant={isActive ? 'gold' : 'ghost'}
                            size="sm"
                            key={layer.key}
                            onClick={() => toggle(layer.key)}
                            className={`w-full h-8 justify-start gap-2.5 px-2 py-[5px] text-left font-normal transition-all duration-200 group ${
                              isActive
                                ? 'border-white/[0.06] bg-white/[0.04]'
                                : 'border border-transparent text-[var(--text-muted)] hover:bg-white/[0.02]'
                            }`}
                          >
                            {/* Color dot indicator */}
                            <div
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300 ${isActive ? 'scale-100' : 'scale-50 opacity-30'}`}
                              style={{
                                backgroundColor: layer.color,
                                boxShadow: isActive ? `0 0 6px ${layer.color}60` : 'none',
                              }}
                            />
                            <Icon
                              className="w-3.5 h-3.5 flex-shrink-0 transition-colors duration-200"
                              style={{ color: isActive ? layer.color : 'var(--text-muted)' }}
                            />
                            <span className={`text-[11px] font-mono tracking-wide flex-1 text-left transition-colors duration-200 ${
                              isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                            }`}>
                              {layer.label}
                            </span>
                            {count !== null && (
                              <span
                                className="text-[9px] font-mono tabular-nums font-bold transition-colors duration-200"
                                style={{ color: isActive ? layer.color : 'var(--text-muted)' }}
                              >
                                {count.toLocaleString()}
                              </span>
                            )}
                            {/* Toggle switch */}
                            <div className={`layer-toggle ${isActive ? 'active' : ''}`} />
                          </Button>
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
