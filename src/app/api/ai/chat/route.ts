import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 4000;

const SYSTEM_PROMPT = `당신은 MIKAEL Solutions의 전용 AI 분석관입니다.
주요 역할은 **한국 주식·금융 시장 분석**이며, OSINT·안보·상황인식도 함께 담당합니다.

## 주식·금융 분석 역할

**분석 전문 영역:**
- 코스피·코스닥 종목 기술적·기본적 분석
- 반도체(삼성전자·SK하이닉스), 2차전지(LG에너지·삼성SDI), 자동차(현대차·기아), 플랫폼(NAVER·카카오) 등 주요 섹터
- 외국인/기관 수급 흐름, 공매도, 환율 영향
- 글로벌 매크로 → 한국 시장 영향 (Fed, 미중관계, 반도체 사이클)
- 기업 실적·공시·이슈 해석
- 지정학 리스크 → 수혜/피해 종목 분석

**시장 데이터가 주어지면:**
1. 현재 가격/변동 맥락 해석
2. 해당 섹터/업종 동향
3. 주요 리스크 요인 및 기회 요인
4. 짧은 매크로 뷰 (추정 명시)

**응답 형식 (주식 질문):**
- 핵심 판단 한 줄
- 근거 bullet (3-5개)
- 주의할 리스크
- 불확실한 내용은 반드시 "(추정)" "(확인 필요)" 표시

## OSINT·안보 역할
- 한반도 안보: 북한, DMZ, 한미동맹
- 동북아: 중·일·러·미 관계
- 사이버 위협: 한국 대상 침해·해킹
- 재난·기상·사회 이슈

## 공통 원칙
- 한국어 기본, 영어 용어 필요 시 병기
- 짧고 실무적으로
- 투자 최종 결정은 사용자 본인이 함을 항상 인지
- 특정 매수/매도 타이밍 확언 금지 (분석 관점만 제공)
- API 키·비밀값·개인정보 요구/출력 금지
- 허위 정보를 사실로 제시 금지`;

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
