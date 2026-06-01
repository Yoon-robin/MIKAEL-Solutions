# README FOR CLAUDE — 시작 문서

Claude Code는 이 ZIP을 열면 아래 순서로 읽고 작업하세요.

1. `CLAUDE.md`
2. `CLAUDE_REDESIGN_HANDOFF.md`
3. `MIKAEL_REDESIGN_ACCEPTANCE_CHECKLIST.md`
4. `MIKAEL_CURRENT_DEPLOYMENT_STATUS.md`

## 핵심 요청

MIKAEL Solutions를 한국어 우선의 개인 OSINT 상황인식/조사 지휘 콘솔로 리디자인하세요.

- 기존 기능/API 동작 보존
- 사용자 노출 브랜딩은 `MIKAEL Solutions` 유지
- 사용자 노출 `OSIRIS` 문구 재도입 금지
- Docker/container/image/repo 운영 식별자 `osiris`, `osiris:local`, `/home/ubuntu/osiris`는 변경 금지
- 비밀값/API 키/토큰을 읽거나 출력하지 말 것
- `.env*` 파일은 ZIP에 포함되어 있지 않으며, 작업 중 새로 만들거나 요구하지 말 것

## 추천 작업 방식

1. 현재 구조 파악: `src/app/page.tsx`, `src/app/globals.css`, `src/components/*`
2. 레이아웃/시각 계층 리디자인
3. 모바일 UX 확인
4. `npm run build` 실행 및 오류 수정
5. 가능하면 `npm run lint`도 확인하되, 기존 코드베이스에 repository-wide `any`/unused lint 이슈가 있을 수 있음을 감안
6. 변경 파일과 검증 결과를 한국어로 요약

## Claude Code용 짧은 프롬프트

```text
Read README_FOR_CLAUDE.md, CLAUDE_REDESIGN_HANDOFF.md, and MIKAEL_REDESIGN_ACCEPTANCE_CHECKLIST.md first.
Redesign MIKAEL Solutions as a Korean-first personal OSINT situational-awareness command console.
Preserve all functionality and API behavior. Do not rename osiris operational identifiers.
Keep public branding as MIKAEL Solutions and do not reintroduce OSIRIS in UI copy.
Run npm run build after changes and fix any errors.
```
