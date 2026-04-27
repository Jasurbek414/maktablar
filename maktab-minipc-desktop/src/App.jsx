import { useEffect, useState } from 'react'
import { Activity, Settings, CheckCircle2, XCircle, RefreshCw, Server, User } from 'lucide-react'

const { ipcRenderer } = window.require('electron')

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [config, setConfig] = useState({ apiKey: '', schoolId: '' })
  const [terminals, setTerminals] = useState([])
  const [events, setEvents] = useState([])

  useEffect(() => {
    // Load Initial Data
    ipcRenderer.invoke('get-config').then(setConfig)
    ipcRenderer.invoke('get-terminals').then(setTerminals)
    ipcRenderer.invoke('get-events').then(setEvents)

    // Listeners
    const termListener = (e, terms) => setTerminals(terms)
    const evListener = (e, ev) => setEvents(prev => [ev, ...prev].slice(0, 50))
    
    ipcRenderer.on('terminal-update', termListener)
    ipcRenderer.on('new-event', evListener)

    const itv = setInterval(() => {
      ipcRenderer.invoke('get-events').then(setEvents)
      ipcRenderer.invoke('get-terminals').then(setTerminals)
    }, 10000)

    return () => {
      ipcRenderer.removeListener('terminal-update', termListener)
      ipcRenderer.removeListener('new-event', evListener)
      clearInterval(itv)
    }
  }, [])

  const saveConfig = () => {
    ipcRenderer.invoke('save-config', config).then(() => {
      alert('Saqlandi!')
    })
  }

  return (
    <div className="flex h-screen bg-[#020504] text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[#0a0f0d] border-r border-[#1a2520] flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Maktab Mini-PC
          </h1>
          <p className="text-xs text-gray-400 mt-1">v2.0.0 Desktop</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:bg-white/5'}`}
          >
            <Activity size={20} /> Asosiy
          </button>
          <button 
            onClick={() => setActiveTab('terminals')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'terminals' ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:bg-white/5'}`}
          >
            <Server size={20} /> Qurilmalar
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:bg-white/5'}`}
          >
            <Settings size={20} /> Sozlamalar
          </button>
        </nav>
        
        <div className="p-4 m-4 rounded-xl bg-white/5 border border-white/10 text-sm">
          <div className="flex items-center gap-2 mb-2 text-emerald-400">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            Server ishlayapti
          </div>
          <div className="text-gray-400 text-xs font-mono">Port: 7660 TCP</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Jonli Davomat</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-[#0a0f0d] p-6 rounded-2xl border border-[#1a2520]">
                <h3 className="text-gray-400 mb-2">Bugun qayd etildi</h3>
                <div className="text-4xl font-bold text-white">{events.length}</div>
              </div>
              <div className="bg-[#0a0f0d] p-6 rounded-2xl border border-[#1a2520]">
                <h3 className="text-gray-400 mb-2">Aktiv Terminallar</h3>
                <div className="text-4xl font-bold text-emerald-400">{terminals.filter(t => t.status==='ONLINE').length} / {terminals.length}</div>
              </div>
            </div>

            <div className="bg-[#0a0f0d] rounded-2xl border border-[#1a2520] overflow-hidden">
              <div className="p-4 border-b border-[#1a2520] font-semibold flex justify-between">
                <span>So'nggi hodisalar</span>
                <RefreshCw size={18} className="text-gray-400" />
              </div>
              <div className="p-4 space-y-3">
                {events.length === 0 && <div className="text-center text-gray-500 py-4">Hozircha ma'lumot yo'q</div>}
                {events.map((e, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${e.eventType === 'IN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {e.eventType === 'IN' ? 'KIRDI' : 'CHIQDI'}
                      </div>
                      <div>
                        <div className="font-medium">{e.studentName}</div>
                        <div className="text-xs text-gray-400">ID: {e.studentId} • Terminal: {e.deviceSerial}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{new Date(e.timestamp).toLocaleTimeString()}</div>
                      {e.synced ? <div className="text-xs text-emerald-500 flex items-center justify-end gap-1"><CheckCircle2 size={12}/> Sinxronlandi</div> : 
                                  <div className="text-xs text-amber-500 flex items-center justify-end gap-1"><RefreshCw size={12} className="animate-spin"/> Kutmoqda...</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'terminals' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Face ID Qurilmalar</h2>
            <div className="grid grid-cols-2 gap-4">
              {terminals.length === 0 && <div className="text-gray-500 col-span-2">Ushbu tarmoqda birorta ham terminal ulanmagan. Terminal sozlamalaridan Server IP siga ushbu kompyuter IP sini yozing.</div>}
              {terminals.map(t => (
                <div key={t.id} className="bg-[#0a0f0d] p-5 rounded-2xl border border-[#1a2520] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${t.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      <Server size={24} />
                    </div>
                    <div>
                      <div className="font-bold">{t.id}</div>
                      <div className="text-xs text-gray-400">IP: {t.addr}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${t.status === 'ONLINE' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-xl">
            <h2 className="text-2xl font-bold">Platformaga Ulanish</h2>
            <div className="bg-[#0a0f0d] p-6 rounded-2xl border border-[#1a2520] space-y-4">
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Maktab ID (Platformadan olingan)</label>
                <input 
                  value={config.schoolId || ''} 
                  onChange={e => setConfig({...config, schoolId: e.target.value})}
                  className="w-full bg-[#020504] border border-[#1a2520] rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Masalan: 2"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">API Kalit (Maxfiy)</label>
                <input 
                  value={config.apiKey || ''} 
                  onChange={e => setConfig({...config, apiKey: e.target.value})}
                  type="password"
                  className="w-full bg-[#020504] border border-[#1a2520] rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Platformadan berilgan kalit"
                />
              </div>

              <button 
                onClick={saveConfig}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 rounded-xl transition-all"
              >
                Saqlash va Ulanish
              </button>

            </div>
          </div>
        )}

      </div>
    </div>
  )
}
