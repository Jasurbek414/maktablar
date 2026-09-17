import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useAiChat } from '../context/AiChatContext';
import AiChatBody from './AiChatBody';

const SPARKLE = 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z';
const CLOSE = 'M6 18L18 6M6 6l12 12';

const BTN_SIZE = 56;
const PANEL_W = 384;
const PANEL_H = 560;
const MARGIN = 8;
const POS_KEY = 'aiChatButtonPos';
const DRAG_THRESHOLD = 4;

function clampPos(x, y) {
  const maxX = window.innerWidth - BTN_SIZE - MARGIN;
  const maxY = window.innerHeight - BTN_SIZE - MARGIN;
  return {
    x: Math.min(Math.max(x, MARGIN), Math.max(MARGIN, maxX)),
    y: Math.min(Math.max(y, MARGIN), Math.max(MARGIN, maxY)),
  };
}

function loadInitialPos() {
  try {
    const saved = JSON.parse(localStorage.getItem(POS_KEY));
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') return clampPos(saved.x, saved.y);
  } catch { /* noop */ }
  return clampPos(window.innerWidth - BTN_SIZE - 24, window.innerHeight - BTN_SIZE - 24);
}

/** Tugma joylashuviga qarab panelni ekrandan chiqib ketmaydigan qilib joylashtiradi. */
function computePanelStyle(pos) {
  let left = pos.x + BTN_SIZE - PANEL_W;
  if (left < MARGIN) left = pos.x;
  left = Math.min(Math.max(left, MARGIN), window.innerWidth - PANEL_W - MARGIN);

  let top = pos.y - PANEL_H - 12;
  if (top < MARGIN) top = pos.y + BTN_SIZE + 12;
  top = Math.min(Math.max(top, MARGIN), window.innerHeight - PANEL_H - MARGIN);

  return { left, top };
}

/**
 * Butun ilova bo'ylab suzib yuruvchi AI yordamchi tugmasi — SURIB, istalgan joyga
 * qo'yish mumkin (sichqoncha va barmoq bilan). Joylashuv localStorage'da saqlanadi,
 * shuning uchun keyingi safar ochganda tugma o'sha joyda turadi.
 */
export default function FloatingAiChat() {
  const { t } = useTranslation();
  const { open, setOpen } = useAiChat();
  const location = useLocation();

  const [pos, setPos] = useState(loadInitialPos);
  const dragState = useRef(null); // { startX, startY, posX, posY, moved }

  const onPointerDown = useCallback((e) => {
    dragState.current = { startX: e.clientX, startY: e.clientY, posX: pos.x, posY: pos.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e) => {
    const d = dragState.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) d.moved = true;
    if (d.moved) setPos(clampPos(d.posX + dx, d.posY + dy));
  }, []);

  const onPointerUp = useCallback((e) => {
    const d = dragState.current;
    if (!d) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (d.moved) {
      setPos(current => {
        const finalPos = clampPos(current.x, current.y);
        localStorage.setItem(POS_KEY, JSON.stringify(finalPos));
        return finalPos;
      });
    } else {
      setOpen(v => !v);
    }
    dragState.current = null;
  }, [setOpen]);

  useEffect(() => {
    const onResize = () => setPos(p => clampPos(p.x, p.y));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Dedicated sahifaning o'zida ikkinchi (ortiqcha) chat oynasi ko'rsatilmaydi.
  if (location.pathname === '/ai-chat') return null;

  const panelStyle = computePanelStyle(pos);

  return (
    <>
      {open && (
        <div
          style={{ position: 'fixed', left: panelStyle.left, top: panelStyle.top, width: PANEL_W, height: PANEL_H, zIndex: 40 }}
          className="max-w-[calc(100vw-1rem)] max-h-[calc(100vh-1rem)] rounded-2xl bg-[#0a120e] border border-emerald-500/[0.15] shadow-2xl shadow-black/50 flex flex-col overflow-hidden animate-slide-up"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] bg-gradient-to-r from-emerald-500/[0.06] to-transparent">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={SPARKLE} /></svg>
              </div>
              <span className="text-[13px] font-semibold text-white">{t('aiChat.title')}</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.05] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={CLOSE} /></svg>
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <AiChatBody compact />
          </div>
        </div>
      )}

      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        title={t('aiChat.dragHint')}
        style={{ position: 'fixed', left: pos.x, top: pos.y, width: BTN_SIZE, height: BTN_SIZE, zIndex: 40, touchAction: 'none' }}
        className="rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-grab active:cursor-grabbing select-none"
      >
        <svg className="w-6 h-6 text-white pointer-events-none" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d={open ? CLOSE : SPARKLE} />
        </svg>
      </button>
    </>
  );
}
