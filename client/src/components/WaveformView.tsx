interface WaveformViewProps {
  peaks: number[];
  currentTime?: number;
  duration?: number;
  width?: number;
  height?: number;
}

export function WaveformView({
  peaks,
  currentTime = 0,
  duration = 1,
  width = 600,
  height = 80,
}: WaveformViewProps) {
  if (!peaks.length) return null;

  const barWidth = width / peaks.length;
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <svg width={width} height={height} role="img" aria-label="Audio waveform">
      {peaks.map((peak, i) => {
        const barHeight = Math.max(1, peak * height);
        const x = i * barWidth;
        const y = (height - barHeight) / 2;
        const isPast = i / peaks.length <= progress;

        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={Math.max(1, barWidth - 1)}
            height={barHeight}
            fill={isPast ? '#3b82f6' : '#94a3b8'}
          />
        );
      })}
    </svg>
  );
}
