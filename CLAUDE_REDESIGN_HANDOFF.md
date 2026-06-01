# Claude Code 핸드오프 — MIKAEL Solutions 리디자인

## 1. 프로젝트 개요

- 프로젝트명: **MIKAEL Solutions**
- 저장소 경로: `/home/ubuntu/osiris`
- 기술 스택: Next.js App Router, React, TypeScript, Tailwind CSS, Mapbox GL, Framer Motion
- 실행 형태: Docker 컨테이너 `osiris`가 `127.0.0.1:3000`에 바인딩되고 Apache가 `https://43.200.203.218`로 프록시
- 운영 식별자(`osiris`, `osiris:local`, `/home/ubuntu/osiris`)는 호환성을 위해 유지한다. 사용자 노출 브랜딩만 `MIKAEL Solutions`로 유지한다.

## 2. 현재 상태

이 핸드오프 작성 시점에 사용자 노출 UI/메타데이터는 한국어 중심으로 1차 한글화되어 있다.

주요 변경 영역:

- `src/app/layout.tsx`: HTML `lang="ko"`, OpenGraph/Twitter/JSON-LD 메타데이터 한글화
- `src/app/page.tsx`: 로딩 문구, 상단/하단 HUD, 모바일 패널, 지역 정보 파일, 라이브 스트림 안내 한글화
- `src/components/LayerPanel.tsx`: 데이터 레이어명 한글화
- `src/components/IntelFeed.tsx`: 정보 피드/위험 라벨/시간 표시 한글화
- `src/components/MarketsPanel.tsx`: 시장·우주기상 패널 한글화
- `src/components/OsintPanel.tsx`: 정찰/OSINT 도구 UI 한글화
- `src/components/LiveAlerts.tsx`: 실시간 경보 패널 한글화
- `src/components/CameraViewer.tsx`: CCTV/외부 피드 뷰어 문구 한글화
- `src/components/SearchBar.tsx`: 검색 입력/언어 헤더 한글화
- `src/components/SharePanel.tsx`: 공유 패널 문구 한글화
- `src/components/ViewPresets.tsx`: 지역 프리셋 한글화
- `public/manifest.json`, `public/site.webmanifest`, `public/robots.txt`, `public/sitemap.xml`: MIKAEL Solutions 및 한국어 메타데이터 반영

## 3. Claude Code에게 요청할 리디자인 목표

### 핵심 방향

MIKAEL Solutions를 “개인 OSINT 상황인식/조사 지휘 콘솔”로 보이게 리디자인한다. 단순한 대시보드가 아니라, 고급 정보기관/위기상황실/개인 Palantir 스타일의 전문 콘솔 느낌을 유지한다.

### UI 톤앤매너

- 다크 사이버 인텔리전스 UI 유지
- 금색(`#D4AF37`) + 시안 + 경보색을 절제해서 사용
- 기존 `glass-panel`, HUD, 지도 중심 레이아웃의 정체성은 보존
- 모바일 UX 개선: 하단 탭, 드로어, 터치 타깃, 작은 화면 가독성 최적화
- 한국어 UI를 기준으로 디자인하고, 영어 약어(OSINT, CVE, DNS, WHOIS 등)는 필요 시 유지

### 우선 개선 영역

1. **메인 지도 화면**
   - 지도 중심성 유지
   - 좌/우 패널이 지도를 과도하게 가리지 않도록 밀도 조정
   - 확대/축소/투영/지도 스타일 컨트롤을 더 직관적으로 정리

2. **좌측 정보 패널**
   - `LayerPanel`, `MarketsPanel`, `ViewPresets`의 시각 계층 재정리
   - 숫자/상태/위험도를 한눈에 보이게 개선

3. **우측 정보 패널**
   - `IntelFeed`, `LiveAlerts`, `OsintPanel`의 정보 밀도와 접힘 상태 개선
   - 뉴스/경보/정찰 도구가 서로 충돌하지 않게 카드 단위 정리

4. **정찰 도구함(`OsintPanel`)**
   - 기능은 유지
   - 탭/입력/결과/히스토리 레이아웃을 더 명확하게
   - 결과 화면은 기술 사용자에게 읽기 쉬운 구조화 레이아웃 유지

5. **브랜딩**
   - `MIKAEL Solutions` 명칭 유지
   - 사용자 노출 `OSIRIS` 문구는 되살리지 말 것
   - Docker/container/repo 이름은 바꾸지 말 것

## 4. 코드 작업 시 주의사항

- `.env`, `.env.local`, 인증 토큰, API 키는 읽거나 ZIP에 포함하지 말 것
- 운영 식별자 변경 금지: `osiris` 컨테이너/이미지/경로/Apache 프록시 전제 유지
- 서버가 저사양일 수 있으므로 불필요한 대형 의존성 추가 금지
- Mapbox/외부 API 호출 로직을 바꾸기 전에는 반드시 영향 범위 확인
- 한글 문구를 깨지게 만드는 대문자 강제 CSS(`uppercase`)는 사용자 노출 텍스트에 신중히 적용
- `ito69_fork.diff`는 과거 원본 참조/아카이브 성격이므로, 실제 UI 리디자인 우선순위에서는 낮게 본다

## 5. 주요 파일 안내

- 앱 엔트리/메타데이터: `src/app/layout.tsx`
- 메인 화면 조립: `src/app/page.tsx`
- 전역 스타일: `src/app/globals.css`
- 지도 컴포넌트: `src/components/MikaelMap.tsx`
- 레이어 패널: `src/components/LayerPanel.tsx`
- 시장 패널: `src/components/MarketsPanel.tsx`
- 정보 피드: `src/components/IntelFeed.tsx`
- 실시간 경보: `src/components/LiveAlerts.tsx`
- 정찰 도구: `src/components/OsintPanel.tsx`
- CCTV 뷰어: `src/components/CameraViewer.tsx`
- 검색: `src/components/SearchBar.tsx`
- 공유: `src/components/SharePanel.tsx`
- 지역 프리셋: `src/components/ViewPresets.tsx`
- 상태 바: `src/components/GlobalStatusBar.tsx`
- API 라우트: `src/app/api/**/route.ts`

