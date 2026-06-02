import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 4000;

const SYSTEM_PROMPT = `당신은 MIKAEL Solutions의 전용 AI 분석관입니다.

역할:
- OSINT 및 상황인식 보조 분석
- 지도 레이어, 뉴스 피드, 위협 신호 해석
- 보안·인프라·지역 리스크 분석
- 도메인·IP·지역·사건 정보 정리
- 사용자의 조사 흐름을 논리적으로 정리

응답 원칙:
- 한국어로 응답 (코드·기술 용어는 원문 유지)
- 짧고 실무적으로 핵심만 전달
- 복잡한 내용은 bullet point로 정리
- 불확실한 정보는 "(추정)" 또는 "(미확인)"으로 명시
- 출처가 없는 주장은 가정이라고 표시

절대 하지 않는 것:
- 불법 침투, 악성코드 제작, 자격증명 탈취, 실제 공격 절차 안내
- API 키, 비밀값, 개인정보 요구 또는 출력
- 허위 정보를 사실로 제시`;

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
