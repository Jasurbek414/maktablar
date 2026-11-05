import { Camera, Video, ScanLine, Settings, Construction } from 'lucide-react'

const featureCards = [
  { icon: Video, title: 'Jonli efir', desc: 'Maktab kameralarini jonli kuzatish va tasvirni qayta ishlash' },
  { icon: ScanLine, title: 'Yuzni aniqlash', desc: 'Face ID qurilmalari orqali o\'quvchilarni avtomatik tanib olish' },
  { icon: Settings, title: 'Kamera sozlamalari', desc: 'Har bir kamerani qo\'shish, sozlash va holatini boshqarish' },
]

export default function CamerasPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Kameralar</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
          Maktab xavfsizlik kameralarini boshqarish
        </p>
      </div>

      <div style={{
        background: 'white', border: '1px solid #E2E8F0', borderRadius: 16,
        padding: '40px 24px', textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18, margin: '0 auto 18px',
          background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 20px rgba(79,70,229,0.3)',
        }}>
          <Construction style={{ width: 30, height: 30, color: 'white' }} />
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>Kameralar moduli ishlab chiqilmoqda</h2>
        <p style={{ fontSize: 13.5, color: '#64748B', maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
          Bu bo'limda maktab kameralarini qo'shish, jonli kuzatish va yuzni aniqlash imkoniyatlari qo'shiladi.
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
              background: '#F5F3FF', border: '1px solid #DDD6FE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon style={{ width: 18, height: 18, color: '#7C3AED' }} />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 5px' }}>{title}</h3>
            <p style={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.5, margin: 0 }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