## 6. 로컬 검증 명령

```bash
cd /home/ubuntu/osiris
npm run lint
npm run build
```

운영 반영이 필요할 때만:

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
curl -sS --max-time 10 http://127.0.0.1:3000/api/health
curl -k -sS -I --max-time 15 https://43.200.203.218 | sed -n '1,20p'
```

## 7. 성공 기준

- `npm run build` 성공
- 메인 화면이 한국어 기준으로 자연스럽게 보임
- `MIKAEL Solutions` 브랜딩 유지
- 사용자 노출 `OSIRIS` 문구 없음
- 모바일에서 패널과 지도가 겹쳐 조작을 방해하지 않음
- OSINT/지도/API 기능 회귀 없음

## 8. Claude Code용 추천 프롬프트

```text
You are Claude Code working on /home/ubuntu/osiris.
Read CLAUDE_REDESIGN_HANDOFF.md first and follow it strictly.
Redesign MIKAEL Solutions as a Korean-first personal OSINT situational-awareness command console.
Preserve all existing features and API behavior. Do not rename the osiris container/image/repo operational identifiers.
Keep user-facing branding as MIKAEL Solutions and do not reintroduce OSIRIS in UI copy.
Focus on visual hierarchy, responsive layout, panel usability, and a premium dark intelligence-console aesthetic.
After changes, run npm run lint and npm run build, fix any issues, and summarize changed files and verification results.
```

## 9. 추가 핸드오프 — shadcn/ui 기반 컴포넌트 시스템 적용 요청

사용자 지시: **Hermes/MIKAEL이 직접 구현을 계속 진행하지 말고, Claude Code가 이어받을 수 있도록 이 핸드오프에 작업 요청을 남길 것.**

### Claude Code에게 맡길 작업

MIKAEL Solutions UI를 유지보수 가능한 전문 컴포넌트 시스템으로 전환한다. 사용자는 `shadcn/ui` 같은 정돈된 컴포넌트 시스템을 선호한다. 실제 shadcn/ui를 써도 되고, shadcn 스타일/패턴과 호환되는 내부 컴포넌트 시스템을 써도 된다.

### 현재 반영된 초안 상태

다음 shadcn 호환 초안이 이미 워킹트리에 있을 수 있다. Claude Code는 이를 **무조건 그대로 확정하지 말고**, 프로젝트 전체 맥락에서 리뷰한 뒤 필요한 경우 수정/정리/되돌림/확장한다.

- `components.json`
- `src/lib/utils.ts` (`cn`, `clsx`, `tailwind-merge`)
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/separator.tsx`
- `src/app/globals.css`의 shadcn 호환 CSS 변수 매핑
- `src/components/LayerPanel.tsx` 일부 shadcn 스타일 컴포넌트 적용
- `package.json`, `package-lock.json` 의존성 후보:
  - `class-variance-authority`
  - `clsx`
  - `tailwind-merge`
  - `@radix-ui/react-slot`

### Claude Code 검토 기준

1. shadcn 스타일 컴포넌트를 MIKAEL의 다크 인텔리전스/HUD 미학에 맞게 토큰화한다.
2. 기본 흰색 shadcn 테마를 그대로 가져오지 말고, 기존 MIKAEL 색상 체계와 결합한다.
3. 우선순위는 다음 순서로 진행한다.
   - `LayerPanel`
   - `OsintPanel`
   - `MarketsPanel`
   - `IntelFeed`
   - `LiveAlerts`
   - 모바일 패널/하단 탭 UX
4. 기능/API/지도 동작을 바꾸지 않는다. UI 구조와 컴포넌트화 중심으로 개선한다.
5. `OSIRIS` 사용자 노출 문구를 되살리지 않는다. 브랜딩은 `MIKAEL Solutions` 유지.
6. 운영 식별자(`osiris` 컨테이너, `osiris:local` 이미지, `/home/ubuntu/osiris` 경로)는 변경하지 않는다.
7. 대형 UI 프레임워크를 추가하지 않는다. shadcn/Radix/Tailwind 기반의 가벼운 접근을 유지한다.

### 검증 필수

```bash
cd /home/ubuntu/osiris
npm run lint
npm run build
```

운영 반영이 필요한 경우에만 Docker 재빌드/재기동을 수행한다. 단, 사용자가 명시적으로 “Claude Code가 운영 반영까지 하라”고 요청하지 않았다면 변경 검증까지만 한다.

### Claude Code용 구체 프롬프트

```text
You are Claude Code working in /home/ubuntu/osiris.
Read CLAUDE_REDESIGN_HANDOFF.md first.
Continue the MIKAEL Solutions redesign by reviewing and formalizing the shadcn/ui-compatible component system currently present in the working tree.
Do not blindly accept existing draft changes: inspect components.json, src/lib/utils.ts, src/components/ui/*, globals.css token mappings, package.json, and LayerPanel.tsx.
Keep the Korean-first MIKAEL Solutions intelligence-console aesthetic: dark HUD, restrained gold/cyan accents, professional OSINT command-center feel.
Do not change API behavior, Mapbox behavior, Docker/container/repo operational names, or reintroduce OSIRIS user-facing branding.
Prefer small, reversible UI-component refactors. Start with LayerPanel, then propose or implement the next panel conversions only if safe.
Run npm run lint and npm run build, fix any issues, and summarize exactly what changed plus verification results.
```
