'use client'
interface ToolbarProps {
  onExport: () => void
}
export default function Toolbar({ onExport }: ToolbarProps) {
  return (
    <div style={{ height: 48, background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
      <span style={{ color: '#666', fontSize: 12, fontFamily: 'system-ui' }}>Toolbar</span>
    </div>
  )
}
