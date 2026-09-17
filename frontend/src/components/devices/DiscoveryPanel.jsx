import React, { useState } from 'react';
import { api } from '../../services/api';

const I = ({ d, c = 'w-5 h-5' }) => (<svg className={c} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>);
const SEARCH = 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z';
const input = 'px-3 py-2 rounded-lg bg-black/30 border border-white/[0.06] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40';

const CATEGORY_STYLE = {
  faceTerminal: 'bg-purple-500/10 text-purple-300',
  camera: 'bg-cyan-500/10 text-cyan-300',
  recorder: 'bg-blue-500/10 text-blue-300',
  router: 'bg-slate-500/10 text-slate-300',
  unknown: 'bg-white/[0.04] text-slate-400',
};

/**
 * Router ortidagi LAN'da qurilmalarni qidirish (POST /api/routers/{id}/discover).
 * Topilgan qurilma DB'ga avtomatik qo'shilmaydi — foydalanuvchi tanlaydi.
 */
export default function DiscoveryPanel({ router, canWrite, t, onAddTerminal, onCameraAdded }) {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [camDraft, setCamDraft] = useState(null);
  const [savingCam, setSavingCam] = useState(false);

  if (!canWrite) return null;

  const scan = async () => {
    setScanning(true); setError(''); setResult(null);
    try { setResult(await api.post(`/api/routers/${router.id}/discover`, creds.username ? creds : {})); }
    catch (e) { setError(e.message); }
    setScanning(false);
  };

  const addTerminal = (d) => onAddTerminal({
    name: d.model ? `${d.model} (${d.lanIp})` : d.lanIp,
    brand: d.vendor === 'hikvision' ? 'Hikvision' : '',
    model: d.model || '',
    serialNumber: d.serialNumber || '',
    ipAddress: d.lanIp,
    // MUHIM (2026-09-18): frontend-admin'dagi (2026-09-17) tuzatish shu yerga ham ko'chirildi —
    // ba'zi qurilmalar (masalan Hikvision "HTTPS majburiy" rejimi) port 80'da 30x bilan
    // https'ga yo'naltiradi; backend buni aniqlab d.httpsOnly=true qaytaradi. Bu e'tiborga
    // olinmasa terminal noto'g'ri (HTTP:80) saqlanadi va davomat hech qachon yozilmaydi —
    // 2026-09-17'da aynan shu bug tufayli yangi qo'shilgan o'quvchining davomati yo'qolgan edi.
    port: d.httpsOnly ? 443 : (d.openPorts.includes(80) ? 80 : ''),
    useHttps: !!d.httpsOnly,
    deviceUsername: creds.username || '',
    devicePassword: creds.password || '',
    firmwareVersion: d.firmwareVersion || '',
  });

  const saveCamera = async () => {
    if (!camDraft?.name?.trim()) return;
    setSavingCam(true); setError('');
    try {
      await api.post('/api/cameras', {
        name: camDraft.name.trim(),
        schoolId: router.schoolId,
        ipAddress: camDraft.device.lanIp,
        brand: camDraft.device.vendor === 'hikvision' ? 'Hikvision' : null,
        model: camDraft.device.model,
        serialNumber: camDraft.device.serialNumber,
        port: camDraft.device.httpsOnly ? 443 : (camDraft.device.openPorts.includes(80) ? 80 : null),
        useHttps: !!camDraft.device.httpsOnly,
        rtspPort: camDraft.device.openPorts.includes(554) ? 554 : null,
        streamChannel: '101',
        deviceUsername: creds.username || null,
        devicePassword: creds.password || null,
        status: 'OFFLINE',
      });
      setCamDraft(null);
      onCameraAdded && onCameraAdded();
      scan();
    } catch (e) { setError(e.message); }
    setSavingCam(false);
  };

  return (
    <div className="rounded-xl bg-purple-500/[0.04] border border-purple-500/10 p-4 space-y-3">
      <div className="flex items-center gap-2"><I d={SEARCH} c="w-4 h-4 text-purple-400" /><p className="text-[12px] font-semibold text-purple-300">{t('devices.discovery.title')}</p></div>
      <p className="text-[11px] text-slate-500">{t('devices.discovery.hint')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input value={creds.username} onChange={e => setCreds({ ...creds, username: e.target.value })} placeholder={t('devices.discovery.username')} className={input} autoComplete="off" />
        <input type="password" value={creds.password} onChange={e => setCreds({ ...creds, password: e.target.value })} placeholder={t('devices.discovery.password')} className={input} autoComplete="new-password" />
        <button onClick={scan} disabled={scanning} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50">
          {scanning ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />{t('devices.discovery.scanning')}</> : t('devices.discovery.scanBtn')}
        </button>
      </div>
      <p className="text-[10px] text-slate-600">{t('devices.discovery.loginHint')}</p>
      {error && <p className="text-[12px] text-red-400">{error}</p>}

      {result && (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-400">
            {t('devices.discovery.found', { count: result.devices.length })} · <span className="font-mono">{result.lanSubnet}</span>
            {!result.routerOnline && <span className="text-amber-400"> · {t('devices.discovery.routerOffline')}</span>}
            {result.timedOut && <span className="text-amber-400"> · {t('devices.discovery.timedOut')}</span>}
          </p>
          {result.devices.length === 0 ? (
            <p className="text-center text-xs text-slate-600 py-4">{t('devices.discovery.none')}</p>
          ) : result.devices.map(d => {
            const registered = d.registeredTerminalId || d.registeredCameraId;
            return (
              <div key={d.lanIp} className="rounded-lg bg-white/[0.02] border border-white/[0.05] px-3 py-2.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[12px] font-mono text-slate-200 w-28 shrink-0">{d.lanIp}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${CATEGORY_STYLE[d.category] || CATEGORY_STYLE.unknown}`}>{t(`devices.discovery.category.${d.category}`)}</span>
                  <span className="text-[11px] text-slate-400 capitalize">{d.vendor}</span>
                  {d.model && <span className="text-[11px] text-slate-500">{d.model}</span>}
                  <span className="text-[10px] text-slate-600 font-mono">{d.openPorts.join(', ')}</span>
                  <div className="ml-auto flex gap-1.5">
                    {registered ? (
                      <span className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400">{t('devices.discovery.registered')}</span>
                    ) : d.category !== 'router' && <>
                      <button onClick={() => addTerminal(d)} className="text-[11px] px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-300 hover:bg-purple-500/20">{t('devices.discovery.addTerminal')}</button>
                      <button onClick={() => setCamDraft({ device: d, name: d.model ? `${d.model} (${d.lanIp})` : d.lanIp })} className="text-[11px] px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20">{t('devices.discovery.addCamera')}</button>
                    </>}
                  </div>
                </div>
                {d.loginError && <p className="text-[10px] text-amber-400 mt-1.5">{d.loginError}</p>}
                {camDraft?.device.lanIp === d.lanIp && (
                  <div className="flex gap-2 mt-2">
                    <input value={camDraft.name} onChange={e => setCamDraft({ ...camDraft, name: e.target.value })} placeholder={t('devices.discovery.cameraName')} className={`${input} flex-1`} />
                    <button onClick={saveCamera} disabled={savingCam || !camDraft.name.trim()} className="px-3 py-2 rounded-lg text-[12px] font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50">{t('common.save')}</button>
                    <button onClick={() => setCamDraft(null)} className="px-3 py-2 text-[12px] text-slate-500 hover:text-slate-300">{t('common.cancel')}</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
