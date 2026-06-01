# 현재 운영 배포 상태 — MIKAEL Solutions

생성 시각: 2026-06-01 10:39:35 UTC

## 운영 환경

- Repo path: `/home/ubuntu/osiris`
- Public URL: `https://43.200.203.218`
- Docker container: `osiris`
- Docker image: `osiris:local`
- Container bind: `127.0.0.1:3000 -> 3000/tcp`
- Apache proxy target: `http://127.0.0.1:3000/`

## 현재 반영 상태

한글화 1차 버전은 이미 운영 컨테이너에 배포되어 있습니다.

검증 당시 상태:

- `/api/health`: `status: operational`
- `/api/health`: `platform: MIKAEL Solutions`
- Local HTTP: `200 OK`
- Public HTTPS: `200 OK`
- Public page HTML:
  - `MIKAEL Solutions`: 32회
  - `개인 OSINT`: 11회
  - `상황인식`: 18회
  - `OSIRIS`: 0회
  - `Osiris`: 0회
- Container logs: Next.js `Ready`, 반복 fatal error 없음

## Claude Code 작업 시 주의

- 리디자인은 현재 한글화된 운영 상태를 기준으로 진행하세요.
- 운영 식별자는 변경하지 마세요.
  - 유지: `osiris`, `osiris:local`, `/home/ubuntu/osiris`
- 사용자 노출 브랜드만 `MIKAEL Solutions`입니다.
- 리디자인 결과물을 운영에 반영하려면 Docker 이미지를 재빌드하고 컨테이너를 재생성해야 합니다. 단순 `docker restart osiris`는 새 이미지 반영에 충분하지 않습니다.
