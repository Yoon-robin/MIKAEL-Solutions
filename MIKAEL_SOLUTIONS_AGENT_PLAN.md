# MIKAEL MIKAEL Solutions Agent Plan

작성일: 2026-05-27 UTC
기반: MIKAEL Solutions + Hermes Agent + Telegram
서버 접속 URL: https://43.200.203.218

## 1. 시스템 이름 제안

- **MIKAEL MIKAEL Solutions Grid**: 개인용 OSINT/상황인식 그리드.
- 보조 명칭: **MIKAEL Watchtower**, **MIKAEL Sentinel**, **MIKAEL Solutions Palantir Lite**.
- 추천: **MIKAEL MIKAEL Solutions Grid** — Hermes의 MIKAEL Solutions 정체성과 Mikael UI를 함께 살린다.

## 2. 핵심 목적

MIKAEL MIKAEL Solutions Grid는 공개 정보와 사용자가 승인한 비공개 계정/키 기반 정보를 통합해 다음을 수행하는 개인 조사·상황인식 시스템이다.

- 전세계 사건, 항공, 해상, 지진, 화재, 날씨, 우주기상, CCTV, 사이버 위협을 한 화면에서 파악.
- Telegram에서 짧은 명령으로 현재 상황을 요약하고 이상 징후를 알려줌.
- 조사 대상 도메인/IP/지역/인물/조직에 대해 OSINT 리서치 워크플로우를 실행.
- Hermes가 서버 작업자 역할을 맡아 컨테이너, 로그, 프록시, 데이터 수집 작업을 운영.
- 민감한 토큰/API 키는 Hermes `.env`나 서비스별 `.env`에만 보관하고 응답에는 마스킹.

## 3. 데이터 소스 레이어

### 기본 공개 소스

- 항공: OpenSky/ADS-B 계열 공개 피드.
- 해상: 공개 AIS/항만/초크포인트 데이터, 추후 aisstream.io 키 연동.
- 지진: USGS Earthquake API.
- 화재: NASA FIRMS 공개 CSV, 추후 FIRMS API 키 연동.
- 날씨/재난: NASA EONET, NOAA, GDACS.
- 우주/위성: CelesTrak, NOAA SWPC, 추후 N2YO 키 연동.
- 뉴스/라이브: Mikael 내장 RSS/라이브 뉴스 소스.
- 사이버: NVD CVE, WHOIS/DNS/BGP/인증서 공개 조회.

### 확장 후보

- GDELT Events/Doc API.
- RSS/Atom 감시 목록: 보안 블로그, 정부 공지, 지역 언론.
- GitHub Security Advisories, CISA KEV, Exploit-DB.
- Telegram/Discord/X 등은 사용자가 계정 연결 또는 API 키를 명시적으로 제공할 때만 연동.

## 4. 실시간 감시 레이어

- 경량 주기 수집: 서버 메모리가 약 2GB이므로 무거운 상시 크롤러 대신 cron/interval 기반으로 수집.
- Hermes cron 또는 shell helper로 다음을 감시:
  - Mikael `/api/health` 응답.
  - 주요 API 레이어 응답 지연/오류.
  - Apache 443 프록시 상태.
  - Docker 컨테이너 재시작 횟수와 메모리 사용량.
- 이벤트 감지:
  - 특정 지역 지진/화재/충돌/항공 이상 이벤트.
  - 특정 도메인/IP/CVE 키워드 관련 신규 뉴스/위협.
- 알림 방식:
  - 고위험/즉시 대응 필요: Telegram 즉시 알림.
  - 일반 변화: 일/시간 단위 요약.

## 5. 조사/리서치 레이어

Telegram 명령 → Hermes → Mikael/API/외부 공개 소스 조회 → 요약 보고 흐름으로 구성한다.

### 조사 워크플로우

1. 대상 정규화: 도메인, IP, 조직명, 지역명, 키워드 구분.
2. 1차 패시브 수집: DNS, WHOIS, 인증서, BGP/ASN, CVE, 뉴스, GDELT.
3. 위험도 태깅: 노출 서비스, 취약 CVE, 최근 사건, 지리적 리스크.
4. 증거 링크 보존: API 응답 원본 경로, 검색 URL, 타임스탬프.
5. Telegram 요약: 핵심 결론, 근거, 불확실성, 다음 액션.

### 주의

- 능동 스캔/포트스캔/취약점 검사는 사용자가 소유하거나 허가한 대상에만 수행.
- 공개 채널 게시나 제3자에게 메시지 발송은 사용자 확인 후 수행.

## 6. Hermes와 Mikael 연결 방식

### 현재 1차 연결

