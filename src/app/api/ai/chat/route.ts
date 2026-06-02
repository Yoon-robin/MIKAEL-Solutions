import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 4000;

const SYSTEM_PROMPT = `당신은 MIKAEL Solutions의 전용 AI 분석관입니다. 한국 사용자를 위한 OSINT·안보·상황인식 분석이 주 임무입니다.

우선 분석 영역:
- 한반도 안보: 북한 미사일·핵·동향, 한미동맹, 주한미군, DMZ
- 동북아 정세: 중국·일본·대만·러시아와 한국의 관계, 분쟁 리스크
- 국내 재난·사고: 화재·지진·기상·교통·감염병 등 한국 관련 사건
- 사이버 위협: 한국 대상 해킹·랜섬웨어·개인정보 침해, KISA 공지
- 경제·에너지: 반도체·배터리·원전·환율·코스피 등 한국 경제 리스크
- OSINT: IP·도메인·지역·인물·사건 정보 정리 및 분석 관점 제공

응답 원칙:
- 한국어 기본 응답 (영어 기술 용어는 괄호 병기 가능)
- 짧고 실무적으로 — 핵심 → 근거 → 판단 순서
- 복잡한 내용은 bullet point로 정리
- 불확실한 정보는 반드시 "(추정)" "(미확인)" "(가정)" 표시
- 한국 사용자가 바로 이해할 수 있게 맥락 포함
- 글로벌 이슈도 "한국에 미치는 영향" 관점에서 분석

절대 하지 않는 것:
- 불법 침투·악성코드 제작·자격증명 탈취·실제 공격 절차 안내
- API 키·비밀값·개인정보 요구 또는 출력
- 허위 정보를 사실로 제시
- 특정 정치 세력 편향 발언`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI 분석관 서비스가 설정되지 않았습니다. 관리자에게 문의하세요.' },
      { status: 503 }
    );
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const messages: ChatMessage[] = body.messages ?? [];

  // 입력 검증
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: '메시지가 없습니다.' }, { status: 400 });
  }
  if (messages.length > MAX_MESSAGES) {
    return NextResponse.json(
      { error: `대화 내역이 너무 깁니다. (최대 ${MAX_MESSAGES}개)` },
      { status: 400 }
    );
  }

  // 각 메시지 길이 검사 + role 검증
  for (const msg of messages) {
    if (!['user', 'assistant'].includes(msg.role)) {
      return NextResponse.json({ error: '잘못된 메시지 형식입니다.' }, { status: 400 });
    }
    if (typeof msg.content !== 'string' || msg.content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `메시지가 너무 깁니다. (최대 ${MAX_CONTENT_LENGTH}자)` },
        { status: 400 }
      );
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const status = res.status;
      if (status === 401 || status === 403) {
        return NextResponse.json(
          { error: 'AI 서비스 인증 오류가 발생했습니다.' },
          { status: 502 }
        );
      }
      if (status === 429) {
        return NextResponse.json(
          { error: 'AI 서비스 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: 'AI 서비스에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 502 }
      );
    }

    const data = await res.json();
    const message = data?.choices?.[0]?.message?.content;

    if (!message) {
      return NextResponse.json(
        { error: 'AI 응답을 받지 못했습니다.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ message });
  } catch (err: unknown) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json(
        { error: 'AI 응답 시간이 초과되었습니다. 다시 시도해주세요.' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: 'AI 서비스 연결에 실패했습니다.' },
      { status: 502 }
    );
  }
}
