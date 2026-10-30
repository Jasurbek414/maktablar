import React, { useState } from 'react';
import { api } from '../../services/api';

const I = ({ d, c = 'w-5 h-5' }) => (
  <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICON = {
  close: 'M6 18L18 6M6 6l12 12',
  copy: 'M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5',
  check: 'M4.5 12.75l6 6 9-13.5',
  cloud: 'M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z',
  router: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  webhook: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244',
  pulse: 'M9 12h1.5l1.5-4.5 3 9 1.5-4.5H21',
  warning: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
};

export default function ConnectionWizardModal({ router, onClose, onAddTerminal }) {
  const [tab, setTab] = useState('isup');
  const [copiedKey, setCopiedKey] = useState('');

  // Quick test state
  const [testIp, setTestIp] = useState('');
  const [testUser, setTestUser] = useState('admin');
  const [testPass, setTestPass] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2000);
    } catch {}
  };

  const runTest = async () => {
    if (!testIp.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/api/terminals/test-connection', {
        ipAddress: testIp.trim(),
        deviceUsername: testUser.trim(),
        devicePassword: testPass,
      });
      setTestResult(res);
    } catch (e) {
      setTestResult({ ok: false, error: e.message });
    }
    setTesting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[80] p-4" onClick={onClose}>
      <div className="bg-[#0d1a14] border border-cyan-500/20 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] sticky top-0 bg-[#0d1a14]/95 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <I d={ICON.cloud} c="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Face ID Ulash Ustasi</h3>
              <p className="text-xs text-slate-400">Hikvision terminallarini serverga to'liq ulash va integratsiya qilish</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/[0.05]">
            <I d={ICON.close} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Method Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-black/30 border border-white/[0.04]">
            <button
              onClick={() => setTab('isup')}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'isup'
                  ? 'bg-cyan-500/15 text-cyan-300 shadow-sm border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <I d={ICON.cloud} c="w-4 h-4" />
              <span>ISUP 5.0 (Bulut)</span>
            </button>
            <button
              onClick={() => setTab('vpn')}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'vpn'
                  ? 'bg-emerald-500/15 text-emerald-300 shadow-sm border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <I d={ICON.router} c="w-4 h-4" />
              <span>Router & VPN</span>
            </button>
            <button
              onClick={() => setTab('webhook')}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'webhook'
                  ? 'bg-purple-500/15 text-purple-300 shadow-sm border border-purple-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <I d={ICON.webhook} c="w-4 h-4" />
              <span>HTTP Webhook</span>
            </button>
          </div>

          {/* TAB 1: ISUP 5.0 */}
          {tab === 'isup' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-cyan-500/[0.08] border border-cyan-500/20 text-xs text-cyan-200 leading-relaxed">
                <span className="font-bold text-cyan-300">Tavsiya etilgan eng qulay usul:</span> Routersiz, statik oq IP (Public IP) va VPNsiz to'g'ridan-to'g'ri internet orqali terminal serverga ulanadi.
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Terminalda kiritiladigan server parametrlari:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Server Manzili (Server Address)</p>
                      <p className="text-sm font-mono font-bold text-white mt-0.5">62.169.27.106</p>
                    </div>
                    <button
                      onClick={() => copy('62.169.27.106', 'ip')}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs text-slate-300 flex items-center gap-1"
                    >
                      <I d={copiedKey === 'ip' ? ICON.check : ICON.copy} c="w-3.5 h-3.5" />
                      <span>{copiedKey === 'ip' ? 'Nusxalandi' : 'Nusxa'}</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Server Porti (Server Port)</p>
                      <p className="text-sm font-mono font-bold text-white mt-0.5">7660</p>
                    </div>
                    <button
                      onClick={() => copy('7660', 'port')}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs text-slate-300 flex items-center gap-1"
                    >
                      <I d={copiedKey === 'port' ? ICON.check : ICON.copy} c="w-3.5 h-3.5" />
                      <span>{copiedKey === 'port' ? 'Nusxalandi' : 'Nusxa'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step by step */}
              <div className="space-y-2.5 pt-2">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Qurilma ekranida sozlash bosqichlari:</p>
                <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside bg-black/20 p-3.5 rounded-xl border border-white/[0.04]">
                  <li className="leading-relaxed">Terminal ekranida bosh menyuga kiring va <span className="text-white font-semibold">Tarmoq sozlamalari (Network)</span> bo'limini oching.</li>
                  <li className="leading-relaxed"><span className="text-white font-semibold">Kengaytirilgan (Advanced) → Platform Access (Platformaga kirish)</span> menyusini tanlang.</li>
                  <li className="leading-relaxed">Platforma turini (Access Type) <span className="text-cyan-400 font-semibold font-mono">ISUP / EHome 5.0</span> ga o'tkazing va yoqing (Enable).</li>
                  <li className="leading-relaxed">Server IP ga <span className="text-cyan-300 font-mono">62.169.27.106</span>, Port ga <span className="text-cyan-300 font-mono">7660</span> ni yozing.</li>
                  <li className="leading-relaxed">Qurilma ID (Device ID) ga terminal seriya raqamini kiriting va saqlang. Holat <span className="text-emerald-400 font-semibold">Online</span> bo'ladi.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: VPN */}
          {tab === 'vpn' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 text-xs text-emerald-200 leading-relaxed">
                Maktabdagi Mikrotik router orqali xavfsiz VPN tunneli ichida to'g'ridan-to'g'ri boshqarish.
              </div>

              {router && (
                <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] text-xs space-y-1">
                  <p className="text-slate-400 font-semibold">{router.name}</p>
                  <p className="text-slate-500">VPN IP: <span className="text-slate-300 font-mono">{router.vpnIp || '—'}</span> · LAN: <span className="text-slate-300 font-mono">{router.lanSubnet || '192.168.88.0/24'}</span></p>
                </div>
              )}

              {/* Quick connectivity test */}
              <div className="p-4 rounded-xl bg-black/30 border border-white/[0.06] space-y-3">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Lokal IP orqali aloqani tekshirish:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={testIp}
                    onChange={e => setTestIp(e.target.value)}
                    placeholder="Terminal IP (192.168.88.250)"
                    className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                  />
                  <input
                    type="text"
                    value={testUser}
                    onChange={e => setTestUser(e.target.value)}
                    placeholder="Login (admin)"
                    className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                  />
                  <input
                    type="password"
                    value={testPass}
                    onChange={e => setTestPass(e.target.value)}
                    placeholder="Parol"
                    className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={runTest}
                    disabled={testing || !testIp.trim()}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <I d={testing ? ICON.copy : ICON.pulse} c={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                    <span>{testing ? 'Ulanish tekshirilmoqda...' : 'Aloqani tekshirish'}</span>
                  </button>

                  {testResult && testResult.ok && onAddTerminal && (
                    <button
                      onClick={() => {
                        onClose();
                        onAddTerminal({
                          ipAddress: testIp.trim(),
                          deviceUsername: testUser.trim(),
                          devicePassword: testPass,
                          model: testResult.model,
                          serialNumber: testResult.serialNumber,
                          brand: 'Hikvision',
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold transition-all"
                    >
                      + Formaga qo'shish
                    </button>
                  )}
                </div>

                {testResult && (
                  <div className={`rounded-lg p-2.5 text-xs flex items-start gap-2 ${testResult.ok ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
                    <I d={testResult.ok ? ICON.check : ICON.warning} c="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{testResult.ok ? testResult.message : 'Ulanish amalga oshmadi'}</p>
                      {testResult.ok ? (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Model: <span className="text-white font-medium">{testResult.model}</span> · Serial: <span className="text-white font-mono">{testResult.serialNumber}</span> · Foydalanuvchilar: <span className="text-white">{testResult.users}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] opacity-80 mt-0.5">{testResult.error}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Webhook */}
          {tab === 'webhook' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-purple-500/[0.08] border border-purple-500/20 text-xs text-purple-200 leading-relaxed">
                Terminal o'tish hodisalarini (Face pass) serverning ochiq webhook manziliga avtomatik POST so'rovi bilan jo'natadi.
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Webhook qabul qilish manzili (Destination URL):</p>
                <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-mono font-bold text-white truncate">http://62.169.27.106:8085/api/public/devices/webhook</p>
                  </div>
                  <button
                    onClick={() => copy('http://62.169.27.106:8085/api/public/devices/webhook', 'hook')}
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs text-slate-300 flex items-center gap-1 shrink-0"
                  >
                    <I d={copiedKey === 'hook' ? ICON.check : ICON.copy} c="w-3.5 h-3.5" />
                    <span>{copiedKey === 'hook' ? 'Nusxalandi' : 'Nusxa'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300 bg-black/20 p-3.5 rounded-xl border border-white/[0.04]">
                <p className="font-semibold text-white">Hikvision Web UI da sozlash:</p>
                <p className="text-slate-400">1. Brauzerda terminalning IP manziliga kiring.</p>
                <p className="text-slate-400">2. <span className="text-white">Configuration → Network → Advanced Settings → HTTP Listening</span> menyusini oching.</p>
                <p className="text-slate-400">3. Destination IP ga <span className="text-purple-300 font-mono">62.169.27.106</span>, Port ga <span className="text-purple-300 font-mono">8085</span> yoki <span className="text-purple-300 font-mono">8095</span> ni kiriting.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-white/[0.06] bg-black/20">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-slate-300 transition-all"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}
