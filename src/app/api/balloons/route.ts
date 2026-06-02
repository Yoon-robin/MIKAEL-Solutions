import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 120; // 2분 캐시

/**
 * MIKAEL Solutions — 고고도 기구 / 라디오존데
 * SondeHub Tracker API (무료, 키 불필요)
 * https://github.com/projecthorus/sondehub-tracker/wiki/SondeHub-Tracker-REST-API
 */
export async function GET() {
  try {
    // SondeHub: 최근 1시간 내 활성 라디오존데
    const res = await fetch(
      'https://api.v2.sondehub.org/sondes?duration=1h&max_positions=1',
      {
        signal: AbortSignal.timeout(10000),
        headers: {
          'User-Agent': 'MIKAEL-OSINT/1.0',
          'Accept': 'application/json',
        },
      }
    );

    if (!res.ok) throw new Error(`SondeHub ${res.status}`);

    const raw: Record<string, any> = await res.json();

    const balloons = Object.entries(raw)
      .map(([serial, data]: [string, any]) => {
        if (!data?.lat || !data?.lon) return null;
        return {
          id:        serial,
          serial,
          lat:       data.lat,
          lng:       data.lon,
          alt:       data.alt || 0,
          vel_v:     data.vel_v || 0,    // 수직 속도 m/s
          vel_h:     data.vel_h || 0,    // 수평 속도 m/s
          heading:   data.heading || 0,
          frequency: data.frequency || null,
          type:      data.type || 'RS41',
          time:      data.datetime || new Date().toISOString(),
          uploader:  data.uploader_callsign || 'unknown',
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      balloons,
      total: balloons.length,
      source: 'SondeHub Tracker',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    // 실패 시 빈 배열 (UI 유지)
    return NextResponse.json({
      balloons: [],
      total: 0,
      source: 'SondeHub Tracker',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
}
