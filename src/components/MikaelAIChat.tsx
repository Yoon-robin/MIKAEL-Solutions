'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bot, Send, X, Loader2, Sparkles, ChevronDown, Minimize2, RotateCcw } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME: Message = {
  role: 'assistant',
  content: 'MIKAEL AI 분석관입니다. 상황, 도메인, IP, 지역, 위협 신호를 입력하면 분석 관점으로 정리합니다.',
};

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-1 h-1 rounded-full bg-white/40"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ msg, index }: { msg: Message; index: number }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, delay: index * 0.03, ease: 'easeOut' }}
      className={`flex items-start gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-5 h-5 rounded-sm bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center mt-0.5">
          <Bot className="w-2.5 h-2.5 text-[#00E5FF]" />
        </div>
      )}
      <div
        className={`
          max-w-[78%] rounded-lg text-[12px] leading-relaxed whitespace-pre-wrap
          ${isUser
            ? 'bg-white/[0.09] border border-white/[0.12] text-white px-3 py-2 rounded-tr-sm'
            : 'bg-white/[0.04] border border-white/[0.07] text-white/85 px-3 py-2 rounded-tl-sm'
          }
        `}
      >
        {msg.content}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-5 h-5 rounded-sm bg-white/[0.08] border border-white/[0.12] flex items-center justify-center mt-0.5">
          <span className="text-[8px] font-bold text-white/60">U</span>
        </div>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */

export default function MikaelAIChat({ isMobile = false }: { isMobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<string>(''); // 재시도용
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Escape 키로 닫기 (#31)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => textareaRef.current?.focus(), 250);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!open && messages.length > 1) setUnread(n => n + 1);
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  const resizeTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  };

  const send = useCallback(async (retryText?: string) => {
    const text = retryText || input.trim();
    if (!text || loading) return;

    setLastInput(text);
    const userMsg: Message = { role: 'user', content: text };
    const history = retryText ? messages : [...messages, userMsg];
    if (!retryText) setMessages(history);
    setInput('');
    setLoading(true);
    setError(null);
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }

    const payload = history
      .filter(m => !(m.role === 'assistant' && m.content === WELCOME.content))
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
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  /* z / position */
  const btnZ   = isMobile ? 'z-[395]' : 'z-[250]';
  const panelZ = isMobile ? 'z-[395]' : 'z-[250]';
  const btnPos   = isMobile
    ? 'fixed bottom-[64px] right-3'
    : 'fixed bottom-6 right-[352px]';
  const panelPos = isMobile
    ? 'fixed bottom-[62px] left-2 right-2'
    : 'fixed bottom-6 right-[352px]';

  return (
    <>
      {/* ── Floating Trigger Button ── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="ai-trigger"
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => setOpen(true)}
            className={`
              ${btnPos} ${btnZ}
              group flex items-center gap-2 pointer-events-auto
              border border-white/[0.12] bg-black/80 backdrop-blur-md
              hover:border-white/[0.22] hover:bg-white/[0.04]
              rounded-lg px-3 py-2 transition-all duration-200
              shadow-[0_4px_24px_rgba(0,0,0,0.6)]
            `}
            aria-label="MIKAEL AI 분석관 열기"
          >
            {/* 스캔 애니메이션 */}
            <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
              <motion.div
                className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
                animate={prefersReducedMotion ? {} : { x: ['-200%', '400%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
            </div>

            <div className="relative flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#00E5FF] group-hover:text-white transition-colors" />
              <span className="text-[12px] font-bold text-white tracking-[0.15em]">MIKAEL AI</span>
              {/* 상태 + 뱃지 */}
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00E676] shadow-[0_0_4px_#00E676]" />
                {unread > 0 && (
                  <span className="text-[10px] font-bold text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/20 rounded px-1">
                    {unread}
                  </span>
                )}
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="ai-panel"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`
              ${panelPos} ${panelZ}
              pointer-events-auto flex flex-col
              bg-black/90 backdrop-blur-xl
              border border-white/[0.1]
              rounded-xl overflow-hidden
              shadow-[0_8px_48px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)]
            `}
            style={{
              width: isMobile ? undefined : '340px',
              maxHeight: isMobile ? 'min(58vh, 460px)' : '480px',
            }}
          >
            {/* ── Header ── */}
            <div className="relative flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.07] flex-shrink-0 overflow-hidden">
              {/* 헤더 스캔라인 */}
              <div className="absolute inset-0 pointer-events-none" aria-hidden>
                <motion.div
                  className="absolute top-0 bottom-0 w-12 bg-gradient-to-r from-transparent via-[#00E5FF]/[0.04] to-transparent"
                  animate={prefersReducedMotion ? {} : { x: ['-300%', '600%'] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                />
              </div>

              <div className="relative flex items-center gap-2.5">
                {/* 아이콘 */}
                <div className="w-6 h-6 rounded-md bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-[#00E5FF]" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-[13px] font-bold text-white tracking-[0.08em]">MIKAEL AI</span>
                  <span className="text-[10px] text-white/35 font-medium tracking-widest mt-0.5">전용 분석관</span>
                </div>
              </div>

              <div className="relative flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00E676] shadow-[0_0_6px_#00E676]" />
                  <span className="text-[10px] text-white/30 tracking-widest">ONLINE</span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md hover:bg-white/[0.06] transition-colors group"
                  aria-label="닫기"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-white/30 group-hover:text-white/70 transition-colors" />
                </button>
              </div>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto styled-scrollbar px-3 py-3 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} index={i} />
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start gap-2"
                >
                  <div className="flex-shrink-0 w-5 h-5 rounded-sm bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center mt-0.5">
                    <Bot className="w-2.5 h-2.5 text-[#00E5FF]" />
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.07] rounded-lg rounded-tl-sm px-3 py-2.5">
                    <TypingDots />
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-start gap-2 px-3 py-2 bg-red-950/20 border border-red-900/25 rounded-lg"
                >
                  <X className="w-3 h-3 text-red-400/80 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-red-400/80 leading-relaxed">{error}</span>
                    {lastInput && (
                      <button
                        onClick={() => send(lastInput)}
                        className="flex items-center gap-1 text-[10px] text-red-400/60 hover:text-red-400 transition-colors flex-shrink-0"
                        aria-label="마지막 메시지 재전송"
                      >
                        <RotateCcw className="w-3 h-3" />
                        재시도
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* ── Divider ── */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent flex-shrink-0" />

            {/* ── Input Area ── */}
            <div className="flex-shrink-0 px-3 pt-2.5 pb-2 space-y-1.5">
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => { setInput(e.target.value); resizeTextarea(e.target); }}
                  onKeyDown={handleKeyDown}
                  placeholder="상황, IP, 도메인, 지역 입력..."
                  rows={1}
                  disabled={loading}
                  aria-label="메시지 입력"
                  className="
                    flex-1 bg-white/[0.04] border border-white/[0.08]
                    hover:border-white/[0.14] focus:border-white/[0.2]
                    rounded-lg px-3 py-2 text-[12px] text-white
                    placeholder:text-white/25 resize-none outline-none
                    transition-colors styled-scrollbar
                    disabled:opacity-40 disabled:cursor-not-allowed
                    leading-relaxed
                  "
                  style={{ maxHeight: '96px', minHeight: '36px' }}
                />
                <motion.button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  whileTap={(!loading && input.trim()) ? { scale: 0.92 } : {}}
                  className="
                    flex-shrink-0 w-9 h-9 rounded-lg
                    bg-white/[0.06] hover:bg-white/[0.12]
                    border border-white/[0.1] hover:border-white/[0.2]
                    flex items-center justify-center
                    disabled:opacity-25 disabled:cursor-not-allowed
                    transition-all duration-150
                  "
                  aria-label="전송"
                >
                  {loading
                    ? <Loader2 className="w-3.5 h-3.5 text-white/50 animate-spin" />
                    : <Send className="w-3.5 h-3.5 text-white/70" />
                  }
                </motion.button>
              </div>

              {/* 힌트 */}
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] text-white/18 tracking-wide">
                  Enter 전송 &nbsp;·&nbsp; Shift+Enter 줄바꿈
                </span>
                <span className="text-[10px] text-white/18">
                  {input.length > 0 && `${input.length} / 4000`}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
