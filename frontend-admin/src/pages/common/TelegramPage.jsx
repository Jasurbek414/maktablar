import { useState } from 'react'
import { MessageCircle, Bot, Users, BarChart3, CheckCircle, ExternalLink, Copy, Bell, ChevronRight, Terminal } from 'lucide-react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'

const cardStyle = {
  background: 'white', border: '1px solid #E2E8F0',
  borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
}

function BotCard({ icon: Icon, gradient, title, description, username, features }) {
  const [copied, setCopied] = useState(false)

  const copyUsername = () => {
    if (!username || username.includes('...')) {
      toast.error('.env faylda bot tokenini sozlang')
      return
    }
    navigator.clipboard.writeText(`https://t.me/${username}`)
    setCopied(true)
    toast.success('Link nusxalandi')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ ...cardStyle, overflow: 'hidden' }}>
      {/* Gradient header */}
      <div style={{ height: 6, background: gradient }} />
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 13, flexShrink: 0,
            background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            <Icon style={{ width: 22, height: 22, color: 'white' }} />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 3 }}>{title}</h3>
            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.4 }}>{description}</p>
          </div>
        </div>

        {username && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
            padding: '10px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10,
          }}>
            <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#4F46E5', flex: 1, fontWeight: 600 }}>
              @{username}
            </span>
            <button onClick={copyUsername} title="Nusxalash" style={{
              padding: '5px', borderRadius: 7, border: '1px solid #E2E8F0', background: copied ? '#EEF2FF' : 'white',
              cursor: 'pointer', color: copied ? '#4F46E5' : '#94A3B8', display: 'flex',
            }}>
              <Copy style={{ width: 14, height: 14 }} />
            </button>
            {!username.includes('...') && (
              <a href={`https://t.me/${username}`} target="_blank" rel="noopener noreferrer" title="Telegramda ochish"
                style={{ padding: '5px', borderRadius: 7, border: '1px solid #E2E8F0', background: 'white', color: '#94A3B8', display: 'flex' }}>
                <ExternalLink style={{ width: 14, height: 14 }} />
              </a>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {features.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
              <CheckCircle style={{ width: 15, height: 15, color: '#10B981', marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.4 }}>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StepItem({ number, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 800, color: 'white',
      }}>
        {number}
      </div>
      <p style={{ fontSize: 13, color: '#475569', paddingTop: 5, lineHeight: 1.5 }}>{text}</p>
    </div>
  )
}

export default function TelegramPage() {
  const parentBotUsername = import.meta.env.VITE_PARENT_BOT_USERNAME || 'davomad_parent_bot'
  const managementBotUsername = import.meta.env.VITE_MANAGEMENT_BOT_USERNAME || 'davomad_management_bot'

  const parentSteps = [
    `Telegram da @${parentBotUsername} ni oching`,
    "/start buyrug'ini yuboring",
    'Telefon raqamingizni ulashing (📱 tugma)',
    "Bot sizni avtomatik o'quvchingiz bilan bog'laydi",
    'Bugundan davomad xabarlari keladi',
  ]

  const commands = [
    { cmd: '/start', desc: 'Botni ishga tushirish' },
    { cmd: '/bugungi_hisobot', desc: 'Bugungi davomat hisoboti' },
    { cmd: '/qurilmalar', desc: 'Qurilmalar holati' },
    { cmd: '/haftalik_trend', desc: 'Haftalik davomat grafigi' },
    { cmd: '/statistika', desc: 'Umumiy statistika' },
    { cmd: '/yordam', desc: "Barcha buyruqlar ro'yxati" },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Telegram Bot</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
          Ota-onalar va boshqaruv uchun Telegram bot integratsiyasi
        </p>
      </div>

      {/* Bot cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <BotCard
          icon={Users}
          gradient="linear-gradient(135deg, #3B82F6, #2563EB)"
          title="Ota-ona boti"
          description="Ota-onalar farzandlarining davomatidan xabardor bo'ladi"
          username={parentBotUsername}
          features={[
            'Farzand maktabga kelganda xabar olish',
            'Kech kelganda yoki kelmasa bildirishnoma',
            "Bugungi davomat holatini ko'rish",
            "Bir nechta farzandni kuzatish",
            "Oylik davomat statistikasini olish",
          ]}
        />
        <BotCard
          icon={BarChart3}
          gradient="linear-gradient(135deg, #10B981, #059669)"
          title="Boshqaruv boti"
          description="Direktor va operatorlar uchun hisobot boti"
          username={managementBotUsername}
          features={[
            'Bugungi davomat hisobotini olish',
            "Barcha qurilmalar holatini ko'rish",
            'Haftalik tendensiya grafiklar',
            'Xavfli holat ogohlantirishlari',
            'Maktab kesimida statistika',
          ]}
        />
      </div>

      {/* Parent guide */}
      <div style={cardStyle}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle style={{ width: 17, height: 17, color: '#2563EB' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>Ota-ona botini ulash qo'llanmasi</h2>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>{parentSteps.length} ta qadam</p>
          </div>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {parentSteps.map((text, i) => <StepItem key={i} number={i + 1} text={text} />)}
        </div>
        <div style={{ margin: '0 24px 20px', padding: '14px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Bell style={{ width: 16, height: 16, color: '#D97706', marginTop: 1, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 3 }}>Muhim eslatma</p>
              <p style={{ fontSize: 12.5, color: '#B45309', lineHeight: 1.5 }}>
                Ota-ona Telegramda ro'yxatdan o'tgan telefon raqami tizimda kiritilgan raqam bilan mos kelishi kerak.
                Aks holda bot ota-onani topa olmaydi.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Management bot commands */}
      <div style={cardStyle}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot style={{ width: 17, height: 17, color: '#059669' }} />
          </div>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>Boshqaruv botidagi buyruqlar</h2>
        </div>
        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {commands.map(({ cmd, desc }) => (
            <div key={cmd} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', background: '#F8FAFC', border: '1px solid #F1F5F9',
              borderRadius: 10, transition: 'background 0.12s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
              onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}
            >
              <code style={{
                fontSize: 12, fontFamily: 'monospace', fontWeight: 700,
                color: '#4F46E5', background: '#EEF2FF', border: '1px solid #C7D2FE',
                padding: '2px 7px', borderRadius: 5, whiteSpace: 'nowrap',
              }}>
                {cmd}
              </code>
              <span style={{ fontSize: 12.5, color: '#475569' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Admin setup guide */}
      <div style={cardStyle}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F5F3FF', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Terminal style={{ width: 17, height: 17, color: '#7C3AED' }} />
          </div>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>Admin uchun sozlash</h2>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            {
              title: '1. BotFather orqali bot yarating',
              content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    <><a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" style={{ color: '#4F46E5', fontWeight: 600 }}>@BotFather</a> ga kiring va <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: 4 }}>/newbot</code> buyrug'ini yuboring</>,
                    "Bot nomini va username kiriting (masalan: davomad_parent_bot)",
                    <span>Olingan tokenni <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: 4 }}>.env</code> ga saqlang</span>,
                  ].map((text, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <ChevronRight style={{ width: 14, height: 14, color: '#94A3B8', marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{text}</span>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              title: '2. .env fayliga qo\'shing',
              content: (
                <pre style={{
                  background: '#0F172A', color: '#4ADE80',
                  padding: '14px 16px', borderRadius: 10, fontSize: 12.5,
                  fontFamily: 'monospace', overflowX: 'auto', margin: 0, lineHeight: 1.6,
                }}>
{`PARENT_BOT_TOKEN=1234567890:AAF...
MANAGEMENT_BOT_TOKEN=9876543210:BBG...
BOT_SECRET=your-shared-secret-key`}
                </pre>
              ),
            },
            {
              title: '3. Botlarni ishga tushiring',
              content: (
                <pre style={{
                  background: '#0F172A', color: '#4ADE80',
                  padding: '14px 16px', borderRadius: 10, fontSize: 12.5,
                  fontFamily: 'monospace', overflowX: 'auto', margin: 0, lineHeight: 1.6,
                }}>
{`# Docker orqali (tavsiya etiladi)
docker-compose up -d parent-bot management-bot

# Yoki to'g'ridan-to'g'ri
cd bot && python parent_bot.py
cd bot && python management_bot.py`}
                </pre>
              ),
            },
          ].map(({ title, content }) => (
            <div key={title} style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 12, padding: '16px 18px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>{title}</p>
              {content}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
