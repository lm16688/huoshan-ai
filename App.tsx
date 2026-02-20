
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Upload, 
  Type as FontIcon, 
  CheckCircle, 
  Download, 
  Loader2, 
  AlertCircle,
  Plus,
  Zap,
  RotateCcw,
  RotateCw,
  Trash2,
  Video as VideoIcon,
  Play,
  Layers,
  Settings,
  Palette,
  Maximize2,
  Eye,
  EyeOff,
  Languages,
  GripVertical,
  MonitorPlay,
  Menu,
  X,
  Save,
  Clock,
  Scissors,
  Square,
  Key,
  Undo,
  Redo,
  Filter,
  HardDrive,
  // Fix: Added missing ShieldCheck import from lucide-react
  ShieldCheck
} from 'lucide-react';
import { AppStatus, SubtitleSegment, VideoMetadata, SubtitleLanguage } from './types';
import { analyzeVideoWithVolcano } from './services/volcanoService';

type Language = 'en' | 'zh';
type ExportQuality = '480p' | '720p' | '1080p' | '1440p';
type ExportFormat = 'webm' | 'mp4';

const translations = {
  en: {
    title: 'NovaClip',
    subtitle: 'AI Smart Editor',
    export: 'Export',
    styling: 'Style',
    previewSubs: 'Show Subtitles',
    hideSubs: 'Hide Subtitles',
    clearProject: 'Reset',
    timeline: 'Timeline',
    selectedClips: 'Clips',
    smartSelect: 'Select All',
    aiScanResults: 'AI Transcription',
    createProject: 'New Project',
    scanning: 'AI Analyzing...',
    rendering: 'Composing...',
    exportSuccess: 'Export Ready',
    backToEditor: 'Back',
    downloadNow: 'Download',
    textColor: 'Text',
    strokeColor: 'Outline',
    shadowColor: 'Shadow',
    bgColor: 'Background',
    opacity: 'Opacity',
    shadowBlur: 'Blur',
    size: 'Size',
    weight: 'Weight',
    font: 'Font Family',
    resetDefault: 'Reset',
    captionStyle: 'Sub Styles',
    previewAll: 'Preview All',
    stopPreview: 'Stop',
    editClip: 'Edit Clip',
    editCaption: 'Edit Text',
    saveChange: 'Save & Sync',
    textVideoSync: 'Text-Video Sync',
    dragHint: 'Clips added here',
    systemAlert: 'Alert',
    apiKeyNeeded: 'Set API Key',
    authError: 'Auth Failed. Please re-select API Key.',
    undo: 'Undo',
    redo: 'Redo',
    quality: 'Quality',
    filterFiller: 'Prune Redundancy',
    uploadHint: 'Suggest < 500MB. Support MP4, WebM, MOV.',
    totalClips: 'Total Clips',
    totalDuration: 'Total Duration',
    subtitleLanguage: 'Subtitle Language',
    langAuto: 'Auto Detect',
    langEn: 'English',
    langZh: 'Chinese',
    langJa: 'Japanese',
    langKo: 'Korean',
    langFr: 'French',
    langDe: 'German',
    langEs: 'Spanish',
    exportSettings: 'Export Settings',
    burnSubtitles: 'Burn Subtitles',
    format: 'Format',
    progress: 'Progress'
  },
  zh: {
    title: 'NovaClip',
    subtitle: 'AI 智能剪辑',
    export: '导出视频',
    styling: '样式',
    previewSubs: '显示字幕',
    hideSubs: '关闭字幕',
    clearProject: '重置',
    timeline: '剪辑轴',
    selectedClips: '个片段',
    smartSelect: '智能选取',
    aiScanResults: '转录列表',
    createProject: '开启新项目',
    scanning: 'AI 分析中...',
    rendering: '正在合成',
    exportSuccess: '合成成功',
    backToEditor: '返回编辑',
    downloadNow: '立即下载',
    textColor: '文字颜色',
    strokeColor: '描边颜色',
    shadowColor: '阴影颜色',
    bgColor: '背景底色',
    opacity: '不透明度',
    shadowBlur: '模糊',
    size: '字号',
    weight: '粗细',
    font: '字体库',
    resetDefault: '重置',
    captionStyle: '字幕样式设置',
    previewAll: '全片预览',
    stopPreview: '停止',
    editClip: '剪辑片段',
    editCaption: '编辑文字',
    saveChange: '保存同步',
    textVideoSync: '文剪视频预览',
    dragHint: '请从右侧添加片段',
    systemAlert: '系统提示',
    apiKeyNeeded: '设置 API Key',
    authError: '认证失败，请重新选择有效的 API Key。',
    undo: '撤销',
    redo: '重做',
    quality: '导出清晰度',
    filterFiller: '剔除冗余/口气词',
    uploadHint: '建议 < 500MB。支持 MP4, WebM, MOV。',
    totalClips: '总片段数',
    totalDuration: '总有效时长',
    subtitleLanguage: '字幕生成语言',
    langAuto: '自动识别',
    langEn: '英语',
    langZh: '中文',
    langJa: '日语',
    langKo: '韩语',
    langFr: '法语',
    langDe: '德语',
    langEs: '西班牙语',
    exportSettings: '导出设置',
    burnSubtitles: '内嵌字幕',
    format: '视频格式',
    progress: '导出进度'
  }
};

