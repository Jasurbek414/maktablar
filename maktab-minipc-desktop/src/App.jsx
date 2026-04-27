import { useEffect, useState } from 'react'
import { Activity, Settings, CheckCircle2, RefreshCw, Server, Users, BookOpen, GraduationCap, Clock } from 'lucide-react'

const { ipcRenderer } = window.require('electron')

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [config, setConfig] = useState({ apiKey: '', schoolId: '', localIp: '' })
  const [terminals, setTerminals] = useState([])
  const [events, setEvents] = useState([])
  
  // New local data state
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const loadData = () => {
    ipcRenderer.invoke('get-events').then(setEvents)
    ipcRenderer.invoke('get-terminals').then(setTerminals)
    ipcRenderer.invoke('get-students').then(setStudents)
    ipcRenderer.invoke('get-classes').then(setClasses)
    ipcRenderer.invoke('get-teachers').then(setTeachers)
  }

  useEffect(() => {
    ipcRenderer.invoke('get-config').then(setConfig)
    loadData()

    const termListener = (e, terms) => setTerminals(terms)
    const evListener = (e, ev) => setEvents(prev => [ev, ...prev].slice(0, 50))
    
    ipcRenderer.on('terminal-update', termListener)
    ipcRenderer.on('new-event', evListener)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const itv = setInterval(loadData, 10000)

    return () => {
      ipcRenderer.removeListener('terminal-update', termListener)
      ipcRenderer.removeListener('new-event', evListener)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(itv)
    }
  }, [])

  const saveConfig = () => {
    ipcRenderer.invoke('save-config', config).then(() => alert('Saqlandi!'))
  }

  const TabButton = ({ id, icon: Icon, label }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === id ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:bg-white/5'}`}
    >
      <Icon size={20} /> {label}
    </button>
  )

  return (
    <div className="flex h-screen bg-[#020504] text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[#0a0f0d] border-r border-[#1a2520] flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Maktab Mini-PC
          </h1>
          <p className="text-xs text-gray-400 mt-1">v2.1.0 Offline Dashboard</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <TabButton id="dashboard" icon={Activity} label="Asosiy" />
          <TabButton id="attendance" icon={Clock} label="Davomat" />
          <TabButton id="students" icon={GraduationCap} label="O'quvchilar" />
          <TabButton id="classes" icon={BookOpen} label="Sinflar" />
          <TabButton id="teachers" icon={Users} label="O'qituvchilar" />
          <div className="my-4 border-t border-[#1a2520]"></div>
          <TabButton id="terminals" icon={Server} label="Qurilmalar" />
          <TabButton id="settings" icon={Settings} label="Sozlamalar" />
        </nav>
        
        <div className="p-4 m-4 rounded-xl bg-white/5 border border-white/10 text-sm">
          <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
            <div className="text-gray-400">Internet</div>
            <div className={`flex items-center gap-1 ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span className={`relative flex h-2 w-2 mr-1`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              </span>
              {isOnline ? 'Aktiv' : 'Uzilgan!'}
            </div>
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Lokal IP:</span>
              <span className="font-mono text-white">{config.localIp || '...'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">ISUP Port:</span>
              <span className="font-mono text-white">7660 TCP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Umumiy Holat</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#0a0f0d] p-5 rounded-2xl border border-[#1a2520]">
                <h3 className="text-gray-400 mb-1 text-sm">O'quvchilar</h3>
                <div className="text-3xl font-bold text-white">{students.length}</div>
              </div>
              <div className="bg-[#0a0f0d] p-5 rounded-2xl border border-[#1a2520]">
                <h3 className="text-gray-400 mb-1 text-sm">Sinflar</h3>
                <div className="text-3xl font-bold text-white">{classes.length}</div>
              </div>
              <div className="bg-[#0a0f0d] p-5 rounded-2xl border border-[#1a2520]">
                <h3 className="text-gray-400 mb-1 text-sm">O'qituvchilar</h3>
                <div className="text-3xl font-bold text-white">{teachers.length}</div>
              </div>
              <div className="bg-[#0a0f0d] p-5 rounded-2xl border border-[#1a2520]">
                <h3 className="text-gray-400 mb-1 text-sm">Aktiv Terminallar</h3>
                <div className="text-3xl font-bold text-emerald-400">{terminals.filter(t => t.status==='ONLINE').length}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Davomat Tarixi (Oflayn Jurnal)</h2>
              <button onClick={loadData} className="p-2 hover:bg-white/10 rounded-lg text-emerald-400"><RefreshCw size={18} /></button>
            </div>
            <div className="bg-[#0a0f0d] rounded-2xl border border-[#1a2520] overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">F.I.SH / ID</th>
                    <th className="px-6 py-4">Vaqt</th>
                    <th className="px-6 py-4">Holat</th>
                    <th className="px-6 py-4">Sinxronizatsiya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2520]">
                  {events.length === 0 && <tr><td colSpan="4" className="text-center py-6 text-gray-500">Hech qanday ma'lumot topilmadi</td></tr>}
                  {events.map((e, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{e.studentName}</div>
                        <div className="text-xs text-gray-500">ID: {e.studentId} | Qurilma: {e.deviceSerial}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-300">{new Date(e.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${e.eventType === 'IN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {e.eventType === 'IN' ? 'KIRDI' : 'CHIQDI'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {e.synced ? <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={14}/> Jo'natildi</span> : 
                                    <span className="text-amber-500 flex items-center gap-1"><RefreshCw size={14} className="animate-spin"/> Kutmoqda</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">O'quvchilar ({students.length})</h2>
              <button onClick={loadData} className="p-2 hover:bg-white/10 rounded-lg text-emerald-400"><RefreshCw size={18} /></button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {students.length === 0 && <div className="text-gray-500">O'quvchilar ro'yxati bo'sh. Platformadan ulanishni tekshiring.</div>}
              {students.map(s => (
                <div key={s.id} className="bg-[#0a0f0d] p-4 rounded-xl border border-[#1a2520] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    {s.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium">{s.fullName}</div>
                    <div className="text-xs text-gray-500">ID: {s.id} | Sinf: {s.className || "Biriktirilmagan"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Sinflar ({classes.length})</h2>
            <div className="grid grid-cols-3 gap-4">
              {classes.length === 0 && <div className="text-gray-500">Sinflar ro'yxati bo'sh.</div>}
              {classes.map(c => (
                <div key={c.id} className="bg-[#0a0f0d] p-5 rounded-xl border border-[#1a2520] flex items-center gap-4">
                  <BookOpen size={24} className="text-cyan-400" />
                  <div>
                    <div className="font-bold text-lg">{c.name}</div>
                    <div className="text-xs text-gray-500">ID: {c.id}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'teachers' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">O'qituvchilar ({teachers.length})</h2>
            <div className="grid grid-cols-2 gap-4">
              {teachers.length === 0 && <div className="text-gray-500">O'qituvchilar ro'yxati bo'sh.</div>}
              {teachers.map(t => (
                <div key={t.id} className="bg-[#0a0f0d] p-4 rounded-xl border border-[#1a2520] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                    <Users size={20} />
                  </div>
                  <div>
                    <div className="font-medium">{t.fullName}</div>
                    <div className="text-xs text-blue-400 uppercase tracking-wider">{t.role}</div>
                  </div>
                </div>
              ))}
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
