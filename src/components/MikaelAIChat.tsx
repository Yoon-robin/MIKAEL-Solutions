'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X, Loader2, Sparkles, ChevronDown } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME: Message = {
  role: 'assistant',
  content: 'MIKAEL AI 분석관입니다. 상황, 도메인, IP, 지역, 위협 신호를 입력하면 분석 관점으로 정리합니다.',
};

export default function MikaelAIChat({ isMobile = false }: { isMobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 메시지 추가 시 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // 열릴 때 input focus
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);
    setError(null);

    // system message 제외한 최근 20개만 전송
    const payload = history
      .filter(m => m.role !== 'assistant' || m.content !== WELCOME.content)
      .slice(-20);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'AI 응답 오류가 발생했습니다.');
        setLoading(false);
        return;
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // 모바일: bottom-[52px] 위에 띄움, desktop: 우하단 floating
  const panelClass = isMobile
    ? 'fixed bottom-[60px] right-2 left-2 z-[395]'
    : 'fixed bottom-6 right-[344px] z-[250]';

  const buttonClass = isMobile
    ? 'fixed bottom-[64px] right-3 z-[395]'
    : 'fixed bottom-6 right-[344px] z-[250]';

  return (
    <>
      {/* Floating 버튼 (닫혀있을 때) */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="chat-btn"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(true)}
            className={`${buttonClass} flex items-center gap-2 glass-panel border border-white/[0.12] px-3 py-2 rounded-lg hover:bg-white/[0.06] transition-colors pointer-events-auto`}
            aria-label="MIKAEL AI 분석관 열기"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--cyan-primary)]" />
            <span className="text-[12px] font-bold text-white tracking-widest">MIKAEL AI</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--alert-green)] animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* 채팅 패널 */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`${panelClass} glass-panel border border-white/[0.1] rounded-xl overflow-hidden flex flex-col pointer-events-auto`}
            style={{ width: isMobile ? undefined : '340px', maxHeight: isMobile ? 'min(60vh, 480px)' : '480px' }}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.07] bg-white/[0.02] flex-shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[var(--cyan-primary)]" />
                <span className="text-[13px] font-bold text-white">MIKAEL AI</span>
                <span className="text-[11px] text-white/40 font-medium">전용 분석관</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--alert-green)]" />
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded hover:bg-white/[0.06] transition-colors"
                  aria-label="닫기"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-white/50" />
                </button>
              </div>
            </div>

            {/* 메시지 목록 */}
            <div className="flex-1 overflow-y-auto styled-scrollbar px-3 py-2 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <Bot className="w-3.5 h-3.5 text-[var(--cyan-primary)] flex-shrink-0 mt-1 mr-1.5" />
                  )}
                  <div
                    className={`max-w-[82%] rounded-lg px-2.5 py-2 text-[12px] leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-white/[0.08] text-white ml-2'
                        : 'bg-white/[0.04] text-white/85 border border-white/[0.06]'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* 로딩 */}
              {loading && (
                <div className="flex justify-start">
                  <Bot className="w-3.5 h-3.5 text-[var(--cyan-primary)] flex-shrink-0 mt-1 mr-1.5" />
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-2 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 text-white/40 animate-spin" />
                    <span className="text-[12px] text-white/40">분석 중...</span>
                  </div>
                </div>
              )}

              {/* 에러 */}
              {error && (
                <div className="flex items-start gap-1.5 px-2.5 py-2 bg-red-950/20 border border-red-900/25 rounded-lg">
                  <X className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-[12px] text-red-400/80">{error}</span>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* 입력창 */}
            <div className="flex-shrink-0 border-t border-white/[0.07] px-2 py-2 bg-white/[0.01]">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="상황, IP, 도메인, 지역 입력..."
                  rows={1}
                  disabled={loading}
                  className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2.5 py-2 text-[12px] text-white placeholder:text-white/30 resize-none outline-none focus:border-white/[0.18] transition-colors styled-scrollbar disabled:opacity-50"
                  style={{ maxHeight: '80px', minHeight: '36px' }}
                  onInput={e => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 80) + 'px';
                  }}
                />
                <button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className="flex-shrink-0 p-2 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-white/[0.08]"
                  aria-label="전송"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              <p className="text-[10px] text-white/20 mt-1 px-0.5">Enter 전송 · Shift+Enter 줄바꿈</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
