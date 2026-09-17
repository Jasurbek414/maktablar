import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAiChat } from '../context/AiChatContext';
import FormattedText from './FormattedText';

const I = ({ d, c = 'w-5 h-5' }) => (<svg className={c} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>);
const SPARKLE = 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z';
const SEND_ICON = 'M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5';
const COPY_ICON = 'M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184';
const CHECK_ICON = 'M4.5 12.75l6 6 9-13.5';
const TRASH_ICON = 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0';

function CopyButton({ text, t }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* noop */ }
      }}
      title={t('aiChat.copy')}
      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all shrink-0"
    >
      <I d={copied ? CHECK_ICON : COPY_ICON} c={`w-3.5 h-3.5 ${copied ? 'text-emerald-400' : ''}`} />
    </button>
  );
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

/**
 * AI chatning umumiy tanasi (xabarlar + taklif savollar + kiritish maydoni) —
 * to'liq sahifa (AiChat.jsx) va suzib yuruvchi panel (FloatingAiChat.jsx) bir xil
 * UI'ni ishlatadi, faqat o'lchami (compact) farq qiladi.
 */
export default function AiChatBody({ compact = false }) {
  const { t } = useTranslation();
  const { messages, sending, error, send, clear } = useAiChat();
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, compact ? 96 : 140)}px`;
  }, [input, compact]);

  const suggestions = t('aiChat.suggestions', { returnObjects: true });

  const submit = (text) => {
    const content = text ?? input;
    if (!content.trim() || sending) return;
    send(content);
    setInput('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {messages.length > 0 && (
        <div className={`flex items-center justify-end shrink-0 ${compact ? 'px-3 pt-2' : 'pb-2'}`}>
          <button
            onClick={clear}
            className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/[0.06]"
          >
            <I d={TRASH_ICON} c="w-3.5 h-3.5" />
            {t('aiChat.clearChat')}
          </button>
        </div>
      )}

      <div ref={scrollRef} className={`flex-1 overflow-y-auto ${compact ? 'px-4 pb-4' : 'rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.08] p-5'}`}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className={`${compact ? 'w-10 h-10 mb-3' : 'w-14 h-14 mb-4'} rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 flex items-center justify-center`}>
              <I d={SPARKLE} c={`${compact ? 'w-5 h-5' : 'w-7 h-7'} text-emerald-400`} />
            </div>
            <p className={`${compact ? 'text-xs' : 'text-sm'} text-slate-300 font-medium mb-1`}>{t('aiChat.emptyTitle')}</p>
            {!compact && <p className="text-xs text-slate-600 mb-6 max-w-xs">{t('aiChat.emptyDesc')}</p>}
            <div className={`flex flex-col gap-2 w-full ${compact ? 'mt-3' : 'max-w-sm'}`}>
              {Array.isArray(suggestions) && suggestions.map((s, i) => (
                <button key={i} onClick={() => submit(s)}
                  className="group flex items-center gap-2 text-left text-xs px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-emerald-500/[0.08] text-slate-300 hover:border-emerald-500/25 hover:bg-emerald-500/[0.04] transition-colors">
                  <I d={SPARKLE} c="w-3.5 h-3.5 text-emerald-500/60 group-hover:text-emerald-400 shrink-0 transition-colors" />
                  <span>{s}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              return (
                <div key={i} className={`group flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isUser ? 'bg-white/[0.06] text-slate-300' : 'bg-gradient-to-br from-emerald-500/25 to-cyan-500/15 text-emerald-400'
                  }`}>
                    {isUser ? <span className="text-[11px] font-semibold">{t('aiChat.you')}</span> : <I d={SPARKLE} c="w-3.5 h-3.5" />}
                  </div>
                  <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[82%] min-w-0`}>
                    <div className={`flex items-center gap-1.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`rounded-2xl px-3.5 py-2.5 text-[13px] min-w-0 ${
                        isUser
                          ? 'bg-emerald-600/20 text-white rounded-br-sm'
                          : 'bg-white/[0.03] text-slate-200 border border-white/[0.04] rounded-bl-sm'
                      }`}>
                        {isUser ? <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p> : <FormattedText text={m.content} />}
                      </div>
                      {!isUser && <CopyButton text={m.content} t={t} />}
                    </div>
                    {m.at && <span className="text-[10px] text-slate-700 mt-1 px-1">{formatTime(m.at)}</span>}
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500/25 to-cyan-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <I d={SPARKLE} c="w-3.5 h-3.5" />
                </div>
                <div className="bg-white/[0.03] border border-white/[0.04] rounded-2xl rounded-bl-sm px-3.5 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className={`flex items-center gap-2 mt-2 px-1 ${compact ? 'mx-4' : ''}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}

      <div className={`flex items-end gap-2 ${compact ? 'p-3 border-t border-white/[0.04]' : 'mt-3'}`}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('aiChat.placeholder')}
          rows={1}
          className={`flex-1 resize-none rounded-xl bg-white/[0.03] border border-emerald-500/[0.1] px-3.5 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500/40 transition-colors ${compact ? 'py-2.5' : 'py-3'}`}
        />
        <button
          onClick={() => submit()}
          disabled={sending || !input.trim()}
          className={`shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors ${compact ? 'h-10 w-10' : 'h-11 w-11'}`}
        >
          <I d={SEND_ICON} c={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        </button>
      </div>
    </div>
  );
}