- Mikael는 Docker 컨테이너 `osiris`로 실행.
- 호스트의 `127.0.0.1:3000`에 바인딩.
- Apache HTTPS가 `https://43.200.203.218` → `http://127.0.0.1:3000`으로 reverse proxy.
- Hermes는 terminal/file 도구와 `osiris-operator` skill로 운영 상태를 점검.

### 다음 연결 단계

- Hermes helper 스크립트: `/home/ubuntu/.hermes/scripts/osiris-status.sh` 후보.
- Mikael API 요약 명령:
  - `/api/health`
  - `/api/stats`
  - `/api/earthquakes`
  - `/api/cyber-threats`
  - `/api/news`
- 필요 시 Hermes tool/plugin으로 `osiris_status`, `osiris_layer_summary`, `osiris_investigate` 같은 전용 도구화.

## 7. Telegram에서 사용할 명령어 설계

자연어 명령 우선. 예시는 다음과 같다.

### 운영 명령

- `osiris 상태 확인해줘`
  - Docker 컨테이너, 포트, HTTP/HTTPS, Apache proxy, 최근 로그 확인.
- `osiris 로그 봐줘`
  - `docker logs --tail 100 osiris` 요약.
- `osiris 재시작해줘`
  - `docker restart osiris` 후 health/API/HTTPS 검증.
- `osiris 아파치 프록시 확인해줘`
  - `/etc/apache2/sites-enabled/default-ssl.conf`, configtest, curl 검증.

### 상황인식 명령

- `오늘 주요 리스크 요약해줘`
- `한반도 주변 상황 봐줘`
- `최근 큰 지진/화재/항공 이슈 요약해줘`
- `CVE 고위험 이슈 요약해줘`

### 조사 명령

- `example.com 조사해줘`
- `1.2.3.4 OSINT 요약해줘`
- `특정 키워드 뉴스 감시 등록해줘`

## 8. 보안/권한 모델

- 기본 원칙: 공개 정보 조회와 로컬 상태 확인은 자동 수행, 외부 계정 연결/토큰 입력/공개 발송/위험한 삭제는 사용자 확인 필요.
- 비밀값:
  - `/home/ubuntu/osiris/.env` 또는 `/home/ubuntu/.hermes/.env`에 저장.
  - Telegram/로그/보고서에는 전체 키를 출력하지 않고 마스킹.
- 네트워크 노출:
  - Mikael 컨테이너는 호스트 `127.0.0.1:3000`에만 바인딩.
  - 외부는 Apache HTTPS 443만 사용.
- 운영 권한:
  - Hermes는 Docker/Apache 상태 확인 및 제한된 restart/reload 수행.
  - 삭제/초기화/인증 정보 변경은 사용자 확인 후 수행.
- 능동 조사:
  - 포트스캔/취약점 테스트는 소유·허가 대상만 허용.

## 9. 1차 MVP 구현 범위

완료/진행할 1차 MVP 범위:

- Mikael Docker 컨테이너 실행.
- Apache HTTPS proxy로 외부 접속 가능하게 구성.
- Hermes `osiris-operator` skill 작성.
- Telegram에서 운영 상태/로그/재시작 요청 처리.
- Mikael 내장 API를 기반으로 간단한 상황 요약 가능하게 확장.

MVP에서 제외:

- 외부 유료 API 키 연동.
- 무거운 장기 크롤러/DB/벡터스토어 상시 실행.
- 능동 스캐너 백엔드 상시 운영.
- 사용자 계정 기반 X/Telegram/Discord 수집 자동화.

## 10. 이후 확장 로드맵

### Phase 1 — 운영 안정화

- `/home/ubuntu/.hermes/scripts/osiris-status.sh` 작성.
- Hermes cron으로 Mikael health 감시.
- Docker 메모리 사용량/재시작 횟수 알림.
- Apache proxy 백업/롤백 문서화.

### Phase 2 — 요약/조사 자동화

- Mikael API 요약 helper 작성.
- Telegram 명령별 조사 템플릿 정리.
- 주요 리스크 daily briefing cron 생성.

### Phase 3 — 데이터 소스 확장

- FIRMS, OpenSky, N2YO, aisstream.io API 키 연동.
- GDELT/RSS 키워드 감시.
- CISA KEV/NVD 고위험 CVE 감시.

### Phase 4 — 개인 Palantir화

- 조사 케이스별 Markdown 보고서 저장.
- 엔티티 그래프: 사람/조직/도메인/IP/위치/사건 연결.
- 경보 룰 엔진: 지역, 키워드, 대상, 심각도별 Telegram 알림.
- 필요 시 경량 DB(SQLite/Postgres)와 검색 인덱스 도입.

### Phase 5 — 보안 강화

- 도메인 및 정식 TLS 인증서 적용.
- Basic Auth/OAuth/allowlist 등 UI 접근 제어.
- 서비스별 최소 권한 systemd/docker 운영.
- 감사 로그와 비밀값 회전 절차 마련.
