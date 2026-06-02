import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#000000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 그리드 배경 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />

        {/* 좌하단 원형 장식 */}
        <div style={{
          position: 'absolute', bottom: -100, left: -100,
          width: 400, height: 400,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 300, height: 300,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
        }} />

        {/* 메인 콘텐츠 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, zIndex: 1 }}>

          {/* SVG 검 엠블럼 */}
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="37" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
            <circle cx="40" cy="40" r="27" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5"/>
            <line x1="40" y1="8" x2="40" y2="58" stroke="#F5F5F5" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="26" y1="40" x2="54" y2="40" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="40" cy="62" r="3.5" fill="rgba(255,255,255,0.5)"/>
            <polygon points="40,5 41.8,10 40,13.5 38.2,10" fill="#F5F5F5" fillOpacity="0.9"/>
          </svg>

          {/* MIKAEL Solutions */}
          <div style={{
            fontSize: 72,
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '0.15em',
            marginTop: 24,
            lineHeight: 1,
          }}>
            MIKAEL
          </div>
          <div style={{
            fontSize: 28,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.45em',
            marginTop: 8,
          }}>
            Solutions
          </div>

          {/* 구분선 */}
          <div style={{
            width: 200,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            marginTop: 32,
            marginBottom: 32,
          }} />

          {/* 서브타이틀 */}
          <div style={{
            fontSize: 22,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '0.08em',
          }}>
            OSINT 상황인식 지휘 콘솔
          </div>

          {/* 태그들 */}
          <div style={{
            display: 'flex',
            gap: 16,
            marginTop: 28,
          }}>
            {['항공 · 위성 · 해상', 'CCTV · 지진 · 화재', '사이버 · 시장 · 뉴스'].map(tag => (
              <div key={tag} style={{
                padding: '6px 16px',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.04em',
              }}>
                {tag}
              </div>
            ))}
          </div>
        </div>

        {/* 하단 URL */}
        <div style={{
          position: 'absolute',
          bottom: 32,
          fontSize: 16,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.2)',
          letterSpacing: '0.06em',
        }}>
          43.200.203.218
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
