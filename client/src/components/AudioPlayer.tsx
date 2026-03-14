import { useRef, useState, useEffect, useCallback } from 'react';

export interface AudioPlayerProps {
  src: string | Blob;
  peaks?: number[];
  width?: number;
  height?: number;
  playedColor?: string;
  unplayedColor?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudioPlayer({
  src,
  peaks,
  width,
  height = 48,
  playedColor = '#6366f1',
  unplayedColor = '#e5e7eb',
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState('');
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    let revoke: string | null = null;

    if (typeof src === 'string') {
      const token = localStorage.getItem('token');
      fetch(src, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => res.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          revoke = url;
          setAudioUrl(url);
        })
        .catch(console.error);
    } else {
      const url = URL.createObjectURL(src);
      revoke = url;
      setAudioUrl(url);
    }

    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [src]);

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
    if (playing) {
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [playing]);

  useEffect(() => {
    if (playing) {
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [playing, updateProgress]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleEnded = () => {
    setPlaying(false);
    setCurrentTime(0);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !containerRef.current || duration === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    audioRef.current.currentTime = ratio * duration;
    setCurrentTime(audioRef.current.currentTime);
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 14px',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        width: width || '100%',
        userSelect: 'none',
      }}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        preload="metadata"
      />

      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        aria-label={playing ? 'Pause' : 'Play'}
        style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-full)',
          border: 'none',
          background: playing
            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
            : 'var(--accent)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: 14,
          transition: 'box-shadow 0.2s',
          boxShadow: playing ? '0 0 12px rgba(99, 102, 241, 0.35)' : 'none',
        }}
      >
        {playing ? (
          <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
            <rect x="0" y="0" width="4" height="14" rx="1" />
            <rect x="8" y="0" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
            <path d="M0 0.5C0 0.191 0.328 0 0.6 0.157L11.4 6.657C11.672 6.814 11.672 7.186 11.4 7.343L0.6 13.843C0.328 14 0 13.809 0 13.5V0.5Z" />
          </svg>
        )}
      </button>

      {/* Time (current) */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--text-secondary)',
          minWidth: 36,
          textAlign: 'center',
        }}
      >
        {formatTime(currentTime)}
      </span>

      {/* Waveform / Progress */}
      <div
        ref={containerRef}
        onClick={handleSeek}
        style={{ flex: 1, cursor: 'pointer', position: 'relative', height }}
      >
        {peaks && peaks.length > 0 ? (
          <WaveformBars
            peaks={peaks}
            progress={progress}
            height={height}
            playedColor={playedColor}
            unplayedColor={unplayedColor}
          />
        ) : (
          <ProgressBar
            progress={progress}
            height={height}
            playedColor={playedColor}
            unplayedColor={unplayedColor}
          />
        )}

        {/* Playhead */}
        {duration > 0 && (
          <div
            style={{
              position: 'absolute',
              left: `${progress * 100}%`,
              top: 0,
              width: 2,
              height: '100%',
              backgroundColor: '#6366f1',
              borderRadius: 1,
              opacity: 0.9,
              boxShadow: '0 0 6px rgba(99,102,241,0.3)',
              transition: playing ? 'none' : 'left 0.1s ease',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Time (duration) */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--text-tertiary)',
          minWidth: 36,
          textAlign: 'center',
        }}
      >
        {formatTime(duration)}
      </span>
    </div>
  );
}

function WaveformBars({
  peaks,
  progress,
  height,
  playedColor,
  unplayedColor,
}: {
  peaks: number[];
  progress: number;
  height: number;
  playedColor: string;
  unplayedColor: string;
}) {
  return (
    <svg width="100%" height={height} preserveAspectRatio="none">
      {peaks.map((peak, i) => {
        const barCount = peaks.length;
        const barWidthPercent = 100 / barCount;
        const barHeight = Math.max(2, peak * height * 0.9);
        const x = i * barWidthPercent;
        const y = (height - barHeight) / 2;
        const isPast = i / barCount < progress;

        return (
          <rect
            key={i}
            x={`${x}%`}
            y={y}
            width={`${Math.max(0.2, barWidthPercent * 0.7)}%`}
            height={barHeight}
            rx={1.5}
            fill={isPast ? playedColor : unplayedColor}
            style={{ transition: isPast ? 'fill 0.1s' : 'none' }}
          />
        );
      })}
    </svg>
  );
}

function ProgressBar({
  progress,
  height,
  playedColor,
  unplayedColor,
}: {
  progress: number;
  height: number;
  playedColor: string;
  unplayedColor: string;
}) {
  const barHeight = 4;
  const y = (height - barHeight) / 2;

  return (
    <svg width="100%" height={height} preserveAspectRatio="none">
      <rect x="0" y={y} width="100%" height={barHeight} rx={2} fill={unplayedColor} />
      <rect x="0" y={y} width={`${progress * 100}%`} height={barHeight} rx={2} fill={playedColor} />
    </svg>
  );
}
