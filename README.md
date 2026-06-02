<div align="center">

# MIKAEL Solutions

### 개인 OSINT 상황인식·조사 지휘 콘솔

[![Live](https://img.shields.io/badge/Live-43.200.203.218-white?style=for-the-badge)](https://43.200.203.218)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![MapLibre](https://img.shields.io/badge/MapLibre_GL-v5-396CB2?style=for-the-badge)](https://maplibre.org)
[![License](https://img.shields.io/badge/License-MIT-white?style=for-the-badge)](LICENSE)

**항공 · 위성 · CCTV · 지진 · 화재 · 뉴스 · 사이버 위협 · 글로벌 사건을  
단일 인텔리전스 콘솔에서 실시간 통합 분석하는 개인 OSINT 플랫폼**

</div>

---

## 개요

MIKAEL Solutions는 Palantir 스타일의 개인 OSINT 상황인식 지휘 플랫폼입니다.  
Next.js 16 App Router + MapLibre GL WebGL 렌더링으로 수천 개의 엔티티를 60fps로 표시합니다.

---

## 데이터 도메인

| 도메인 | 내용 | 소스 |
|--------|------|------|
| **항공** | 민항기 · 개인기 · 전용기 · 군용기 | OpenSky Network |
| **해상** | 함정 · 39개 주요 항구 · 10개 해상 요충지 | 정적 해군 인텔 |
| **CCTV** | 2,000+ 실시간 카메라 | TfL, WSDOT, Caltrans, NYC DOT 外 |
| **지진** | 실시간 M2.5+ 지진 | USGS Earthquake API |
| **화재** | 활성 산불 핫스팟 | NASA FIRMS |
| **뉴스** | 24/7 글로벌 생방송 | 25개+ 방송국 |
| **기상** | 극한 기상 이벤트 | NASA EONET |
| **우주** | 태양풍 · 위성 추적 | NOAA SWPC, N2YO |
| **사이버** | CVE 위협 · 포트 스캔 | NVD, 자체 스캐너 |
| **글로벌 사건** | 분쟁 · 위기 지역 | GDELT, 정적 인텔 |

---

## 아키텍처

```
┌─────────────────────────────────────────────────┐
│              MIKAEL Solutions CLIENT             │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │ MapLibre  │  │  HUD     │  │ 정찰 도구함   │ │
│  │  GL (GPU) │  │ Panels   │  │  포트 스캔    │ │
│  │  WebGL    │  │ 레이어   │  │  DNS / WHOIS  │ │
│  │  렌더링   │  │ 토글     │  │  취약점 스캔  │ │
│  └──────────┘  └──────────┘  └───────────────┘ │
├─────────────────────────────────────────────────┤
│              NEXT.JS API ROUTES (25개)           │
│  /api/flights  /api/earthquakes  /api/cctv      │
│  /api/news     /api/fires        /api/maritime  │
│  /api/gdelt    /api/satellites   /api/weather   │
│  /api/scanner  /api/osint/*                     │
├─────────────────────────────────────────────────┤
│              외부 데이터 소스                    │
│  OpenSky · USGS · NASA · NOAA · TfL · NVD      │
│  GDELT · EONET · FIRMS · N2YO · RSS 피드       │
└─────────────────────────────────────────────────┘
```

---

## 주요 기능

### 인텔리전스 레이어
- **15개 토글 가능한 데이터 레이어** — 실시간 엔티티 카운트
- **GPU 가속 렌더링** — MapLibre GL WebGL, DOM 아님
- **프로그레시브 로딩** — 레이어 활성화 시 온디맨드 페치
- **레이어 토글 애니메이션** — Framer Motion 기반

### 정찰 도구함 (OSINT Toolkit)
- **포트 스캐너** — TCP 연결 스캔 + 서비스 핑거프린팅
- **DNS 조회** — A, AAAA, MX, NS, TXT, CNAME 전체 레코드
- **WHOIS** — 도메인/IP 등록 정보
- **SSL/TLS 인스펙터** — 인증서 체인 분석
- **IP 인텔리전스** — 지리정보, ASN, 위협 평판
- **취약점 스캐너** — NVD CVE 데이터베이스 조회
- **IP 스윕** — 서브넷 장비 탐색

### 실시간 방송 네트워크
- **25개+ 24/7 글로벌 뉴스 스트림**
- 지도 위 뉴스 도트 클릭 → 생방송 오픈
- NBC, CBS, ABC, Sky News, Al Jazeera, France 24, NHK, WION 外

---

## 빠른 시작

```bash
git clone https://github.com/Yoon-robin/MIKAEL-Solutions.git
cd MIKAEL-Solutions
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속

### Docker 셀프호스팅

```bash
git clone https://github.com/Yoon-robin/MIKAEL-Solutions.git
cd MIKAEL-Solutions
docker build -t mikael:local .
docker run -d --name mikael \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e HOSTNAME=0.0.0.0 \
  mikael:local
```

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 16 (App Router, Turbopack) |
| 언어 | TypeScript 5 |
| 스타일링 | Tailwind CSS v4 + shadcn/ui |
| 지도 엔진 | MapLibre GL JS v5 + react-map-gl v8 |
| 애니메이션 | Framer Motion v12 |
| 아이콘 | Lucide React |
| 폰트 | Inter + Cinzel (브랜드) |

---

## 키보드 단축키

| 키 | 동작 |
|----|------|
| `F` | 항공 레이어 토글 |
| `G` | 3D 글로브 ↔ 2D 지도 전환 |
| `S` | 현재 보기 공유 |
| `L` | 레이어 패널 토글 |
| `M` | 시장 패널 토글 |
| `I` | 정보 피드 토글 |
| `R` | 전세계 보기 초기화 |
| `?` | 단축키 도움말 |
| `ESC` | 패널/팝업 닫기 |

---

## 라이선스

MIT — [LICENSE](LICENSE) 참조

---

<div align="center">

**Built by [Yoon-robin](https://github.com/Yoon-robin)**

</div>
