'use client';
import React, { useState, useRef, useEffect } from 'react';

// Inclusive range descending: range(3,10) → [10,9,8,7,6,5,4,3]
const range = (min: number, max: number): number[] =>
  Array.from({ length: max - min + 1 }, (_, i) => max - i);
import Navbar from '@/components/layout/Navbar';
import { fetchModelsWithCache } from '@/lib/modelCache';
import { useUser } from '@clerk/nextjs';
import { useAuth } from '@/context/AuthContext';
import { useTranslations } from 'next-intl';

interface VideoItem {
  id: string;
  videoUrl: string;
  prompt: string;
  createdAt: Date;
  quality?: string;
  duration?: number;
  aspectRatio?: string;
  model?: string;
}

export default function VideoDashboard() {
  const t = useTranslations('video');
  const { isLoaded, isSignedIn } = useUser();
  const { setShowModal } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [generatingCount, setGeneratingCount] = useState(0);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [quality, setQuality] = useState<'720p' | '1080p'>('720p');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [showAspectMenu, setShowAspectMenu] = useState(false);
  const [duration, setDuration] = useState<number>(5);
  const [showDurationMenu, setShowDurationMenu] = useState(false);
  const [isPromptFocused, setIsPromptFocused] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [startFrame, setStartFrame] = useState<string | null>(null);
  const [endFrame, setEndFrame] = useState<string | null>(null);
  const startFrameRef = useRef<HTMLInputElement>(null);
  const endFrameRef = useRef<HTMLInputElement>(null);
  const mobileStartFrameRef = useRef<HTMLInputElement>(null);
  const mobileEndFrameRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'motion-control'>('create');
  const [mcMotionVideoUrl, setMcMotionVideoUrl] = useState<string | null>(null);
  const [mcCharacterImageUrl, setMcCharacterImageUrl] = useState<string | null>(null);
  const [mcCharacterOrientation, setMcCharacterOrientation] = useState<'image' | 'video'>('image');
  const [mcQuality, setMcQuality] = useState<'720p' | '1080p'>('720p');
  const [mcPrompt, setMcPrompt] = useState('');
  const [isMcGenerating, setIsMcGenerating] = useState(false);
  const [mcError, setMcError] = useState<string | null>(null);
  const mcPollRef = useRef<NodeJS.Timeout | null>(null);
  const mcMotionVideoRef = useRef<HTMLInputElement>(null);
  const mcCharacterImageRef = useRef<HTMLInputElement>(null);
  const [mobileShowOptions, setMobileShowOptions] = useState(false);
  const [mobileShowModelMenu, setMobileShowModelMenu] = useState(false);

  type MediaAsset = { id: string; type: 'image' | 'audio' | 'video'; url: string; name: string; uploading?: boolean; };
  type TrimState = { file: File; duration: number; startTime: number; endTime: number; mediaType: 'audio' | 'video'; objectUrl: string; };
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [showAtMenu, setShowAtMenu] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [trimState, setTrimState] = useState<TrimState | null>(null);
  const [isTrimming, setIsTrimming] = useState(false);
  const mediaUploadRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mobileTextareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Restore settings from localStorage on mount
  useEffect(() => {
    const savedPrompt = localStorage.getItem('video_prompt_draft');
    if (savedPrompt) setPrompt(savedPrompt);

    const savedQuality = localStorage.getItem('video_quality_draft');
    if (savedQuality === '720p' || savedQuality === '1080p') setQuality(savedQuality);

    const savedAspect = localStorage.getItem('video_aspect_draft');
    if (savedAspect === '9:16' || savedAspect === '16:9' || savedAspect === '1:1') setAspectRatio(savedAspect);

    const savedDuration = localStorage.getItem('video_duration_draft');
    if (savedDuration) setDuration(Number(savedDuration));

    const savedAudio = localStorage.getItem('video_audio_draft');
    if (savedAudio === 'true') setAudioEnabled(true);

    const savedStart = localStorage.getItem('video_start_frame');
    if (savedStart && !savedStart.startsWith('blob:')) setStartFrame(savedStart);

    const savedEnd = localStorage.getItem('video_end_frame');
    if (savedEnd && !savedEnd.startsWith('blob:')) setEndFrame(savedEnd);

    fetchVideoModels();
  }, []);

  // Save to localStorage on every change
  useEffect(() => {
    localStorage.setItem('video_prompt_draft', prompt);
  }, [prompt]);

  useEffect(() => {
    localStorage.setItem('video_quality_draft', quality);
  }, [quality]);

  useEffect(() => {
    localStorage.setItem('video_aspect_draft', aspectRatio);
  }, [aspectRatio]);

  useEffect(() => {
    localStorage.setItem('video_duration_draft', String(duration));
  }, [duration]);

  useEffect(() => {
    localStorage.setItem('video_audio_draft', String(audioEnabled));
  }, [audioEnabled]);

  useEffect(() => {
    if (startFrame && !startFrame.startsWith('blob:')) localStorage.setItem('video_start_frame', startFrame);
    else if (!startFrame) localStorage.removeItem('video_start_frame');
  }, [startFrame]);

  useEffect(() => {
    if (endFrame && !endFrame.startsWith('blob:')) localStorage.setItem('video_end_frame', endFrame);
    else if (!endFrame) localStorage.removeItem('video_end_frame');
  }, [endFrame]);
  const [videoModels, setVideoModels] = useState<Array<{ id: string; name: string; provider?: string; pricing: Array<{ quality: string; credits: number }> }>>([]);
  const [selectedVideoModelId, setSelectedVideoModelId] = useState('');
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [creditCount, setCreditCount] = useState<number | null>(null);

  // Returns valid duration options per model (per official API docs)
  const getDurationOptions = (model: { name: string; provider?: string } | undefined): number[] => {
    if (!model) return range(3, 10);
    const { provider, name } = model;
    if (provider === 'google') return [8, 6, 4];
    if (provider === 'kling') return range(3, 15);
    if (provider === 'alibaba') return range(2, 15);
    if (provider === 'bytedance') return name.includes('1.5') ? range(4, 12) : range(4, 15);
    return range(3, 10);
  };

  // Clamp duration to valid options when model changes
  useEffect(() => {
    const selected = videoModels.find(m => m.id === selectedVideoModelId);
    const options = getDurationOptions(selected);
    if (!options.includes(duration)) {
      setDuration(options.reduce((best, v) => Math.abs(v - duration) < Math.abs(best - duration) ? v : best));
    }
  }, [selectedVideoModelId, videoModels]);

  const toggleLike = (id: string) => {
    setLikedVideos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const downloadVideo = async (url: string, id: string) => {
    try {
      const res = await fetch(`/api/video-proxy?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const ext = blob.type.includes('webm') ? 'webm' : 'mp4';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `video-${id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    } catch (e: any) {
      setError(`Download failed: ${e?.message ?? 'unknown error'}`);
    }
  };

  const deleteVideo = async (taskId: string) => {
    setVideos(prev => prev.filter(v => v.id !== taskId));
    await fetch('/api/delete-video', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    });
  };

  const handleFrameUpload = async (file: File, type: 'start' | 'end') => {
    const preview = URL.createObjectURL(file);
    if (type === 'start') setStartFrame(preview);
    else setEndFrame(preview);

    try {
      const res = await fetch('/api/upload-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });
      const { signedUrl, publicUrl } = await res.json();

      await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (type === 'start') setStartFrame(publicUrl);
      else setEndFrame(publicUrl);
    } catch (err) {
      console.error('Upload failed', err);
    }
  };
  const handleMcUpload = async (file: File, type: 'motionVideo' | 'characterImage') => {
    const preview = URL.createObjectURL(file);
    if (type === 'motionVideo') setMcMotionVideoUrl(preview);
    else setMcCharacterImageUrl(preview);

    try {
      const res = await fetch('/api/upload-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });
      const { signedUrl, publicUrl } = await res.json();
      await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (type === 'motionVideo') setMcMotionVideoUrl(publicUrl);
      else setMcCharacterImageUrl(publicUrl);
    } catch (err) {
      console.error('MC upload failed', err);
      if (type === 'motionVideo') setMcMotionVideoUrl(null);
      else setMcCharacterImageUrl(null);
      setMcError('Upload failed. Please try again.');
    }
  };

  const handleMcGenerate = async () => {
    if (!mcMotionVideoUrl || !mcCharacterImageUrl || isMcGenerating) return;
    const mcModel = videoModels.find(m => m.name === 'Kling Motion Control');
    if (!mcModel) return;

    setIsMcGenerating(true);
    setMcError(null);
    setStatus('Submitting...');

    try {
      const perSecond = mcModel.pricing.find(p => p.quality === mcQuality)?.credits ?? (mcQuality === '1080p' ? 4 : 3);
      const res = await fetch('/api/generate-motion-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterImageUrl: mcCharacterImageUrl,
          motionVideoUrl: mcMotionVideoUrl,
          characterOrientation: mcCharacterOrientation,
          quality: mcQuality,
          modelId: mcModel.id,
          prompt: mcPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      const taskId = data.taskId;
      setStatus('Processing...');
      if (data.remainingCredits !== undefined) setCreditCount(data.remainingCredits);

      mcPollRef.current = setInterval(async () => {
        try {
          const check = await fetch(`/api/check-video?taskId=${taskId}`);
          const result = await check.json();
          if (result.status === 'succeed' && result.videoUrl) {
            clearInterval(mcPollRef.current!);
            const newVideo: VideoItem = {
              id: taskId,
              videoUrl: result.videoUrl,
              prompt: mcPrompt || 'Motion Control',
              createdAt: new Date(),
              quality: mcQuality,
              model: mcModel.name,
            };
            setVideos(prev => [newVideo, ...prev]);
            setIsMcGenerating(false);
            setStatus('');
            window.dispatchEvent(new Event('credits-updated'));
            if (feedRef.current) feedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (result.status === 'failed') {
            clearInterval(mcPollRef.current!);
            setMcError(result.failReason ?? 'Generation failed. Please try again.');
            setIsMcGenerating(false);
            setStatus('');
          }
        } catch (err) {
          console.error('MC polling error:', err);
        }
      }, 5000);
    } catch (err: any) {
      setMcError(err.message);
      setIsMcGenerating(false);
      setStatus('');
    }
  };

  const fetchVideoModels = async () => {
    try {
      const models = await fetchModelsWithCache('video');
      if (models.length) {
        setVideoModels(models);
        const klingV3 = models.find((m: { name?: string }) => m.name === 'Kling v3');
        setSelectedVideoModelId((klingV3 ?? models[0]).id);
      }
    } catch (err) {
      console.error('Failed to fetch video models', err);
    }
  };

  const pollsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu]')) {
        setShowQualityMenu(false);
        setShowAspectMenu(false);
        setShowDurationMenu(false);
        setShowModelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const res = await fetch('/api/user-credits');
        const data = await res.json();
        if (data.credits !== undefined) setCreditCount(data.credits);
      } catch (err) {
        console.error("Failed to fetch credits", err);
      }
    };
    fetchCredits();
  }, []);

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const res = await fetch('/api/get-videos');
        const data = await res.json();
        if (data.videos) {
          setVideos(data.videos.map((v: any) => ({
            id: v.task_id,
            videoUrl: v.video_url,
            prompt: v.prompt,
            createdAt: new Date(v.created_at),
            quality: v.quality,
            duration: v.duration,
            aspectRatio: v.aspect_ratio,
            model: v.model,
          })));
        }
      } catch (err) {
        console.error('Failed to load videos', err);
      }
    };
    loadVideos();

    // Restore pending video generation from localStorage
    const pendingVideo = localStorage.getItem('video_generation_pending');
    if (pendingVideo) {
      try {
        const pending = JSON.parse(pendingVideo);
        // Only restore if started less than 10 minutes ago
        if (Date.now() - pending.startTime < 10 * 60 * 1000) {
          setGeneratingCount(c => c + 1);
          // Resume polling
          const resumeInterval = setInterval(async () => {
            try {
              const check = await fetch(`/api/check-video?taskId=${pending.taskId}`);
              const result = await check.json();
              if (result.status === 'succeed' && result.videoUrl) {
                clearInterval(resumeInterval);
                pollsRef.current.delete(pending.taskId);
                const newVideo: VideoItem = {
                  id: pending.taskId,
                  videoUrl: result.videoUrl,
                  prompt: pending.prompt,
                  createdAt: new Date(),
                  quality: pending.quality,
                  duration: pending.duration,
                  aspectRatio: pending.aspectRatio,
                  model: pending.modelName,
                };
                setVideos(prev => [newVideo, ...prev]);
                setGeneratingCount(c => c - 1);
                localStorage.removeItem('video_generation_pending');
                localStorage.removeItem('video_start_frame');
                localStorage.removeItem('video_end_frame');
                setStartFrame(null);
                setEndFrame(null);
                window.dispatchEvent(new Event('credits-updated'));
              } else if (result.status === 'failed') {
                clearInterval(resumeInterval);
                pollsRef.current.delete(pending.taskId);
                setGeneratingCount(c => c - 1);
                localStorage.removeItem('video_generation_pending');
              }
            } catch (err) {
              console.error('Polling error:', err);
            }
          }, 5000);
          pollsRef.current.set(pending.taskId, resumeInterval);
        } else {
          localStorage.removeItem('video_generation_pending');
        }
      } catch (err) {
        localStorage.removeItem('video_generation_pending');
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (mcPollRef.current) clearInterval(mcPollRef.current);
    };
  }, []);

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const numSamples = buffer.length;
    const dataSize = numSamples * numChannels * 2;
    const ab = new ArrayBuffer(44 + dataSize);
    const view = new DataView(ab);
    const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); ws(8, 'WAVE');
    ws(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true); view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true); ws(36, 'data'); view.setUint32(40, dataSize, true);
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      for (let c = 0; c < numChannels; c++) {
        const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
      }
    }
    return new Blob([ab], { type: 'audio/wav' });
  };

  const trimAudioFile = async (file: File, startSec: number, endSec: number): Promise<File> => {
    const ctx = new AudioContext();
    const audioBuffer = await ctx.decodeAudioData(await file.arrayBuffer());
    const sr = audioBuffer.sampleRate;
    const start = Math.floor(startSec * sr);
    const len = Math.min(Math.floor((endSec - startSec) * sr), audioBuffer.length - start);
    const out = ctx.createBuffer(audioBuffer.numberOfChannels, len, sr);
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      out.getChannelData(c).set(audioBuffer.getChannelData(c).subarray(start, start + len));
    }
    await ctx.close();
    return new File([audioBufferToWav(out)], 'trimmed.wav', { type: 'audio/wav' });
  };

  const trimVideoFile = (file: File, startSec: number, endSec: number): Promise<File> =>
    new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.onloadedmetadata = () => { video.currentTime = startSec; };
      video.onseeked = () => {
        const chunks: Blob[] = [];
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
        const stream = (video as HTMLVideoElement & { captureStream: () => MediaStream }).captureStream();
        const recorder = new MediaRecorder(stream, { mimeType });
        recorder.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
          URL.revokeObjectURL(video.src);
          resolve(new File([new Blob(chunks, { type: 'video/webm' })], 'trimmed.webm', { type: 'video/webm' }));
        };
        recorder.start();
        video.play().catch(reject);
        setTimeout(() => { recorder.stop(); video.pause(); }, (endSec - startSec) * 1000);
      };
      video.onerror = () => reject(new Error('Video load failed'));
    });

  const confirmTrim = async () => {
    if (!trimState) return;
    setIsTrimming(true);
    try {
      const trimmed = trimState.mediaType === 'audio'
        ? await trimAudioFile(trimState.file, trimState.startTime, trimState.endTime)
        : await trimVideoFile(trimState.file, trimState.startTime, trimState.endTime);
      URL.revokeObjectURL(trimState.objectUrl);
      setTrimState(null);
      // Upload trimmed file
      const type = trimState.mediaType;
      const placeholder: MediaAsset = { id: Math.random().toString(36).slice(2), type, url: URL.createObjectURL(trimmed), name: `${type.charAt(0).toUpperCase() + type.slice(1)} 1`, uploading: true };
      setMediaAssets(prev => {
        const idx = prev.filter(a => a.type === type).length + 1;
        return [...prev, { ...placeholder, name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${idx}` }];
      });
      const form = new FormData();
      form.append('file', trimmed);
      const res = await fetch('/api/upload-media', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setMediaAssets(prev => prev.map(a => a.id === placeholder.id ? { ...a, url: data.url, uploading: false } : a));
    } catch (e: any) {
      setError(e?.message ?? 'Trim failed');
    } finally {
      setIsTrimming(false);
    }
  };

  const renderPromptChips = (text: string): React.ReactNode[] => {
    const parts = text.split(/(@(?:Image|Audio|Video) \d+)/g);
    return parts.map((part, i) => {
      const m = part.match(/^@(Image|Audio|Video) \d+$/);
      if (m) {
        const t = m[1].toLowerCase() as 'image' | 'audio' | 'video';
        const color = t === 'image' ? 'rgba(130,185,255,1)' : t === 'audio' ? 'rgba(180,130,255,1)' : 'rgba(100,220,160,1)';
        const bg = t === 'image' ? 'rgba(30,80,180,0.22)' : t === 'audio' ? 'rgba(83,30,150,0.22)' : 'rgba(20,100,60,0.22)';
        // No padding/border/inline-flex — must match textarea character dimensions exactly
        return <span key={i} style={{ color, background: bg, borderRadius: '3px' }}>{part}</span>;
      }
      return <span key={i} style={{ color: 'rgba(255,255,255,0.85)' }}>{part}</span>;
    });
  };

  const handleMediaUpload = async (files: FileList | null) => {
    if (!files) return;
    const allFiles = Array.from(files);
    if (allFiles.length === 0) return;
    const getType = (f: File): MediaAsset['type'] => f.type.startsWith('image/') ? 'image' : f.type.startsWith('audio/') ? 'audio' : 'video';

    // Validate audio duration (ByteDance limit: ≤15s)
    const getAudioDuration = (file: File): Promise<number> =>
      new Promise(resolve => {
        const el = file.type.startsWith('video/') ? document.createElement('video') : document.createElement('audio');
        const url = URL.createObjectURL(file);
        el.src = url;
        el.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(el.duration); };
        el.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
      });

    const newFiles: File[] = [];
    for (const file of allFiles) {
      const type = getType(file);
      if (type === 'audio' || type === 'video') {
        const dur = await getAudioDuration(file);
        if (dur > 15) {
          setTrimState({ file, duration: dur, startTime: 0, endTime: Math.min(15, dur), mediaType: type, objectUrl: URL.createObjectURL(file) });
          continue;
        }
      }
      newFiles.push(file);
    }
    if (newFiles.length === 0) return;

    // Add placeholders with blob URLs immediately for preview
    const placeholders: MediaAsset[] = [];
    setMediaAssets(prev => {
      newFiles.forEach(file => {
        const type = getType(file);
        const idx = prev.filter(a => a.type === type).length + placeholders.filter(a => a.type === type).length + 1;
        const label = type.charAt(0).toUpperCase() + type.slice(1);
        placeholders.push({ id: Math.random().toString(36).slice(2), type, url: URL.createObjectURL(file), name: `${label} ${idx}`, uploading: true });
      });
      return [...prev, ...placeholders];
    });

    // Upload each file and replace blob URL with public URL
    await Promise.all(newFiles.map(async (file, i) => {
      const placeholder = placeholders[i];
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/upload-media', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Upload failed');
        setMediaAssets(prev => prev.map(a => a.id === placeholder.id ? { ...a, url: data.url, uploading: false } : a));
      } catch {
        setMediaAssets(prev => prev.filter(a => a.id !== placeholder.id));
      }
    }));
  };

  const insertAtMention = (asset: MediaAsset, ref: React.RefObject<HTMLTextAreaElement | null>) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? prompt.length;
    const atPos = prompt.lastIndexOf('@', start - 1);
    const before = atPos >= 0 ? prompt.slice(0, atPos) : prompt.slice(0, start);
    const after = prompt.slice(start);
    const newVal = `${before}@${asset.name} ${after}`;
    setPrompt(newVal);
    setShowAtMenu(false);
    setTimeout(() => {
      el.focus();
      const pos = before.length + asset.name.length + 2;
      el.setSelectionRange(pos, pos);
    }, 0);
  };

  const handlePromptChange = (val: string) => {
    setPrompt(val);
    if (val.endsWith('@') && isSeedanceV2 && mediaAssets.length > 0) setShowAtMenu(true);
    else if (showAtMenu) setShowAtMenu(false);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!selectedVideoModelId) return;
    setError(null);
    setGeneratingCount(c => c + 1);
    const snapshotPrompt = prompt;
    const snapshotModel = videoModels.find(m => m.id === selectedVideoModelId)?.name;
    try {
      type SerializedMedia = { type: string; url: string; name: string; };
      const serializedMedia: SerializedMedia[] = isSeedanceV2
        ? mediaAssets.filter(a => !a.uploading && a.url).map(a => ({ type: a.type, url: a.url, name: a.name }))
        : [];

      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: snapshotPrompt, duration, aspectRatio, mode: 'std', quality, audio: audioEnabled, startFrame, endFrame, modelId: selectedVideoModelId, mediaAssets: serializedMedia }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const taskId = data.taskId;

      localStorage.setItem('video_generation_pending', JSON.stringify({
        taskId,
        prompt: snapshotPrompt,
        startTime: Date.now(),
        quality,
        duration,
        aspectRatio,
        modelName: snapshotModel,
      }));

      const interval = setInterval(async () => {
        const check = await fetch(`/api/check-video?taskId=${taskId}`);
        const result = await check.json();
        if (result.status === 'succeed' && result.videoUrl) {
          clearInterval(interval);
          pollsRef.current.delete(taskId);
          const newVideo: VideoItem = {
            id: taskId,
            videoUrl: result.videoUrl,
            prompt: snapshotPrompt,
            createdAt: new Date(),
            quality,
            duration,
            aspectRatio,
            model: snapshotModel,
          };
          setVideos(prev => [newVideo, ...prev]);
          setGeneratingCount(c => c - 1);
          localStorage.removeItem('video_generation_pending');
          localStorage.removeItem('video_start_frame');
          localStorage.removeItem('video_end_frame');
          setStartFrame(null);
          setEndFrame(null);
          window.dispatchEvent(new Event('credits-updated'));
          if (feedRef.current) feedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (result.status === 'failed') {
          clearInterval(interval);
          pollsRef.current.delete(taskId);
          setError(result.googleError ?? result.error ?? 'Generation failed');
          setGeneratingCount(c => c - 1);
          localStorage.removeItem('video_generation_pending');
        }
      }, 5000);
      pollsRef.current.set(taskId, interval);
    } catch (err: any) {
      setError(err.message);
      setGeneratingCount(c => c - 1);
    }
  };

  const selectedVideoModel = videoModels.find(m => m.id === selectedVideoModelId);
  const isSeedanceV2 = selectedVideoModel?.name?.startsWith('Seedance 2.0') ?? false;
  const perSecond = selectedVideoModel?.pricing.find(p => p.quality === quality)?.credits ?? (quality === '1080p' ? 4 : 3);
  const videoCreditCost = (perSecond + (audioEnabled ? 1 : 0)) * duration;
  const mcModel = videoModels.find(m => m.name === 'Kling Motion Control');
  const mcPerSecond = mcModel?.pricing.find(p => p.quality === mcQuality)?.credits ?? (mcQuality === '1080p' ? 4 : 3);
  const mcCreditCost = mcPerSecond * 5;

  const videoHero = (
    <>
      <div className="inline-flex items-center gap-2" style={{ background: 'rgba(83,47,207,0.1)', border: '0.5px solid rgba(83,47,207,0.3)', borderRadius: '20px', padding: '4px 12px', marginBottom: '20px', position: 'relative' }}>
        <span style={{ color: 'rgba(120,80,255,0.8)', fontSize: '9px' }}>✦</span>
        <span className="font-dm" style={{ color: 'rgba(120,80,255,0.7)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{t('aiBadge')}</span>
      </div>
      <h1 style={{ fontWeight: 700, lineHeight: 1.05, marginBottom: '16px', position: 'relative' }}>
        <span className="font-clash" style={{ display: 'block', fontSize: 'clamp(22px, 3.2vw, 34px)', letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.85)' }}>
          {t('heroLine1')}
        </span>
        <span className="font-clash" style={{ display: 'block', fontSize: 'clamp(64px, 12vw, 110px)', letterSpacing: '-0.04em', lineHeight: 0.93, background: 'linear-gradient(135deg, #c4b0ff 0%, #9b7eff 40%, #6b4ef5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          {t('heroWord')}
        </span>
        <span className="font-clash" style={{ display: 'block', fontSize: 'clamp(22px, 3.2vw, 34px)', letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.85)', marginTop: '6px' }}>
          {t('heroLine3')}{' '}
          <span style={{ background: 'linear-gradient(135deg, #c4b0ff 0%, #9b7eff 50%, #7c5cf0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>keyo.studio</span>
        </span>
      </h1>
      <p className="font-dm" style={{ fontSize: '13px', color: 'rgba(180,160,230,0.45)', marginBottom: '36px', position: 'relative' }}>
        {t('heroSubtitle')}
      </p>
      <button
        onClick={() => setShowModal(true)}
        style={{ background: 'linear-gradient(135deg, #7c5cf0 0%, #9b7eff 100%)', border: 'none', borderRadius: '12px', padding: '14px 40px', fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-dm)', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 24px rgba(83,47,207,0.45), inset 0 1px 0 rgba(255,255,255,0.15)', display: 'inline-flex', alignItems: 'center', gap: '8px', position: 'relative' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>
        {t('tryForFree')}
      </button>
    </>
  );


  return (
    <div className={`video-root${isLoaded && !isSignedIn ? ' mobile-locked' : ''}`} style={{ paddingTop: '94px', background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />
      <style>{`
        textarea::-webkit-scrollbar { width: 4px; }
        textarea::-webkit-scrollbar-track { background: transparent; }
        textarea::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }
        textarea::-webkit-scrollbar-thumb:hover { background: var(--accent); }
        .feed::-webkit-scrollbar { width: 0px; }
        .feed::-webkit-scrollbar-track { background: transparent; }
        .feed::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
        @media (min-width: 768px) {
          .video-root { height: 100vh; overflow: hidden; }
          .video-layout { height: calc(100vh - 94px); padding-bottom: 24px; }
          .video-panel { width: 260px; flex-shrink: 0; }
        }
        .video-panel { display: none; }
        @media (min-width: 768px) {
          .video-panel { display: flex; flex-direction: column; }
        }
        .video-sidebar { display: none; }
        @media (min-width: 768px) {
          .video-sidebar { display: flex; width: 200px; flex-shrink: 0; border-left: var(--border); flex-direction: column; }
        }
        @media (max-width: 767px) {
          .mobile-locked { overflow: hidden; height: 100vh; }
          .video-layout { padding-bottom: 0 !important; }
          .feed { padding-bottom: calc(240px + env(safe-area-inset-bottom, 0px)) !important; }
          .mobile-action-bar { display: flex !important; }
        }
        .mobile-action-bar { display: none; }
      `}</style>

      <div className="video-layout flex flex-col md:flex-row" style={{ padding: '0 16px 80px', gap: '12px', alignItems: 'stretch' }}>

        {/* MOBILE HERO — unauthenticated only */}
        {isLoaded && !isSignedIn && (
          <div className="flex md:hidden flex-col items-center justify-start text-center relative px-6" style={{ minHeight: 'calc(100vh - 94px)', overflow: 'hidden', paddingTop: '15vh', paddingBottom: '80px' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(60,80,160,0.28) 0%, rgba(40,55,120,0.1) 45%, transparent 70%)', pointerEvents: 'none' }} />

            {[['top-0 left-0', 'border-t border-l', '-translate-x-px -translate-y-px'],
              ['top-0 right-0', 'border-t border-r', 'translate-x-px -translate-y-px'],
              ['bottom-0 left-0', 'border-b border-l', '-translate-x-px translate-y-px'],
              ['bottom-0 right-0', 'border-b border-r', 'translate-x-px translate-y-px'],
            ].map(([pos, border, translate], i) => (
              <div key={i} className={`absolute ${pos} ${translate}`} style={{ width: '36px', height: '36px' }}>
                <div className={`w-full h-full ${border}`} style={{ borderColor: 'rgba(83,47,207,0.7)' }} />
              </div>
            ))}
            <p className="font-dm mb-5 tracking-[0.2em] uppercase" style={{ fontSize: '11px', color: 'rgba(140,160,220,0.55)', letterSpacing: '0.18em', position: 'relative' }}>
              {t('studioLabel')}
            </p>
            <h1 className="font-clash" style={{
              fontSize: 'clamp(44px, 6vw, 72px)',
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #7090e8 0%, #5b7fe0 35%, #8ba4f0 65%, #a8c0ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              maxWidth: '680px',
              position: 'relative',
            }}>
              {t('heroTitle')}
            </h1>
          </div>
        )}

        {/* LEFT PANEL */}
        <div className="video-panel" style={{ background: '#0a0a0e', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
          {/* Top shimmer */}
          <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent 5%, rgba(120,80,255,0.5) 40%, rgba(83,47,207,0.75) 50%, rgba(120,80,255,0.5) 60%, transparent 95%)', pointerEvents: 'none', zIndex: 1 }} />

          {/* Divider */}
          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)' }} />

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
            {(['create', 'motion-control'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab ? '1.5px solid rgba(120,80,255,0.8)' : '1.5px solid transparent',
                  color: activeTab === tab ? 'rgba(160,120,255,0.95)' : 'rgba(255,255,255,0.28)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-dm)',
                  fontWeight: activeTab === tab ? 600 : 400,
                  letterSpacing: '0.3px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  marginBottom: '-0.5px',
                }}
              >
                {tab === 'create' ? 'Create Video' : 'Motion Control'}
              </button>
            ))}
          </div>

          {activeTab === 'create' && (
            <>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

            {/* Model card */}
            <div style={{ background: '#0c0c14', border: '0.5px solid rgba(83,47,207,0.25)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ height: '70px', background: 'radial-gradient(ellipse 100% 120% at 50% 0%, rgba(83,47,207,0.35) 0%, rgba(20,10,40,0.9) 100%)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(120,80,255,0.5), transparent)' }} />
                <button style={{ position: 'absolute', top: '7px', right: '7px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '3px 9px', fontSize: '10px', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'var(--font-dm)' }}>✎ {t('change')}</button>
              </div>
              <div style={{ padding: '8px 12px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(120,80,255,0.7)', letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: 'var(--font-dm)' }}>✦ {t('general')}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', marginTop: '3px', fontFamily: 'var(--font-dm)', fontWeight: 500 }}>{videoModels.find(m => m.id === selectedVideoModelId)?.name ?? t('loading')}</div>
              </div>
            </div>

            {/* Frames */}
            {!isSeedanceV2 && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {(['start', 'end'] as const).map(type => {
                const frame = type === 'start' ? startFrame : endFrame;
                const ref = type === 'start' ? startFrameRef : endFrameRef;
                return (
                  <div key={type} style={{ position: 'relative', aspectRatio: '1' }}>
                    <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFrameUpload(e.target.files[0], type)} />
                    <div onClick={() => ref.current?.click()} style={{ background: '#0c0c14', border: `0.5px solid ${frame ? 'rgba(83,47,207,0.5)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: 'pointer', overflow: 'hidden', position: 'relative', transition: 'border-color 0.15s' }}>
                      {frame ? (
                        <img src={frame} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <>
                          <span style={{ position: 'absolute', top: '6px', right: '8px', fontSize: '8px', color: 'rgba(255,255,255,0.22)', fontFamily: 'var(--font-dm)' }}>{t('optional')}</span>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-dm)' }}>{type === 'start' ? t('startFrame') : t('endFrame')}</span>
                        </>
                      )}
                    </div>
                    {frame && (
                      <div onClick={() => type === 'start' ? setStartFrame(null) : setEndFrame(null)} style={{ position: 'absolute', top: '5px', right: '5px', width: '18px', height: '18px', background: 'rgba(10,10,14,0.85)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '11px', color: 'rgba(255,255,255,0.7)', zIndex: 10 }}>×</div>
                    )}
                  </div>
                );
              })}
            </div>}

            {/* Audio toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-dm)', color: audioEnabled ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s', cursor: 'pointer' }} onClick={() => setAudioEnabled(v => !v)}>{t('audio')}</span>
              <div onClick={() => setAudioEnabled(v => !v)} style={{ width: '32px', height: '18px', background: audioEnabled ? 'rgba(83,47,207,0.8)' : 'rgba(255,255,255,0.1)', borderRadius: '20px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ width: '14px', height: '14px', background: 'white', borderRadius: '50%', position: 'absolute', left: audioEnabled ? '16px' : '2px', top: '2px', transition: 'left 0.2s' }} />
              </div>
            </div>

            {/* Seedance 2.0 media panel */}
            {isSeedanceV2 && (
              <div style={{ marginBottom: '6px' }}>
                <input ref={mediaUploadRef} type="file" accept="image/*,audio/*,video/*" multiple style={{ display: 'none' }} onChange={e => { handleMediaUpload(e.target.files); e.target.value = ''; }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
                  {mediaAssets.map(asset => (
                    <div key={asset.id} onClick={() => !asset.uploading && setPreviewAsset(asset)} style={{ position: 'relative', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', cursor: asset.uploading ? 'default' : 'pointer' }}>
                      {asset.type === 'image' && <img src={asset.url} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      {asset.type === 'video' && <video src={asset.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />}
                      {asset.type === 'audio' && (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(40,20,70,0.6)' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '28px', padding: '0 8px' }}>
                            {[10,18,12,22,16,26,14,20,10,18,12,22,16,14].map((h, j) => (
                              <div key={j} style={{ width: '3px', height: `${h}px`, background: 'rgba(160,120,255,0.55)', borderRadius: '2px', flexShrink: 0 }} />
                            ))}
                          </div>
                          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-dm)', textAlign: 'center', padding: '0 4px', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{asset.name}</span>
                        </div>
                      )}
                      {asset.uploading && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                        </div>
                      )}
                      {!asset.uploading && (
                        <div style={{ position: 'absolute', top: '4px', left: '4px', background: 'rgba(0,0,0,0.6)', borderRadius: '4px', padding: '2px 4px', display: 'flex', alignItems: 'center' }}>
                          {asset.type === 'image' && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(120,180,255,0.9)" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
                          {asset.type === 'video' && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(120,255,180,0.9)" strokeWidth="2" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>}
                          {asset.type === 'audio' && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(160,120,255,0.9)" strokeWidth="2" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}
                        </div>
                      )}
                      {!asset.uploading && <button onClick={e => { e.stopPropagation(); setMediaAssets(p => p.filter(a => a.id !== asset.id)); }} style={{ position: 'absolute', top: '3px', right: '3px', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0 }}>×</button>}
                    </div>
                  ))}
                  <div onClick={() => mediaUploadRef.current?.click()} style={{ aspectRatio: '1', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '0.5px dashed rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.25)', fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</div>
                </div>
              </div>
            )}

            {/* Prompt textarea */}
            <div
              className={`prompt-bar-orbit${isPromptFocused ? ' prompt-bar-focused' : ''}${generatingCount > 0 ? ' prompt-bar-loading' : ''}`}
              style={{ borderRadius: '12px', position: 'relative', background: 'rgba(10,10,14,0.97)' }}
            >
              <div style={{ position: 'relative' }}>
                {/* Overlay for inline @mention chips */}
                <div
                  ref={overlayRef}
                  aria-hidden
                  style={{
                    position: 'absolute', inset: 0,
                    padding: '10px 12px',
                    fontSize: '13px', lineHeight: 1.6,
                    fontFamily: 'var(--font-dm)',
                    pointerEvents: 'none',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    overflowY: 'hidden', borderRadius: '10px',
                    zIndex: 0,
                  }}
                >
                  {renderPromptChips(prompt)}
                </div>
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={e => handlePromptChange(e.target.value)}
                  onScroll={e => { if (overlayRef.current) overlayRef.current.scrollTop = (e.target as HTMLTextAreaElement).scrollTop; }}
                  onFocus={() => setIsPromptFocused(true)}
                  onBlur={() => { setIsPromptFocused(false); setTimeout(() => setShowAtMenu(false), 150); }}
                  placeholder={prompt ? '' : t('promptPlaceholder')}
                  style={{ background: 'transparent', border: 'none', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'transparent', caretColor: 'rgba(255,255,255,0.85)', flex: 1, minHeight: '110px', resize: 'none', outline: 'none', width: '100%', fontFamily: 'var(--font-dm)', boxSizing: 'border-box', lineHeight: 1.6, display: 'block', position: 'relative', zIndex: 1 }}
                />
              </div>
              {/* @ mention menu */}
              {showAtMenu && mediaAssets.length > 0 && (
                <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0, background: 'rgba(12,12,18,0.98)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                  <div style={{ padding: '6px 10px 4px', fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-dm)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Insert reference</div>
                  {mediaAssets.map(asset => (
                    <button key={asset.id} onMouseDown={e => { e.preventDefault(); insertAtMention(asset, textareaRef); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-dm)' }}>
                      {/* Thumbnail preview */}
                      <div style={{ width: '28px', height: '28px', borderRadius: '5px', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {asset.type === 'image' && <img src={asset.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        {asset.type === 'video' && <video src={asset.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />}
                        {asset.type === 'audio' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(160,120,255,0.8)" strokeWidth="1.5" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}
                      </div>
                      <span style={{ color: asset.type === 'image' ? 'rgba(120,180,255,0.9)' : asset.type === 'audio' ? 'rgba(160,120,255,0.9)' : 'rgba(120,255,180,0.9)' }}>@{asset.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* @ Elements button (Seedance 2.0 only) */}
            {isSeedanceV2 && mediaAssets.length > 0 && (
              <div style={{ marginTop: '4px', display: 'flex', gap: '6px' }}>
                <button onClick={() => setShowAtMenu(v => !v)} style={{ height: '24px', padding: '0 10px', borderRadius: '6px', background: showAtMenu ? 'rgba(83,47,207,0.15)' : 'rgba(255,255,255,0.04)', border: showAtMenu ? '0.5px solid rgba(83,47,207,0.4)' : '0.5px solid rgba(255,255,255,0.08)', color: showAtMenu ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.4)', fontSize: '11px', fontFamily: 'var(--font-dm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>@</span> Elements
                </button>
              </div>
            )}

          </div>

          {error && <div style={{ fontSize: '11px', color: '#ef4444', fontFamily: 'var(--font-dm)', padding: '6px 12px', lineHeight: 1.5, wordBreak: 'break-word' }}>{error}</div>}

          {/* Footer */}
          <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Model select — outside scroll container so dropdown is never clipped */}
            <div style={{ position: 'relative' }} data-menu="true">
              <div onClick={e => { e.stopPropagation(); setShowModelMenu(v => !v); setShowQualityMenu(false); setShowAspectMenu(false); setShowDurationMenu(false); }} style={{ background: showModelMenu ? 'rgba(83,47,207,0.1)' : 'rgba(255,255,255,0.03)', border: showModelMenu ? '0.5px solid rgba(83,47,207,0.4)' : '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.15s' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-dm)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>{t('model')}</div>
                  <div style={{ fontSize: '12px', fontFamily: 'var(--font-dm)', fontWeight: 500, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(120,80,255,0.8)', flexShrink: 0 }} />
                    {videoModels.find(m => m.id === selectedVideoModelId)?.name ?? t('loading')}
                  </div>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {showModelMenu && (() => {
                const providerNames: Record<string, string> = { google: 'Google', alibaba: 'Alibaba', kling: 'Kling', bytedance: 'ByteDance' };
                const providerIcons: Record<string, React.ReactNode> = {
                  google: (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  ),
                  alibaba: (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L3 20h3.5l1.5-3.5h8l1.5 3.5H21L12 2zm-2.2 11.5L12 8l2.2 5.5h-4.4z" fill="rgba(255,106,0,0.85)"/>
                    </svg>
                  ),
                  kling: (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M19 3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3l5 6-5 6V6z" fill="rgba(100,180,255,0.85)"/>
                    </svg>
                  ),
                  bytedance: (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <polygon points="2,3 5,3 4,20 1,20" fill="#3951CC"/>
                      <polygon points="8,10 11,10 10,20 7,20" fill="#5B86F0"/>
                      <polygon points="13,12 16,12 15,20 12,20" fill="#00C8C0"/>
                      <polygon points="19,4 22,4 21,20 18,20" fill="#5EE8D8"/>
                    </svg>
                  ),
                };
                const groups = videoModels.reduce((acc, m) => {
                  const p = m.provider || 'other';
                  if (!acc[p]) acc[p] = [];
                  acc[p].push(m);
                  return acc;
                }, {} as Record<string, typeof videoModels>);
                return (
                  <div data-menu="true" style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0, background: 'rgba(12,12,18,0.98)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflowY: 'auto', overflowX: 'hidden', maxHeight: '60vh', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                    {Object.entries(groups).map(([provider, providerModels], gi) => (
                      <div key={provider}>
                        <div style={{ padding: '8px 12px 5px', borderTop: gi > 0 ? '0.5px solid rgba(255,255,255,0.06)' : 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '8px' }}>✦</span>
                          {providerIcons[provider]}
                          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', fontFamily: 'var(--font-dm)' }}>
                            {providerNames[provider] || provider}
                          </span>
                        </div>
                        {providerModels.map(m => {
                          const credits = m.pricing.find(p => p.quality === quality)?.credits ?? m.pricing[0]?.credits;
                          const isSelected = selectedVideoModelId === m.id;
                          return (
                            <button key={m.id} onClick={() => { if (isSeedanceV2 && !m.name?.startsWith('Seedance 2.0')) { setPrompt(''); setMediaAssets([]); } setSelectedVideoModelId(m.id); setShowModelMenu(false); if (m.name === 'Kling Motion Control') { setActiveTab('motion-control'); } }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '8px 12px', background: isSelected ? 'rgba(83,47,207,0.12)' : 'none', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}>
                              <div>
                                <div style={{ fontSize: '12px', fontFamily: 'var(--font-dm)', fontWeight: 500, color: isSelected ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.75)' }}>{m.name}</div>
                                {credits && <div style={{ fontSize: '10px', fontFamily: 'var(--font-dm)', color: 'rgba(255,255,255,0.28)', marginTop: '1px' }}>{credits} credit/s</div>}
                              </div>
                              {isSelected && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(160,120,255,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { label: `◷ ${duration}s`, show: showDurationMenu, toggle: () => { setShowDurationMenu(v => !v); setShowQualityMenu(false); setShowAspectMenu(false); setShowModelMenu(false); }, items: getDurationOptions(selectedVideoModel).map(d => ({ label: `${d}s`, value: d, active: duration === d, onClick: () => { setDuration(d); setShowDurationMenu(false); } })) },
                { label: `▭ ${aspectRatio}`, show: showAspectMenu, toggle: () => { setShowAspectMenu(v => !v); setShowQualityMenu(false); setShowDurationMenu(false); setShowModelMenu(false); }, items: (['9:16','16:9','1:1'] as const).map(r => ({ label: r, value: r, active: aspectRatio === r, onClick: () => { setAspectRatio(r); setShowAspectMenu(false); } })) },
                { label: `◇ ${quality}`, show: showQualityMenu, toggle: () => { setShowQualityMenu(v => !v); setShowAspectMenu(false); setShowDurationMenu(false); setShowModelMenu(false); }, items: (['720p','1080p'] as const).map(q => ({ label: q, value: q, active: quality === q, onClick: () => { setQuality(q); setShowQualityMenu(false); } })) },
              ].map(({ label, show, toggle, items }) => (
                <div key={label} style={{ flex: 1, position: 'relative' }} data-menu="true">
                  <div onClick={e => { e.stopPropagation(); toggle(); }} style={{ background: show ? 'rgba(83,47,207,0.1)' : 'rgba(255,255,255,0.04)', border: show ? '0.5px solid rgba(83,47,207,0.35)' : '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '7px 4px', textAlign: 'center', fontSize: '11px', color: show ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'var(--font-dm)', transition: 'all 0.15s' }}>{label}</div>
                  {show && (
                    <div data-menu="true" style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0, background: 'rgba(12,12,18,0.98)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                      {items.map(item => (
                        <div key={String(item.value)} onClick={item.onClick} style={{ padding: '8px 12px', fontSize: '12px', color: item.active ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.55)', background: item.active ? 'rgba(83,47,207,0.1)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-dm)' }}>
                          {item.label}
                          {item.active && <span style={{ fontSize: '10px' }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || !selectedVideoModelId || (creditCount !== null && creditCount < videoCreditCost)}
              style={{
                background: (creditCount !== null && creditCount <= 0) ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #7c5cf0 0%, #9b7eff 100%)',
                border: (creditCount !== null && creditCount <= 0) ? '0.5px solid rgba(255,255,255,0.08)' : 'none',
                borderRadius: '11px', padding: '13px', fontSize: '13px', fontWeight: 700,
                fontFamily: 'var(--font-dm)', letterSpacing: '0.1px',
                color: (creditCount !== null && creditCount <= 0) ? 'rgba(255,255,255,0.25)' : '#fff',
                cursor: (creditCount !== null && creditCount <= 0) ? 'not-allowed' : 'pointer',
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                boxShadow: (creditCount !== null && creditCount <= 0) ? 'none' : '0 4px 20px rgba(83,47,207,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                transition: 'opacity 0.2s',
              }}
            >
              {(creditCount !== null && creditCount <= 0) ? (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/></svg>{t('noCredits')}</>
              ) : (
                <>
                  <span style={{ fontSize: '10px', color: 'rgba(220,200,255,0.9)' }}>✦</span>
                  {t('generate')}
                  <span style={{ color: 'rgba(200,170,255,0.7)', fontSize: '11px', fontWeight: 500 }}>· {videoCreditCost}</span>
                  {generatingCount > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '2px', color: 'rgba(255,255,255,0.6)', fontSize: '10px', fontWeight: 400 }}>
                      <div style={{ width: '8px', height: '8px', border: '1.5px solid rgba(255,255,255,0.4)', borderTop: '1.5px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                      {generatingCount}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
            </>
          )}

          {activeTab === 'motion-control' && (
            <>
              {/* Hidden file inputs */}
              <input ref={mcMotionVideoRef} type="file" accept="video/mp4,video/webm,video/quicktime,.mov" style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && handleMcUpload(e.target.files[0], 'motionVideo')} />
              <input ref={mcCharacterImageRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && handleMcUpload(e.target.files[0], 'characterImage')} />

              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

                {/* Upload boxes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {/* Motion video upload */}
                  <div style={{ position: 'relative', aspectRatio: '1' }}>
                    <div
                      onClick={() => mcMotionVideoRef.current?.click()}
                      style={{ background: '#0c0c14', border: `0.5px solid ${mcMotionVideoUrl && !mcMotionVideoUrl.startsWith('blob:') ? 'rgba(83,47,207,0.5)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: 'pointer', overflow: 'hidden', position: 'relative', transition: 'border-color 0.15s' }}
                    >
                      {mcMotionVideoUrl ? (
                        <video src={mcMotionVideoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-dm)', textAlign: 'center', lineHeight: 1.4, padding: '0 4px' }}>Add motion to copy</span>
                          <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-dm)' }}>3–30s video</span>
                        </>
                      )}
                    </div>
                    {mcMotionVideoUrl && (
                      <div onClick={() => setMcMotionVideoUrl(null)} style={{ position: 'absolute', top: '5px', right: '5px', width: '18px', height: '18px', background: 'rgba(10,10,14,0.85)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '11px', color: 'rgba(255,255,255,0.7)', zIndex: 10 }}>×</div>
                    )}
                  </div>

                  {/* Character image upload */}
                  <div style={{ position: 'relative', aspectRatio: '1' }}>
                    <div
                      onClick={() => mcCharacterImageRef.current?.click()}
                      style={{ background: '#0c0c14', border: `0.5px solid ${mcCharacterImageUrl && !mcCharacterImageUrl.startsWith('blob:') ? 'rgba(83,47,207,0.5)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: 'pointer', overflow: 'hidden', position: 'relative', transition: 'border-color 0.15s' }}
                    >
                      {mcCharacterImageUrl ? (
                        <img src={mcCharacterImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-dm)', textAlign: 'center', lineHeight: 1.4, padding: '0 4px' }}>Add your character</span>
                          <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-dm)' }}>Face + body visible</span>
                        </>
                      )}
                    </div>
                    {mcCharacterImageUrl && (
                      <div onClick={() => setMcCharacterImageUrl(null)} style={{ position: 'absolute', top: '5px', right: '5px', width: '18px', height: '18px', background: 'rgba(10,10,14,0.85)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '11px', color: 'rgba(255,255,255,0.7)', zIndex: 10 }}>×</div>
                    )}
                  </div>
                </div>

                {/* Model label */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '9px 12px' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-dm)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Model</div>
                  <div style={{ fontSize: '12px', fontFamily: 'var(--font-dm)', fontWeight: 500, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(120,80,255,0.8)', flexShrink: 0 }} />
                    Kling Motion Control
                  </div>
                </div>

                {/* Quality selector */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['720p', '1080p'] as const).map(q => (
                    <button
                      key={q}
                      onClick={() => setMcQuality(q)}
                      style={{ flex: 1, padding: '7px 4px', background: mcQuality === q ? 'rgba(83,47,207,0.1)' : 'rgba(255,255,255,0.04)', border: mcQuality === q ? '0.5px solid rgba(83,47,207,0.35)' : '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px', color: mcQuality === q ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'var(--font-dm)', transition: 'all 0.15s' }}
                    >
                      ◇ {q}
                    </button>
                  ))}
                </div>

                {/* Scene control mode */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-dm)', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.2px' }}>Scene control mode</span>
                    <div
                      onClick={() => setMcCharacterOrientation(v => v === 'image' ? 'video' : 'image')}
                      style={{ width: '32px', height: '18px', background: mcCharacterOrientation === 'video' ? 'rgba(83,47,207,0.8)' : 'rgba(255,255,255,0.1)', borderRadius: '20px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
                    >
                      <div style={{ width: '14px', height: '14px', background: 'white', borderRadius: '50%', position: 'absolute', left: mcCharacterOrientation === 'video' ? '16px' : '2px', top: '2px', transition: 'left 0.2s' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['video', 'image'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setMcCharacterOrientation(mode)}
                        style={{ flex: 1, padding: '6px 4px', background: mcCharacterOrientation === mode ? 'rgba(83,47,207,0.12)' : 'rgba(255,255,255,0.03)', border: mcCharacterOrientation === mode ? '0.5px solid rgba(83,47,207,0.35)' : '0.5px solid rgba(255,255,255,0.07)', borderRadius: '7px', fontSize: '11px', color: mcCharacterOrientation === mode ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.3)', cursor: 'pointer', fontFamily: 'var(--font-dm)', transition: 'all 0.15s', textTransform: 'capitalize' }}
                      >
                        {mode === 'video' ? 'Video' : 'Image'}
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-dm)', lineHeight: 1.4 }}>
                    {mcCharacterOrientation === 'video'
                      ? 'Background from motion video (up to 30s)'
                      : 'Background from character image (up to 10s)'}
                  </span>
                </div>

                {/* Optional prompt */}
                <textarea
                  value={mcPrompt}
                  onChange={e => setMcPrompt(e.target.value)}
                  placeholder="Optional prompt..."
                  style={{ background: 'rgba(10,10,14,0.97)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'rgba(255,255,255,0.85)', minHeight: '60px', resize: 'none', outline: 'none', width: '100%', fontFamily: 'var(--font-dm)', boxSizing: 'border-box', lineHeight: 1.6 }}
                />

              </div>

              {/* MC Footer */}
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '10px 12px' }}>
                <button
                  onClick={handleMcGenerate}
                  disabled={
                    isMcGenerating ||
                    !mcMotionVideoUrl || mcMotionVideoUrl.startsWith('blob:') ||
                    !mcCharacterImageUrl || mcCharacterImageUrl.startsWith('blob:') ||
                    creditCount === null || creditCount < mcCreditCost
                  }
                  style={{
                    background: (creditCount === null || creditCount < mcCreditCost || !mcMotionVideoUrl || mcMotionVideoUrl.startsWith('blob:') || !mcCharacterImageUrl || mcCharacterImageUrl.startsWith('blob:')) ? 'rgba(255,255,255,0.04)' : isMcGenerating ? 'rgba(83,47,207,0.5)' : 'linear-gradient(135deg, #7c5cf0 0%, #9b7eff 100%)',
                    border: (creditCount === null || creditCount < mcCreditCost || !mcMotionVideoUrl || mcMotionVideoUrl.startsWith('blob:') || !mcCharacterImageUrl || mcCharacterImageUrl.startsWith('blob:')) ? '0.5px solid rgba(255,255,255,0.08)' : 'none',
                    borderRadius: '11px', padding: '13px', fontSize: '13px', fontWeight: 700,
                    fontFamily: 'var(--font-dm)', letterSpacing: '0.1px',
                    color: (creditCount === null || creditCount < mcCreditCost || !mcMotionVideoUrl || mcMotionVideoUrl.startsWith('blob:') || !mcCharacterImageUrl || mcCharacterImageUrl.startsWith('blob:')) ? 'rgba(255,255,255,0.25)' : '#fff',
                    cursor: (isMcGenerating || !mcMotionVideoUrl || mcMotionVideoUrl.startsWith('blob:') || !mcCharacterImageUrl || mcCharacterImageUrl.startsWith('blob:')) ? 'not-allowed' : 'pointer',
                    opacity: isMcGenerating ? 0.85 : 1, width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                    boxShadow: isMcGenerating || (creditCount === null || creditCount < mcCreditCost || !mcMotionVideoUrl || mcMotionVideoUrl.startsWith('blob:') || !mcCharacterImageUrl || mcCharacterImageUrl.startsWith('blob:')) ? 'none' : '0 4px 20px rgba(83,47,207,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                    transition: 'opacity 0.2s',
                  }}
                >
                  {isMcGenerating ? (
                    <><div style={{ width: '13px', height: '13px', border: '1.5px solid rgba(255,255,255,0.35)', borderTop: '1.5px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />{status || 'Generating...'}</>
                  ) : (creditCount === null || creditCount < mcCreditCost) ? (
                    <>No Credits</>
                  ) : (
                    <><span style={{ fontSize: '10px', color: 'rgba(220,200,255,0.9)' }}>✦</span>Generate<span style={{ color: 'rgba(200,170,255,0.7)', fontSize: '11px', fontWeight: 500 }}>· {mcCreditCost}</span></>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* CENTER PANEL — scrollable feed */}
        <div ref={feedRef} className="feed" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0, minHeight: 0 }}>
          {/* Generating placeholders */}
          {Array.from({ length: generatingCount }).map((_, i) => (
            <div key={i} style={{ width: '100%', aspectRatio: '16/9', background: 'var(--bg-card)', border: 'var(--border)', borderRadius: 'var(--radius-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', border: '2px solid var(--accent)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('generating')}</span>
            </div>
          ))}
          {/* Empty state */}
          {videos.length === 0 && generatingCount === 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 154px)', position: 'relative' }}>
              {isLoaded && !isSignedIn ? (
                <div className="hidden md:flex flex-col items-center text-center" style={{ padding: '0 24px' }}>
                  <p className="font-dm mb-5 tracking-[0.2em] uppercase" style={{ fontSize: '11px', color: 'rgba(140,160,220,0.55)', letterSpacing: '0.18em' }}>{t('studioLabel')}</p>
                  <h2 className="font-clash" style={{ fontSize: 'clamp(44px, 6vw, 72px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #7090e8 0%, #5b7fe0 35%, #8ba4f0 65%, #a8c0ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', maxWidth: '680px' }}>
                    {t('heroTitle')}
                  </h2>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '8px 0' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(83,47,207,0.1)', border: '0.5px solid rgba(83,47,207,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(120,80,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <span className="font-clash" style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>No videos yet</span>
                    <span className="font-dm" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', maxWidth: '160px', lineHeight: 1.5 }}>Enter a prompt and hit Generate to create your first video</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Video list */}
          {videos.map(v => (
            <div key={v.id} style={{ width: '100%', background: 'var(--bg-card)', border: 'var(--border)', borderRadius: 'var(--radius-card)', overflow: 'hidden', flexShrink: 0, display: 'flex' }}>
              {/* Video */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', minHeight: '160px' }}
                  onMouseEnter={e => {
                    const el = e.currentTarget.querySelector('.video-actions') as HTMLElement;
                    const dl = e.currentTarget.querySelector('.download-btn') as HTMLElement;
                    if (el) el.style.opacity = '1';
                    if (dl) dl.style.display = 'flex';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget.querySelector('.video-actions') as HTMLElement;
                    const dl = e.currentTarget.querySelector('.download-btn') as HTMLElement;
                    if (el) el.style.opacity = likedVideos.has(v.id) ? '1' : '0';
                    if (dl && likedVideos.has(v.id)) dl.style.display = 'none';
                  }}
                >
                  <video
                    src={v.videoUrl?.includes('generativelanguage.googleapis.com') ? `/api/video-proxy?url=${encodeURIComponent(v.videoUrl)}` : v.videoUrl}
                    controls loop
                    style={{ width: '100%', display: 'block', maxHeight: '80vh', minHeight: '160px', objectFit: 'contain', background: '#000' }}
                  />

                  {/* Delete confirmation overlay */}
                  {confirmingDeleteId === v.id && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 40 }} onClick={e => e.stopPropagation()}>
                      <p className="font-dm" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', textAlign: 'center', padding: '0 16px' }}>Delete this video?</p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setConfirmingDeleteId(null)} className="font-dm" style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '12px', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => { setConfirmingDeleteId(null); deleteVideo(v.id); }} className="font-dm" style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '12px', background: 'rgba(200,40,40,0.8)', border: 'none', color: '#fff', cursor: 'pointer' }}>Delete</button>
                      </div>
                    </div>
                  )}

                  {/* Hover actions */}
                  <div className="video-actions" style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px', opacity: likedVideos.has(v.id) ? 1 : 0, transition: 'opacity 0.2s', zIndex: 30 }}>
                    <button className="download-btn" onClick={() => downloadVideo(v.videoUrl, v.id)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button onClick={() => toggleLike(v.id)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: likedVideos.has(v.id) ? 'var(--accent-subtle, rgba(83,47,207,0.13))' : 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={likedVideos.has(v.id) ? 'var(--accent)' : 'none'} stroke={likedVideos.has(v.id) ? 'var(--accent)' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </button>
                    <button onClick={() => setConfirmingDeleteId(v.id)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,60,60,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,100,100,0.9)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                </div>
                {/* Mobile action bar — inside video container, always below video */}
                <div className="mobile-action-bar" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '10px 12px', gap: '8px', alignItems: 'center' }}>
                  <button onClick={() => setPrompt(v.prompt)} className="font-dm" style={{ flex: 1, padding: '9px 10px', borderRadius: '8px', background: 'rgba(83,47,207,0.08)', border: '0.5px solid rgba(83,47,207,0.25)', color: 'rgba(160,120,255,0.85)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 500 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Use prompt
                  </button>
                  <button onClick={() => downloadVideo(v.videoUrl, v.id)} style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                  {confirmingDeleteId === v.id ? (
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => setConfirmingDeleteId(null)} className="font-dm" style={{ padding: '0 12px', height: '38px', borderRadius: '8px', fontSize: '12px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={() => { setConfirmingDeleteId(null); deleteVideo(v.id); }} className="font-dm" style={{ padding: '0 12px', height: '38px', borderRadius: '8px', fontSize: '12px', background: 'rgba(180,30,30,0.8)', border: 'none', color: '#fff', cursor: 'pointer' }}>Delete</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmingDeleteId(v.id)} style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(255,40,40,0.08)', border: '0.5px solid rgba(255,40,40,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,80,80,0.6)', flexShrink: 0 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    </button>
                  )}
                </div>
              </div>
              {/* Info sidebar — desktop only */}
              <div className="video-sidebar" style={{ padding: '14px', gap: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)' }}></div>
                  {v.model ?? 'Kling 3.0'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.6', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as const }}>
                  {v.prompt}
                </div>
                <div style={{ height: '0.5px', background: '#1a1a1a' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>👁 {v.quality || '720p'}</span>
                  <span>◷ {v.duration || 5}s</span>
                  <span>▭ {v.aspectRatio || '9:16'}</span>
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Use prompt */}
                  <button
                    onClick={() => { setPrompt(v.prompt); }}
                    className="font-dm"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(83,47,207,0.08)', border: '0.5px solid rgba(83,47,207,0.25)', color: 'rgba(160,120,255,0.85)', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(83,47,207,0.15)'; e.currentTarget.style.borderColor = 'rgba(83,47,207,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(83,47,207,0.08)'; e.currentTarget.style.borderColor = 'rgba(83,47,207,0.25)'; }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Use prompt
                  </button>
                  {/* Download */}
                  <button
                    onClick={() => downloadVideo(v.videoUrl, v.id)}
                    className="font-dm"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    {v.createdAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  {/* Delete */}
                  {confirmingDeleteId === v.id ? (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => setConfirmingDeleteId(null)} className="font-dm" style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={() => { setConfirmingDeleteId(null); deleteVideo(v.id); }} className="font-dm" style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', background: 'rgba(180,30,30,0.7)', border: 'none', color: '#fff', cursor: 'pointer' }}>Delete</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmingDeleteId(v.id)} style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'rgba(255,40,40,0.08)', border: '0.5px solid rgba(255,40,40,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,80,80,0.6)', flexShrink: 0, transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,40,40,0.18)'; e.currentTarget.style.color = 'rgba(255,80,80,1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,40,40,0.08)'; e.currentTarget.style.color = 'rgba(255,80,80,0.6)'; }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    </button>
                  )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
      {/* MOBILE PROMPT BAR — same style as images PromptBar */}
      <div className="md:hidden fixed left-0 right-0 z-[110] px-3 pb-3 pointer-events-none" style={{ bottom: 'calc(65px + env(safe-area-inset-bottom, 0px))' }}>
        {/* Purple glow */}
        <div aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={{ bottom: 0, width: '100%', height: '180px', zIndex: -1 }}>
          <div style={{ position: 'absolute', bottom: 0, left: '10%', right: '10%', height: '160px', background: 'radial-gradient(ellipse at 50% 100%, rgba(83,47,207,0.2) 0%, rgba(83,47,207,0.05) 45%, transparent 70%)', pointerEvents: 'none' }} />
        </div>

        <div className={`pointer-events-auto prompt-bar-orbit${generatingCount > 0 ? ' prompt-bar-loading' : ''}`}>
          <div style={{ background: 'rgba(10,10,14,0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 -1px 0 rgba(255,255,255,0.04) inset' }}>

            {/* Frames preview strip (when options open) */}
            {mobileShowOptions && (
              <div style={{ padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                {/* Frames */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {(['start', 'end'] as const).map(type => {
                    const frame = type === 'start' ? startFrame : endFrame;
                    const ref = type === 'start' ? mobileStartFrameRef : mobileEndFrameRef;
                    return (
                      <div key={type} style={{ position: 'relative', height: '64px' }}>
                        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFrameUpload(e.target.files[0], type)} />
                        <div onClick={() => ref.current?.click()} style={{ background: 'rgba(255,255,255,0.03)', border: `0.5px solid ${frame ? 'rgba(83,47,207,0.5)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', overflow: 'hidden' }}>
                          {frame ? (
                            <img src={frame} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-dm)' }}>{type === 'start' ? t('startFrame') : t('endFrame')}</span>
                            </>
                          )}
                        </div>
                        {frame && <div onClick={() => type === 'start' ? setStartFrame(null) : setEndFrame(null)} style={{ position: 'absolute', top: '4px', right: '4px', width: '18px', height: '18px', background: 'rgba(10,10,14,0.85)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>×</div>}
                      </div>
                    );
                  })}
                </div>
                {/* Model selector in options */}
                <div onClick={() => setMobileShowModelMenu(v => !v)} style={{ background: mobileShowModelMenu ? 'rgba(83,47,207,0.1)' : 'rgba(255,255,255,0.03)', border: mobileShowModelMenu ? '0.5px solid rgba(83,47,207,0.35)' : '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(120,80,255,0.8)', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', fontFamily: 'var(--font-dm)', fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>{videoModels.find(m => m.id === selectedVideoModelId)?.name ?? t('loading')}</span>
                  </div>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                {mobileShowModelMenu && (
                  <div style={{ background: 'rgba(12,12,18,0.99)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                    {videoModels.map(m => (
                      <button key={m.id} onClick={() => { if (isSeedanceV2 && !m.name?.startsWith('Seedance 2.0')) { setPrompt(''); setMediaAssets([]); } setSelectedVideoModelId(m.id); setMobileShowModelMenu(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '10px 14px', background: selectedVideoModelId === m.id ? 'rgba(83,47,207,0.12)' : 'none', border: 'none', cursor: 'pointer' }}>
                        <span style={{ fontSize: '12px', fontFamily: 'var(--font-dm)', fontWeight: 500, color: selectedVideoModelId === m.id ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.75)' }}>{m.name}</span>
                        {selectedVideoModelId === m.id && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(160,120,255,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                    ))}
                  </div>
                )}
                {error && <div style={{ fontSize: '11px', color: '#ef4444', fontFamily: 'var(--font-dm)', paddingBottom: '2px' }}>{error}</div>}
                <div style={{ height: '4px' }} />
              </div>
            )}

            {/* Mobile Seedance 2.0 media panel */}
            {isSeedanceV2 && (
              <div style={{ padding: '10px 14px 0' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {mediaAssets.map(asset => (
                    <div key={asset.id} onClick={() => !asset.uploading && setPreviewAsset(asset)} style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', cursor: asset.uploading ? 'default' : 'pointer' }}>
                      {asset.type === 'image' && <img src={asset.url} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      {asset.type === 'video' && <video src={asset.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />}
                      {asset.type === 'audio' && (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(83,47,207,0.15)' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(160,120,255,0.7)" strokeWidth="1.5" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                        </div>
                      )}
                      {asset.uploading && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                        </div>
                      )}
                      {!asset.uploading && <div style={{ position: 'absolute', top: '3px', left: '3px', background: 'rgba(0,0,0,0.65)', borderRadius: '4px', padding: '2px 3px', display: 'flex', alignItems: 'center' }}>
                        {asset.type === 'image' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(120,180,255,0.9)" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
                        {asset.type === 'video' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(120,255,180,0.9)" strokeWidth="2" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>}
                        {asset.type === 'audio' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(160,120,255,0.9)" strokeWidth="2" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}
                      </div>}
                      {!asset.uploading && <button onClick={e => { e.stopPropagation(); setMediaAssets(p => p.filter(a => a.id !== asset.id)); }} style={{ position: 'absolute', top: '2px', right: '2px', width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>}
                    </div>
                  ))}
                  <button onClick={() => mediaUploadRef.current?.click()} style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '0.5px dashed rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.3)', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                </div>
              </div>
            )}

            {/* Textarea */}
            <div style={{ padding: '14px 14px 8px', position: 'relative' }}>
              <textarea
                ref={mobileTextareaRef}
                value={prompt}
                onChange={e => handlePromptChange(e.target.value)}
                placeholder={t('promptPlaceholder')}
                rows={1}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isSignedIn) { setShowModal(true); } else { handleGenerate(); } } }}
                onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }}
                onBlur={() => setTimeout(() => setShowAtMenu(false), 150)}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: '16px', lineHeight: '1.6', minHeight: '40px', maxHeight: '120px', overflowY: 'auto', color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-dm)' }}
              />
              {showAtMenu && mediaAssets.length > 0 && (
                <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: '14px', right: '14px', background: 'rgba(12,12,18,0.98)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                  {mediaAssets.map(asset => (
                    <button key={asset.id} onMouseDown={e => { e.preventDefault(); insertAtMention(asset, mobileTextareaRef); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-dm)' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {asset.type === 'image' && <img src={asset.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        {asset.type === 'video' && <video src={asset.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />}
                        {asset.type === 'audio' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(160,120,255,0.8)" strokeWidth="1.5" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}
                      </div>
                      <span style={{ color: asset.type === 'image' ? 'rgba(120,180,255,0.9)' : asset.type === 'audio' ? 'rgba(160,120,255,0.9)' : 'rgba(120,255,180,0.9)' }}>@{asset.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px 10px', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'nowrap', overflow: 'hidden' }}>

                {/* Frames toggle */}
                <button onClick={() => setMobileShowOptions(v => !v)} style={{ height: '30px', padding: '0 10px', borderRadius: '8px', background: mobileShowOptions ? 'rgba(83,47,207,0.15)' : 'rgba(255,255,255,0.05)', border: mobileShowOptions ? '0.5px solid rgba(83,47,207,0.4)' : '0.5px solid rgba(255,255,255,0.08)', color: mobileShowOptions ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontFamily: 'var(--font-dm)', cursor: 'pointer', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  {(startFrame || endFrame) && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(120,80,255,0.9)', display: 'inline-block' }} />}
                </button>

                {/* Duration */}
                <button onClick={() => setDuration(d => d <= 3 ? 10 : d - 1)} style={{ height: '30px', padding: '0 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontFamily: 'var(--font-dm)', cursor: 'pointer', flexShrink: 0 }}>
                  ◷ {duration}s
                </button>

                {/* Aspect ratio */}
                <button onClick={() => { const opts = ['9:16','16:9','1:1'] as const; const i = opts.indexOf(aspectRatio as any); setAspectRatio(opts[(i + 1) % opts.length]); }} style={{ height: '30px', padding: '0 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontFamily: 'var(--font-dm)', cursor: 'pointer', flexShrink: 0 }}>
                  {aspectRatio}
                </button>

                {/* Quality */}
                <button onClick={() => setQuality(q => q === '720p' ? '1080p' : '720p')} style={{ height: '30px', padding: '0 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontFamily: 'var(--font-dm)', cursor: 'pointer', flexShrink: 0 }}>
                  {quality}
                </button>

                {/* Audio */}
                <button onClick={() => setAudioEnabled(v => !v)} style={{ height: '30px', padding: '0 10px', borderRadius: '8px', background: audioEnabled ? 'rgba(83,47,207,0.15)' : 'rgba(255,255,255,0.05)', border: audioEnabled ? '0.5px solid rgba(83,47,207,0.4)' : '0.5px solid rgba(255,255,255,0.08)', color: audioEnabled ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>{audioEnabled ? <><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></> : <line x1="23" y1="9" x2="17" y2="15"/>}</svg>
                </button>
              </div>

              {/* Generate */}
              <button
                onClick={() => { if (!isSignedIn) { setShowModal(true); return; } handleGenerate(); }}
                disabled={!!isSignedIn && (!prompt.trim() || !selectedVideoModelId || (creditCount !== null && creditCount < videoCreditCost))}
                className={`flex-shrink-0 flex items-center gap-1.5 font-dm font-[500] ${isSignedIn && creditCount !== null && creditCount <= 0 ? 'generate-btn-empty' : 'generate-btn'}`}
                style={{ height: '32px', padding: '0 14px', borderRadius: '50px', fontSize: '12px', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/></svg>
                {isSignedIn ? `${t('generate')} · ${videoCreditCost}` : t('tryForFree')}
                {generatingCount > 0 && (
                  <div style={{ width: '8px', height: '8px', border: '1.5px solid rgba(255,255,255,0.4)', borderTop: '1.5px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trim modal */}
      {trimState && (() => {
        const { duration, startTime, endTime } = trimState;
        const segDur = endTime - startTime;
        const over15 = segDur > 15.2;
        const startPct = (startTime / duration) * 100;
        const endPct = (endTime / duration) * 100;
        const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
        const handleSliderDown = (e: React.PointerEvent<HTMLDivElement>) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          const t = ratio * duration;
          const which: 'start' | 'end' = Math.abs(t - startTime) <= Math.abs(t - endTime) ? 'start' : 'end';
          const move = (ev: PointerEvent) => {
            const r = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
            const pos = r * duration;
            setTrimState(s => {
              if (!s) return s;
              if (which === 'start') return { ...s, startTime: Math.max(0, Math.min(pos, s.endTime - 0.2)) };
              return { ...s, endTime: Math.min(s.duration, Math.max(pos, s.startTime + 0.2)) };
            });
          };
          const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
          document.addEventListener('pointermove', move);
          document.addEventListener('pointerup', up);
        };
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#0f0f16', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-dm)' }}>Trim {trimState.mediaType === 'audio' ? 'Audio' : 'Video'}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-dm)', marginTop: '3px' }}>Drag handles to select segment · Max 15s for Seedance 2.0</div>
              </div>
              {trimState.mediaType === 'audio'
                ? <audio src={trimState.objectUrl} controls style={{ width: '100%', height: '36px' }} />
                : <video src={trimState.objectUrl} controls muted style={{ width: '100%', borderRadius: '8px', maxHeight: '180px', background: '#000' }} />
              }
              {/* Time labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-dm)', fontVariantNumeric: 'tabular-nums' }}>{fmt(startTime)}</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-dm)', fontVariantNumeric: 'tabular-nums', color: over15 ? '#ef4444' : 'rgba(160,120,255,0.9)', fontWeight: 500 }}>{segDur.toFixed(1)}s{over15 ? ' ⚠ max 15s' : ''}</span>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-dm)', fontVariantNumeric: 'tabular-nums' }}>{fmt(endTime)}</span>
              </div>
              {/* Two-handle slider */}
              <div
                onPointerDown={handleSliderDown}
                style={{ position: 'relative', height: '28px', cursor: 'pointer', userSelect: 'none' }}
              >
                {/* Track bg */}
                <div style={{ position: 'absolute', top: '12px', left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px' }} />
                {/* Selected range */}
                <div style={{ position: 'absolute', top: '12px', height: '4px', background: over15 ? 'rgba(239,68,68,0.7)' : 'rgba(83,47,207,0.8)', borderRadius: '2px', left: `${startPct}%`, width: `${endPct - startPct}%`, transition: 'background 0.2s' }} />
                {/* Start handle */}
                <div style={{ position: 'absolute', top: '50%', left: `${startPct}%`, transform: 'translate(-50%, -50%)', width: '18px', height: '18px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', cursor: 'grab', zIndex: 2 }} />
                {/* End handle */}
                <div style={{ position: 'absolute', top: '50%', left: `${endPct}%`, transform: 'translate(-50%, -50%)', width: '18px', height: '18px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', cursor: 'grab', zIndex: 2 }} />
                {/* Total duration labels */}
                <div style={{ position: 'absolute', top: '22px', left: 0, fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-dm)' }}>0s</div>
                <div style={{ position: 'absolute', top: '22px', right: 0, fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-dm)' }}>{Math.round(duration)}s</div>
              </div>
              {/* Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button onClick={() => { URL.revokeObjectURL(trimState.objectUrl); setTrimState(null); }} disabled={isTrimming} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: 'var(--font-dm)', cursor: 'pointer' }}>Cancel</button>
                <button onClick={confirmTrim} disabled={isTrimming || over15} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: isTrimming || over15 ? 'rgba(83,47,207,0.35)' : 'rgba(83,47,207,0.85)', color: 'white', fontSize: '13px', fontFamily: 'var(--font-dm)', cursor: isTrimming || over15 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  {isTrimming ? <><div style={{ width: '12px', height: '12px', border: '1.5px solid rgba(255,255,255,0.3)', borderTop: '1.5px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Trimming...</> : `Trim & Add (${segDur.toFixed(1)}s)`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Media preview modal */}
      {previewAsset && (
        <div onClick={() => setPreviewAsset(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', overflow: 'hidden', background: '#0a0a0e' }}>
            <button onClick={() => setPreviewAsset(null)} style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: '0.5px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            <div style={{ padding: '6px 12px 8px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-dm)', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>{previewAsset.name}</div>
            {previewAsset.type === 'image' && (
              <img src={previewAsset.url} alt={previewAsset.name} style={{ display: 'block', maxWidth: '80vw', maxHeight: '80vh', objectFit: 'contain' }} />
            )}
            {previewAsset.type === 'video' && (
              <video src={previewAsset.url} controls autoPlay style={{ display: 'block', maxWidth: '80vw', maxHeight: '80vh' }} />
            )}
            {previewAsset.type === 'audio' && (
              <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', minWidth: '260px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(83,47,207,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(160,120,255,0.8)" strokeWidth="1.5" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                </div>
                <audio src={previewAsset.url} controls style={{ width: '100%' }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* MC Error Modal */}
      {mcError && (
        <div
          onClick={() => setMcError(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#0f0f16', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '0.5px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-dm)', marginBottom: '6px' }}>Generation failed</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-dm)', lineHeight: 1.6 }}>{mcError}</div>
              </div>
            </div>
            <button
              onClick={() => setMcError(null)}
              style={{ alignSelf: 'flex-end', padding: '7px 18px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontFamily: 'var(--font-dm)', cursor: 'pointer' }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
