import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 300; // 5분 캐시

/**
 * MIKAEL Solutions — 방사선 모니터링
 * Safecast.org Open API (무료, 키 불필요)
 * 전세계 시민 방사선 측정 네트워크
 */

// μSv/h 임계값
const THRESHOLD = {
  normal:  0.2,   // 정상
  elevated: 0.5,  // 주의
  high:    1.0,   // 높음
  critical: 3.0,  // 위험
};

function getLevel(value: number): string {
  if (value >= THRESHOLD.critical) return 'CRITICAL';
  if (value >= THRESHOLD.high)     return 'HIGH';
  if (value >= THRESHOLD.elevated) return 'ELEVATED';
  return 'NORMAL';
}

export async function GET() {
  try {
    // Safecast: 최근 측정값 (1페이지 = 500개)
    const res = await fetch(
      'https://api.safecast.org/measurements.json?distance=20000&unit=microsieverts&page=1&per_page=500&order[created_at]=desc',
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
      .map((m: any) => ({
        id:        m.id,
        lat:       parseFloat(m.latitude),
        lng:       parseFloat(m.longitude),
        value:     parseFloat(m.value),       // μSv/h
        unit:      m.unit || 'microsieverts',
        level:     getLevel(parseFloat(m.value)),
        time:      m.captured_at,
        device:    m.device_id || null,
        location:  m.location_name || null,
      }));

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
