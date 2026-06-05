'use client'
import { EditorProvider } from '@/lib/editor/EditorContext'
import EditorShell from '@/components/editor/EditorShell'

export default function EditorPage() {
  return (
    <EditorProvider>
      <EditorShell />
    </EditorProvider>
  )
}
