# MIKAEL Solutions Branding Notes

작성일: 2026-05-27 UTC
대상: `/home/ubuntu/osiris`

## 목표

현재 Mikael 기반 대시보드를 사용자의 개인 브랜드인 **MIKAEL Solutions**로 1차 리브랜딩한다. 기능/API 경로/데이터 소스 식별자는 안정성을 위해 유지하고, 사용자가 직접 보는 화면 텍스트·메타데이터·문서 중심으로 변경한다.

## 적용한 브랜드 방향

- 제품명: **MIKAEL Solutions**
- 성격: 개인 Palantir 스타일 OSINT/상황인식/조사 에이전트
- 톤: 전문적, 정보기관 느낌, 어둡고 선명한 사이버 인텔리전스 UI
- 기본 설명: 한국어 우선, 필요한 곳에 영어 보조 문구 사용

## 리브랜딩한 영역

1. 브라우저 메타데이터
   - 기본 title을 `MIKAEL Solutions — 개인 OSINT 상황인식 플랫폼`으로 변경.
   - description을 개인 OSINT·상황인식·조사 에이전트 플랫폼 설명으로 변경.
   - OpenGraph/Twitter title, description, alt 문구를 MIKAEL Solutions 중심으로 변경.
   - JSON-LD WebApplication 이름과 alternateName을 MIKAEL Solutions 중심으로 변경.

2. 화면 UI 문구
   - 초기 splash 타이틀: `MIKAEL Solutions` → `MIKAEL Solutions`
   - 초기 subtitle: `GLOBAL INTELLIGENCE PLATFORM` → `PERSONAL OSINT COMMAND CENTER`
   - 상단 헤더 브랜드: `MIKAEL Solutions` → `MIKAEL Solutions`
   - 상단 배지: `OPEN SOURCE` → `PRIVATE GRID`
   - 상단 subtitle: `GLOBAL INTELLIGENCE COMMAND` → `OSINT SITUATIONAL COMMAND`
   - RECON full screen 제목: `MIKAEL Solutions RECON TOOLKIT` → `MIKAEL RECON TOOLKIT`
   - 모바일 RECON drawer 제목: `MIKAEL Solutions RECON` → `MIKAEL RECON`
   - 공유 문구: `MIKAEL Solutions — ...` → `MIKAEL Solutions — ...`

3. 앱 manifest
   - `public/manifest.json`과 `public/site.webmanifest`의 name/short_name/description/theme를 MIKAEL Solutions에 맞게 변경.
   - 기존 아이콘 파일은 유지.

4. 문서
   - README 상단 제목과 핵심 설명을 MIKAEL Solutions 중심으로 1차 수정.
   - 기존 self-hosting, API, Docker 안내의 기술적 MIKAEL Solutions 표기는 안정성과 원본 기반 명시를 위해 대부분 유지.

## 의도적으로 바꾸지 않은 영역

- API route 이름: `/api/flights`, `/api/health`, `/api/osint/*` 등 유지.
- 코드 내부 컴포넌트명: `MikaelMap`, `OsintPanel`, `` CSS class 등 유지.
- 컨테이너명: `osiris` 유지.
- Docker image/tag: `mikael-solutions:local` 유지.
- 기존 favicon/icon 이미지 파일: 유지.
- Apache proxy: 이미 `127.0.0.1:3000`으로 설정되어 있어 변경하지 않음.

## 추후 로고/아이콘 교체 필요

현재 favicon, apple-touch-icon, Android icon, `og-image.png`, `osiris-icon.png`는 기존 파일을 유지했다. 다음 단계에서 MIKAEL Solutions 전용 로고와 OpenGraph 이미지를 제작해 아래 파일을 교체하는 것이 좋다.

- `public/favicon.ico`
- `public/favicon.svg`
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/apple-touch-icon.png`
- `public/android-chrome-192x192.png`
- `public/android-chrome-512x512.png`
- `public/og-image.png`
- ``
- `public/icon-192.png`

## 검증 권장

변경 후 다음을 확인한다.

```bash
cd /home/ubuntu/osiris
npm run lint
npm run build
docker build -t mikael-solutions:local .
# 서버에서 직접 실행
curl -sS -I http://127.0.0.1:3000
curl -k -sS -I https://43.200.203.218
```
