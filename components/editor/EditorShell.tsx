'use client'
import { useState } from 'react'
import Toolbar from './Toolbar'
import VideoPreview from './VideoPreview'
import Timeline from './Timeline/Timeline'
import MediaPanel from './Panels/MediaPanel'
import AudioPanel from './Panels/AudioPanel'
import ExportModal from './ExportModal'

const PANEL_TABS = ['Media', 'Audio', 'Text', 'Filters'] as const
type PanelTab = typeof PANEL_TABS[number]

export default function EditorShell() {
  const [activeTab, setActiveTab] = useState<PanelTab>('Media')
  const [showExport, setShowExport] = useState(false)

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: '#080808',
      fontFamily: 'var(--font-dm), DM Sans, -apple-system, sans-serif',
    }}>
      <Toolbar onExport={() => setShowExport(true)} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left panel */}
        <div style={{
          width: 272, display: 'flex', flexDirection: 'column',
          background: '#0d0d0d',
          borderRight: '0.5px solid rgba(255,255,255,0.06)',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            {PANEL_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, height: 36, border: 'none', cursor: 'pointer',
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                  fontFamily: 'var(--font-dm), DM Sans, sans-serif',
                  background: activeTab === tab ? 'rgba(83,47,207,0.08)' : 'transparent',
                  color: activeTab === tab ? 'rgba(155,126,255,0.9)' : 'rgba(255,255,255,0.28)',
                  borderBottom: activeTab === tab ? '1.5px solid rgba(120,80,255,0.7)' : '1.5px solid transparent',
                  textTransform: 'uppercase',
                  transition: 'all 0.15s',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'hidden auto' }}>
            {activeTab === 'Media' && <MediaPanel />}
            {activeTab === 'Audio' && <AudioPanel />}
            {activeTab === 'Text' && (
              <div style={{ padding: 16, color: 'rgba(255,255,255,0.2)', fontSize: 11, fontFamily: 'var(--font-dm), sans-serif' }}>
                Text overlays — coming soon
              </div>
            )}
            {activeTab === 'Filters' && (
              <div style={{ padding: 16, color: 'rgba(255,255,255,0.2)', fontSize: 11, fontFamily: 'var(--font-dm), sans-serif' }}>
                Filters — coming soon
              </div>
            )}
          </div>
        </div>

        <VideoPreview />
      </div>

      <Timeline />

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  )
}
