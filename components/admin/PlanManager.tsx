'use client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

type BreakdownItem = { icon: string; main: string; sub: string }

type Plan = {
  id: string
  name: string
  description: string
  price_usd: number
  credits: number
  featured: boolean
  cta_text: string
  cta_style: string
  sort_order: number
  breakdown: BreakdownItem[]
}

export default function PlanManager() {
  const t = useTranslations('settings.admin.plans')
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [editPlan, setEditPlan] = useState<Plan | null>(null)

  const showNotice = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 3000) }

  const fetchPlans = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/plans')
    const data = await res.json()
    setPlans(data.plans ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchPlans() }, [])

  const savePlan = async (form: Plan) => {
    const res = await fetch(`/api/admin/plans/${form.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) { const d = await res.json(); alert(d.error); return }
    await fetchPlans()
    setEditPlan(null)
    showNotice(t('planUpdated'))
  }

  const inputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 10px', color: 'white', fontSize: '12px', outline: 'none', width: '100%' }
  const btnPrimary: React.CSSProperties = { background: 'linear-gradient(135deg, #9b7eff 0%, #6b4ef5 100%)', border: 'none', borderRadius: '8px', padding: '6px 14px', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }
  const btnSecondary: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '5px 10px', color: 'rgba(255,255,255,0.6)', fontSize: '11px', cursor: 'pointer' }

  const PlanForm = ({ plan, onSave, onCancel }: { plan: Plan; onSave: (f: Plan) => void; onCancel: () => void }) => {
    const [form, setForm] = useState({ ...plan, breakdown: JSON.stringify(plan.breakdown, null, 2) } as any)
    const handleSave = () => {
      try {
        const parsed = JSON.parse(form.breakdown)
        onSave({ ...form, breakdown: parsed, price_usd: Number(form.price_usd), credits: Number(form.credits) })
      } catch { alert('Breakdown JSON is invalid') }
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          {[
            { label: 'Name', key: 'name' },
            { label: 'Price (USD)', key: 'price_usd' },
            { label: 'Credits', key: 'credits' },
          ].map(({ label, key }) => (
            <div key={key}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
              <input style={inputStyle} value={form[key]} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</p>
          <input style={inputStyle} value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          {[
            { label: 'CTA Text', key: 'cta_text' },
            { label: 'CTA Style (outline/primary)', key: 'cta_style' },
            { label: 'Sort Order', key: 'sort_order' },
          ].map(({ label, key }) => (
            <div key={key}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
              <input style={inputStyle} value={form[key]} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '12px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.featured} onChange={e => setForm((f: any) => ({ ...f, featured: e.target.checked }))} />
            Featured (Most popular badge)
          </label>
        </div>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Breakdown (JSON array)
          </p>
          <textarea
            style={{ ...inputStyle, height: '220px', resize: 'vertical', fontFamily: 'monospace' } as React.CSSProperties}
            value={form.breakdown}
            onChange={e => setForm((f: any) => ({ ...f, breakdown: e.target.value }))}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button style={btnSecondary} onClick={onCancel}>{t('cancel')}</button>
          <button style={btnPrimary} onClick={handleSave}>{t('save')}</button>
        </div>
      </div>
    )
  }

  const backdrop: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }
  const btnClose: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '32px', paddingTop: '24px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
      <h3 style={{ color: 'white', fontSize: '15px', fontWeight: 700, margin: 0 }}>{t('title')}</h3>

      {/* Edit modal */}
      {editPlan && (
        <div style={backdrop} onClick={() => setEditPlan(null)}>
          <div
            style={{ background: '#0c0c12', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '32px', width: '720px', maxWidth: '94vw', maxHeight: '96vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <p style={{ color: 'rgba(170,140,255,0.9)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>
                {t('edit')} — {editPlan.name}
              </p>
              <button style={btnClose} onClick={() => setEditPlan(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <PlanForm plan={editPlan} onSave={savePlan} onCancel={() => setEditPlan(null)} />
          </div>
        </div>
      )}

      {notice && (
        <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(83,47,207,0.12)', border: '0.5px solid rgba(120,80,255,0.3)', color: 'rgba(170,140,255,0.9)', fontSize: '12px' }}>
          ✓ {notice}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>{t('loading')}</div>
      ) : (
        <div style={{ borderRadius: '14px', border: '0.5px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 90px 100px 90px 44px', padding: '10px 18px', background: 'rgba(255,255,255,0.02)', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
            {['ID', 'Plan', 'Price', 'Credits', 'Featured', ''].map(h => (
              <span key={h} style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', paddingLeft: h === 'Plan' ? '12px' : 0 }}>{h}</span>
            ))}
          </div>
          {plans.map((plan, i) => (
            <div
              key={plan.id}
              style={{ display: 'grid', gridTemplateColumns: '70px 1fr 90px 100px 90px 44px', padding: '14px 18px', borderBottom: i < plans.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center', background: 'transparent', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.018)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ color: 'rgba(160,130,255,0.7)', fontSize: '10px', fontFamily: 'monospace', background: 'rgba(83,47,207,0.1)', borderRadius: '5px', padding: '3px 7px', display: 'inline-block', letterSpacing: '0.3px' }}>{plan.id}</span>
              <div style={{ paddingLeft: '12px' }}>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: 600, margin: 0, letterSpacing: '-0.1px' }}>{plan.name}</p>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', margin: '3px 0 0' }}>{plan.description}</p>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', fontWeight: 600, letterSpacing: '-0.3px' }}>${plan.price_usd}<span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', fontWeight: 400 }}>/mo</span></span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: 'rgba(160,120,255,0.9)', fontSize: '13px', fontWeight: 600 }}>{plan.credits.toLocaleString()}</span>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>cr</span>
              </div>
              <div>
                {plan.featured ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(83,47,207,0.15)', border: '0.5px solid rgba(120,80,255,0.25)', borderRadius: '20px', padding: '3px 8px', fontSize: '10px', color: 'rgba(160,120,255,0.9)', fontWeight: 600 }}>
                    <span style={{ fontSize: '8px' }}>✦</span> Popular
                  </span>
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '12px' }}>—</span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  style={{ background: 'none', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                  onClick={() => setEditPlan(plan)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
