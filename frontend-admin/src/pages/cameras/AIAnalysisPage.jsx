import { BrainCircuit, AlertTriangle, TrendingUp, ShieldCheck, Construction } from 'lucide-react'

const featureCards = [
  { icon: AlertTriangle, title: 'Anomaliya aniqlash', desc: 'Shubhali yoki xavfli holatlarni avtomatik aniqlash' },
  { icon: TrendingUp, title: 'Prognoz', desc: 'Davomat tendensiyalarini AI asosida bashorat qilish' },
  { icon: ShieldCheck, title: 'Xavfsizlik', desc: 'Ruxsatsiz kirish va xavfsizlik xatarlarini avtomatik ogohlantirish' },
]

export default function AIAnalysisPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>AI tahlili</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
          Sun'iy intellekt asosidagi kuzatuv va tahlil
        </p>
      </div>

      <div style={{
        background: 'white', border: '1px solid #E2E8F0', borderRadius: 16,
        padding: '40px 24px', textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18, margin: '0 auto 18px',
          background: 'linear-gradient(135deg, #7C3AED, #DB2777)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 20px rgba(124,58,237,0.3)',
        }}>
          <Construction style={{ width: 30, height: 30, color: 'white' }} />
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>AI tahlili moduli ishlab chiqilmoqda</h2>
        <p style={{ fontSize: 13.5, color: '#64748B', maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
          Sun'iy intellekt yordamida shaxsni aniqlash, anomaliyalarni topish va prognoz qilish imkoniyatlari qo'shiladi.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
        {featureCards.map(({ icon: Icon, title, desc }) => (
          <div key={title} style={{
            background: 'white', border: '1px solid #E2E8F0', borderRadius: 16,
            padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11, marginBottom: 12,
              background: '#FDF2F8', border: '1px solid #FBCFE8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon style={{ width: 18, height: 18, color: '#DB2777' }} />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 5px' }}>{title}</h3>
            <p style={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.5, margin: 0 }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
