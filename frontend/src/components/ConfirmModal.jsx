import React from 'react';

export default function ConfirmModal({ open, onConfirm, onCancel, title, message }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-[#0d1a14] border border-red-500/20 p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{title || "O'chirishni tasdiqlang"}</h3>
            <p className="text-[12px] text-slate-500 mt-0.5">{message || "Bu amalni qaytarib bo'lmaydi"}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 h-10 rounded-xl border border-slate-700 text-slate-400 text-sm hover:bg-white/[0.03] transition-colors">Bekor qilish</button>
          <button onClick={onConfirm} className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors">O'chirish</button>
        </div>
      </div>
    </div>
  );
}
