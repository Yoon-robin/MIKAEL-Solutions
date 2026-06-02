# CLAUDE.md — MIKAEL Solutions 프로젝트 지침

Claude Code가 이 프로젝트에서 작업할 때 항상 이 파일을 먼저 읽는다.

---

## 프로젝트 개요

- **이름**: MIKAEL Solutions
- **성격**: 개인 OSINT 상황인식·조사 지휘 콘솔 (Palantir 스타일)
- **로컬 경로**: `C:\Users\Blitz\Desktop\Projects\MIKAEL Solutions`
- **운영 서버 경로**: `/home/ubuntu/osiris`
- **운영 URL**: `https://43.200.203.218`
- **GitHub**: `https://github.com/Yoon-robin/MIKAEL-Solutions`

---

## 기술 스택

| 항목 | 버전 / 상세 |
|---|---|
| Framework | Next.js **16**.x App Router (Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS **v4** + custom CSS design system |
| UI Components | shadcn/ui 호환 내부 시스템 (`src/components/ui/`) |
| Map | MapLibre GL JS v5 + react-map-gl v8 |
| Animation | Framer Motion v12 |
| Icons | Lucide React |
| HLS Video | hls.js |

> ⚠️ **Next.js 16은 기존 버전과 breaking change가 많다.** 코드 작성 전 `node_modules/next/dist/docs/`를 참고하고, 기존 패턴을 함부로 변경하지 않는다.

---

## 디자인 시스템

### 색상 토큰 (globals.css)
- **화이트** `#FFFFFF` — 주요 강조, 브랜드 컬러
- **시안** `#00E5FF` — 데이터 스트림, 정보 표시
- **배경** `#04040A` (void) ~ `#0C0E1A` (panel)
- **경보** `#FF3D3D` (critical) / `#FF9500` (high) / `#00E676` (ok)

### shadcn/ui 컴포넌트 (`src/components/ui/`)

| 파일 | 커스텀 variant |
|---|---|
| `badge.tsx` | `gold` `cyan` `success` `danger` `warning` |
| `button.tsx` | `hud` `cyan` `gold` (+ 기본 shadcn variants) |
| `card.tsx` | 기본 shadcn (MIKAEL 토큰으로 자동 테마) |
| `separator.tsx` | 기본 shadcn |

### CSS 유틸리티 클래스
- `glass-panel` — 반투명 글래스모피즘 패널
- `hud-text` / `hud-label` / `hud-value` — HUD 텍스트 스타일
- `mikael-glow` — 골드 외광 효과
- `styled-scrollbar` — 커스텀 스크롤바
- `animate-mikael-pulse` `animate-glow-pulse` `animate-ticker` 등

---

## 주요 파일 구조

```
src/
├── app/
│   ├── page.tsx           # 메인 대시보드 (전체 UI 조립)
│   ├── layout.tsx         # HTML 메타데이터 (한국어, OG, JSON-LD)
│   ├── globals.css        # 전역 디자인 시스템 (~2260줄)
│   └── api/               # 25개 API 라우트
│       ├── flights/       ├── satellites/    ├── cctv/
│       ├── earthquakes/   ├── fires/         ├── maritime/
│       ├── news/          ├── markets/       ├── weather/
│       ├── gdelt/         ├── cyber-threats/ ├── country-risk/
│       ├── space-weather/ ├── infrastructure/ ├── region-dossier/
│       ├── scanner/       ├── health/
│       └── osint/{dns, whois, certs, ip, bgp, cve, threats, sweep}/
├── components/
│   ├── MikaelMap.tsx      # MapLibre GL 지도 엔진
│   ├── LayerPanel.tsx     # 데이터 레이어 제어 (shadcn Card 기반)
│   ├── OsintPanel.tsx     # OSINT 정찰 도구함
│   ├── MarketsPanel.tsx   # 시장·우주기상 패널 (shadcn Card 기반)
│   ├── IntelFeed.tsx      # SIGINT 뉴스 피드 (shadcn Card 기반)
│   ├── LiveAlerts.tsx     # 실시간 경보·피드 (shadcn Card 기반)
│   ├── CameraViewer.tsx   # CCTV/HLS 뷰어
│   ├── GlobalStatusBar.tsx # 하단 거래소·위험도 티커
│   ├── SearchBar.tsx      # 위치 검색 (Nominatim)
│   ├── SharePanel.tsx     # 현재 보기 공유
│   ├── ViewPresets.tsx    # 지역 프리셋 이동
│   ├── KeyboardShortcuts.tsx # 단축키 오버레이
│   ├── ScaleBar.tsx       # 지도 축척 바
│   └── ErrorBoundary.tsx  # 에러 경계
├── lib/
│   ├── utils.ts           # cn() 유틸리티
│   ├── ssrf-guard.ts      # SSRF 방어
│   └── stealthFetch.ts    # 스텔스 페치
└── middleware.ts          # Next.js 미들웨어
```

---

## 개발 명령어

```bash
# 로컬 개발
npm run dev

# 빌드 검증 (변경 후 항상 실행)
npm run build

# 린트 확인
npm run lint
```

> lint는 기존 코드베이스 전반에 `any` 타입 경고(272건)가 있음.
> 새로 추가한 코드에서 신규 오류가 나지 않으면 정상.

---

## 운영 배포 (서버에서 실행)

```bash
cd /home/ubuntu/osiris
docker build -t osiris:local .
docker stop osiris >/dev/null 2>&1 || true
docker rm osiris
docker run -d --name osiris --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -e NODE_ENV=production -e PORT=3000 -e HOSTNAME=0.0.0.0 \
  --add-host=host.docker.internal:host-gateway \
  osiris:local
```

---

## Git / GitHub 작업 흐름

```bash
git add .
git commit -m "설명"
git push
```

---

## 작업 원칙

1. **빌드 우선** — 변경 후 반드시 `npm run build` 성공 확인
2. **한국어 우선** — 사용자 노출 텍스트는 한국어 기준. 기술 약어(OSINT, CVE, DNS, WHOIS, SSL/TLS)는 영어 유지
3. **브랜딩 고정** — 사용자 노출 브랜드는 `MIKAEL Solutions`. `OSIRIS` 문구 재도입 금지
4. **운영 식별자 불변** — `osiris` 컨테이너/이미지, `/home/ubuntu/osiris` 경로 변경 금지
5. **shadcn 우선** — 새 UI 요소는 `src/components/ui/` 컴포넌트 활용
6. **의존성 절제** — 불필요한 대형 패키지 추가 금지 (서버 저사양)
7. **API 키 금지** — `.env*` 파일 읽기/출력/커밋 금지
8. **uppercase 주의** — 한글 텍스트에 `text-transform: uppercase` CSS 적용 금지

---

## 모바일 UX 구조

- **6개 하단 탭**: 레이어 / 시장 / 정보 / 경보 / 정찰 / 검색
- **슬라이드업 드로어**: `bottom-[52px]` 기준, `max-height: min(55vh, calc(100dvh - 100px))`
- **백드롭 오버레이**: 드로어 열린 상태에서 지도 터치 차단 (`z-[399]`)
- `isMobile`: 너비 768px 미만 OR 높이 500px 미만 & 너비 1024px 미만 (가로 폰 포함)

---

## 알려진 이슈 / 후속 작업

- `src/middleware.ts` — Next.js 16에서 `middleware` 명칭 deprecated (`proxy`로 이동 예정). 빌드 경고 발생하지만 동작은 정상
- `globals.css` — `.gotham-command-bar`, `.gotham-stat`, `.gotham-divider`, `.gotham-enter` 이중 정의 잔존. 나중 정의가 앞을 덮으므로 동작 정상이나 정리 필요