const fontOptions = [
  { label: 'Sans-serif', value: '"Inter", "Microsoft YaHei", sans-serif' },
  { label: 'Serif', value: '"Georgia", "Source Han Serif SC", serif' },
  { label: 'Monospace', value: '"JetBrains Mono", monospace' }
];

const MAX_HISTORY = 50;

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('zh');
  const t = useMemo(() => translations[lang], [lang]);

  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<SubtitleSegment[]>([]);
  
  const [isFilterEnabled, setIsFilterEnabled] = useState(true);
  const [subtitleLang, setSubtitleLang] = useState<SubtitleLanguage>(SubtitleLanguage.AUTO);
  const [exportQuality, setExportQuality] = useState<ExportQuality>('1080p');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('webm');
  const [burnSubtitles, setBurnSubtitles] = useState(true);
  const [exportProgress, setExportProgress] = useState(0);

  const [history, setHistory] = useState<SubtitleSegment[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [processingMsg, setProcessingMsg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  
  const [isKeySelected, setIsKeySelected] = useState(true);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);

  const [subColor, setSubColor] = useState('#ffffff');
  const [subStrokeColor, setSubStrokeColor] = useState('#000000');
  const [subShadowColor, setSubShadowColor] = useState('#000000');
  const [subBgColor, setSubBgColor] = useState('#000000');
  const [subBgOpacity, setSubBgOpacity] = useState(0.5);
  const [subShadowBlur, setSubShadowBlur] = useState(8);
  const [subSizeScale, setSubSizeScale] = useState(1);
  const [subFontWeight, setSubFontWeight] = useState(700);
  const [subFontFamily, setSubFontFamily] = useState(fontOptions[0].value);
  const [isPreviewSubVisible, setIsPreviewSubVisible] = useState(true);
  
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempEditText, setTempEditText] = useState('');
  const [tempStartTime, setTempStartTime] = useState(0);
  const [tempEndTime, setTempEndTime] = useState(0);

  const [currentPreviewText, setCurrentPreviewText] = useState('');
  const [isPreviewingProject, setIsPreviewingProject] = useState(false);
  const [activeClipIndex, setActiveClipIndex] = useState(-1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<number>(null);

  const updateSegmentsWithHistory = useCallback((newSegments: SubtitleSegment[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newSegments);
    
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    } else {
      setHistoryIndex(newHistory.length - 1);
    }
    
    setHistory(newHistory);
    setSelectedSegments(newSegments);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setSelectedSegments(history[newIndex]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setSelectedSegments(history[newIndex]);
    }
  }, [history, historyIndex]);

  const ensureAudioEnabled = (v: HTMLVideoElement | null) => {
    if (!v) return;
    v.muted = false;
    v.volume = 1.0;
  };

  useEffect(() => {
    const checkKey = async () => {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey?.();
      setIsKeySelected(!!hasKey);
    };
    checkKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    await (window as any).aistudio?.openSelectKey?.();
    setIsKeySelected(true);
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, drawBg: boolean) => {
    const words = text.split('');
    let line = '';
    const lines = [];
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n];
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        lines.push(line); line = words[n];
      } else { line = testLine; }
    }
    lines.push(line);

    if (drawBg) {
      const totalHeight = lines.length * lineHeight;
      const maxLineWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
      ctx.save();
      ctx.fillStyle = subBgColor;
      ctx.globalAlpha = subBgOpacity;
      ctx.fillRect(
        x - maxLineWidth / 2 - 15, 
        y - (lines.length - 1) * lineHeight - lineHeight + 10, 
        maxLineWidth + 30, 
        totalHeight + 10
      );
      ctx.restore();
    }

    for (let i = lines.length - 1; i >= 0; i--) {
      ctx.strokeText(lines[i], x, y - (lines.length - 1 - i) * lineHeight);
      ctx.fillText(lines[i], x, y - (lines.length - 1 - i) * lineHeight);
    }
  };

  const syncSubtitles = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;

    const time = v.currentTime;
    
    if (isPreviewingProject && selectedSegments.length > 0) {
      const currentClip = selectedSegments[activeClipIndex];
      if (currentClip) {
        // If we reached the end of the current clip or jumped out of it significantly
        if (time >= currentClip.endTime - 0.02) {
          if (activeClipIndex < selectedSegments.length - 1) {
            const nextIdx = activeClipIndex + 1;
            setActiveClipIndex(nextIdx);
            v.currentTime = selectedSegments[nextIdx].startTime;
            v.play().catch(() => {});
          } else {
            setIsPreviewingProject(false);
            setActiveClipIndex(-1);
            v.pause();
          }
        }
      } else {
        setIsPreviewingProject(false);
        setActiveClipIndex(-1);
      }
    }

    // Find active segment for subtitle display
    let activeSeg: SubtitleSegment | undefined;
    if (isPreviewingProject) {
      activeSeg = selectedSegments[activeClipIndex];
      // Only show if within the clip's bounds
      if (activeSeg && (time < activeSeg.startTime - 0.05 || time > activeSeg.endTime + 0.05)) {
        activeSeg = undefined;
      }
    } else {
      activeSeg = segments.find(s => time >= (s.startTime - 0.03) && time <= (s.endTime + 0.03));
    }

    const newText = activeSeg ? activeSeg.text : '';
    if (newText !== currentPreviewText) {
      setCurrentPreviewText(newText);
    }
  }, [isPreviewingProject, activeClipIndex, selectedSegments, segments, currentPreviewText]);

  useEffect(() => {
    const loop = () => {
      syncSubtitles();
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [syncSubtitles]);

  useEffect(() => {
    const v = modalVideoRef.current;
    if (!v || editingIndex === null) return;
    ensureAudioEnabled(v);
    v.currentTime = tempStartTime;
    v.play().catch(() => {});
    const handleModalUpdate = () => {
      if (v.currentTime >= tempEndTime || v.currentTime < tempStartTime - 0.1) {
        v.currentTime = tempStartTime;
      }
    };
    v.addEventListener('timeupdate', handleModalUpdate);
    return () => v.removeEventListener('timeupdate', handleModalUpdate);
  }, [editingIndex, tempStartTime, tempEndTime]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024 * 1024) {
      setError("Video is too large (>800MB). Performance may degrade.");
    }

    const url = URL.createObjectURL(file);
    setVideo({ name: file.name, size: file.size, duration: 0, url, file });
    setStatus(AppStatus.ANALYZING);
    analyzeVideoWithVolcano(file, subtitleLang, setProcessingMsg)
      .then(res => { setSegments(res); setStatus(AppStatus.READY); })
      .catch(err => {
        if (err?.message?.includes?.('401') || err?.message?.toLowerCase?.()?.includes?.('auth')) {
          setError(t.authError); setIsKeySelected(false);
        } else { setError(err?.message || "Unknown analysis error"); }
        setStatus(AppStatus.IDLE);
      });
  };

  const openEditModal = (index: number) => {
    const seg = selectedSegments[index];
    setEditingIndex(index);
    setTempEditText(seg.text);
    setTempStartTime(seg.startTime);
    setTempEndTime(seg.endTime);
    setActiveClipIndex(index);
    if (videoRef.current) {
      ensureAudioEnabled(videoRef.current);
      videoRef.current.currentTime = seg.startTime;
    }
  };

  const saveClipEdit = () => {
    if (editingIndex === null) return;
    const newList = [...selectedSegments];
    newList[editingIndex] = { ...newList[editingIndex], text: tempEditText, startTime: tempStartTime, endTime: tempEndTime };
    updateSegmentsWithHistory(newList);
    setEditingIndex(null);
  };

  const handleTextChange = (newText: string) => {
    const originalText = selectedSegments[editingIndex!]?.text || '';
    const originalDuration = (selectedSegments[editingIndex!]?.endTime || 0) - (selectedSegments[editingIndex!]?.startTime || 0);
    if (newText.length < originalText.length && originalText.length > 0) {
      const ratio = newText.length / originalText.length;
      setTempEndTime(tempStartTime + Math.max(0.1, originalDuration * ratio));
    }
    setTempEditText(newText);
  };

  const composeVideo = async () => {
    if (selectedSegments.length === 0) return;
    setStatus(AppStatus.GENERATING);
    setExportProgress(0);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        const v = document.createElement('video');
        v.src = video!.url;
        v.muted = false; 
        v.crossOrigin = "anonymous";
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false })!;

        v.onloadedmetadata = async () => {
          let targetHeight = 1080;
          if (exportQuality === '480p') targetHeight = 480;
          else if (exportQuality === '720p') targetHeight = 720;
          else if (exportQuality === '1440p') targetHeight = 1440;

          const scale = targetHeight / v.videoHeight;
          canvas.width = v.videoWidth * scale; 
          canvas.height = v.videoHeight * scale;
          
          const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          await audioCtx.resume(); 
          
          const source = audioCtx.createMediaElementSource(v);
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest); 
          
          const videoStream = canvas.captureStream(30);
          const combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...dest.stream.getAudioTracks()
          ]);

          const mimeType = exportFormat === 'mp4' ? 'video/mp4' : 'video/webm;codecs=vp8,opus';
          const recorderOptions: MediaRecorderOptions = {
            mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm',
            videoBitsPerSecond: targetHeight * 10000 // Rough estimate for bitrate
          };

          const recorder = new MediaRecorder(combinedStream, recorderOptions);

          const chunks: Blob[] = [];
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };
          recorder.onstop = () => { 
            audioCtx.close(); 
            resolve(new Blob(chunks, { type: recorder.mimeType })); 
          };
          
          // Start recorder but immediately pause it until the first segment is ready
          recorder.start();
          recorder.pause();

          const totalDuration = selectedSegments.reduce((acc, s) => acc + (s.endTime - s.startTime), 0);
          let processedDuration = 0;

          for (const seg of selectedSegments) {
            v.currentTime = seg.startTime;
            v.muted = false;
            v.volume = 1.0;
            
            await new Promise(r => { v.onseeked = () => r(null); });
            
            // Resume recording only when the segment starts playing
            recorder.resume();
            await v.play();
            
            const segmentDuration = seg.endTime - seg.startTime;

            await new Promise(r => {
              const renderLoop = () => {
                if (v.currentTime >= seg.endTime || v.paused) {
                  v.pause();
                  // Pause recorder immediately after the segment ends
                  if (recorder.state === 'recording') recorder.pause();
                  processedDuration += segmentDuration;
                  r(null);
                  return;
                }
                
                const currentProgress = ((processedDuration + (v.currentTime - seg.startTime)) / totalDuration) * 100;
                setExportProgress(Math.min(99, currentProgress));
                setProcessingMsg(`${t.rendering}: ${Math.round(currentProgress)}%`);

                ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                
                if (burnSubtitles) {
                  const fontSize = Math.max(16, Math.floor(canvas.height / 20)) * subSizeScale;
                  ctx.font = `${subFontWeight} ${fontSize}px ${subFontFamily}`;
                  ctx.lineWidth = Math.max(2, fontSize / 8);
                  ctx.strokeStyle = subStrokeColor; 
                  ctx.fillStyle = subColor;
                  ctx.textAlign = 'center'; 
                  ctx.lineJoin = 'round';
                  ctx.shadowColor = subShadowColor; 
                  ctx.shadowBlur = subShadowBlur;

                  wrapText(
                    ctx, 
                    seg.text, 
                    canvas.width / 2, 
                    canvas.height * 0.88, 
                    canvas.width * 0.9, 
                    fontSize * 1.3, 
                    subBgOpacity > 0
                  );
                }

                requestAnimationFrame(renderLoop);
              };
              requestAnimationFrame(renderLoop);
            });
          }
          
          setExportProgress(100);
          // Wait a bit to ensure the last frames are captured before stopping
          setTimeout(() => {
            if (recorder.state !== 'inactive') recorder.stop();
          }, 500);
        };
        v.onerror = () => reject(new Error("Video load failed"));
      });

      setFinalVideoUrl(URL.createObjectURL(blob));
      setStatus(AppStatus.COMPLETED);
    } catch (e: any) {
      setError(e?.message || "Synthesis error");
      setStatus(AppStatus.READY);
    }
  };

  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const displaySegments = useMemo(() => {
    return isFilterEnabled ? segments.filter(s => !s.isRedundant) : segments;
  }, [segments, isFilterEnabled]);

  const totalDuration = useMemo(() => {
    return displaySegments.reduce((acc, seg) => acc + (seg.endTime - seg.startTime), 0);
  }, [displaySegments]);

  return (
    <div className="h-screen flex flex-col bg-[#030712] text-slate-100 overflow-hidden font-sans relative" onClick={() => {
      if (videoRef.current) ensureAudioEnabled(videoRef.current);
    }}>
      <header className="h-14 lg:h-16 flex items-center justify-between px-4 lg:px-8 glass-nav z-[60] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
            <VideoIcon className="text-white w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base lg:text-lg font-bold tracking-tight">{t.title} <span className="text-indigo-500">AI</span></h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="hidden md:flex bg-slate-900 rounded-lg p-1 border border-slate-800">
            <button 
              onClick={() => setExportQuality('720p')} 
              className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${exportQuality === '720p' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >720P</button>
            <button 
              onClick={() => setExportQuality('1080p')} 
              className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${exportQuality === '1080p' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >1080P</button>
          </div>

          <button 
            onClick={handleOpenKeyDialog}
            className={`p-2 rounded-lg border transition-all flex items-center gap-2 text-xs font-bold ${!isKeySelected ? 'bg-red-600 border-red-600 animate-pulse' : 'bg-slate-900 border-slate-800 text-indigo-400 hover:bg-slate-800'}`}
          >
            <Key className="w-4 h-4" />
            <span className="hidden lg:inline">{t.apiKeyNeeded}</span>
          </button>

          <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="p-2 bg-slate-900 rounded-lg text-xs font-bold text-slate-400 border border-slate-800 transition-all hover:bg-slate-800">
            <Languages className="w-4 h-4" /> 
          </button>
          
          <button onClick={() => setShowStylePanel(!showStylePanel)} className={`p-2 rounded-lg border transition-all ${showStylePanel ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-800 text-slate-400'}`}>
            <Palette className="w-4 h-4" />
          </button>

          <button 
            onClick={() => {
              if(!isPreviewingProject) {
                setActiveClipIndex(0);
                if(videoRef.current) {
                  ensureAudioEnabled(videoRef.current);
                  videoRef.current.currentTime = selectedSegments[0].startTime;
                  videoRef.current.play().catch(() => {});
                }
              }
              setIsPreviewingProject(!isPreviewingProject);
            }}
            disabled={selectedSegments.length === 0}
            className={`flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-xs font-bold transition-all border ${isPreviewingProject ? 'bg-amber-500 border-amber-500 text-black' : 'border-slate-700 text-slate-300 disabled:opacity-20'}`}
          >
            {isPreviewingProject ? <RotateCcw className="w-3 h-3 animate-spin" /> : <MonitorPlay className="w-3 h-3" />}
            <span className="hidden sm:inline">{isPreviewingProject ? t.stopPreview : t.previewAll}</span>
          </button>
          
          <button disabled={selectedSegments.length === 0 || status === AppStatus.GENERATING} onClick={composeVideo} className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 lg:px-6 lg:py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xl disabled:opacity-20 transition-all active:scale-95">
            {status === AppStatus.GENERATING ? <Loader2 className="w-3 h-3 lg:w-4 lg:h-4 animate-spin" /> : <CheckCircle className="w-3 h-3 lg:w-4 lg:h-4" />}
            {t.export}
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row overflow-hidden relative">
        <aside className={`absolute inset-y-0 left-0 w-72 bg-[#111827] border-r border-slate-800 z-[70] transition-transform duration-300 transform ${showStylePanel ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:flex ${showStylePanel ? 'flex' : 'hidden'} flex-col shrink-0`}>
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <Settings className="w-3 h-3" /> {t.exportSettings}
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[9px] text-slate-500 mb-1"><span>{t.quality}</span></div>
                  <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                    {(['480p', '720p', '1080p', '1440p'] as ExportQuality[]).map(q => (
                      <button 
                        key={q}
                        onClick={() => setExportQuality(q)}
                        className={`py-1 text-[9px] font-bold rounded transition-all ${exportQuality === q ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                      >{q.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-slate-500 mb-1"><span>{t.format}</span></div>
                  <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                    {(['webm', 'mp4'] as ExportFormat[]).map(f => (
                      <button 
                        key={f}
                        onClick={() => setExportFormat(f)}
                        className={`py-1 text-[9px] font-bold rounded transition-all ${exportFormat === f ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                      >{f.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                <div 
                  onClick={() => setBurnSubtitles(!burnSubtitles)}
                  className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${burnSubtitles ? 'bg-indigo-600/10 border-indigo-600/50 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                >
                  <span className="text-[9px] font-bold uppercase">{t.burnSubtitles}</span>
                  <div className={`w-3 h-3 rounded-sm border ${burnSubtitles ? 'bg-indigo-500 border-indigo-500' : 'border-slate-700'}`}></div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <Languages className="w-3 h-3" /> {t.subtitleLanguage}
              </h3>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <select 
                  value={subtitleLang} 
                  onChange={(e) => setSubtitleLang(e.target.value as SubtitleLanguage)} 
                  className="w-full bg-transparent text-[11px] text-slate-200 outline-none cursor-pointer"
                >
                  <option value={SubtitleLanguage.AUTO} className="bg-[#111827]">{t.langAuto}</option>
                  <option value={SubtitleLanguage.EN} className="bg-[#111827]">{t.langEn}</option>
                  <option value={SubtitleLanguage.ZH} className="bg-[#111827]">{t.langZh}</option>
                  <option value={SubtitleLanguage.JA} className="bg-[#111827]">{t.langJa}</option>
                  <option value={SubtitleLanguage.KO} className="bg-[#111827]">{t.langKo}</option>
                  <option value={SubtitleLanguage.FR} className="bg-[#111827]">{t.langFr}</option>
                  <option value={SubtitleLanguage.DE} className="bg-[#111827]">{t.langDe}</option>
                  <option value={SubtitleLanguage.ES} className="bg-[#111827]">{t.langEs}</option>
                </select>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-3 h-3" /> {t.filterFiller}
              </h3>
              <div 
                onClick={() => setIsFilterEnabled(!isFilterEnabled)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isFilterEnabled ? 'bg-indigo-600/10 border-indigo-600/50 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
              >
                <span className="text-[10px] font-bold uppercase">{isFilterEnabled ? 'Enabled' : 'Disabled'}</span>
                <Filter className="w-3.5 h-3.5" />
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{t.textColor}</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <input type="color" value={subColor} onChange={(e) => setSubColor(e.target.value)} className="w-full h-6 bg-transparent cursor-pointer" title={t.textColor} />
                </div>
                <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <input type="color" value={subStrokeColor} onChange={(e) => setSubStrokeColor(e.target.value)} className="w-full h-6 bg-transparent cursor-pointer" title={t.strokeColor} />
                </div>
              </div>
            </section>
            
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{t.shadowColor}</h3>
              <div className="space-y-3">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <input type="color" value={subShadowColor} onChange={(e) => setSubShadowColor(e.target.value)} className="w-full h-6 bg-transparent cursor-pointer" title={t.shadowColor} />
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-slate-500 mb-1"><span>{t.shadowBlur}</span><span>{subShadowBlur}px</span></div>
                  <input type="range" min="0" max="20" step="1" value={subShadowBlur} onChange={(e) => setSubShadowBlur(parseInt(e.target.value))} className="w-full" />
                </div>
              </div>
            </section>
            
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{t.font}</h3>
              <div className="space-y-3">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <select value={subFontFamily} onChange={(e) => setSubFontFamily(e.target.value)} className="w-full bg-transparent text-[11px] text-slate-200 outline-none cursor-pointer">
                    {fontOptions.map(opt => <option key={opt.value} value={opt.value} className="bg-[#111827]">{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-slate-500 mb-1"><span>{t.weight}</span><span>{subFontWeight}</span></div>
                  <input type="range" min="300" max="900" step="100" value={subFontWeight} onChange={(e) => setSubFontWeight(parseInt(e.target.value))} className="w-full" />
                </div>
              </div>
            </section>
            
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{t.bgColor}</h3>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <input type="color" value={subBgColor} onChange={(e) => setSubBgColor(e.target.value)} className="w-full h-6 bg-transparent cursor-pointer" />
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-slate-500 mb-1"><span>{t.opacity}</span><span>{Math.round(subBgOpacity * 100)}%</span></div>
                  <input type="range" min="0" max="1" step="0.1" value={subBgOpacity} onChange={(e) => setSubBgOpacity(parseFloat(e.target.value))} className="w-full" />
                </div>
              </div>
            </section>
            
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{t.size}</h3>
              <input type="range" min="0.5" max="2.5" step="0.1" value={subSizeScale} onChange={(e) => setSubSizeScale(parseFloat(e.target.value))} className="w-full" />
            </section>
            <button onClick={() => {setSubColor('#ffffff'); setSubStrokeColor('#000000'); setSubShadowColor('#000000'); setSubBgOpacity(0.5); setSubSizeScale(1); setSubFontWeight(700); setSubShadowBlur(8);}} className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold transition-all">{t.resetDefault}</button>
          </div>
        </aside>

        <div className="flex-grow flex flex-col min-w-0 bg-[#030712] overflow-hidden">
          <div className="flex-grow p-4 lg:p-8 flex items-center justify-center overflow-hidden min-h-[280px]">
            {status === AppStatus.IDLE ? (
              <div onClick={() => fileInputRef.current?.click()} className="w-full max-w-xl aspect-video border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center hover:border-indigo-500 transition-all cursor-pointer bg-slate-900/20 group">
                <Upload className="text-slate-500 w-10 h-10 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-base font-bold text-white mb-2">{t.createProject}</h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-600 bg-slate-900/40 px-4 py-2 rounded-full border border-slate-800">
                  <HardDrive className="w-3 h-3" />
                  {t.uploadHint}
                </div>
                <input ref={fileInputRef} type="file" className="hidden" accept="video/mp4,video/webm,video/quicktime" onChange={handleFileUpload} />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center max-w-4xl relative">
                <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 relative">
                  <video 
                    ref={videoRef} 
                    src={video?.url} 
                    className="w-full h-full object-contain" 
                    controls={!isPreviewingProject} 
                    playsInline 
                  />
                  {isPreviewSubVisible && currentPreviewText && (
                    <div className="absolute inset-x-0 bottom-[10%] pointer-events-none flex items-center justify-center px-6">
                       <div 
                        style={{ 
                          color: subColor, WebkitTextStroke: `${2 * subSizeScale}px ${subStrokeColor}`,
                          fontSize: `${Math.max(12, 28 * subSizeScale)}px`,
                          textShadow: `${subShadowColor} 0px 0px ${subShadowBlur}px`,
                          backgroundColor: subBgOpacity > 0 ? hexToRgba(subBgColor, subBgOpacity) : 'transparent',
                          fontFamily: subFontFamily, fontWeight: subFontWeight,
                          maxWidth: '90%', padding: '0.2em 0.5em', borderRadius: '4px',
                          wordBreak: 'break-word', lineHeight: '1.2'
                        }}
                        className="text-center select-none whitespace-pre-wrap transition-all shadow-sm"
                       >
                         {currentPreviewText}
                       </div>
                    </div>
                  )}
                  {status === AppStatus.ANALYZING && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-50 backdrop-blur-md p-4">
                      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                      <h3 className="text-sm font-bold tracking-widest uppercase text-center">{t.scanning}</h3>
                      <p className="text-[10px] text-indigo-400 mt-2 text-center">{processingMsg}</p>
                    </div>
                  )}
                  {status === AppStatus.GENERATING && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-50 backdrop-blur-md p-6">
                      <div className="w-full max-w-xs space-y-4">
                        <div className="flex justify-between items-end">
                          <h3 className="text-sm font-bold tracking-widest uppercase text-indigo-400">{t.rendering}</h3>
                          <span className="text-xl font-mono font-bold text-white">{Math.round(exportProgress)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                          <div 
                            className="h-full bg-indigo-500 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
                            style={{ width: `${exportProgress}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 text-center animate-pulse">{processingMsg}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-52 lg:h-72 bg-[#0d1117] border-t border-slate-800 flex flex-col shrink-0">
            <div className="h-10 border-b border-slate-800 flex items-center justify-between px-4 lg:px-6 bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-3">
                <Layers className="w-3 h-3 text-indigo-500" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{t.timeline}</span>
                <button 
                  onClick={() => {
                    if(!isPreviewingProject) {
                      setActiveClipIndex(0);
                      if(videoRef.current) {
                        ensureAudioEnabled(videoRef.current);
                        videoRef.current.currentTime = selectedSegments[0].startTime;
                        videoRef.current.play().catch(() => {});
                      }
                    }
                    setIsPreviewingProject(!isPreviewingProject);
                  }}
                  disabled={selectedSegments.length === 0}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-bold transition-all border ${isPreviewingProject ? 'bg-amber-500 border-amber-500 text-black' : 'border-slate-700 text-slate-400 hover:text-white'}`}
                >
                  {isPreviewingProject ? <RotateCcw className="w-2.5 h-2.5 animate-spin" /> : <Play className="w-2.5 h-2.5" />}
                  {isPreviewingProject ? t.stopPreview : t.previewAll}
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 border-r border-slate-700 pr-4">
                  <button disabled={historyIndex === 0} onClick={undo} className="p-1 text-slate-500 hover:text-white disabled:opacity-20 transition-all"><Undo className="w-3.5 h-3.5" /></button>
                  <button disabled={historyIndex >= history.length - 1} onClick={redo} className="p-1 text-slate-500 hover:text-white disabled:opacity-20 transition-all"><Redo className="w-3.5 h-3.5" /></button>
                </div>
                <button onClick={() => updateSegmentsWithHistory([])} className="text-[9px] font-bold text-slate-600 hover:text-white uppercase"><RotateCcw className="w-3 h-3" /></button>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-2 timeline-bg">
              {selectedSegments.map((seg, i) => (
                <div key={`${seg.id}-${i}`} onClick={() => openEditModal(i)} className={`flex items-center gap-3 bg-[#161b22] border rounded-lg p-3 transition-all cursor-pointer group ${activeClipIndex === i ? 'border-indigo-500 ring-1 ring-indigo-500/30' : 'border-slate-800 hover:border-slate-700'}`}>
                  <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center font-bold text-slate-600 text-[10px] shrink-0">{i+1}</div>
                  <div className="flex-grow min-w-0">
                    <p className="text-[11px] text-slate-300 font-medium truncate">{seg.text}</p>
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-500 font-mono"><Clock className="w-2.5 h-2.5" /> <span>{seg.startTime.toFixed(1)}s - {seg.endTime.toFixed(1)}s</span></div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); updateSegmentsWithHistory(selectedSegments.filter((_, idx) => idx !== i)); }} className="p-1.5 text-slate-600 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className={`fixed lg:relative inset-y-0 right-0 w-72 bg-[#111827] border-l border-slate-800 z-[80] transition-transform duration-300 transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col shadow-2xl lg:shadow-none`}>
          <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex flex-col gap-2 shrink-0">
            <div className="flex justify-between items-center">
              <h2 className="text-[10px] font-bold flex items-center gap-2 text-white uppercase tracking-widest"><FontIcon className="w-3.5 h-3.5 text-indigo-500" /> {t.aiScanResults}</h2>
              <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-4 text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
              <div className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded">
                <Layers className="w-2.5 h-2.5 text-indigo-400" />
                <span>{t.totalClips}: {displaySegments.length}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded">
                <Clock className="w-2.5 h-2.5 text-indigo-400" />
                <span>{t.totalDuration}: {totalDuration.toFixed(1)}s</span>
              </div>
            </div>
          </div>
          <div className="flex-grow overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {displaySegments.map((seg) => {
              const isSelected = selectedSegments.some(s => s.id === seg.id);
              return (
                <div 
                  key={seg.id} 
                  onClick={() => { 
                    if (videoRef.current) {
                      ensureAudioEnabled(videoRef.current);
                      videoRef.current.currentTime = seg.startTime;
                      videoRef.current.play().catch(() => {});
                    }
                    if (isSelected) {
                      updateSegmentsWithHistory(selectedSegments.filter(s => s.id !== seg.id));
                    } else {
                      updateSegmentsWithHistory([...selectedSegments, seg]);
                    }
                  }} 
                  className={`group p-3 rounded-lg border transition-all cursor-pointer relative overflow-hidden ${
                    seg.isRedundant ? 'bg-red-500/5 border-red-500/10 opacity-30' : 
                    isSelected ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-[#030712] border-slate-800 hover:border-indigo-500'
                  }`}
                >
                  {!seg.isRedundant && <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${isSelected ? 'bg-indigo-400' : 'bg-indigo-500'}`}></div>}
                  <div className="flex justify-between items-center mb-1.5">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${seg.isRedundant ? 'bg-red-500/10 text-red-400' : 'bg-indigo-500/10 text-indigo-400 font-bold'}`}>
                      {seg.startTime.toFixed(1)}s
                    </span>
                    {isSelected ? <X className="w-3 h-3 text-red-400" /> : <Plus className="w-3 h-3 text-indigo-500 opacity-0 group-hover:opacity-100" />}
                  </div>
                  <p className={`text-[10px] leading-relaxed line-clamp-2 ${isSelected ? 'text-slate-200' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    {seg.text}
                  </p>
                </div>
              );
            })}
          </div>
        </aside>
      </main>

      {editingIndex !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 lg:p-8">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl lg:rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col lg:flex-row h-[85vh] lg:h-auto max-h-[90vh]">
            <div className="w-full lg:w-[60%] bg-black relative flex items-center justify-center overflow-hidden shrink-0 lg:shrink">
               <video ref={modalVideoRef} src={video?.url} className="w-full h-full object-contain" playsInline />
               <div className="absolute top-3 left-3 bg-indigo-600/90 text-[9px] px-2 py-1 rounded font-bold uppercase">{t.textVideoSync}</div>
               <div className="absolute inset-x-0 bottom-[10%] pointer-events-none flex items-center justify-center px-4">
                 <p style={{ color: subColor, WebkitTextStroke: `${1 * subSizeScale}px ${subStrokeColor}`, fontSize: `${Math.max(12, 20 * subSizeScale)}px`, backgroundColor: subBgOpacity > 0 ? hexToRgba(subBgColor, subBgOpacity) : 'transparent', fontFamily: subFontFamily, fontWeight: subFontWeight, padding: '0.2em 0.4em', borderRadius: '2px' }} className="text-center whitespace-pre-wrap">{tempEditText}</p>
               </div>
            </div>
            <div className="w-full lg:w-[40%] p-4 lg:p-8 flex flex-col justify-between bg-[#111827] overflow-y-auto">
              <div className="space-y-6">
                <div className="flex justify-between items-center"><h2 className="text-sm lg:text-base font-bold flex items-center gap-2"><Scissors className="text-indigo-500 w-4 h-4" /> {t.editClip} #{editingIndex + 1}</h2><button onClick={() => setEditingIndex(null)} className="text-slate-500"><X /></button></div>
                <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <button disabled={historyIndex === 0} onClick={undo} className="flex-grow py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-20 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all"><Undo className="w-3.5 h-3.5" /> {t.undo}</button>
                  <button disabled={historyIndex >= history.length - 1} onClick={redo} className="flex-grow py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-20 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all"><Redo className="w-3.5 h-3.5" /> {t.redo}</button>
                </div>
                <textarea value={tempEditText} onChange={(e) => handleTextChange(e.target.value)} className="w-full h-28 lg:h-40 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:border-indigo-500 outline-none resize-none" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800"><span className="text-[8px] text-slate-500 block mb-1 font-bold uppercase tracking-tighter">Start (s)</span><input type="number" step="0.1" value={tempStartTime} onChange={(e) => setTempStartTime(parseFloat(e.target.value))} className="bg-transparent text-sm font-mono text-indigo-400 w-full outline-none" /></div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800"><span className="text-[8px] text-slate-500 block mb-1 font-bold uppercase tracking-tighter">End (s)</span><input type="number" step="0.1" value={tempEndTime} onChange={(e) => setTempEndTime(parseFloat(e.target.value))} className="bg-transparent text-sm font-mono text-indigo-400 w-full outline-none" /></div>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3"><button onClick={() => setEditingIndex(null)} className="py-3 bg-slate-800 rounded-xl font-bold text-xs">{t.backToEditor}</button><button onClick={saveClipEdit} className="py-3 bg-indigo-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2"><Save className="w-3 h-3" /> {t.saveChange}</button></div>
            </div>
          </div>
        </div>
      )}

      {status === AppStatus.COMPLETED && finalVideoUrl && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col shadow-3xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center"><h2 className="text-sm font-bold flex items-center gap-2"><CheckCircle className="text-emerald-500 w-4 h-4" /> {t.exportSuccess}</h2><button onClick={() => setStatus(AppStatus.READY)}><X className="w-4 h-4" /></button></div>
            <div className="p-4 lg:p-8 flex flex-col items-center">
              <video src={finalVideoUrl} controls className="w-full aspect-video rounded-xl mb-6 bg-black" />
              <div className="flex gap-3 w-full max-sm:flex-col">
                <button onClick={() => setStatus(AppStatus.READY)} className="flex-grow py-3 bg-slate-800 rounded-xl font-bold text-xs">{t.backToEditor}</button>
                <a href={finalVideoUrl} download={`NovaClip_${exportQuality}.${exportFormat}`} className="flex-grow flex items-center justify-center gap-2 bg-indigo-600 py-3 rounded-xl font-bold text-white text-xs shadow-lg">
                  <Download className="w-3.5 h-3.5" /> {t.downloadNow}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-[150] animate-in slide-in-from-bottom-5">
          <AlertCircle className="w-5 h-5" />
          <div className="flex flex-col"><span className="text-[10px] font-bold uppercase">{t.systemAlert}</span><span className="text-[10px] opacity-80">{error}</span></div>
          <button onClick={() => setError(null)} className="ml-4">✕</button>
        </div>
      )}
    </div>
  );
};

export default App;
