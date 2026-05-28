'use client'
import React, { createContext, useContext, useReducer, type Dispatch } from 'react'
import type { EditorState, EditorAction, VideoClip, AudioTrack, HistorySnapshot } from './types'

function calcDuration(clips: VideoClip[], audioTracks: AudioTrack[]): number {
  let max = 5
  for (const c of clips) {
    const end = c.startOnTimeline + (c.originalDuration - c.trimStart - c.trimEnd)
    if (end > max) max = end
  }
  for (const a of audioTracks) {
    const end = a.startOnTimeline + a.duration
    if (end > max) max = end
  }
  return max
}

const initialState: EditorState = {
  clips: [],
  audioTracks: [],
  playhead: 0,
  duration: 5,
  zoom: 40,
  selectedId: null,
  playing: false,
  past: [],
}

function snapshot(state: EditorState): HistorySnapshot {
  return { clips: [...state.clips], audioTracks: [...state.audioTracks] }
}

function pushPast(past: HistorySnapshot[], snap: HistorySnapshot): HistorySnapshot[] {
  return [...past.slice(-49), snap]
}

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'ADD_CLIP': {
      const clips = [...state.clips, action.clip]
      return { ...state, clips, duration: calcDuration(clips, state.audioTracks), past: pushPast(state.past, snapshot(state)) }
    }
    case 'REMOVE_CLIP': {
      const clips = state.clips.filter(c => c.id !== action.id)
      return {
        ...state, clips,
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        duration: calcDuration(clips, state.audioTracks),
        past: pushPast(state.past, snapshot(state)),
      }
    }
    case 'MOVE_CLIP': {
      const clips = state.clips.map(c =>
        c.id === action.id ? { ...c, startOnTimeline: Math.max(0, action.startOnTimeline) } : c
      )
      return { ...state, clips, duration: calcDuration(clips, state.audioTracks), past: pushPast(state.past, snapshot(state)) }
    }
    case 'TRIM_CLIP': {
      const clips = state.clips.map(c => {
        if (c.id !== action.id) return c
        const minDur = 0.2
        // Clamp trimStart first, then trimEnd against the already-clamped trimStart
        const trimStart = Math.max(0, Math.min(action.trimStart, c.originalDuration - c.trimEnd - minDur))
        const trimEnd = Math.max(0, Math.min(action.trimEnd, c.originalDuration - trimStart - minDur))
        return { ...c, trimStart, trimEnd }
      })
      return { ...state, clips, duration: calcDuration(clips, state.audioTracks), past: pushPast(state.past, snapshot(state)) }
    }
    case 'ADD_AUDIO': {
      const audioTracks = [...state.audioTracks, action.track]
      return { ...state, audioTracks, duration: calcDuration(state.clips, audioTracks), past: pushPast(state.past, snapshot(state)) }
    }
    case 'REMOVE_AUDIO': {
      const audioTracks = state.audioTracks.filter(a => a.id !== action.id)
      return {
        ...state, audioTracks,
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        duration: calcDuration(state.clips, audioTracks),
        past: pushPast(state.past, snapshot(state)),
      }
    }
    case 'MOVE_AUDIO': {
      const audioTracks = state.audioTracks.map(a =>
        a.id === action.id ? { ...a, startOnTimeline: Math.max(0, action.startOnTimeline) } : a
      )
      return { ...state, audioTracks, duration: calcDuration(state.clips, audioTracks), past: pushPast(state.past, snapshot(state)) }
    }
    case 'SET_CLIP_VOLUME': {
      const clips = state.clips.map(c =>
        c.id === action.id ? { ...c, volume: Math.max(0, Math.min(1, action.volume)) } : c
      )
      return { ...state, clips, past: pushPast(state.past, snapshot(state)) }
    }
    case 'SET_AUDIO_VOLUME': {
      const audioTracks = state.audioTracks.map(a =>
        a.id === action.id ? { ...a, volume: Math.max(0, Math.min(1, action.volume)) } : a
      )
      return { ...state, audioTracks, past: pushPast(state.past, snapshot(state)) }
    }
    case 'SET_PLAYHEAD':
      return { ...state, playhead: Math.max(0, Math.min(action.time, state.duration)) }
    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(10, Math.min(200, action.zoom)) }
    case 'SELECT':
      return { ...state, selectedId: action.id }
    case 'SET_PLAYING':
      return { ...state, playing: action.playing }
    case 'UNDO': {
      if (state.past.length === 0) return state
      const prev = state.past[state.past.length - 1]
      return {
        ...state,
        clips: prev.clips,
        audioTracks: prev.audioTracks,
        past: state.past.slice(0, -1),
        duration: calcDuration(prev.clips, prev.audioTracks),
      }
    }
    default:
      return state
  }
}

const EditorContext = createContext<{ state: EditorState; dispatch: Dispatch<EditorAction> } | null>(null)

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return <EditorContext.Provider value={{ state, dispatch }}>{children}</EditorContext.Provider>
}

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used inside EditorProvider')
  return ctx
}
