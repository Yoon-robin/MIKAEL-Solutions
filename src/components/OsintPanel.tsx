'use client';

import { useState, useCallback, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Radar, Globe, Shield, FileText, Radio,
  ChevronDown, ChevronUp, Loader2, AlertTriangle, Server,
  Wifi, Lock, Bug, Code, Layers, Fingerprint,
  CheckCircle, XCircle, Clock, ExternalLink, Crosshair,
  Maximize2, Minimize2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const TABS = [
  { id: 'scanner', label: '포트 스캔', icon: Radar, placeholder: 'IP 또는 호스트명', color: '#00E5FF' },
  { id: 'vuln', label: '취약점 점검', icon: Bug, placeholder: 'IP 또는 호스트명', color: '#FF3D3D' },

  { id: 'dns', label: 'DNS', icon: Server, placeholder: '도메인명', color: '#448AFF' },
  { id: 'whois', label: 'WHOIS', icon: FileText, placeholder: '도메인명', color: '#FFD700' },
  { id: 'certs', label: '인증서', icon: Lock, placeholder: '도메인명', color: '#E040FB' },
  { id: 'threats', label: '위협정보', icon: AlertTriangle, placeholder: 'IP, 도메인 또는 해시', color: '#FF9500' },
  { id: 'headers', label: '헤더', icon: Code, placeholder: '분석할 URL', color: '#87CEEB' },
  { id: 'ssl', label: 'SSL/TLS', icon: Shield, placeholder: 'Domain name', color: '#76FF03' },
  { id: 'subdomains', label: '서브도메인', icon: Layers, placeholder: '열거할 도메인', color: '#00BCD4' },
  { id: 'tech', label: '기술식별', icon: Fingerprint, placeholder: '식별할 URL', color: '#9C27B0' },
  { id: 'sweep', label: 'IP 스윕', icon: Crosshair, placeholder: 'IP 주소 입력 (예: 8.8.8.8)', color: '#FF3D3D' },
];

interface OsintPanelProps { isOpen?: boolean; onClose?: () => void; isMobile?: boolean; onSweepVisualize?: (data: any) => void; onScanGeolocate?: (target: string, data: any) => void; }

function OsintPanelInner({ isMobile, onSweepVisualize, onScanGeolocate }: OsintPanelProps) {
  const [activeTab, setActiveTab] = useState('scanner');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanType, setScanType] = useState('quick');
  const [expanded, setExpanded] = useState(true);
  const [history, setHistory] = useState<{tab:string;query:string;time:string}[]>([]);
  const [sweepResult, setSweepResult] = useState<any>(null);
  const [sweepProgress, setSweepProgress] = useState<{ current: number; total: number } | null>(null);
  const [sweepCidr, setSweepCidr] = useState(24);
  const [cveCache, setCveCache] = useState<Record<string, any>>({});
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);

  // Fetch CVE details when a device is expanded in full-screen mode
  const fetchCveDetails = useCallback(async (cveIds: string[]) => {
    const missing = cveIds.filter(id => !cveCache[id]);
    if (missing.length === 0) return;
    // Mark as loading
    setCveCache(prev => {
      const next = { ...prev };
      for (const id of missing) next[id] = { loading: true };
      return next;
    });
    // Fetch in parallel
    const results = await Promise.allSettled(
      missing.map(id => fetch(`/api/osint/cve?cve=${encodeURIComponent(id)}`).then(r => r.json()).then(data => ({ id, data })))
    );
    setCveCache(prev => {
      const next = { ...prev };
      for (const r of results) {
        if (r.status === 'fulfilled') {
          next[r.value.id] = r.value.data;
        }
      }
      return next;
    });
  }, [cveCache]);

  const runLookup = useCallback(async () => {
    if (!query.trim() || loading) return;
    setLoading(true); setError(''); setResults(null);

    // IP Sweep / Vuln Scan — separate flow
    if (activeTab === 'sweep' || activeTab === 'vuln') {
      setSweepResult(null);
      setSweepProgress({ current: 0, total: Math.pow(2, 32 - sweepCidr) });
      try {
        const cidr = sweepCidr;
        const res = await fetch(`/api/osint/sweep?ip=${encodeURIComponent(query)}&cidr=${cidr}`);
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `스윕 실패 (${res.status})`); }
        const data = await res.json();
        setSweepResult(data);
        setSweepProgress(null);
        setHistory(prev => [{ tab: activeTab, query, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
      } catch (err: any) {
        setError(err.message);
        setSweepProgress(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      let url = '';
      switch (activeTab) {

        case 'dns': url = `/api/osint/dns?domain=${encodeURIComponent(query)}`; break;
        case 'certs': url = `/api/osint/certs?domain=${encodeURIComponent(query)}`; break;
        case 'whois': url = `/api/osint/whois?domain=${encodeURIComponent(query)}`; break;
        case 'threats': url = `/api/osint/threats?query=${encodeURIComponent(query)}`; break;
        case 'scanner': url = `/api/scanner?target=${encodeURIComponent(query)}&type=${scanType}`; break;
        case 'headers': url = `/api/scanner?target=${encodeURIComponent(query)}&type=headers`; break;
        case 'ssl': url = `/api/scanner?target=${encodeURIComponent(query)}&type=ssl`; break;
        case 'subdomains': url = `/api/scanner?target=${encodeURIComponent(query)}&type=subdomains`; break;
        case 'tech': url = `/api/scanner?target=${encodeURIComponent(query)}&type=tech`; break;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setResults(data);
        setHistory(prev => [{ tab: activeTab, query, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
        
        // Geolocate the target in the background
        if (activeTab !== 'sweep' && activeTab !== 'vuln') {
          fetch(`/api/osint/ip?ip=${encodeURIComponent(query)}`)
            .then(r => r.json())
            .then(locData => {
              if (locData && locData.geo && locData.geo.lat && locData.geo.lon && onScanGeolocate) {
                // ip-api returns lat/lon, we pass it up
                onScanGeolocate(query, { lat: locData.geo.lat, lng: locData.geo.lon, ...locData, type: activeTab });
              }
            })
            .catch(() => {});
        }
      } else {
        setError(data.error || '조회 실패');
      }
    } catch { setError('네트워크 오류'); }
    finally { setLoading(false); }
  }, [query, activeTab, scanType, loading, sweepCidr]);

  const currentTab = TABS.find(t => t.id === activeTab);

  // ── Shodan-style structured result renderers ──

  const ResultRow = ({ label, value, color, mono = true }: { label: string; value: any; color?: string; mono?: boolean }) => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <div className="flex items-start gap-3 py-1.5 border-b border-[var(--border-secondary)]/20 last:border-0">
        <span className="text-[12px] text-[var(--text-muted)] uppercase tracking-wider w-[90px] flex-shrink-0 pt-0.5">{label}</span>
        <span className={`text-[12px] ${mono ? '' : ''} break-all flex-1`} style={{ color: color || 'var(--text-primary)' }}>
          {String(value)}
        </span>
      </div>
    );
  };

  const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-bold ${ok ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
      {ok ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
      {label}
    </span>
  );

  const SectionHeader = ({ title, icon: Icon, color }: { title: string; icon: any; color: string }) => (
    <div className="flex items-center gap-2 mt-3 mb-1.5 first:mt-0">
      <Icon className="w-3.5 h-3.5" style={{ color }} />
      <span className="text-[12px] font-bold tracking-widest" style={{ color }}>{title}</span>
      <div className="flex-1 h-px" style={{ background: `${color}30` }} />
    </div>
  );

  const PortRow = ({ port, state, service, version }: { port: number; state: string; service?: string; version?: string }) => (
    <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[var(--hover-accent)] transition-colors">
      <span className="text-[13px] font-bold text-[var(--cyan-primary)] w-[60px]">{port}</span>
      <StatusBadge ok={state === 'open'} label={state.toUpperCase()} />
      <span className="text-[12px] text-[var(--text-secondary)] flex-1">{service || '알 수 없음'}</span>
      {version && <span className="text-[12px] text-[var(--text-muted)]">{version}</span>}
    </div>
  );

  const renderStructuredResults = () => {
    if (!results) return null;
    const r = results;

    // ── PORT SCAN ──
    if (activeTab === 'scanner') {
      const ports = r.ports || r.open_ports || r.results || [];
      const host = r.host || r.target || query;
      return (
        <div>
          <SectionHeader title="호스트 정보" icon={Server} color="#00E5FF" />
          <ResultRow label="대상" value={host} color="#00E5FF" />
          <ResultRow label="스캔 유형" value={r.scan_type || scanType} />
          <ResultRow label="소요 시간" value={r.duration || r.scan_time} />
          {Array.isArray(ports) && ports.length > 0 && (
            <>
              <SectionHeader title={`열린 포트 (${ports.length})`} icon={Wifi} color="#00E676" />
              <div className="space-y-0.5">
                {ports.map((p: any, i: number) => (
                  <PortRow key={i} port={p.port || p} state={p.state || 'open'} service={p.service || p.name} version={p.version} />
                ))}
              </div>
            </>
          )}
          {(!Array.isArray(ports) || ports.length === 0) && renderFallback()}
        </div>
      );
    }

    // ── VULN SCAN ──
    if (activeTab === 'vuln') {
      const vulns = r.vulnerabilities || r.vulns || r.cves || [];
      const exploits = vulns.filter((v: any) => v.is_exploit);
      const regularVulns = vulns.filter((v: any) => !v.is_exploit);
      
      return (
        <div>
          <SectionHeader title="취약점 평가" icon={Bug} color="#FF3D3D" />
          <ResultRow label="대상" value={r.target || query} color="#FF3D3D" />
          <ResultRow label="전체 CVE" value={Array.isArray(vulns) ? vulns.length : 0} color={Array.isArray(vulns) && vulns.length > 0 ? '#FF3D3D' : '#00E676'} />
          <ResultRow label="위험 수준" value={r.risk_level || r.severity} />
          {Array.isArray(regularVulns) && regularVulns.length > 0 && (
            <div className="mt-2 space-y-1">
              {regularVulns.slice(0, 20).map((v: any, i: number) => (
                <div key={i} className="p-2 rounded-lg border border-red-500/20 bg-red-500/5 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-red-400">{v.id || v.cve || v.name}</span>
                    {v.severity && <span className={`text-[13px] font-bold px-1.5 py-0.5 rounded ${v.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : v.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{v.severity}</span>}
                  </div>
                  {v.cvss && <div className="text-[12px] text-[var(--text-muted)] mt-1">CVSS: {v.cvss} ({v.type || 'cve'})</div>}
                  {v.description && <p className="text-[12px] text-[var(--text-muted)] mt-1 line-clamp-2">{v.description}</p>}
                </div>
              ))}
            </div>
          )}
          
          {exploits.length > 0 && (
            <div className="mt-4">
              <SectionHeader title={`가능한 익스플로잇 (${exploits.length})`} icon={AlertTriangle} color="#FF9500" />
              <div className="mt-2 space-y-1">
                {exploits.slice(0, 10).map((e: any, i: number) => (
                  <div key={i} className="p-2 rounded-lg border border-orange-500/30 bg-orange-500/10 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-orange-400">{e.id}</span>
                      <span className="text-[13px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">익스플로잇</span>
                    </div>
                    <div className="text-[12px] text-[var(--text-muted)] mt-1 flex justify-between">
                      <span>출처: {e.type?.toUpperCase() || '알 수 없음'}</span>
                      {e.cvss && <span>CVSS: {e.cvss}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {(!Array.isArray(vulns) || vulns.length === 0) && renderFallback()}
        </div>
      );
    }



    // ── DNS ──
    if (activeTab === 'dns') {
      return (
        <div>
          <SectionHeader title="DNS 레코드" icon={Server} color="#448AFF" />
          <ResultRow label="도메인" value={r.domain || query} color="#448AFF" />
          {r.A && <ResultRow label="A Records" value={Array.isArray(r.A) ? r.A.join(', ') : r.A} />}
          {r.AAAA && <ResultRow label="AAAA" value={Array.isArray(r.AAAA) ? r.AAAA.join(', ') : r.AAAA} />}
          {r.MX && <ResultRow label="MX" value={Array.isArray(r.MX) ? r.MX.map((m:any) => m.exchange || m).join(', ') : r.MX} />}
          {r.NS && <ResultRow label="NS" value={Array.isArray(r.NS) ? r.NS.join(', ') : r.NS} />}
          {r.TXT && <ResultRow label="TXT" value={Array.isArray(r.TXT) ? r.TXT.join(' | ') : r.TXT} />}
          {r.CNAME && <ResultRow label="CNAME" value={Array.isArray(r.CNAME) ? r.CNAME.join(', ') : r.CNAME} />}
          {r.SOA && <ResultRow label="SOA" value={typeof r.SOA === 'object' ? `${r.SOA.nsname} (${r.SOA.hostmaster})` : r.SOA} />}
          {renderFallbackExcluding(['domain','A','AAAA','MX','NS','TXT','CNAME','SOA','timestamp','cached'])}
        </div>
      );
    }

    // ── WHOIS ──
    if (activeTab === 'whois') {
      return (
        <div>
          <SectionHeader title="WHOIS 정보" icon={FileText} color="#FFD700" />
          <ResultRow label="도메인" value={r.domain_name || r.domainName || query} color="#FFD700" />
          <ResultRow label="등록기관" value={r.registrar} />
          <ResultRow label="생성일" value={r.creation_date || r.createdDate} />
          <ResultRow label="만료일" value={r.expiration_date || r.expiresDate} />
          <ResultRow label="갱신일" value={r.updated_date || r.updatedDate} />
          <ResultRow label="상태" value={Array.isArray(r.status) ? r.status.join(', ') : r.status} />
          <ResultRow label="네임서버" value={Array.isArray(r.name_servers || r.nameServers) ? (r.name_servers || r.nameServers).join(', ') : r.name_servers} />
          {renderFallbackExcluding(['domain_name','domainName','registrar','creation_date','createdDate','expiration_date','expiresDate','updated_date','updatedDate','status','name_servers','nameServers','timestamp','cached','raw'])}
        </div>
      );
    }

    // ── CERTS ──
    if (activeTab === 'certs') {
      const certs = r.certificates || r.certs || (Array.isArray(r) ? r : []);
      return (
        <div>
          <SectionHeader title="인증서 투명성" icon={Lock} color="#E040FB" />
          <ResultRow label="도메인" value={query} color="#E040FB" />
          <ResultRow label="인증서 수" value={Array.isArray(certs) ? certs.length : 0} />
          {Array.isArray(certs) && certs.slice(0, 15).map((c: any, i: number) => (
            <div key={i} className="mt-1.5 p-2 rounded border border-[var(--border-secondary)]/30 bg-[var(--bg-tertiary)]/30">
              <ResultRow label="발급자" value={c.issuer_name || c.issuer} />
              <ResultRow label="공통 이름" value={c.common_name || c.name_value} />
              <ResultRow label="유효 시작" value={c.not_before} />
              <ResultRow label="유효 종료" value={c.not_after} />
            </div>
          ))}
          {(!Array.isArray(certs) || certs.length === 0) && renderFallback()}
        </div>
      );
    }

    // ── THREATS ──
    if (activeTab === 'threats') {
      return (
        <div>
          <SectionHeader title="위협 인텔리전스" icon={AlertTriangle} color="#FF9500" />
          <ResultRow label="질의" value={query} color="#FF9500" />
          <ResultRow label="위험 점수" value={r.risk_score || r.score} color={
            (r.risk_score || r.score || 0) > 70 ? '#FF3D3D' : (r.risk_score || r.score || 0) > 40 ? '#FF9500' : '#00E676'
          } />
          <ResultRow label="악성 여부" value={r.malicious !== undefined ? (r.malicious ? '예' : '아니오') : undefined} color={r.malicious ? '#FF3D3D' : '#00E676'} />
          <ResultRow label="분류" value={r.category || r.type} />
          <ResultRow label="보고 수" value={r.total_reports || r.reports} />
          <ResultRow label="최근 관측" value={r.last_seen || r.last_analysis} />
          {r.tags && <ResultRow label="태그" value={Array.isArray(r.tags) ? r.tags.join(', ') : r.tags} />}
          {renderFallbackExcluding(['risk_score','score','malicious','category','type','total_reports','reports','last_seen','last_analysis','tags','timestamp','cached','query'])}
        </div>
      );
    }

    // ── SSL ──
    if (activeTab === 'ssl') {
      return (
        <div>
          <SectionHeader title="SSL/TLS 분석" icon={Shield} color="#76FF03" />
          <ResultRow label="대상" value={query} color="#76FF03" />
          <ResultRow label="프로토콜" value={r.protocol || r.tls_version} />
          <ResultRow label="암호군" value={r.cipher || r.cipher_suite} />
          <ResultRow label="유효성" value={r.valid !== undefined ? (r.valid ? '예' : '아니오') : undefined} color={r.valid ? '#00E676' : '#FF3D3D'} />
          <ResultRow label="발급자" value={r.issuer} />
          <ResultRow label="주체" value={r.subject} />
          <ResultRow label="만료일" value={r.expires || r.not_after} />
          <ResultRow label="SANs" value={Array.isArray(r.sans) ? r.sans.join(', ') : r.sans} />
          {renderFallback()}
        </div>
      );
    }

    // Fallback for other tools
    return renderFallback();
  };

  const renderFallback = () => {
    if (!results) return null;
    return (
      <div className="space-y-1">
        {Object.entries(results).filter(([k]) => !['timestamp','cached'].includes(k)).map(([key, value]) => (
          <ResultRow key={key} label={key.replace(/_/g, ' ')} value={typeof value === 'object' ? JSON.stringify(value, null, 1) : String(value)} />
        ))}
      </div>
    );
  };

  const renderFallbackExcluding = (exclude: string[]) => {
    if (!results) return null;
    const extra = Object.entries(results).filter(([k]) => !exclude.includes(k));
    if (extra.length === 0) return null;
    return (
      <div className="mt-2 space-y-1">
        {extra.map(([key, value]) => (
          <ResultRow key={key} label={key.replace(/_/g, ' ')} value={typeof value === 'object' ? JSON.stringify(value, null, 1) : String(value)} />
        ))}
      </div>
    );
  };

  const renderContent = () => (
    <div className="flex flex-col gap-2.5">
      {/* Tool Grid */}
      <div className="flex flex-col gap-1">
        {/* Sweep - Main Action */}
        {TABS.filter(t => t.id === 'sweep').map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setQuery(''); setResults(null); setError(''); }}
            className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-[12px] tracking-widest font-bold transition-all border ${activeTab === tab.id ? 'border-opacity-60 bg-opacity-20' : 'border-[var(--border-secondary)] hover:bg-[var(--hover-accent)]'}`}
            style={{ 
              borderColor: activeTab === tab.id ? tab.color : 'rgba(255,61,61,0.3)', 
              backgroundColor: activeTab === tab.id ? `${tab.color}20` : 'rgba(255,61,61,0.05)', 
              color: activeTab === tab.id ? tab.color : tab.color,
              boxShadow: activeTab === tab.id ? `0 0 15px ${tab.color}30` : 'none'
            }}>
            <tab.icon className="w-5 h-5" />
            <span>전역 {tab.label}</span>
          </button>
        ))}
        {/* Other Tools — 5열 유지, 가독성 개선 */}
        <div className="grid grid-cols-5 gap-1 mt-1">
          {TABS.filter(t => t.id !== 'sweep').map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setQuery(''); setResults(null); setError(''); }}
              className={`flex flex-col items-center gap-1.5 px-0.5 py-2.5 rounded-lg text-[13px] font-semibold transition-all border ${activeTab === tab.id ? 'border-opacity-40 bg-opacity-15' : 'border-transparent hover:bg-[#110E0E]'}`}
              style={{ borderColor: activeTab === tab.id ? tab.color : 'transparent', backgroundColor: activeTab === tab.id ? `${tab.color}15` : undefined, color: activeTab === tab.id ? tab.color : '#71717A' }}>
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              <span className="leading-tight text-center break-keep w-full" style={{ fontSize: '10px', lineHeight: '1.3' }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runLookup()}
              placeholder={currentTab?.placeholder}
              className="w-full bg-[var(--bg-primary)]/60 border border-[var(--border-primary)] rounded-lg pl-8 pr-3 py-2.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40 focus:outline-none transition-colors"
              style={{ borderColor: query ? `${currentTab?.color}40` : undefined }} />
          </div>
          <button onClick={runLookup} disabled={loading || !query.trim()}
            className="px-4 py-2 rounded-lg text-[12px] font-bold tracking-wider disabled:opacity-30 transition-all flex items-center justify-center min-w-[70px]"
            style={{ backgroundColor: `${currentTab?.color}20`, border: `1px solid ${currentTab?.color}40`, color: currentTab?.color }}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '스캔'}
          </button>
        </div>
        
        {/* Secondary Controls */}
        {activeTab === 'scanner' && (
          <select value={scanType} onChange={e => setScanType(e.target.value)}
            className="w-full px-3 py-2 rounded text-[13px] font-semibold text-white outline-none cursor-pointer appearance-none"
            style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}>
            <option value="quick">빠른 스캔</option>
            <option value="deep">심층 스캔</option>
            <option value="ports">상위 1000 포트</option>
          </select>
        )}
        {(activeTab === 'sweep' || activeTab === 'vuln') && (
          <div className="flex items-center justify-between bg-[var(--bg-primary)]/60 border border-[var(--border-primary)] rounded-lg p-1">
            <span className="text-[12px] text-[var(--text-muted)] pl-2">서브넷 마스크:</span>
            <div className="flex items-center gap-0.5">
              {[24, 25, 26, 27, 28].map(c => (
                <button key={c} onClick={() => setSweepCidr(c)}
                  className={`px-2 py-1 text-[12px] rounded transition-all ${
                    sweepCidr === c ? 'bg-[#FF3D3D]/20 text-[#FF3D3D]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >/{c}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-[13px] text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
        </div>
      )}

      {/* Sweep Progress */}
      {sweepProgress && loading && (
        <div className="p-3 rounded-lg border border-[#FF3D3D]/30 bg-[#FF3D3D]/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] tracking-wider text-[#FF3D3D]">서브넷 스윕 중...</span>
            <span className="text-[12px] text-[#E8E6E0]">{sweepProgress.total} 호스트</span>
          </div>
          <div className="w-full h-1.5 bg-[#1A1A18] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '100%', background: 'linear-gradient(90deg, #FF3D3D, #FF6B00, #FFD700)', animation: 'sweep-pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      )}

      {/* Sweep Results */}
      {sweepResult && !loading && (
        <div className="bg-[var(--bg-primary)]/40 border border-[var(--border-primary)] rounded-lg overflow-hidden max-h-[55vh] overflow-y-auto styled-scrollbar">
          {/* Summary */}
          <div className="p-3 border-b border-[#2A2A28]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[13px] tracking-wider text-[#E8E6E0]">{sweepResult.subnet}</div>
                <div className="text-[12px] text-[#5C5A54]">{sweepResult.center.city}, {sweepResult.center.country} · {sweepResult.center.isp}</div>
              </div>
              <div className="text-right">
                <div className="text-[18px] font-bold text-[#FF3D3D]">{sweepResult.summary.total_responsive}</div>
                <div className="text-[13px] text-[#5C5A54] tracking-wider">발견 장비</div>
              </div>
            </div>
            {/* Breakdown Bar */}
            <div className="flex h-2 rounded-full overflow-hidden bg-[#1A1A18] mb-2">
              {Object.entries(sweepResult.summary.device_breakdown).map(([type, count]: [string, any]) => {
                const device = sweepResult.devices.find((d: any) => d.device_type === type);
                return <div key={type} style={{ width: `${(count / sweepResult.summary.total_responsive) * 100}%`, backgroundColor: device?.device_color || '#666' }} title={`${type}: ${count}`} />;
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {Object.entries(sweepResult.summary.device_breakdown).map(([type, count]: [string, any]) => {
                const device = sweepResult.devices.find((d: any) => d.device_type === type);
                return (
                  <div key={type} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: device?.device_color || '#666' }} />
                    <span className="text-[12px] text-[#8A8880]">{type}</span>
                    <span className="text-[12px] text-[#E8E6E0] font-bold">{String(count)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Visualize Button */}
          <div className="p-3 border-b border-[#2A2A28]">
            <button onClick={() => onSweepVisualize?.(sweepResult)}
              className="w-full py-2.5 rounded-lg text-[13px] tracking-wider font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, rgba(255,61,61,0.2), rgba(255,107,0,0.2))', border: '1px solid rgba(255,61,61,0.5)', color: '#FF3D3D', textShadow: '0 0 10px rgba(255,61,61,0.5)' }}
            >
              <Globe className="w-4 h-4" /> 글로브에 시각화
            </button>
          </div>
          {/* Device List */}
          <div className={isFullScreen ? "flex flex-col gap-3 p-4" : "divide-y divide-[#2A2A28]"}>
            {sweepResult.devices.map((device: any) => {
              const isExpanded = expandedDevice === device.ip;
              return (
              <div key={device.ip} className={isFullScreen
                ? "bg-[#0D0D0C] border border-[#2A2A28] rounded-lg overflow-hidden hover:border-[#3A3A38] transition-colors"
                : "px-3 py-2.5 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              }>
                {/* Device Header */}
                <div
                  className={isFullScreen
                    ? "flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#151514] transition-colors"
                    : "flex items-center justify-between mb-1"
                  }
                  onClick={() => {
                    if (!isFullScreen) return;
                    const next = isExpanded ? null : device.ip;
                    setExpandedDevice(next);
                    if (next && device.vulns.length > 0) fetchCveDetails(device.vulns);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: device.device_color }} />
                    <span className={isFullScreen ? "text-[14px] font-bold text-[#E8E6E0]" : "text-[13px] text-[#E8E6E0]"}>{device.ip}</span>
                    {device.hostnames.length > 0 && (
                      <span className={`${isFullScreen ? "text-[13px]" : "text-[12px]"} text-[#5C5A54]`}>{device.hostnames[0]}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {device.vulns.length > 0 && (
                      <span className={`${isFullScreen ? "text-[12px]" : "text-[13px]"} px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30`}>
                        {device.vulns.length} CVEs
                      </span>
                    )}
                    <span className={`${isFullScreen ? "text-[12px]" : "text-[13px]"} px-1.5 py-0.5 rounded`} style={{ backgroundColor: device.device_color + '20', color: device.device_color, border: `1px solid ${device.device_color}40` }}>{device.device_type}</span>
                    {isFullScreen && (
                      <ChevronDown className={`w-4 h-4 text-[#5C5A54] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </div>

                {/* Compact info (sidebar mode) */}
                {!isFullScreen && (
                  <>
                    <div className="flex items-center gap-2 text-[12px] text-[#5C5A54]">
                      <span>포트: {device.ports.slice(0, 8).join(', ')}{device.ports.length > 8 ? ` +${device.ports.length - 8}` : ''}</span>
                      {device.vulns.length > 0 && (
                        <div className="group relative flex items-center gap-1 cursor-help">
                          <span className="text-[#FF3D3D] flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> {device.vulns.length} CVEs
                          </span>
                          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50 p-2 bg-[#1A1A18] border border-[#FF3D3D50] rounded-md shadow-xl min-w-[140px] max-w-[220px] max-h-[150px] overflow-y-auto styled-scrollbar">
                            <div className="text-[13px] text-[#FF3D3D] mb-1 tracking-wider uppercase border-b border-[#FF3D3D30] pb-1">식별된 취약점</div>
                            <div className="flex flex-col gap-0.5">
                              {device.vulns.map((cve: string) => (
                                <a key={cve} href={`https://nvd.nist.gov/vuln/detail/${cve}`} target="_blank" rel="noreferrer" className="text-[12px] text-[#E8E6E0] hover:text-[#FF3D3D] transition-colors truncate">
                                  {cve}
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {device.hostnames.length > 0 && <div className="text-[12px] text-[#8A8880] mt-0.5 truncate">{device.hostnames[0]}</div>}
                  </>
                )}

                {/* Full-Screen Expanded Detail */}
                {isFullScreen && isExpanded && (
                  <div className="border-t border-[#2A2A28]">
                    {/* Ports + 호스트명 Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#2A2A28]">
                      <div className="bg-[#0D0D0C] p-4">
                        <div className="text-[12px] text-[#5C5A54] tracking-widest uppercase mb-2">열린 포트</div>
                        <div className="flex flex-wrap gap-1.5">
                          {device.ports.map((port: number) => (
                            <span key={port} className="px-2 py-1 bg-[#1A1A18] border border-[#2A2A28] rounded text-[13px] text-[var(--cyan-primary)]">{port}</span>
                          ))}
                        </div>
                      </div>
                      <div className="bg-[#0D0D0C] p-4">
                        <div className="text-[12px] text-[#5C5A54] tracking-widest uppercase mb-2">호스트명</div>
                        {device.hostnames.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {device.hostnames.map((h: string) => (
                              <span key={h} className="text-[13px] text-[#E8E6E0]">{h}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[13px] text-[#3A3A38]">역방향 DNS 없음</span>
                        )}
                      </div>
                    </div>

                    {/* CVE Intelligence */}
                    {device.vulns.length > 0 && (
                      <div className="p-4 border-t border-[#2A2A28]">
                        <div className="text-[12px] text-[#5C5A54] tracking-widest uppercase mb-3">취약점 ({device.vulns.length})</div>
                        <div className="flex flex-col gap-2">
                          {device.vulns.map((cveId: string) => {
                            const info = cveCache[cveId];
                            const isLoading = !info || info.loading;
                            const severityColor = !info?.severity ? '#5C5A54'
                              : info.severity === 'CRITICAL' ? '#FF3D3D'
                              : info.severity === 'HIGH' ? '#FF6B00'
                              : info.severity === 'MEDIUM' ? '#FFD700'
                              : '#76FF03';
                            return (
                              <div key={cveId} className="bg-[#111] border border-[#2A2A28] rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[12px] font-bold text-[#E8E6E0]">{cveId}</span>
                                    {info?.cvss != null && (
                                      <span className="text-[12px] px-1.5 py-0.5 rounded" style={{ backgroundColor: severityColor + '15', color: severityColor, border: `1px solid ${severityColor}40` }}>CVSS {info.cvss}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {info?.severity && (
                                      <span className="text-[12px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: severityColor + '15', color: severityColor, border: `1px solid ${severityColor}40` }}>{info.severity}</span>
                                    )}
                                    <a href={`https://nvd.nist.gov/vuln/detail/${cveId}`} target="_blank" rel="noreferrer" className="text-[#5C5A54] hover:text-[#E8E6E0] transition-colors">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                                {isLoading ? (
                                  <div className="flex items-center gap-2 py-1">
                                    <Loader2 className="w-3 h-3 animate-spin text-[#5C5A54]" />
                                    <span className="text-[12px] text-[#5C5A54]">취약점 정보 수집 중...</span>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-[13px] text-[#8A8880] leading-relaxed">{info.description}</p>
                                    {info.cwe && <div className="text-[12px] text-[#5C5A54] mt-2">약점: {info.cwe}</div>}
                                    {info.affected && info.affected.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {info.affected.map((a: any, i: number) => (
                                          <span key={i} className="text-[12px] px-1.5 py-0.5 bg-[#1A1A18] border border-[#2A2A28] rounded text-[#8A8880]">
                                            {a.vendor}/{a.product}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
            })}
          </div>
          <div className="px-3 py-2 border-t border-[#2A2A28]">
            <div className="text-[13px] text-[#5C5A54] tracking-wider">{sweepResult.summary.total_hosts}개 호스트 스윕 완료 · {(sweepResult.sweep_time_ms / 1000).toFixed(1)}s · ASN {sweepResult.center.asn}</div>
          </div>
        </div>
      )}

      {results && !(sweepResult && !loading) && (
        <div className="bg-[var(--bg-primary)]/40 border border-[var(--border-primary)] rounded-lg p-3 max-h-[50vh] overflow-y-auto styled-scrollbar">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] tracking-widest" style={{ color: currentTab?.color }}>{currentTab?.label} 결과</span>
            <span className="text-[13px] text-[var(--text-muted)] flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{new Date().toLocaleTimeString()}</span>
          </div>
          {renderStructuredResults()}
        </div>
      )}

      {history.length > 0 && !results && (
        <div className="space-y-1">
          <span className="text-[12px] tracking-widest text-[var(--text-muted)]">최근 스캔</span>
          {history.slice(0, 5).map((h, i) => (
            <button key={i} onClick={() => { setActiveTab(h.tab); setQuery(h.query); }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[var(--hover-accent)] transition-colors text-left">
              <div className="flex items-center gap-2">
                <span className="text-[12px]" style={{ color: TABS.find(t => t.id === h.tab)?.color }}>{TABS.find(t => t.id === h.tab)?.label}</span>
                <span className="text-[12px] text-[var(--text-secondary)]">{h.query}</span>
              </div>
              <span className="text-[13px] text-[var(--text-muted)]">{h.time}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (isMobile) return renderContent();

  if (isFullScreen) {
    return (
      <div className="fixed inset-4 z-[999] glass-panel bg-[#0a0a09]/95 backdrop-blur-2xl border border-[var(--cyan-primary)]/40 rounded-xl flex flex-col overflow-hidden shadow-2xl shadow-[var(--cyan-primary)]/20">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0A0C14]">
          <div className="flex items-center gap-3">
            <Radar className="w-5 h-5 text-[var(--cyan-primary)]" />
            <span className="text-[16px] font-semibold text-[var(--text-heading)]">MIKAEL 정찰 도구함</span>
            <Badge variant="cyan" className="text-[12px] px-1.5 py-0">전체 화면</Badge>
            <Badge variant="gold" className="text-[13px] px-1.5 py-0 tracking-[0.15em]">{TABS.length}개 모듈</Badge>
          </div>
          <button onClick={() => setIsFullScreen(false)} className="p-2 hover:bg-white/5 rounded transition-colors text-[var(--text-muted)] hover:text-white">
            <Minimize2 className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 styled-scrollbar">
          {/* We wrap renderContent in a container that forces wider layouts if we want to target it with CSS */}
          <div className="max-w-[1400px] mx-auto w-full full-screen-mode-content">
             {renderContent()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="border border-white/[0.07] bg-[#0A0808] rounded-lg flex flex-col overflow-hidden pointer-events-auto">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.07] hover:bg-[#110E0E] transition-colors">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2.5 flex-1">
          <Radar className="w-4 h-4 text-[var(--cyan-primary)]" />
          <span className="mikael-brand text-[13px] text-[var(--text-heading)]">정찰 도구함</span>
          <Badge variant="cyan" className="text-[12px] h-5 px-1.5 rounded font-semibold">{TABS.length}개 도구</Badge>
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsFullScreen(true)} className="text-[#6B5748] hover:text-white transition-colors" title="전체 화면">
             <Maximize2 className="w-4 h-4" />
          </button>
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--cyan-primary)]" />
          <button onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-4 h-4 text-[#6B5748]" /> : <ChevronDown className="w-4 h-4 text-[#6B5748]" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden px-3 pb-3">
            {renderContent()}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const OsintPanel = memo(OsintPanelInner);
export default OsintPanel;
