'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, BarChart3, Newspaper, Search, Share2, Map as MapIcon, X, Globe, MapPinned, Radar, Satellite, Moon, ExternalLink, AlertTriangle, Building2, RadioTower, Activity, Shield, Database, Wifi } from 'lucide-react';
import IntelFeed from '@/components/IntelFeed';
import MarketsPanel from '@/components/MarketsPanel';
import SearchBar from '@/components/SearchBar';
import ScaleBar from '@/components/ScaleBar';
import MapLegend from '@/components/MapLegend';
import ErrorBoundary from '@/components/ErrorBoundary';
import SharePanel from '@/components/SharePanel';
import ViewPresets from '@/components/ViewPresets';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import GlobalStatusBar from '@/components/GlobalStatusBar';
import LiveAlerts from '@/components/LiveAlerts';

const MikaelMap = dynamic(() => import('@/components/MikaelMap'), { ssr: false });
const LayerPanel = dynamic(() => import('@/components/LayerPanel'));
const CameraViewer = dynamic(() => import('@/components/CameraViewer'));
const OsintPanel = dynamic(() => import('@/components/OsintPanel'));
const MikaelAIChat = dynamic(() => import('@/components/MikaelAIChat'), { ssr: false });

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Mobile if narrow, OR landscape phone (short height + moderate width)
      setIsMobile(w < 768 || (h < 500 && w < 1024));
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);
  return isMobile;
}
const UptimeClock = () => {
  const [uptime, setUptime] = useState('00:00:00');
  const startTime = useRef(Date.now());
  useEffect(() => {
    const iv = setInterval(() => {
      const e = Math.floor((Date.now() - startTime.current) / 1000);
      setUptime(`${String(Math.floor(e/3600)).padStart(2,'0')}:${String(Math.floor((e%3600)/60)).padStart(2,'0')}:${String(e%60).padStart(2,'0')}`);
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  return <span className="hidden lg:inline">가동: <span className="text-[var(--gold-primary)]">{uptime}</span></span>;
};

const ZuluClock = () => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const iv = setInterval(() => {
      const now = new Date();
      setTime(`ZULU ${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}:${String(now.getUTCSeconds()).padStart(2,'0')}Z`);
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  return <span className="text-[var(--cyan-primary)] font-bold tabular-nums">{time || 'ZULU --:--:--Z'}</span>;
};

const DataThroughput = ({ data }: { data: any }) => {
  const [throughput, setThroughput] = useState('0.00');
  const [pingTime, setPingTime] = useState<number | null>(null);

  useEffect(() => {
    const iv = setInterval(() => {
      let estimatedBytes = 0;
      if (data) {
        if (data.satellites) estimatedBytes += data.satellites.length * 150;
        if (data.commercial_flights) estimatedBytes += data.commercial_flights.length * 120;
        if (data.cameras) estimatedBytes += data.cameras.length * 80;
        if (data.gdelt) estimatedBytes += data.gdelt.length * 300;
        if (data.live_feeds) estimatedBytes += data.live_feeds.length * 500;
      }
      
      const megabytes = estimatedBytes / 1024 / 1024;
      setThroughput(megabytes > 0 ? (megabytes * 1.5).toFixed(2) : "0.00");
      
      setPingTime(Math.floor(30 + estimatedBytes / 100000));
    }, 2500);
    return () => clearInterval(iv);
  }, [data]);

  return <span className="text-[var(--alert-green)] font-bold tabular-nums">{throughput} MB/s</span>;
};

export default function Dashboard() {
  const dataRef = useRef<any>({});
  const [dataVersion, setDataVersion] = useState(0);
  const data = dataRef.current;

  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [mapView, setMapView] = useState({ zoom: 4.5, latitude: 36.5, longitude: 127.8 });
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number; ts: number } | null>(null);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const mouseCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const coordsDisplayRef = useRef<HTMLDivElement>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [regionDossier, setRegionDossier] = useState<any>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [activeCamera, setActiveCamera] = useState<any>(null);
  const [spaceWeather, setSpaceWeather] = useState<any>(null);
  const [showLayers, setShowLayers] = useState(true);
  const [showMarkets, setShowMarkets] = useState(true);
  const [showIntel, setShowIntel] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'layers'|'markets'|'intel'|'alerts'|'search'|'recon'|null>(null);
  const [mapProjection, setMapProjection] = useState<'globe'|'mercator'>('globe');
  const [mapStyle, setMapStyle] = useState<'dark'|'satellite'>('dark');
  const [sweepData, setSweepData] = useState<any>(null);
  const [scanTargets, setScanTargets] = useState<any[]>([]);

  const isMobile = useIsMobile();
  const startTime = useRef(Date.now());
  const geocodeCache = useRef<Map<string, string>>(new Map());
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeocodedPos = useRef<{ lat: number; lng: number } | null>(null);

  // ── DEFAULT: Most layers OFF — fast initial load ──
  const [activeLayers, setActiveLayers] = useState({
    flights: false,
    private: false,
    jets: false,
    military: false,
    maritime: true,
    satellites: false,
    balloons: false,
    cctv: true,
    live_news: true,
    news_intel: true,
    earthquakes: true,
    fires: false,
    weather: false,
    radiation: false,
    infrastructure: false,
    global_incidents: true,
    war_alerts: false,
    gps_jamming: false,
    day_night: true,
  });
  const [liveFeedUrl, setLiveFeedUrl] = useState<string | null>(null);
  const [liveFeedName, setLiveFeedName] = useState('');
  const [liveFeedEmbedAllowed, setLiveFeedEmbedAllowed] = useState(true);

  // Splash screen
  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(splashTimer);
  }, []);

  // URL state: parse on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    const lat = parseFloat(p.get('lat') || '');
    const lon = parseFloat(p.get('lon') || '');
    const zoom = parseFloat(p.get('zoom') || '');
    if (!isNaN(lat) && !isNaN(lon)) {
      setFlyToLocation({ lat, lng: lon, ts: Date.now() });
      if (!isNaN(zoom)) setMapView(v => ({ ...v, zoom }));
    }
    const layers = p.get('layers');
    if (layers) {
      const active = layers.split(',');
      setActiveLayers(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { (next as any)[k] = active.includes(k); });
        return next;
      });
    }
  }, []);

  // URL state: update URL on view change (debounced)
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (urlTimer.current) clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      const p = new URLSearchParams();
      p.set('lat', (mouseCoordsRef.current?.lat ?? mapView.latitude ?? 20).toFixed(4));
      p.set('lon', (mouseCoordsRef.current?.lng ?? 0).toFixed(4));
      p.set('zoom', mapView.zoom.toFixed(2));
      const active = Object.entries(activeLayers).filter(([,v]) => v).map(([k]) => k).join(',');
      p.set('layers', active);
      const url = `${window.location.pathname}?${p.toString()}`;
      window.history.replaceState(null, '', url);
    }, 1500);
  }, [mapView, activeLayers]);

  // Global Stats Fetch
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(d => {
        if (d.stats) setGlobalStats(d.stats);
      })
      .catch(console.error);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) return;
      if (e.key === 'f' && !e.ctrlKey) {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
        setIsFullscreen(!!document.fullscreenElement);
      }
      if (e.key === 'l') setShowLayers(p => !p);
      if (e.key === 'm') setShowMarkets(p => !p);
      if (e.key === 'i') setShowIntel(p => !p);
      if (e.key === 'r') setFlyToLocation({ lat: 20, lng: 0, ts: Date.now() });
      if (e.key === 'g') setMapProjection(p => p === 'globe' ? 'mercator' : 'globe');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Mouse coords + reverse geocode (Zero-Render)
  // BigDataCloud API: 무료, 키 없음, Nominatim보다 빠름
  const handleMouseCoords = useCallback((coords: { lat: number; lng: number }) => {
    mouseCoordsRef.current = coords;
    if (coordsDisplayRef.current) {
      coordsDisplayRef.current.innerText = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
    }
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      if (lastGeocodedPos.current) {
        const d = Math.abs(coords.lat - lastGeocodedPos.current.lat) + Math.abs(coords.lng - lastGeocodedPos.current.lng);
        if (d < 0.15) return; // ~16km 이내 이동은 스킵
      }
      const gk = `${coords.lat.toFixed(1)},${coords.lng.toFixed(1)}`;
      if (geocodeCache.current.has(gk)) {
        setLocationLabel(geocodeCache.current.get(gk)!);
        lastGeocodedPos.current = coords;
        return;
      }
      try {
        // BigDataCloud — 빠른 응답, 무료, rate limit 없음
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.lat}&longitude=${coords.lng}&localityLanguage=ko`,
          { signal: AbortSignal.timeout(3000) }
        );
        if (res.ok) {
          const d = await res.json();
          const city = d.city || d.locality || d.principalSubdivision || '';
          const country = d.countryName || '';
          const label = [city, country].filter(Boolean).join(', ') || '알 수 없음';
          if (geocodeCache.current.size > 500) {
            const it = geocodeCache.current.keys();
            for (let i = 0; i < 100; i++) { const k = it.next().value; if (k) geocodeCache.current.delete(k); }
          }
          geocodeCache.current.set(gk, label);
          setLocationLabel(label);
          lastGeocodedPos.current = coords;
        }
      } catch (e) { console.warn('[MIKAEL] geocode suppressed:', e instanceof Error ? e.message : e); }
    }, 800); // 3000ms → 800ms
  }, []);

  // Region dossier (right-click)
  const handleRightClick = useCallback(async (coords: { lat: number; lng: number }) => {
    setDossierLoading(true); setRegionDossier(null);
    try {
      const res = await fetch(`/api/region-dossier?lat=${coords.lat}&lng=${coords.lng}`);
      if (res.ok) setRegionDossier(await res.json());
    } catch (e) { console.warn('[MIKAEL Solutions] Suppressed error:', e instanceof Error ? e.message : e); } finally { setDossierLoading(false); }
  }, []);

  // Entity click handler (hoisted from JSX to comply with Rules of Hooks — Fixes #113)
  const handleEntityClick = useCallback((entity: any) => {
    if (entity?.type === 'cctv') setActiveCamera(entity);
    if (entity?.type === 'live_news' && entity.url) {
      setLiveFeedUrl(entity.url);
      setLiveFeedName(entity.name);
      setLiveFeedEmbedAllowed(entity.embed_allowed !== false);
    }
  }, []);

  // ── SHARED FETCH UTILITY (Fixes #107 — single definition, not 3 copies) ──
  const fetchEndpoint = useCallback(async (url: string, transform?: (d: any) => any, options?: RequestInit) => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const res = await fetch(url, options);
      if (res.ok) {
        const json = await res.json();
        const d = transform ? transform(json) : json;
        dataRef.current = { ...dataRef.current, ...d };
        setDataVersion(v => v + 1);
        setBackendStatus('connected');
      }
    } catch (e) {
      console.warn('[MIKAEL Solutions] Suppressed error:', e instanceof Error ? e.message : e);
      setBackendStatus('error');
    }
  }, []);

  // ── PROGRESSIVE DATA LOADING (request-optimized) ──
  useEffect(() => {
    // Priority 1: Core feeds (always needed for panels)
    fetchEndpoint('/api/earthquakes');
    fetchEndpoint('/api/news');
    const marketTimer = setTimeout(() => fetchEndpoint('/api/markets', d => ({ markets: d })), 800);

    // Priority 2: Space Weather (needed for MarketsPanel)
    const spaceTimer = setTimeout(async () => {
      try {
        const r = await fetch('/api/space-weather');
        if (r.ok) setSpaceWeather(await r.json());
      } catch (e) { console.warn('[MIKAEL Solutions] Suppressed error:', e instanceof Error ? e.message : e); }
    }, 5000);

    // Polling — OPTIMIZED intervals to minimize edge requests
    const intervals = [
      setInterval(() => fetchEndpoint('/api/earthquakes'), 900000),  // 15 min (was 5)
      setInterval(() => fetchEndpoint('/api/news'), 1800000),        // 30 min (was 10)
      setInterval(() => fetchEndpoint('/api/markets', d => ({ markets: d })), 900000), // 15 min (was 5)
    ];
    return () => {
      clearTimeout(marketTimer);
      clearTimeout(spaceTimer);
      intervals.forEach(clearInterval);
    };
  }, [fetchEndpoint]);

  // ── LAYER-AWARE DATA LOADING — only fetch when layer is toggled ON ──
  const layerFetchedRef = useRef<Set<string>>(new Set());
  useEffect(() => {

    // Flights
    if (activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) {
      if (!layerFetchedRef.current.has('flights')) {
        fetchEndpoint('/api/flights');
        layerFetchedRef.current.add('flights');
      }
    }
    // Satellites
    if (activeLayers.satellites && !layerFetchedRef.current.has('satellites')) {
      fetchEndpoint('/api/satellites');
      layerFetchedRef.current.add('satellites');
    }
    // Fires
    if (activeLayers.fires && !layerFetchedRef.current.has('fires')) {
      fetchEndpoint('/api/fires');
      layerFetchedRef.current.add('fires');
    }
    // CCTV
    if (activeLayers.cctv && !layerFetchedRef.current.has('cctv')) {
      fetchEndpoint('/api/cctv?region=all');
      layerFetchedRef.current.add('cctv');
    }
    // Maritime
    if (activeLayers.maritime && !layerFetchedRef.current.has('maritime')) {
      fetchEndpoint('/api/maritime', d => ({ maritime_ports: d.ports, maritime_chokepoints: d.chokepoints, maritime_ships: d.ships }));
      layerFetchedRef.current.add('maritime');
    }
    // Balloons
    if (activeLayers.balloons && !layerFetchedRef.current.has('balloons')) {
      fetchEndpoint('/api/balloons', d => ({ balloons: d.balloons }));
      layerFetchedRef.current.add('balloons');
    }
    // Radiation
    if (activeLayers.radiation && !layerFetchedRef.current.has('radiation')) {
      fetchEndpoint('/api/radiation', d => ({ radiation: d.stations }));
      layerFetchedRef.current.add('radiation');
    }
    // Live News
    if (activeLayers.live_news && !layerFetchedRef.current.has('live_news')) {
      fetchEndpoint('/api/live-news', d => ({ live_feeds: d.feeds }));
      layerFetchedRef.current.add('live_news');
    }
    // Weather
    if (activeLayers.weather && !layerFetchedRef.current.has('weather')) {
      fetchEndpoint('/api/weather', d => ({ weather_events: d.events }));
      layerFetchedRef.current.add('weather');
    }
    // Infrastructure
    if (activeLayers.infrastructure && !layerFetchedRef.current.has('infrastructure')) {
      fetchEndpoint('/api/infrastructure', d => ({ infrastructure: d.infrastructure }));
      layerFetchedRef.current.add('infrastructure');
    }
    // Global Incidents (GDELT)
    if (activeLayers.global_incidents && !layerFetchedRef.current.has('gdelt')) {
      fetchEndpoint('/api/gdelt', d => ({ gdelt: d.events }));
      layerFetchedRef.current.add('gdelt');
    }

  }, [activeLayers]);

  // ── LAYER-AWARE POLLING — only poll data for active layers ──
  useEffect(() => {
    const intervals: ReturnType<typeof setInterval>[] = [];
    if (activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) {
      intervals.push(setInterval(() => fetchEndpoint('/api/flights'), 300000)); // 5 min (was 2 min)
    }

    if (activeLayers.balloons) {
      intervals.push(setInterval(() => fetchEndpoint('/api/balloons', d => ({ balloons: d.balloons })), 300000)); // 5m
    }
    if (activeLayers.radiation) {
      intervals.push(setInterval(() => fetchEndpoint('/api/radiation', d => ({ radiation: d.stations })), 300000)); // 5m
    }
    if (activeLayers.maritime) {
      intervals.push(setInterval(() => fetchEndpoint('/api/maritime', d => ({ maritime_ports: d.ports, maritime_chokepoints: d.chokepoints, maritime_ships: d.ships })), 60000)); // 1m
    }
    // Fires: no polling needed (data changes very slowly, initial fetch is enough)
    return () => intervals.forEach(clearInterval);
  }, [activeLayers, fetchEndpoint]);

  // CCTV: loaded once on layer toggle via layerFetchedRef (no viewport polling)

  // Reactive layer fetch: handled by layerFetchedRef above (no duplicate)

  const totalFlights = useMemo(() => (
    (data.commercial_flights?.length||0)+(data.private_flights?.length||0)+(data.private_jets?.length||0)+(data.military_flights?.length||0)
  ), [data.commercial_flights, data.private_flights, data.private_jets, data.military_flights]);


  return (
    <main className="fixed inset-0 w-full h-full bg-[var(--bg-void)] overflow-hidden mikael-grid-bg">

      {/* ── Next.js 스타일 원형 장식 — 대천사 헤일로 ── */}
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
        {/* 좌하단 헤일로 */}
        <div className="mikael-grid-circle absolute" style={{ width: 320, height: 320, bottom: -80, left: -80 }} />
        <div className="mikael-grid-circle absolute" style={{ width: 180, height: 180, bottom: -20, left: -20, opacity: 0.6 }} />
        {/* 우상단 헤일로 */}
        <div className="mikael-grid-circle absolute" style={{ width: 260, height: 260, top: -60, right: -60, opacity: 0.7 }} />
        <div className="mikael-grid-circle absolute" style={{ width: 140, height: 140, top: -10, right: -10, opacity: 0.5 }} />
        {/* 중앙 좌측 패널 주변 */}
        <div className="mikael-grid-circle absolute" style={{ width: 88, height: 88, top: '38%', left: 240, opacity: 0.3 }} />
        {/* 중앙 우측 패널 주변 */}
        <div className="mikael-grid-circle absolute" style={{ width: 88, height: 88, bottom: '30%', right: 340, opacity: 0.3 }} />
      </div>

      {/* ── SPLASH ── */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at center, #0a0a14 0%, var(--bg-void) 70%)' }}
          >
            {/* ── Scanline CRT overlay ── */}
            <div className="absolute inset-0 pointer-events-none z-[1]" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)',
              animation: 'splashScanDrift 8s linear infinite',
            }} />

            {/* ── V4.2 badge — top-left ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="absolute top-6 left-6 z-[2] text-[12px] tracking-[0.3em] text-[var(--gold-primary)]"
            >
              V4.2
            </motion.div>



            {/* ── 검 엠블럼 — SVG self-draw 애니메이션 ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative w-28 h-28 mb-10 flex items-center justify-center z-[2]"
            >
              <svg viewBox="0 0 80 80" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                {/* 외원 — fade in */}
                <motion.circle
                  cx="40" cy="40" r="37"
                  stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.12"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 1.2, ease: 'easeInOut' }}
                />
                {/* 내원 */}
                <motion.circle
                  cx="40" cy="40" r="27"
                  stroke="#FFFFFF" strokeWidth="0.5" strokeOpacity="0.06"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 1.0, ease: 'easeInOut' }}
                />
                {/* 검 날 — 위에서 아래로 그려짐 */}
                <motion.line
                  x1="40" y1="8" x2="40" y2="58"
                  stroke="#F0E6D0" strokeWidth="1.6" strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.6, duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
                {/* 크로스가드 — 퍼지듯 등장 */}
                <motion.line
                  x1="26" y1="40" x2="54" y2="40"
                  stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 1.2, duration: 0.45, ease: 'easeOut' }}
                />
                {/* 포멜 */}
                <motion.circle
                  cx="40" cy="62" r="3.5"
                  fill="#FFFFFF" fillOpacity="0.5"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1.55, duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                />
                {/* 검 끝 */}
                <motion.polygon
                  points="40,5 41.8,10 40,13.5 38.2,10"
                  fill="#F0E6D0" fillOpacity="0.9"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.55, duration: 0.3 }}
                  style={{ transformOrigin: '40px 9px' }}
                />
              </svg>
            </motion.div>

            {/* ── MIKAEL Solutions title — Cinzel 서체 ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
              className="mb-3 z-[2] text-center"
            >
              <span
                className="mikael-brand text-4xl md:text-5xl"
                style={{ color: 'var(--text-heading)', letterSpacing: '0.35em' }}
              >
                MIKAEL
              </span>
              <span
                className="block text-xl md:text-2xl mt-1"
                style={{ fontFamily: 'Cinzel, serif', color: 'var(--text-secondary)', letterSpacing: '0.55em', fontWeight: 400 }}
              >
                Solutions
              </span>
            </motion.div>

            {/* ── Subtitle — typewriter reveal ── */}
            <div className="overflow-hidden mb-8 z-[2]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 1.2, duration: 0.8, ease: 'easeInOut' }}
                className="overflow-hidden whitespace-nowrap"
              >
                <p className="text-[12px] md:text-[13px] tracking-[0.5em] text-[var(--gold-primary)]" style={{ opacity: 0.8 }}>
                  개인 OSINT 상황인식 센터
                </p>
              </motion.div>
            </div>

            {/* ── Multi-stage progress bar ── */}
            <div className="w-64 md:w-80 z-[2]">
              {/* Thin progress track */}
              <div className="relative w-full h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: ['0%', '25%', '50%', '78%', '100%'] }}
                  transition={{ duration: 2.2, delay: 0.5, times: [0, 0.25, 0.5, 0.75, 1], ease: 'easeInOut' }}
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: 'linear-gradient(90deg, var(--gold-primary), var(--cyan-primary), var(--gold-primary))', boxShadow: '0 0 12px rgba(185,28,28,0.3)' }}
                />
              </div>

              {/* Status messages — cycling */}
              <div className="mt-3 h-4 flex items-center justify-center">
                {[
                  { text: '보안 연결 수립 중...', delay: 0.5 },
                  { text: '데이터 피드 초기화 중...', delay: 1.1 },
                  { text: '센서 보정 중...', delay: 1.7 },
                  { text: '시스템 준비 완료', delay: 2.2 },
                ].map((stage, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{ delay: stage.delay, duration: 0.6, times: [0, 0.1, 0.7, 1] }}
                    className="absolute text-[12px] tracking-[0.25em]"
                    style={{ color: i === 3 ? 'var(--cyan-primary)' : 'var(--text-muted)' }}
                  >
                    {stage.text}
                  </motion.span>
                ))}
              </div>
            </div>




            {/* ── Inline keyframe for scanline drift ── */}
            <style>{`
              @keyframes splashScanDrift {
                0% { background-position: 0 0; }
                100% { background-position: 0 100vh; }
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>



      {/* ── MAP ── */}
      <ErrorBoundary name="Map">
        <MikaelMap 
          data={data} 
          activeLayers={activeLayers} 
          projection={mapProjection} 
          mapStyle={mapStyle === 'satellite' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'dark'} 
          onEntityClick={handleEntityClick} 
          onMouseCoords={handleMouseCoords} 
          onRightClick={handleRightClick} 
          onViewStateChange={setMapView} 
          flyToLocation={flyToLocation}
          sweepData={sweepData}
          scanTargets={scanTargets}
        />
      </ErrorBoundary>


      {/* ── MAP VIEW CONTROLS (3D/2D + SATELLITE TOGGLE) ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.5 }}
        className="absolute bottom-[75px] md:bottom-6 left-3 md:left-[315px] z-[200] flex items-center gap-2 pointer-events-none"
      >
        {/* 3D/2D Toggle */}
        <button
          onClick={() => setMapProjection(p => p === 'globe' ? 'mercator' : 'globe')}
          className="glass-panel p-2.5 pointer-events-auto hover:border-[var(--gold-primary)]/40 transition-colors group relative"
          title={mapProjection === 'globe' ? '2D 지도로 전환' : '3D 글로브로 전환'}
        >
          {mapProjection === 'globe' ? (
            <MapPinned className="w-4 h-4 text-[var(--gold-primary)] group-hover:scale-110 transition-transform" />
          ) : (
            <Globe className="w-4 h-4 text-[var(--cyan-primary)] group-hover:scale-110 transition-transform" />
          )}
          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-[12px] text-[var(--text-muted)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity glass-panel px-2 py-1 z-[300]">
            {mapProjection === 'globe' ? '2D 지도' : '3D 글로브'}
          </span>
        </button>

        {/* Map Style Toggle */}
        <button
          onClick={() => setMapStyle(s => s === 'dark' ? 'satellite' : 'dark')}
          className="glass-panel p-2.5 pointer-events-auto hover:border-[var(--gold-primary)]/40 transition-colors group relative"
          title={mapStyle === 'dark' ? '위성 보기' : '야간 보기'}
        >
          {mapStyle === 'dark' ? (
            <Satellite className="w-4 h-4 text-[var(--alert-green)] group-hover:scale-110 transition-transform" />
          ) : (
            <Moon className="w-4 h-4 text-[var(--cyan-primary)] group-hover:scale-110 transition-transform" />
          )}
          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-[12px] text-[var(--text-muted)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity glass-panel px-2 py-1 z-[300]">
            {mapStyle === 'dark' ? '위성' : '야간 모드'}
          </span>
        </button>
      </motion.div>

      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 2.5 }} className={`absolute top-3 left-3 md:top-5 md:left-5 z-[200] pointer-events-none flex items-center gap-2 md:gap-3`}>
        {/* ── MIKAEL 검 엠블럼 — SVG ── */}
        <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            {/* 외원 */}
            <circle cx="20" cy="20" r="18.5" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.15"/>
            {/* 내원 */}
            <circle cx="20" cy="20" r="13" stroke="#FFFFFF" strokeWidth="0.5" strokeOpacity="0.07"/>
            {/* 검 날 (세로) */}
            <line x1="20" y1="4" x2="20" y2="28" stroke="#F0E6D0" strokeWidth="1.2" strokeLinecap="round"/>
            {/* 검 손잡이 가드 (가로) */}
            <line x1="13" y1="20" x2="27" y2="20" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round"/>
            {/* 검 끝 (pommel) */}
            <circle cx="20" cy="30" r="2.2" fill="#FFFFFF" fillOpacity="0.5"/>
            {/* 검 날 끝 다이아몬드 */}
            <polygon points="20,2 21.2,5 20,7 18.8,5" fill="#F0E6D0" fillOpacity="0.9"/>
          </svg>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="mikael-brand text-[13px] md:text-[17px] text-[var(--text-heading)]">MIKAEL Solutions</h1>
            <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-[1px] rounded-sm border border-[var(--cyan-primary)]/30 bg-[var(--cyan-primary)]/8 text-[13px] tracking-[0.1em] text-[var(--cyan-primary)]" style={{ lineHeight: '1.4' }}>
              GRID
            </span>
          </div>
          <span className="text-[12px] md:text-[11px] text-[var(--text-muted)] font-semibold tracking-[0.06em]">OSINT 상황인식 지휘 콘솔</span>
        </div>
      </motion.div>

      {/* ── TOP-RIGHT STATUS (desktop) — C2 DISPLAY ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }} className="status-bar-desktop absolute top-3 right-3 md:top-4 md:right-5 z-[200] pointer-events-none flex items-center gap-1.5 md:gap-3 text-[12px] md:text-[12px] tracking-widest text-[var(--text-muted)]">

        {/* Zulu Clock */}
        <span className="hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-[var(--border-primary)] bg-black/30">
          <ZuluClock />
        </span>

        <span className="hidden lg:inline text-[var(--border-primary)]">│</span>

        <span className="flex items-center gap-1">시스템: <span className={backendStatus === 'connected' ? 'text-[var(--alert-green)]' : 'text-[var(--alert-red)]'}>{backendStatus.toUpperCase()}</span></span>

        {spaceWeather && <span className="hidden lg:inline">SOLAR: <span style={{ color: spaceWeather.storm_color, fontWeight: 700 }}>Kp{spaceWeather.kp_index}</span></span>}

        {/* Active Data Feeds */}
        <span className="hidden lg:inline-flex items-center gap-1">
          <Wifi className="w-3 h-3 text-[var(--cyan-primary)]" />
          <span className="text-[var(--cyan-primary)] font-bold">{Object.values(activeLayers).filter(Boolean).length}</span>
          <span className="text-[var(--text-muted)]/60">피드</span>
        </span>

        <UptimeClock />
        
        <span className="px-3 py-1 rounded-sm border border-white/[0.15] bg-white/[0.04] text-white text-[13px] font-bold tracking-[0.2em]">MIKAEL GRID</span>
      </motion.div>

      {/* ── MOBILE: Compact top status ── */}
      {isMobile && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="absolute top-3 right-3 z-[200] pointer-events-auto flex items-center gap-2">
          <span className="glass-panel px-2 py-1 flex items-center gap-1.5 text-[13px] tracking-widest">
            <div className="w-1 h-1 rounded-full bg-white/60 animate-beacon" />
            <span className="text-white/80 font-bold">MIKAEL GRID</span>
          </span>
        </motion.div>
      )}



      {/* ── LEFT HUD (desktop): Layers + Stats + Markets + Intel ── */}
      <div className="desktop-panel absolute left-5 top-20 bottom-24 w-72 flex flex-col gap-3 z-[200] pointer-events-none overflow-y-auto styled-scrollbar pr-1">
        {showLayers && (
          <>
            <LayerPanel data={data} activeLayers={activeLayers} setActiveLayers={setActiveLayers} />
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="glass-panel px-3 py-2.5 pointer-events-auto">
              <div className="grid grid-cols-5 gap-2 text-center">
                {([
                  { label: '항공', val: globalStats?.flights, color: '#00E5FF' },
                  { label: '위성', val: globalStats?.sats,    color: '#94A3B8' },
                  { label: 'CCTV', val: globalStats?.cctv,    color: '#39FF14' },
                  { label: '기상', val: globalStats?.weather,  color: '#E040FB' },
                  { label: '원전', val: globalStats?.nuclear,  color: '#76FF03' },
                ] as const).map(({ label, val, color }) => {
                  const n = val ?? 0;
                  return (
                    <div key={label} className={`transition-opacity duration-300 ${n === 0 ? 'opacity-25' : 'opacity-100'}`}>
                      <div className="hud-label">{label}</div>
                      <div className="text-[12px] font-bold tabular-nums" style={{ color: n > 0 ? color : 'rgba(255,255,255,0.3)' }}>
                        {n > 0 ? n.toLocaleString() : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
            <ViewPresets onNavigate={(lat, lng, zoom) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMapView(v => ({ ...v, zoom })); }} />
          </>
        )}
        {showMarkets && <MarketsPanel data={data} spaceWeather={spaceWeather} />}
        {showIntel && <IntelFeed data={data} onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })} />}
      </div>

      {/* ── RIGHT HUD (desktop): Search + RECON + Live Alerts ── */}
      <div className="desktop-panel absolute right-5 top-20 bottom-24 w-80 flex flex-col gap-3 z-[200] pointer-events-auto overflow-y-auto styled-scrollbar pr-1">
        <div className="flex gap-2 items-start">
          <div className="flex-1"><SearchBar onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })} /></div>
          <div className="relative"><SharePanel mapView={mapView} activeLayers={activeLayers} mouseCoords={null} /></div>
        </div>
        <OsintPanel onSweepVisualize={setSweepData} onScanGeolocate={(target, data) => {
          setScanTargets(prev => {
            const existing = prev.filter(t => t.id !== target);
            return [{ id: target, timestamp: Date.now(), ...data }, ...existing].slice(0, 10);
          });
          setFlyToLocation({ lat: data.lat, lng: data.lng, ts: Date.now() });
        }} />
        <LiveAlerts data={data} onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })} onWatchFeed={(url, name) => { setLiveFeedUrl(url); setLiveFeedName(name); }} />
      </div>

      {/* ── LIVE FEED VIEWER OVERLAY ── */}
      <AnimatePresence>
        {liveFeedUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setLiveFeedUrl(null)}
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="w-[90vw] max-w-[900px] flex flex-col relative rounded-xl overflow-hidden border border-[var(--border-primary)] shadow-2xl bg-black"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#111] border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#FF4081] animate-beacon" />
                  <span className="text-[12px] font-bold text-white tracking-wider">{liveFeedName}</span>
                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[12px] font-bold">실시간 방송</span>
                  {!liveFeedEmbedAllowed && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[12px]">외부 전용</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={
                      liveFeedUrl.includes('channel=')
                        ? `https://www.youtube.com/channel/${liveFeedUrl.split('channel=')[1].split('&')[0]}/live`
                        : liveFeedUrl.includes('/embed/')
                        ? `https://www.youtube.com/watch?v=${liveFeedUrl.split('/embed/')[1].split('?')[0]}`
                        : liveFeedUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--border-primary)] hover:bg-[var(--gold-primary)] hover:text-black text-white transition-colors text-[13px]"
                  >
                    <span>YouTube에서 열기</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button onClick={() => setLiveFeedUrl(null)} className="text-white/70 hover:text-white transition-colors p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body — iframe or external card */}
              {liveFeedEmbedAllowed ? (
                <div className="w-full aspect-video relative bg-black">
                  <iframe
                    src={liveFeedUrl}
                    className="w-full h-full absolute inset-0"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-black/95">
                  <div className="text-center px-8">
                    <div className="w-14 h-14 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center mx-auto mb-4">
                      <ExternalLink className="w-6 h-6 text-[#39FF14]" />
                    </div>
                    <p className="text-[13px] font-bold text-white tracking-widest mb-2">임베드 제한됨</p>
                    <p className="text-[13px] text-white/50 mb-6 max-w-xs">
                      {liveFeedName} 은(는) 외부 임베드를 허용하지 않습니다. 아래 버튼으로 원본 실시간 스트림을 직접 여세요.
                    </p>
                    <a
                      href={
                        liveFeedUrl.includes('channel=')
                          ? `https://www.youtube.com/channel/${liveFeedUrl.split('channel=')[1].split('&')[0]}/live`
                          : liveFeedUrl.includes('/embed/')
                          ? `https://www.youtube.com/watch?v=${liveFeedUrl.split('/embed/')[1].split('?')[0]}`
                          : liveFeedUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded border border-[#39FF14]/40 text-[#39FF14] text-[12px] hover:bg-[#39FF14]/10 transition-colors tracking-wider"
                    >
                      <ExternalLink className="w-4 h-4" />
                      실시간 스트림 열기
                    </a>
                  </div>
                </div>
              )}

              {/* Footer — only show for embeddable feeds */}
              {liveFeedEmbedAllowed && (
                <div className="bg-[#111]/90 px-4 py-2.5 border-t border-[var(--border-primary)] flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[var(--gold-primary)] shrink-0" />
                  <span className="text-[13px] text-white/70 leading-relaxed">
                    &ldquo;동영상을 재생할 수 없음&rdquo;이 보이면 위의 <strong className="text-[var(--gold-primary)]">YouTube에서 열기</strong>를 사용하세요.
                  </span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MOBILE UI ═══ */}
      {isMobile && (
        <>
          {/* ── 드로어 백드롭: 열린 상태에서 지도 터치 차단 ── */}
          {mobilePanel && (
            <div
              className="fixed inset-0 z-[399] bg-black/40 backdrop-blur-[2px]"
              onClick={() => setMobilePanel(null)}
              aria-hidden="true"
            />
          )}

          {/* Mobile Bottom Navigation */}
          <div className="mobile-nav">
            <div className="glass-panel mobile-nav-inner">
              {[
                { id: 'layers'  as const, icon: Layers,    label: '레이어' },
                { id: 'markets' as const, icon: BarChart3,  label: '시장'   },
                { id: 'intel'   as const, icon: Newspaper,  label: '정보'   },
                { id: 'alerts'  as const, icon: RadioTower, label: '경보'   },
                { id: 'recon'   as const, icon: Radar,      label: '정찰'   },
                { id: 'search'  as const, icon: Search,     label: '검색'   },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setMobilePanel(mobilePanel === tab.id ? null : tab.id)}
                  className={`mobile-nav-btn ${mobilePanel === tab.id ? 'active' : ''}`}
                >
                  <tab.icon className={`w-4 h-4 ${tab.id === 'recon' ? 'text-[var(--cyan-primary)]' : tab.id === 'alerts' ? 'text-[#FF4081]' : ''}`} />
                  <span className={tab.id === 'recon' ? 'text-[var(--cyan-primary)]' : tab.id === 'alerts' ? 'text-[#FF4081]' : ''}>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Drawer */}
          <AnimatePresence>
            {mobilePanel && (
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed bottom-[52px] left-0 right-0 z-[400] glass-panel rounded-b-none overflow-y-auto styled-scrollbar"
                style={{ maxHeight: 'min(55vh, calc(100dvh - 100px))', paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}
              >
                <div className="mobile-drawer-handle" />
                <div className="px-3 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="hud-text text-[12px] text-[var(--text-primary)]">
                      {mobilePanel === 'layers' ? '레이어·통계' : mobilePanel === 'markets' ? '시장·정보' : mobilePanel === 'intel' ? '정보 피드' : mobilePanel === 'alerts' ? '실시간 경보' : mobilePanel === 'recon' ? 'MIKAEL 정찰' : '검색'}
                    </span>
                    <button onClick={() => setMobilePanel(null)} className="text-[var(--text-muted)] p-1"><X className="w-4 h-4" /></button>
                  </div>
                  {mobilePanel === 'layers' && (
                    <>
                      <div className="glass-panel-sm p-2 mb-2">
                        <div className="grid grid-cols-5 gap-1 text-center">
                          {([
                            { label: '항공', val: totalFlights, color: '#00E5FF' },
                            { label: '위성', val: data.satellites?.length || 0, color: '#94A3B8' },
                            { label: 'CCTV', val: data.cameras?.length || 0, color: '#39FF14' },
                            { label: '기상', val: data.weather_events?.length || 0, color: '#E040FB' },
                            { label: '원전', val: data.infrastructure?.length || 0, color: '#76FF03' },
                          ] as const).map(({ label, val, color }) => (
                            <div key={label} className={val === 0 ? 'opacity-30' : ''}>
                              <div className="text-[9px] text-white/40 font-bold tracking-wider mb-0.5">{label}</div>
                              <div className="text-[12px] font-bold tabular-nums" style={{ color: val > 0 ? color : 'rgba(255,255,255,0.3)' }}>
                                {val > 0 ? val.toLocaleString() : '—'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <LayerPanel data={data} activeLayers={activeLayers} setActiveLayers={setActiveLayers} />
                      <div className="mt-2">
                        <ViewPresets onNavigate={(lat, lng, zoom) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMapView(v => ({ ...v, zoom })); setMobilePanel(null); }} />
                      </div>
                    </>
                  )}
                  {mobilePanel === 'markets' && <MarketsPanel data={data} spaceWeather={spaceWeather} />}
                  {mobilePanel === 'intel' && <IntelFeed data={data} onLocate={(lat, lng) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMobilePanel(null); }} />}
                  {mobilePanel === 'alerts' && (
                    <LiveAlerts
                      data={data}
                      onLocate={(lat, lng) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMobilePanel(null); }}
                      onWatchFeed={(url, name) => { setLiveFeedUrl(url); setLiveFeedName(name); setMobilePanel(null); }}
                    />
                  )}
                  {mobilePanel === 'search' && (
                    <div className="space-y-2">
                      <SearchBar onLocate={(lat, lng) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMobilePanel(null); }} />
                      <SharePanel mapView={mapView} activeLayers={activeLayers} mouseCoords={null} />
                    </div>
                  )}
                  {mobilePanel === 'recon' && (
                    <div className="space-y-2">
                      <OsintPanel isOpen={true} onClose={() => setMobilePanel(null)} isMobile={true} onSweepVisualize={setSweepData} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── MIKAEL AI CHAT (desktop) ── */}
      {!isMobile && <MikaelAIChat isMobile={false} />}

      {/* ── MIKAEL AI CHAT (mobile) ── */}
      {isMobile && <MikaelAIChat isMobile={true} />}

      {/* ── BOTTOM CENTER (desktop) ── */}
      {!isMobile && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3, duration: 0.8 }} className="desktop-only absolute bottom-5 left-1/2 -translate-x-1/2 z-[200] pointer-events-auto">
          <div className="glass-panel px-5 py-2.5 flex items-center gap-0 mikael-glow relative overflow-hidden" style={{ borderImage: 'linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.08), rgba(255,255,255,0.04)) 1', borderImageSlice: 1, borderWidth: '1px', borderStyle: 'solid' }}>

            {/* Animated scan line sweeping across the bar */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
              <div className="absolute top-0 bottom-0 w-[60px] bg-gradient-to-r from-transparent via-[var(--gold-primary)]/[0.07] to-transparent" style={{ animation: 'hud-scanline 4s ease-in-out infinite' }} />
            </div>

            {/* 좌표 */}
            <div className="flex flex-col items-center min-w-[110px] px-3">
              <div className="hud-label">좌표</div>
              <div ref={coordsDisplayRef} className="text-[12px] font-bold text-[var(--gold-primary)] tracking-wide tabular-nums">—</div>
            </div>

            <div className="w-px h-8 bg-gradient-to-b from-transparent via-[var(--border-primary)] to-transparent flex-shrink-0" />

            {/* 위치 */}
            <div className="flex flex-col items-center min-w-[160px] max-w-[280px] px-3">
              <div className="hud-label">위치</div>
              <div className="text-[12px] text-[var(--text-secondary)] truncate max-w-[280px]">{locationLabel || '지도 위에 마우스를 올리세요...'}</div>
            </div>

            <div className="w-px h-8 bg-gradient-to-b from-transparent via-[var(--border-primary)] to-transparent flex-shrink-0" />

            {/* 줌 */}
            <div className="flex flex-col items-center px-3">
              <div className="hud-label">줌</div>
              <div className="text-[12px] font-bold text-[var(--gold-primary)] tabular-nums">{mapView.zoom.toFixed(1)}</div>
            </div>

            <div className="w-px h-8 bg-gradient-to-b from-transparent via-[var(--border-primary)] to-transparent flex-shrink-0" />

            {/* 활성 레이어 */}
            <div className="flex flex-col items-center px-3 min-w-[60px]">
              <div className="hud-label">활성 레이어</div>
              <div className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-[var(--gold-primary)]" />
                <span className="text-[12px] font-bold text-[var(--gold-primary)] tabular-nums">{Object.values(activeLayers).filter(Boolean).length}</span>
              </div>
            </div>

            <div className="w-px h-8 bg-gradient-to-b from-transparent via-[var(--border-primary)] to-transparent flex-shrink-0" />

            {/* 데이터 피드 */}
            <div className="flex flex-col items-center px-3 min-w-[60px]">
              <div className="hud-label">피드</div>
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-[var(--cyan-primary)]" />
                <span className="text-[12px] font-bold text-[var(--cyan-primary)] tabular-nums">{Object.values(activeLayers).filter(Boolean).length}</span>
              </div>
            </div>

            <div className="w-px h-8 bg-gradient-to-b from-transparent via-[var(--border-primary)] to-transparent flex-shrink-0" />

            {/* 처리량 */}
            <div className="flex flex-col items-center px-3 min-w-[70px]">
              <div className="hud-label">처리량</div>
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3 text-[var(--alert-green)]" />
                <DataThroughput data={data} />
              </div>
            </div>

          </div>
        </motion.div>
      )}

      {/* ── Scale Bar (desktop) ── */}
      <div className="desktop-only absolute bottom-[4.5rem] left-[20rem] z-[201] pointer-events-none flex items-end gap-3">
        <ScaleBar zoom={mapView.zoom} latitude={mapView.latitude} />
        <div className="pointer-events-auto relative"><MapLegend activeLayers={activeLayers} /></div>
      </div>

      {/* ── Region Dossier ── */}
      {(regionDossier || dossierLoading) && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-16 md:top-20 left-2 right-2 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[300] md:w-[480px] max-h-[65vh] overflow-y-auto styled-scrollbar">
          <div className="glass-panel p-5 mikael-glow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[var(--gold-primary)] tracking-wider">지역 정보 파일</h2>
              <button onClick={() => { setRegionDossier(null); setDossierLoading(false); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs">✕</button>
            </div>
            {dossierLoading ? (
              <div className="text-center py-8">
                <div className="w-5 h-5 border-2 border-[var(--gold-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-[13px] text-[var(--text-muted)] tracking-widest">정보 취합 중...</span>
              </div>
            ) : regionDossier && (
              <div className="space-y-3">
                <div><div className="hud-label mb-0.5">위치</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.location?.display_name}</div></div>
                {regionDossier.country && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><div className="hud-label mb-0.5">국가</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.flag} {regionDossier.country.name}</div></div>
                    <div><div className="hud-label mb-0.5">수도</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.capital}</div></div>
                    <div><div className="hud-label mb-0.5">인구</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.population?.toLocaleString()}</div></div>
                    <div><div className="hud-label mb-0.5">지역</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.subregion || regionDossier.country.region}</div></div>
                    <div><div className="hud-label mb-0.5">언어</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.languages?.join(', ')}</div></div>
                    <div><div className="hud-label mb-0.5">면적</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.area?.toLocaleString()} km²</div></div>
                  </div>
                )}
                {regionDossier.head_of_state && (<div><div className="hud-label mb-0.5">국가원수</div><div className="text-xs text-[var(--gold-primary)]">{regionDossier.head_of_state.name}</div><div className="text-[13px] text-[var(--text-muted)]">{regionDossier.head_of_state.position}</div></div>)}
                {regionDossier.wikipedia && (<div><div className="hud-label mb-1">정보 요약</div><div className="flex gap-3">{regionDossier.wikipedia.thumbnail && <img src={regionDossier.wikipedia.thumbnail} alt="" className="w-14 h-14 rounded object-cover flex-shrink-0" />}<p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{regionDossier.wikipedia.extract}</p></div></div>)}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Camera Viewer ── */}
      <CameraViewer
        camera={activeCamera}
        onClose={() => setActiveCamera(null)}
        onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })}
      />

      {/* ── OVERLAYS ── */}
      {/* 지도 포커스 비네트 */}
      <div className="fixed inset-0 map-vignette z-[1]" />

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcuts />

      {/* ── GLOBAL STATUS TICKER (bottom) ── */}
      <GlobalStatusBar />

      {/* Shortcut hint */}
      <div className="desktop-only absolute bottom-[26px] right-5 z-[200] pointer-events-none text-[6px] text-[var(--text-muted)]/40 tracking-widest">
        [?] 단축키 · [F] 전체화면 · [S] 공유 · [R] 전세계 초기화
      </div>


    </main>
  );
}
