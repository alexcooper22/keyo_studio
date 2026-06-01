'use client'
import { useState, useEffect } from 'react'

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
    showNotice('Plan updated — cache cleared')
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
            style={{ ...inputStyle, height: '100px', resize: 'vertical', fontFamily: 'monospace' } as React.CSSProperties}
            value={form.breakdown}
            onChange={e => setForm((f: any) => ({ ...f, breakdown: e.target.value }))}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button style={btnSecondary} onClick={onCancel}>Cancel</button>
          <button style={btnPrimary} onClick={handleSave}>Save</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '32px', paddingTop: '24px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
      <h3 style={{ color: 'white', fontSize: '15px', fontWeight: 700, margin: 0 }}>Subscription Plans</h3>

      {notice && (
        <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(83,47,207,0.12)', border: '0.5px solid rgba(120,80,255,0.3)', color: 'rgba(170,140,255,0.9)', fontSize: '12px' }}>
          ✓ {notice}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Loading...</div>
      ) : (
        <div style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 90px 80px 80px', padding: '8px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
            {['ID', 'Name / Desc', 'Price', 'Credits', 'Featured', 'Actions'].map(h => (
              <span key={h} style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
            ))}
          </div>
          {plans.map(plan => (
            <div key={plan.id}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 90px 80px 80px', padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontFamily: 'monospace' }}>{plan.id}</span>
                <div>
                  <p style={{ color: 'white', fontSize: '13px', fontWeight: 500, margin: 0 }}>{plan.name}</p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', margin: '2px 0 0' }}>{plan.description}</p>
                </div>
                <span style={{ color: 'white', fontSize: '13px' }}>${plan.price_usd}</span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{plan.credits.toLocaleString()}</span>
                <span style={{ fontSize: '12px' }}>{plan.featured ? '⭐' : '—'}</span>
                <button style={btnSecondary} onClick={() => setEditPlan(editPlan?.id === plan.id ? null : plan)}>
                  {editPlan?.id === plan.id ? 'Close' : 'Edit'}
                </button>
              </div>
              {editPlan?.id === plan.id && (
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                  <PlanForm plan={plan} onSave={savePlan} onCancel={() => setEditPlan(null)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
