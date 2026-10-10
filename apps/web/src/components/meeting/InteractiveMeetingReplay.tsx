import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Search,
  UploadCloud,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileVideo,
  Keyboard,
  Info,
  Trash2,
} from 'lucide-react';
import type { MeetingTranscriptEntry } from '../../types/meeting';
import { getRecording, saveRecording, deleteRecording } from '../../utils/recordingStorage';
import { parseTimestampToSeconds, formatMediaTime } from '../../utils/mediaTime';

export interface InteractiveMeetingReplayProps {
  meetingCode: string;
  transcript: MeetingTranscriptEntry[];
  initialVideoUrl?: string | null;
  className?: string;
}

interface ParsedCue {
  id: string;
  seconds: number;
  formattedTime: string;
  speaker: string;
  originalText: string;
  translatedText: string;
}

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export const InteractiveMeetingReplay: React.FC<InteractiveMeetingReplayProps> = ({
  meetingCode,
  transcript,
  initialVideoUrl,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cueListRef = useRef<HTMLDivElement | null>(null);
  const activeCueRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [videoSrc, setVideoSrc] = useState<string | null>(initialVideoUrl || null);
  const [videoSourceType, setVideoSourceType] = useState<'prop' | 'indexedDB' | 'uploaded' | null>(
    initialVideoUrl ? 'prop' : null,
  );
  const [isLoadingRecording, setIsLoadingRecording] = useState(!initialVideoUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Compute base epoch from transcript to normalize relative offsets
  const baseEpochMs = useMemo(() => {
    const dates = transcript
      .map((t) => Date.parse(t.timestamp))
      .filter((ms) => !isNaN(ms) && ms > 0);
    return dates.length > 0 ? Math.min(...dates) : 0;
  }, [transcript]);

  // Parse cues with timestamps and relative seconds
  const parsedCues: ParsedCue[] = useMemo(() => {
    return transcript.map((item, idx) => {
      const seconds = parseTimestampToSeconds(item.timestamp, baseEpochMs);
      return {
        id: item.id || `cue-${idx}`,
        seconds,
        formattedTime: formatMediaTime(seconds),
        speaker: item.participantName || 'Người phát biểu',
        originalText: item.originalText || '',
        translatedText: item.translatedText || item.originalText || '',
      };
    }).sort((a, b) => a.seconds - b.seconds);
  }, [baseEpochMs, transcript]);

  // Attempt to load from IndexedDB if no initialVideoUrl provided
  useEffect(() => {
    let active = true;

    async function loadFromDB() {
      if (initialVideoUrl) {
        setVideoSrc(initialVideoUrl);
        setVideoSourceType('prop');
        setIsLoadingRecording(false);
        return;
      }

      setIsLoadingRecording(true);
      try {
        const stored = await getRecording(meetingCode);
        if (!active) return;
        if (stored?.blob) {
          const url = URL.createObjectURL(stored.blob);
          setVideoSrc(url);
          setVideoSourceType('indexedDB');
        }
      } catch (err) {
        console.warn('Failed to load recording from IndexedDB', err);
      } finally {
        if (active) setIsLoadingRecording(false);
      }
    }

    void loadFromDB();

    return () => {
      active = false;
    };
  }, [initialVideoUrl, meetingCode]);

  // Identify currently active cue index
  const activeCueIndex = useMemo(() => {
    if (parsedCues.length === 0) return -1;
    // Find last cue whose start time <= currentTime
    let activeIdx = -1;
    for (let i = 0; i < parsedCues.length; i++) {
      if (parsedCues[i].seconds <= currentTime + 0.3) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return activeIdx;
  }, [currentTime, parsedCues]);

  // Auto-scroll transcript to active cue
  useEffect(() => {
    if (autoScroll && activeCueRef.current && cueListRef.current) {
      activeCueRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeCueIndex, autoScroll]);

  // Search filtering
  const matchingCueIndices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const matches: number[] = [];
    parsedCues.forEach((cue, idx) => {
      if (
        cue.translatedText.toLowerCase().includes(q) ||
        cue.originalText.toLowerCase().includes(q) ||
        cue.speaker.toLowerCase().includes(q)
      ) {
        matches.push(idx);
      }
    });
    return matches;
  }, [parsedCues, searchQuery]);

  // Video event handlers
  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      void videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, []);

  const handleSeek = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    const target = Math.max(0, Math.min(seconds, duration || 999999));
    videoRef.current.currentTime = target;
    setCurrentTime(target);
  }, [duration]);

  const handleSkip = useCallback((deltaSeconds: number) => {
    if (!videoRef.current) return;
    handleSeek(videoRef.current.currentTime + deltaSeconds);
  }, [handleSeek]);

  const handleSpeedChange = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackRate(speed);
  };

  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVol;
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };

  const handleToggleMute = useCallback(() => {
    if (!videoRef.current) return;
    setIsMuted((prev) => {
      const nextMuted = !prev;
      if (videoRef.current) videoRef.current.muted = nextMuted;
      return nextMuted;
    });
  }, []);

  const handleToggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.warn('Fullscreen request failed', err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.warn('Exit fullscreen failed', err);
      }
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in search input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSkip(-5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSkip(5);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        void handleToggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, handleSkip, handleToggleMute]);

  // File upload / dropzone handlers
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoSourceType('uploaded');
    try {
      await saveRecording(meetingCode, file);
    } catch (err) {
      console.warn('Could not persist uploaded file to IndexedDB', err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDeleteLocalRecording = async () => {
    if (window.confirm('Bạn có chắc muốn xóa bản ghi đã lưu trong trình duyệt này?')) {
      await deleteRecording(meetingCode);
      setVideoSrc(null);
      setVideoSourceType(null);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
    }
  };

  const handleNextMatch = () => {
    if (matchingCueIndices.length === 0) return;
    const nextIdx = (currentMatchIdx + 1) % matchingCueIndices.length;
    setCurrentMatchIdx(nextIdx);
    const targetCueIdx = matchingCueIndices[nextIdx];
    handleSeek(parsedCues[targetCueIdx].seconds);
  };

  const handlePrevMatch = () => {
    if (matchingCueIndices.length === 0) return;
    const prevIdx = (currentMatchIdx - 1 + matchingCueIndices.length) % matchingCueIndices.length;
    setCurrentMatchIdx(prevIdx);
    const targetCueIdx = matchingCueIndices[prevIdx];
    handleSeek(parsedCues[targetCueIdx].seconds);
  };

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border border-zinc-800 bg-zinc-950/90 text-zinc-100 shadow-2xl overflow-hidden flex flex-col ${className}`}
    >
      {/* Player Header */}
      <header className="border-b border-zinc-800/80 px-4 sm:px-6 py-3.5 bg-zinc-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              Trình Xem Lại Cuộc Họp Tương Tác
              {videoSourceType === 'indexedDB' && (
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                  Đã lưu IndexedDB
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-400">
              Đồng bộ phụ đề song ngữ · Nhảy theo mốc thời gian · Tìm kiếm từ khóa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowKeyboardHelp((prev) => !prev)}
            aria-label="Phím tắt điều khiển"
            className="flex h-9 px-2.5 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <Keyboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Phím tắt</span>
          </button>
          {videoSrc && (
            <button
              type="button"
              onClick={handleDeleteLocalRecording}
              aria-label="Xóa video khỏi bộ nhớ"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/60 text-xs text-zinc-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
              title="Xóa video khỏi bộ nhớ máy"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Keyboard Shortcuts Info Bar */}
      {showKeyboardHelp && (
        <div className="px-4 py-2.5 bg-blue-950/30 border-b border-blue-500/20 text-xs text-blue-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Info className="h-4 w-4 text-blue-400 shrink-0" />
            <span>
              <strong>Phím tắt:</strong> <kbd className="px-1.5 py-0.5 rounded bg-blue-900/50 text-white font-mono">Space</kbd> Phát/Dừng ·{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-blue-900/50 text-white font-mono">← / →</kbd> Tua ±5s ·{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-blue-900/50 text-white font-mono">M</kbd> Tắt tiếng ·{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-blue-900/50 text-white font-mono">F</kbd> Toàn màn hình
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowKeyboardHelp(false)}
            className="text-xs text-blue-300 hover:underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Main Grid: Video Player on Left, Transcript on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-[480px]">
        {/* Left Column: Video & Playback Controls (7 cols) */}
        <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800 bg-black/40">
          <div className="relative flex-1 min-h-[260px] sm:min-h-[320px] flex items-center justify-center bg-zinc-950">
            {videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
                playsInline
                className="w-full h-full max-h-[460px] object-contain bg-black cursor-pointer"
                onClick={handlePlayPause}
                onTimeUpdate={() => {
                  if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) setDuration(videoRef.current.duration);
                }}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : isLoadingRecording ? (
              <div className="flex flex-col items-center justify-center p-8 text-zinc-400 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mb-3" />
                <p className="text-sm">Đang tải bản ghi cuộc họp từ bộ nhớ máy…</p>
              </div>
            ) : (
              /* Drag & Drop File Fallback Dropzone */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-8 text-center m-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-blue-500 bg-blue-500/10 text-white'
                    : 'border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:border-zinc-500 hover:bg-zinc-900/70'
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400 mb-3">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  Đồng bộ video / audio cuộc họp
                </h4>
                <p className="text-xs text-zinc-400 max-w-sm mb-4">
                  Kéo thả file ghi âm/hình đã tải về (.webm, .mp4, .m4a) vào đây để nghe lại đồng bộ với phụ đề song ngữ.
                </p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-md">
                  <FileVideo className="h-4 w-4" />
                  Chọn file từ máy tính
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,audio/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      void handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Video Scrubbing Timeline & Controls */}
          <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 space-y-3">
            {/* Timeline Progress Bar */}
            <div className="space-y-1">
              <div className="relative flex items-center">
                <input
                  type="range"
                  min="0"
                  max={duration || (parsedCues.length ? parsedCues[parsedCues.length - 1].seconds + 5 : 100)}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  aria-label="Thanh trượt thời gian"
                  className="w-full h-2 rounded-lg bg-zinc-700 appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>{formatMediaTime(currentTime)}</span>
                <span>{formatMediaTime(duration || (parsedCues.length ? parsedCues[parsedCues.length - 1].seconds : 0))}</span>
              </div>
            </div>

            {/* Playback Button Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {/* Play / Pause */}
                <button
                  type="button"
                  onClick={handlePlayPause}
                  aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </button>

                {/* Rewind 5s */}
                <button
                  type="button"
                  onClick={() => handleSkip(-5)}
                  aria-label="Lùi lại 5 giây"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                  title="Lùi lại 5 giây (←)"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                {/* Forward 5s */}
                <button
                  type="button"
                  onClick={() => handleSkip(5)}
                  aria-label="Tua tới 5 giây"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                  title="Tua tới 5 giây (→)"
                >
                  <RotateCw className="h-4 w-4" />
                </button>

                {/* Volume & Mute */}
                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    aria-label={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    aria-label="Âm lượng"
                    className="w-16 h-1.5 rounded-lg bg-zinc-700 appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>

              {/* Speed Rates & Fullscreen */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center rounded-lg bg-zinc-800 p-0.5 border border-zinc-700/60">
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => handleSpeedChange(speed)}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        playbackRate === speed
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  aria-label={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors ml-1"
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Synchronized Transcript Scrubbing Panel (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-zinc-900/40">
          {/* Transcript Panel Header & Search Bar */}
          <div className="p-3.5 border-b border-zinc-800/80 bg-zinc-900/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-400" />
                Phụ đề theo thời gian ({parsedCues.length} câu)
              </span>

              {/* Auto Scroll Toggle */}
              <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>Tự cuộn</span>
              </label>
            </div>

            {/* Keyword Search Input */}
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm từ khóa trong phụ đề..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentMatchIdx(0);
                }}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950/80 pl-8 pr-16 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {searchQuery && (
                <div className="absolute right-2 flex items-center gap-1 text-[10px] text-zinc-400">
                  <span>
                    {matchingCueIndices.length > 0 ? `${currentMatchIdx + 1}/${matchingCueIndices.length}` : '0/0'}
                  </span>
                  <button
                    type="button"
                    onClick={handlePrevMatch}
                    disabled={matchingCueIndices.length === 0}
                    aria-label="Kết quả trước"
                    className="p-0.5 hover:text-white disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMatch}
                    disabled={matchingCueIndices.length === 0}
                    aria-label="Kết quả tiếp"
                    className="p-0.5 hover:text-white disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Transcript Scrollable Cue List */}
          <div
            ref={cueListRef}
            className="flex-1 overflow-y-auto max-h-[500px] p-3 space-y-2 scrollbar-thin scrollbar-thumb-zinc-700"
          >
            {parsedCues.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500">
                <Clock className="h-6 w-6 mb-2 opacity-50" />
                <p className="text-xs">Chưa có phụ đề nào được ghi nhận.</p>
              </div>
            ) : (
              parsedCues.map((cue, idx) => {
                const isActive = idx === activeCueIndex;
                const isMatch = matchingCueIndices.includes(idx);

                return (
                  <div
                    key={cue.id}
                    ref={isActive ? activeCueRef : undefined}
                    onClick={() => handleSeek(cue.seconds)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSeek(cue.seconds);
                      }
                    }}
                    aria-label={`Nhảy tới ${cue.formattedTime} - ${cue.speaker}`}
                    className={`group p-3 rounded-xl border transition-all cursor-pointer text-left ${
                      isActive
                        ? 'border-blue-500 bg-blue-500/15 shadow-sm shadow-blue-500/10'
                        : isMatch
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-zinc-300 group-hover:text-white flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                        {cue.speaker}
                      </span>
                      <span
                        className={`font-mono text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-200'
                        }`}
                      >
                        {cue.formattedTime}
                      </span>
                    </div>

                    {/* Translated Text (Hero Subtitle) */}
                    <p className={`text-xs sm:text-sm font-medium leading-relaxed ${
                      isActive ? 'text-white' : 'text-zinc-200'
                    }`}>
                      {cue.translatedText}
                    </p>

                    {/* Original Source Text (Subtitle) */}
                    {cue.originalText && cue.originalText !== cue.translatedText && (
                      <p className="text-[11px] text-zinc-400/90 italic mt-1 leading-snug">
                        Gốc: {cue.originalText}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
