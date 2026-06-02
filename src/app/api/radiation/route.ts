import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 300; // 5분 캐시

/**
 * MIKAEL Solutions — 방사선 모니터링
 * Safecast.org Open API (무료, 키 불필요)
 * 단위: Safecast는 cpm(counts per minute) 기준 반환
 * 변환: 1 μSv/h ≈ 100 cpm (일반 Geiger-Müller 튜브 기준)
 */

// μSv/h 임계값
const THRESHOLD = {
  normal:   0.2,
  elevated: 0.5,
  high:     1.0,
  critical: 3.0,
};

// cpm → μSv/h 변환 (GM 튜브 평균 변환계수)
function cpmToUsvh(cpm: number): number {
  return Math.round((cpm / 100) * 1000) / 1000;
}

function toUsvh(value: number, unit: string): number {
  const u = (unit || '').toLowerCase();
  if (u === 'cpm') return cpmToUsvh(value);
  if (u === 'msv') return value * 1000;
  if (u === 'nsv' || u === 'nsv/h') return value / 1000;
  return value; // microsieverts, μsv/h 등 그대로
}

function getLevel(value: number): string {
  if (value >= THRESHOLD.critical) return 'CRITICAL';
  if (value >= THRESHOLD.high)     return 'HIGH';
  if (value >= THRESHOLD.elevated) return 'ELEVATED';
  return 'NORMAL';
}

export async function GET() {
  try {
    // Safecast: 최근 측정값 (unit 필터 제거 — cpm/mSv 등 혼재, 서버에서 변환)
    const res = await fetch(
      'https://api.safecast.org/measurements.json?page=1&per_page=500&order[created_at]=desc',
      {
        signal: AbortSignal.timeout(12000),
        headers: {
          'User-Agent': 'MIKAEL-OSINT/1.0',
          'Accept': 'application/json',
        },
      }
    );

    if (!res.ok) throw new Error(`Safecast ${res.status}`);

    const raw: any[] = await res.json();

    // 최근 30일 이내, 유효한 좌표만 필터
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const stations = raw
      .filter((m: any) => {
        if (!m.latitude || !m.longitude) return false;
        if (!m.value || m.value <= 0) return false;
        const ts = m.captured_at ? new Date(m.captured_at).getTime() : 0;
        return ts > cutoff;
      })
      .map((m: any) => {
        const raw   = parseFloat(m.value);
        const usvh  = toUsvh(raw, m.unit || 'cpm');
        return {
          id:       m.id,
          lat:      parseFloat(m.latitude),
          lng:      parseFloat(m.longitude),
          value:    usvh,           // μSv/h 통일
          raw:      raw,
          unit:     m.unit || 'cpm',
          level:    getLevel(usvh),
          time:     m.captured_at,
          device:   m.device_id || null,
          location: m.location_name || null,
        };
      });

    return NextResponse.json({
      stations,
      total: stations.length,
      source: 'Safecast.org',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({
      stations: [],
      total: 0,
      source: 'Safecast.org',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
}
