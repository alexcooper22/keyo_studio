'use client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { invalidateModelsCache } from '@/lib/modelCache'

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

const inputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 10px', color: 'white', fontSize: '12px', outline: 'none', width: '100%' }
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }
const btnPrimary: React.CSSProperties = { background: 'linear-gradient(135deg, #9b7eff 0%, #6b4ef5 100%)', border: 'none', borderRadius: '8px', padding: '6px 14px', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }
const btnSecondary: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '5px 10px', color: 'rgba(255,255,255,0.6)', fontSize: '11px', cursor: 'pointer' }

type ModelFormShape = { name: string; provider: string; model_id: string; category: string; api_key_env: string; api_secret_env: string }

function ModelForm({ initial, onSave, onCancel, cancelLabel, saveLabel }: { initial: ModelFormShape; onSave: (f: ModelFormShape) => void; onCancel: () => void; cancelLabel: string; saveLabel: string }) {
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
        <button style={btnSecondary} onClick={onCancel}>{cancelLabel}</button>
        <button style={btnPrimary} onClick={() => onSave(form)}>{saveLabel}</button>
      </div>
    </div>
  )
}

export default function ModelManager() {
  const t = useTranslations('settings.admin.models')
  const [models, setModels] = useState<AdminModel[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [pricingModel, setPricingModel] = useState<AdminModel | null>(null)
  const [showAddModel, setShowAddModel] = useState(false)
  const [editModel, setEditModel] = useState<AdminModel | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [addPricingForm, setAddPricingForm] = useState({ quality: '', credits: '', unit: 'per_image', cost_usd: '' })
  const [addModelForm, setAddModelForm] = useState({ name: '', provider: 'google', model_id: '', category: 'image', api_key_env: '', api_secret_env: '' })
  const [editPricingId, setEditPricingId] = useState<string | null>(null)
  const [editPricingForm, setEditPricingForm] = useState({ quality: '', credits: '', unit: 'per_image', cost_usd: '' })

  const showNotice = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 3000) }

  const closeMenu = () => { setOpenMenuId(null); setMenuPos(null) }


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
    invalidateModelsCache(model.category)
    showNotice(t('cacheCleared'))
  }

  const deleteModel = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    await fetch(`/api/admin/models/${id}`, { method: 'DELETE' })
    const deleted = models.find(m => m.id === id)
    setModels(prev => prev.filter(m => m.id !== id))
    if (deleted) invalidateModelsCache(deleted.category)
    showNotice(t('modelDeleted'))
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
    invalidateModelsCache(form.category)
    await fetchModels()
    setShowAddModel(false)
    setEditModel(null)
    if (!id) setAddModelForm({ name: '', provider: 'google', model_id: '', category: 'image', api_key_env: '', api_secret_env: '' })
    showNotice(id ? t('modelUpdated') : t('modelAdded'))
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
    showNotice(t('pricingAdded'))
  }

  const savePricing = async () => {
    if (!editPricingId || !pricingModel) return
    const res = await fetch(`/api/admin/pricing/${editPricingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editPricingForm, credits: Number(editPricingForm.credits), cost_usd: Number(editPricingForm.cost_usd) }),
    })
    if (!res.ok) { const d = await res.json(); alert(d.error); return }
    const updated = await fetch('/api/admin/models')
    const data = await updated.json()
    const refreshed = data.models?.find((m: AdminModel) => m.id === pricingModel.id)
    if (refreshed) { setPricingModel(refreshed); setModels(data.models) }
    setEditPricingId(null)
    showNotice(t('pricingUpdated'))
  }

  const deletePricing = async (pricingId: string) => {
    if (!confirm(t('deletePricingConfirm'))) return
    await fetch(`/api/admin/pricing/${pricingId}`, { method: 'DELETE' })
    if (pricingModel) {
      setPricingModel({ ...pricingModel, model_pricing: pricingModel.model_pricing.filter(p => p.id !== pricingId) })
      setModels(prev => prev.map(m => m.id === pricingModel.id ? { ...m, model_pricing: m.model_pricing.filter(p => p.id !== pricingId) } : m))
    }
    showNotice(t('pricingDeleted'))
  }

  const btnDanger: React.CSSProperties = { background: 'rgba(255,60,60,0.1)', border: '0.5px solid rgba(255,60,60,0.3)', borderRadius: '8px', padding: '5px 10px', color: 'rgba(255,100,100,0.9)', fontSize: '11px', cursor: 'pointer' }

  const backdrop: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }
  const modalCard = (width: string): React.CSSProperties => ({ background: '#0c0c12', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', width, maxWidth: '92vw', maxHeight: '85vh', overflowY: 'auto' })
  const modalHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }
  const modalTitle: React.CSSProperties = { color: 'rgba(170,140,255,0.9)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }
  const btnClose: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }
  const closeIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Context menu */}
      {openMenuId && menuPos && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={closeMenu} />
          <div style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, background: 'rgba(18,18,26,0.98)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '4px', zIndex: 9999, minWidth: '130px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
            <button
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '8px 10px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '12px', cursor: 'pointer', borderRadius: '7px' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              onClick={() => { setEditModel(models.find(m => m.id === openMenuId) ?? null); closeMenu() }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              {t('edit')}
            </button>
            <button
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '8px 10px', background: 'none', border: 'none', color: 'rgba(255,100,100,0.85)', fontSize: '12px', cursor: 'pointer', borderRadius: '7px' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,60,60,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              onClick={() => { deleteModel(openMenuId); closeMenu() }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              {t('delete')}
            </button>
          </div>
        </>
      )}

      {/* Add model modal */}
      {showAddModel && (
        <div style={backdrop} onClick={() => setShowAddModel(false)}>
          <div style={modalCard('480px')} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <p style={modalTitle}>{t('newModel')}</p>
              <button style={btnClose} onClick={() => setShowAddModel(false)}>{closeIcon}</button>
            </div>
            <ModelForm initial={addModelForm} onSave={(f) => saveModel(f)} onCancel={() => setShowAddModel(false)} cancelLabel={t('cancel')} saveLabel={t('save')} />
          </div>
        </div>
      )}

      {/* Edit model modal */}
      {editModel && (
        <div style={backdrop} onClick={() => setEditModel(null)}>
          <div style={modalCard('480px')} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <p style={modalTitle}>{t('edit')} — {editModel.name}</p>
              <button style={btnClose} onClick={() => setEditModel(null)}>{closeIcon}</button>
            </div>
            <ModelForm
              initial={{ name: editModel.name, provider: editModel.provider, model_id: editModel.model_id, category: editModel.category, api_key_env: editModel.api_key_env, api_secret_env: editModel.api_secret_env ?? '' }}
              onSave={(f) => saveModel(f, editModel.id)}
              onCancel={() => setEditModel(null)}
              cancelLabel={t('cancel')} saveLabel={t('save')}
            />
          </div>
        </div>
      )}

      {/* Pricing modal */}
      {pricingModel && (
        <div style={backdrop} onClick={() => setPricingModel(null)}>
          <div style={{ ...modalCard('560px'), padding: '28px' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px' }}>Pricing</p>
                <p style={{ color: 'white', fontSize: '16px', fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>{pricingModel.name}</p>
              </div>
              <button style={btnClose} onClick={() => setPricingModel(null)}>{closeIcon}</button>
            </div>

            {/* Rows table */}
            {pricingModel.model_pricing?.length > 0 ? (
              <div style={{ marginBottom: '20px' }}>
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.6fr 1fr 64px', gap: '8px', padding: '0 14px 8px', marginBottom: '6px' }}>
                  {['Quality', 'Credits', 'Unit', 'Cost USD', ''].map(h => (
                    <span key={h} style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{h}</span>
                  ))}
                </div>

                {/* Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {pricingModel.model_pricing.map(p => (
                    <div key={p.id} style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr 1.6fr 1fr 64px', gap: '8px',
                      alignItems: 'center', padding: '12px 14px', borderRadius: '10px',
                      background: editPricingId === p.id ? 'rgba(83,47,207,0.1)' : 'rgba(255,255,255,0.03)',
                      border: editPricingId === p.id ? '0.5px solid rgba(120,80,255,0.35)' : '0.5px solid rgba(255,255,255,0.05)',
                      transition: 'background 0.15s',
                    }}>
                      {editPricingId === p.id ? (
                        <>
                          <input style={{ ...inputStyle, padding: '5px 8px', fontSize: '12px' }} value={editPricingForm.quality} onChange={e => setEditPricingForm(f => ({ ...f, quality: e.target.value }))} />
                          <input style={{ ...inputStyle, padding: '5px 8px', fontSize: '12px' }} value={editPricingForm.credits} onChange={e => setEditPricingForm(f => ({ ...f, credits: e.target.value }))} />
                          <select style={{ ...selectStyle, padding: '5px 8px', fontSize: '12px' }} value={editPricingForm.unit} onChange={e => setEditPricingForm(f => ({ ...f, unit: e.target.value }))}>
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <input style={{ ...inputStyle, padding: '5px 8px', fontSize: '12px' }} value={editPricingForm.cost_usd} onChange={e => setEditPricingForm(f => ({ ...f, cost_usd: e.target.value }))} />
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button style={{ ...btnPrimary, padding: '5px 10px', fontSize: '12px' }} onClick={savePricing}>✓</button>
                            <button style={{ ...btnSecondary, padding: '5px 8px' }} onClick={() => setEditPricingId(null)}>✕</button>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Quality badge */}
                          <span style={{ display: 'inline-block', background: 'rgba(83,47,207,0.15)', border: '0.5px solid rgba(120,80,255,0.25)', borderRadius: '6px', padding: '3px 10px', color: 'rgba(195,170,255,0.95)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.2px' }}>{p.quality}</span>
                          {/* Credits */}
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(160,120,255,0.9)' }}>
                            {p.credits}<span style={{ fontSize: '10px', fontWeight: 400, color: 'rgba(255,255,255,0.3)', marginLeft: '3px' }}>cr</span>
                          </span>
                          {/* Unit */}
                          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)', borderRadius: '5px', padding: '2px 7px', display: 'inline-block' }}>{p.unit}</span>
                          {/* Cost */}
                          <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>$</span>{p.cost_usd}
                          </span>
                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            <button
                              style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '7px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(83,47,207,0.15)'; e.currentTarget.style.borderColor = 'rgba(120,80,255,0.3)'; e.currentTarget.style.color = 'rgba(170,140,255,0.9)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                              onClick={() => { setEditPricingId(p.id); setEditPricingForm({ quality: p.quality, credits: String(p.credits), unit: p.unit, cost_usd: String(p.cost_usd) }) }}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button
                              style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '7px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,50,50,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,60,60,0.3)'; e.currentTarget.style.color = 'rgba(255,110,110,0.9)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                              onClick={() => deletePricing(p.id)}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '28px 0', color: 'rgba(255,255,255,0.2)', fontSize: '12px', marginBottom: '20px' }}>{t('noPricing')}</div>
            )}

            {/* Add row form */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 12px' }}>{t('addPricingRow')}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.6fr 1fr 72px', gap: '8px', alignItems: 'flex-end' }}>
                {[
                  { label: 'Quality', key: 'quality', placeholder: '1K' },
                  { label: 'Credits', key: 'credits', placeholder: '2' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginBottom: '5px', letterSpacing: '0.3px' }}>{label}</p>
                    <input style={{ ...inputStyle, padding: '7px 10px' }} placeholder={placeholder} value={(addPricingForm as Record<string, string>)[key]} onChange={e => setAddPricingForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginBottom: '5px', letterSpacing: '0.3px' }}>Unit</p>
                  <select style={{ ...selectStyle, padding: '7px 10px' }} value={addPricingForm.unit} onChange={e => setAddPricingForm(f => ({ ...f, unit: e.target.value }))}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginBottom: '5px', letterSpacing: '0.3px' }}>Cost USD</p>
                  <input style={{ ...inputStyle, padding: '7px 10px' }} placeholder="0.067" value={addPricingForm.cost_usd} onChange={e => setAddPricingForm(f => ({ ...f, cost_usd: e.target.value }))} />
                </div>
                <button
                  style={{ ...btnPrimary, padding: '8px 0', width: '100%', borderRadius: '8px', fontSize: '13px' }}
                  onClick={addPricing}
                >+</button>
              </div>
            </div>

          </div>
        </div>
      )}

      {notice && (
        <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(83,47,207,0.12)', border: '0.5px solid rgba(120,80,255,0.3)', color: 'rgba(170,140,255,0.9)', fontSize: '12px' }}>
          ✓ {notice}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: 'white', fontSize: '16px', fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>{t('title')}</h3>
        <button style={btnPrimary} onClick={() => setShowAddModel(true)}>{t('addModel')}</button>
      </div>

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>{t('loading')}</div>
      ) : (
        <div style={{ borderRadius: '14px', border: '0.5px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px 130px 44px', padding: '10px 18px', background: 'rgba(255,255,255,0.02)', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
            {['Model', 'Category', 'Status', 'Pricing', ''].map(h => (
              <span key={h} style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{h}</span>
            ))}
          </div>

          {Object.entries(
            models.reduce((acc, m) => {
              if (!acc[m.provider]) acc[m.provider] = [];
              acc[m.provider].push(m);
              return acc;
            }, {} as Record<string, typeof models>)
          ).map(([provider, providerModels], gi) => (
            <div key={provider}>
              {/* Provider group header */}
              <div style={{ padding: '10px 18px', background: 'rgba(83,47,207,0.04)', borderTop: gi > 0 ? '0.5px solid rgba(255,255,255,0.05)' : 'none', borderBottom: '0.5px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(83,47,207,0.12)', border: '0.5px solid rgba(120,80,255,0.2)', borderRadius: '20px', padding: '2px 8px' }}>
                  <span style={{ color: 'rgba(140,100,255,0.8)', fontSize: '8px' }}>✦</span>
                  <span style={{ color: 'rgba(160,120,255,0.85)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{provider}</span>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '10px' }}>{providerModels.length} model{providerModels.length > 1 ? 's' : ''}</span>
              </div>

              {providerModels.map((model, i) => (
                <div
                  key={model.id}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px 130px 44px', padding: '13px 18px', borderBottom: i < providerModels.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center', background: 'transparent', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.018)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: 600, margin: 0, letterSpacing: '-0.1px' }}>{model.name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', margin: '3px 0 0', fontFamily: 'monospace' }}>{model.model_id}</p>
                  </div>
                  <div>
                    <span style={{
                      fontSize: '10px', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase',
                      padding: '3px 8px', borderRadius: '20px',
                      background: model.category === 'image' ? 'rgba(83,47,207,0.15)' : 'rgba(0,120,200,0.15)',
                      border: model.category === 'image' ? '0.5px solid rgba(120,80,255,0.25)' : '0.5px solid rgba(0,150,255,0.25)',
                      color: model.category === 'image' ? 'rgba(160,120,255,0.9)' : 'rgba(80,180,255,0.9)',
                    }}>{model.category}</span>
                  </div>
                  <button
                    onClick={() => toggleEnabled(model)}
                    style={{ width: '36px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: model.enabled ? 'rgba(83,47,207,0.85)' : 'rgba(255,255,255,0.08)', position: 'relative', transition: 'background 0.2s', flexShrink: 0, boxShadow: model.enabled ? '0 0 8px rgba(83,47,207,0.4)' : 'none' }}
                  >
                    <span style={{ position: 'absolute', top: '2px', left: model.enabled ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                  </button>
                  <button
                    onClick={() => setPricingModel(model)}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '5px 10px', color: 'rgba(255,255,255,0.5)', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(83,47,207,0.12)'; e.currentTarget.style.borderColor = 'rgba(120,80,255,0.3)'; e.currentTarget.style.color = 'rgba(160,120,255,0.9)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                  >
                    <span style={{ fontWeight: 600 }}>{model.model_pricing?.length ?? 0}</span>
                    <span style={{ opacity: 0.6 }}>rows</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      style={{ background: 'none', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                      onClick={e => {
                        if (openMenuId === model.id) { closeMenu(); return }
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                        setOpenMenuId(model.id)
                      }}
                    >
                      ⋯
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {models.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '13px' }}>{t('noModels')}</div>
          )}
        </div>
      )}
    </div>
  )
}
