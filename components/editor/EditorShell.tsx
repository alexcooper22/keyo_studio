'use client'
import { useState } from 'react'
import Toolbar from './Toolbar'
import VideoPreview from './VideoPreview'
import Timeline from './Timeline/Timeline'
import MediaPanel from './Panels/MediaPanel'
import AudioPanel from './Panels/AudioPanel'

const PANEL_TABS = ['Media', 'Audio', 'Text', 'Filters'] as const
type PanelTab = typeof PANEL_TABS[number]

export default function EditorShell() {
  const [activeTab, setActiveTab] = useState<PanelTab>('Media')
  const [showExport, setShowExport] = useState(false)

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: '#141414',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <Toolbar onExport={() => setShowExport(true)} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', background: '#181818', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            {PANEL_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, height: 36, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500,
                  background: activeTab === tab ? 'rgba(200,237,77,0.08)' : 'transparent',
                  color: activeTab === tab ? '#c8ed4d' : 'rgba(255,255,255,0.35)',
                  borderBottom: activeTab === tab ? '1.5px solid #c8ed4d' : '1.5px solid transparent',
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
            {activeTab === 'Text' && <div style={{ padding: 16, color: '#666', fontSize: 12 }}>Text overlays — coming soon</div>}
            {activeTab === 'Filters' && <div style={{ padding: 16, color: '#666', fontSize: 12 }}>Filters — coming soon</div>}
          </div>
        </div>
        <VideoPreview />
      </div>

      <Timeline />

      {showExport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#1e1e1e', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
            <p style={{ marginBottom: 12 }}>Export modal — coming in Task 14</p>
            <button onClick={() => setShowExport(false)} style={{ padding: '6px 14px', background: '#c8ed4d', color: '#0e1004', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
