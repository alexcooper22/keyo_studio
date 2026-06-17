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

const PROVIDERS = ['google', 'openai', 'kling', 'alibaba', 'bytedance']
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
      <style>{`
        .models-table { border-radius: 16px; border: 0.5px solid rgba(255,255,255,0.08); overflow: hidden; background: #0a0a0f; }
        .models-header { display: grid; grid-template-columns: 1fr 110px 80px 150px 44px; padding: 12px 20px; background: rgba(255,255,255,0.025); border-bottom: 0.5px solid rgba(255,255,255,0.07); }
        .model-row { display: grid; grid-template-columns: 1fr 110px 80px 150px 44px; padding: 14px 20px; align-items: center; background: transparent; transition: background 0.15s; }
        .model-row:hover { background: rgba(255,255,255,0.025); }
        .model-col-meta { display: none; }
        .model-mobile-row1 { display: none; }
        .model-mobile-row2 { display: none; }
        @media (max-width: 767px) {
          .models-header { display: none; }
          .model-row { display: flex; flex-direction: column; gap: 3px; padding: 13px 16px; align-items: stretch; }
          .model-col-name { display: none !important; }
          .model-col-category { display: none; }
          .model-col-status { display: none; }
          .model-col-pricing { display: none; }
          .model-col-menu-desktop { display: none !important; }
          .model-mobile-row1 { display: flex; align-items: center; gap: 8px; }
          .model-mobile-row2 { display: flex; align-items: center; gap: 5px; }
          .pricing-row-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 6px !important; }
          .pricing-row-grid .pricing-unit { grid-column: 1 / 3; }
          .pricing-add-grid { grid-template-columns: 1fr 1fr !important; }
          .pricing-add-btn { grid-column: 1 / 3 !important; }
        }
      `}</style>

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
              <div className="pricing-add-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.6fr 1fr 72px', gap: '8px', alignItems: 'flex-end' }}>
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
                  className="pricing-add-btn"
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
        <div className="models-table">
          {/* Header */}
          <div className="models-header">
            {[['MODEL', ''], ['CATEGORY', ''], ['STATUS', ''], ['PRICING', ''], ['', '']].map(([h], idx) => (
              <span key={idx} style={{ color: 'rgba(255,255,255,0.28)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.9px' }}>{h}</span>
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
              {(() => {
                const providerIcons: Record<string, React.ReactNode> = {
                  google: (
                    <svg width="14" height="14" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  ),
                  openai: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(210,210,210,0.9)">
                      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.886zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .027-.057l4.83-2.791a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
                    </svg>
                  ),
                  alibaba: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2a10 10 0 1 0 6.32 17.74l1.47 1.47 1.41-1.41-1.47-1.47A10 10 0 0 0 12 2zm0 2a8 8 0 1 1-4.9 14.32l1.72-1.72A5.5 5.5 0 1 0 7.4 14.9L5.68 16.6A8 8 0 0 1 12 4zm0 3a5.5 5.5 0 1 0 3.18 9.94l-1.44-1.44A3.5 3.5 0 1 1 15.5 12c0 .7-.21 1.36-.56 1.9l1.44 1.44A5.48 5.48 0 0 0 17.5 12 5.5 5.5 0 0 0 12 7z" fill="#FF6A00"/>
                    </svg>
                  ),
                  kling: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M19 3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3l5 6-5 6V6z" fill="rgba(100,180,255,0.9)"/>
                    </svg>
                  ),
                  bytedance: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <polygon points="2,3 5,3 4,20 1,20" fill="#3951CC"/>
                      <polygon points="8,10 11,10 10,20 7,20" fill="#5B86F0"/>
                      <polygon points="13,12 16,12 15,20 12,20" fill="#00C8C0"/>
                      <polygon points="19,4 22,4 21,20 18,20" fill="#5EE8D8"/>
                    </svg>
                  ),
                };
                const icon = providerIcons[provider];
                return (
                  <div style={{
                    padding: '9px 20px',
                    background: 'rgba(83,47,207,0.06)',
                    borderTop: gi > 0 ? '0.5px solid rgba(255,255,255,0.06)' : 'none',
                    borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '3px 10px 3px 7px' }}>
                      {icon ?? <span style={{ color: 'rgba(140,100,255,0.8)', fontSize: '8px' }}>✦</span>}
                      <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{provider}</span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>{providerModels.length} model{providerModels.length > 1 ? 's' : ''}</span>
                  </div>
                );
              })()}

              {providerModels.map((model, i) => {
                const categoryBadge = (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
                    padding: '4px 10px', borderRadius: '20px',
                    background: model.category === 'image' ? 'rgba(83,47,207,0.18)' : 'rgba(0,130,220,0.18)',
                    border: model.category === 'image' ? '0.5px solid rgba(130,90,255,0.35)' : '0.5px solid rgba(0,160,255,0.35)',
                    color: model.category === 'image' ? 'rgba(180,145,255,0.95)' : 'rgba(90,190,255,0.95)',
                  }}>
                    {model.category === 'image'
                      ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                      : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                    }
                    {model.category}
                  </span>
                );
                const toggleBtn = (
                  <button
                    onClick={() => toggleEnabled(model)}
                    style={{
                      width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer',
                      background: model.enabled ? 'linear-gradient(135deg, #7c5cf0, #5c3dd8)' : 'rgba(255,255,255,0.08)',
                      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                      boxShadow: model.enabled ? '0 0 10px rgba(100,70,230,0.45)' : 'none',
                    }}
                  >
                    <span style={{ position: 'absolute', top: '3px', left: model.enabled ? '20px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                  </button>
                );
                const pricingBtn = (
                  <button
                    onClick={() => setPricingModel(model)}
                    style={{
                      background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)',
                      borderRadius: '9px', padding: '6px 12px', color: 'rgba(255,255,255,0.55)',
                      fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                      transition: 'all 0.15s', fontWeight: 500,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(83,47,207,0.15)'; e.currentTarget.style.borderColor = 'rgba(130,90,255,0.4)'; e.currentTarget.style.color = 'rgba(180,145,255,0.95)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>{model.model_pricing?.length ?? 0}</span>
                    <span style={{ opacity: 0.55, fontSize: '11px' }}>rows</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                );
                const menuBtn = (
                  <button
                    style={{ background: 'none', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '16px', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    onClick={e => {
                      if (openMenuId === model.id) { closeMenu(); return }
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                      setOpenMenuId(model.id)
                    }}
                  >⋯</button>
                );
                return (
                  <div
                    key={model.id}
                    className="model-row"
                    style={{ borderBottom: i < providerModels.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none' }}
                  >
                    {/* Name + ID — desktop col 1 */}
                    <div className="model-col-name" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.92)', fontSize: '14px', fontWeight: 600, letterSpacing: '-0.2px' }}>{model.name}</span>
                      <span style={{
                        display: 'inline-block', width: 'fit-content',
                        color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontFamily: 'monospace',
                        background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)',
                        borderRadius: '5px', padding: '2px 7px',
                      }}>{model.model_id}</span>
                    </div>

                    {/* Category — desktop */}
                    <div className="model-col-category">{categoryBadge}</div>

                    {/* Toggle — desktop */}
                    <div className="model-col-status">{toggleBtn}</div>

                    {/* Pricing — desktop */}
                    <div className="model-col-pricing">{pricingBtn}</div>

                    {/* Menu — desktop */}
                    <div className="model-col-menu-desktop" style={{ display: 'flex', justifyContent: 'center' }}>{menuBtn}</div>

                    {/* ── Mobile card ── */}
                    {/* Row 1: name + toggle + ⋯ */}
                    <div className="model-mobile-row1">
                      <span style={{ flex: 1, minWidth: 0, fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.92)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{model.name}</span>
                      <button
                        onClick={() => toggleEnabled(model)}
                        style={{ width: '38px', height: '21px', borderRadius: '11px', border: 'none', cursor: 'pointer', background: model.enabled ? 'linear-gradient(135deg, #7c5cf0, #5c3dd8)' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s', flexShrink: 0, boxShadow: model.enabled ? '0 0 8px rgba(100,70,230,0.4)' : 'none' }}
                      >
                        <span style={{ position: 'absolute', top: '2.5px', left: model.enabled ? '19px' : '2.5px', width: '16px', height: '16px', borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                      </button>
                      <button
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.22)', cursor: 'pointer', padding: '4px 2px', fontSize: '18px', lineHeight: 1, flexShrink: 0, letterSpacing: '1px' }}
                        onClick={e => {
                          if (openMenuId === model.id) { closeMenu(); return }
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                          setOpenMenuId(model.id)
                        }}
                      >⋯</button>
                    </div>
                    {/* Row 2: model_id · category · pricing */}
                    <div className="model-mobile-row2">
                      <span style={{ fontFamily: 'monospace', fontSize: '10.5px', color: 'rgba(255,255,255,0.25)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>{model.model_id}</span>
                      <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: '10px', flexShrink: 0 }}>·</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: model.category === 'image' ? 'rgba(160,120,255,0.8)' : 'rgba(70,175,255,0.8)', flexShrink: 0 }}>{model.category}</span>
                      <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: '10px', flexShrink: 0 }}>·</span>
                      <button
                        onClick={() => setPricingModel(model)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'rgba(255,255,255,0.38)', fontSize: '10.5px', flexShrink: 0 }}
                      >
                        <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>{model.model_pricing?.length ?? 0}</span>
                        {t('pricing')}
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {models.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '13px' }}>{t('noModels')}</div>
          )}
        </div>
      )}
    </div>
  )
}
