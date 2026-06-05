import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Video Editor',
  description: 'Browser-based video editor — trim, arrange, and export MP4.',
  robots: { index: false, follow: false },
}

export default function EditorLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
