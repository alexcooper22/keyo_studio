'use client'
import { useState, useEffect } from 'react'

type PricingRow = {
  id: string
  quality: string
  credits: number
  unit: 'per_image' | 'per_second'
  cost_usd: number
}

type AdminModel = {
  id: string
  name: string
  provider: string
  model_id: string
  category: 'image' | 'video'
  enabled: boolean
  sort_order: number
  api_key_env: string
  api_secret_env: string | null
  model_pricing: PricingRow[]
}

const PROVIDERS = ['google', 'openai', 'kling', 'alibaba']
const UNITS = ['per_image', 'per_second'] as const

export default function ModelManager() {
  const [models, setModels] = useState<AdminModel[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [pricingModel, setPricingModel] = useState<AdminModel | null>(null)
  const [showAddModel, setShowAddModel] = useState(false)
  const [editModel, setEditModel] = useState<AdminModel | null>(null)
  const [addPricingForm, setAddPricingForm] = useState({ quality: '', credits: '', unit: 'per_image', cost_usd: '' })
  const [addModelForm, setAddModelForm] = useState({ name: '', provider: 'google', model_id: '', category: 'image', api_key_env: '', api_secret_env: '' })

  const showNotice = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 3000) }

  const fetchModels = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/models')
    const data = await res.json()
    setModels(data.models ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchModels() }, [])

  const toggleEnabled = async (model: AdminModel) => {
    await fetch(`/api/admin/models/${model.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !model.enabled }),
    })
    setModels(prev => prev.map(m => m.id === model.id ? { ...m, enabled: !m.enabled } : m))
    showNotice('Cache cleared — changes live within seconds')
  }

  const deleteModel = async (id: string) => {
    if (!confirm('Delete this model and all its pricing?')) return
    await fetch(`/api/admin/models/${id}`, { method: 'DELETE' })
    setModels(prev => prev.filter(m => m.id !== id))
    showNotice('Model deleted')
  }

  const saveModel = async (form: typeof addModelForm, id?: string) => {
    const method = id ? 'PATCH' : 'POST'
    const url = id ? `/api/admin/models/${id}` : '/api/admin/models'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, api_secret_env: form.api_secret_env || null }),
    })
    if (!res.ok) { const d = await res.json(); alert(d.error); return }
    await fetchModels()
    setShowAddModel(false)
    setEditModel(null)
    if (!id) setAddModelForm({ name: '', provider: 'google', model_id: '', category: 'image', api_key_env: '', api_secret_env: '' })
    showNotice(id ? 'Model updated' : 'Model added (disabled by default)')
  }

  const addPricing = async () => {
    if (!pricingModel) return
    const res = await fetch(`/api/admin/models/${pricingModel.id}/pricing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quality: addPricingForm.quality,
        credits: Number(addPricingForm.credits),
        unit: addPricingForm.unit,
        cost_usd: Number(addPricingForm.cost_usd),
      }),
    })
    if (!res.ok) { const d = await res.json(); alert(d.error); return }
    const updated = await fetch('/api/admin/models')
    const data = await updated.json()
    const refreshed = data.models?.find((m: AdminModel) => m.id === pricingModel.id)
    if (refreshed) { setPricingModel(refreshed); setModels(data.models) }
    setAddPricingForm({ quality: '', credits: '', unit: 'per_image', cost_usd: '' })
    showNotice('Pricing row added')
  }

  const deletePricing = async (pricingId: string) => {
    if (!confirm('Delete this pricing row?')) return
    await fetch(`/api/admin/pricing/${pricingId}`, { method: 'DELETE' })
    if (pricingModel) {
      setPricingModel({ ...pricingModel, model_pricing: pricingModel.model_pricing.filter(p => p.id !== pricingId) })
      setModels(prev => prev.map(m => m.id === pricingModel.id ? { ...m, model_pricing: m.model_pricing.filter(p => p.id !== pricingId) } : m))
    }
    showNotice('Pricing row deleted')
  }

  const inputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 10px', color: 'white', fontSize: '12px', outline: 'none', width: '100%' }
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }
  const btnPrimary: React.CSSProperties = { background: 'linear-gradient(135deg, #9b7eff 0%, #6b4ef5 100%)', border: 'none', borderRadius: '8px', padding: '6px 14px', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }
  const btnDanger: React.CSSProperties = { background: 'rgba(255,60,60,0.1)', border: '0.5px solid rgba(255,60,60,0.3)', borderRadius: '8px', padding: '5px 10px', color: 'rgba(255,100,100,0.9)', fontSize: '11px', cursor: 'pointer' }
  const btnSecondary: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '5px 10px', color: 'rgba(255,255,255,0.6)', fontSize: '11px', cursor: 'pointer' }

  type ModelFormShape = { name: string; provider: string; model_id: string; category: string; api_key_env: string; api_secret_env: string }

  const ModelForm = ({ initial, onSave, onCancel }: { initial: ModelFormShape; onSave: (f: ModelFormShape) => void; onCancel: () => void }) => {
    const [form, setForm] = useState(initial)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[
          { label: 'Display Name', key: 'name', placeholder: 'e.g. GPT-image-2' },
          { label: 'Model ID (API string)', key: 'model_id', placeholder: 'e.g. gpt-image-2' },
          { label: 'API Key Env Var', key: 'api_key_env', placeholder: 'e.g. OPENAI_API_KEY' },
          { label: 'API Secret Env Var (optional)', key: 'api_secret_env', placeholder: 'e.g. KLING_ACCESS_KEY_SECRET' },
        ].map(({ label, key, placeholder }) => (
          <div key={key}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
            <input style={inputStyle} placeholder={placeholder} value={(form as Record<string, string>)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Provider</p>
            <select style={selectStyle} value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}>
              {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</p>
            <select style={selectStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="image">image</option>
              <option value="video">video</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <button style={btnSecondary} onClick={onCancel}>Cancel</button>
          <button style={btnPrimary} onClick={() => onSave(form)}>Save</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {notice && (
        <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(83,47,207,0.12)', border: '0.5px solid rgba(120,80,255,0.3)', color: 'rgba(170,140,255,0.9)', fontSize: '12px' }}>
          ✓ {notice}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: 'white', fontSize: '15px', fontWeight: 700, margin: 0 }}>AI Models</h3>
        <button style={btnPrimary} onClick={() => setShowAddModel(true)}>+ Add Model</button>
      </div>

      {showAddModel && (
        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>New Model</p>
          <ModelForm initial={addModelForm} onSave={(f) => saveModel(f)} onCancel={() => setShowAddModel(false)} />
        </div>
      )}

      {editModel && (
        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Edit: {editModel.name}</p>
          <ModelForm
            initial={{ name: editModel.name, provider: editModel.provider, model_id: editModel.model_id, category: editModel.category, api_key_env: editModel.api_key_env, api_secret_env: editModel.api_secret_env ?? '' }}
            onSave={(f) => saveModel(f, editModel.id)}
            onCancel={() => setEditModel(null)}
          />
        </div>
      )}

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>Loading...</div>
      ) : (
        <div style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 120px 160px', padding: '8px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
            {['Name / Provider', 'Category', 'Status', 'Pricing', 'Actions'].map(h => (
              <span key={h} style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
            ))}
          </div>
          {models.map(model => (
            <div key={model.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 120px 160px', padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
              <div>
                <p style={{ color: 'white', fontSize: '13px', fontWeight: 500, margin: 0 }}>{model.name}</p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', margin: '2px 0 0' }}>{model.provider} · {model.model_id}</p>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{model.category}</span>
              <button
                onClick={() => toggleEnabled(model)}
                style={{ width: '36px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: model.enabled ? 'rgba(83,47,207,0.8)' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
              >
                <span style={{ position: 'absolute', top: '2px', left: model.enabled ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
              </button>
              <button style={btnSecondary} onClick={() => setPricingModel(model)}>
                {model.model_pricing?.length ?? 0} rows →
              </button>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={btnSecondary} onClick={() => setEditModel(model)}>Edit</button>
                <button style={btnDanger} onClick={() => deleteModel(model.id)}>Delete</button>
              </div>
            </div>
          ))}
          {models.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>No models yet</div>
          )}
        </div>
      )}

      {pricingModel && (
        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(83,47,207,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ color: 'rgba(170,140,255,0.9)', fontSize: '12px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Pricing — {pricingModel.name}
            </p>
            <button style={btnSecondary} onClick={() => setPricingModel(null)}>Close</button>
          </div>
          {pricingModel.model_pricing?.length > 0 ? (
            <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {pricingModel.model_pricing.map(p => (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '80px 70px 100px 90px 60px', gap: '8px', alignItems: 'center', padding: '6px 8px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 500 }}>{p.quality}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{p.credits} cr</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{p.unit}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>${p.cost_usd}</span>
                  <button style={btnDanger} onClick={() => deletePricing(p.id)}>✕</button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', marginBottom: '12px' }}>No pricing rows yet.</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '80px 70px 110px 90px auto', gap: '8px', alignItems: 'flex-end' }}>
            {[
              { label: 'Quality', key: 'quality', placeholder: '1K' },
              { label: 'Credits', key: 'credits', placeholder: '2' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginBottom: '4px' }}>{label}</p>
                <input style={{ ...inputStyle, padding: '5px 8px' }} placeholder={placeholder} value={(addPricingForm as Record<string, string>)[key]} onChange={e => setAddPricingForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginBottom: '4px' }}>Unit</p>
              <select style={{ ...selectStyle, padding: '5px 8px' }} value={addPricingForm.unit} onChange={e => setAddPricingForm(f => ({ ...f, unit: e.target.value }))}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginBottom: '4px' }}>Cost USD</p>
              <input style={{ ...inputStyle, padding: '5px 8px' }} placeholder="0.067" value={addPricingForm.cost_usd} onChange={e => setAddPricingForm(f => ({ ...f, cost_usd: e.target.value }))} />
            </div>
            <button style={btnPrimary} onClick={addPricing}>Add</button>
          </div>
        </div>
      )}
    </div>
  )
}
