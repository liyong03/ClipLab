import { AudioPlayer } from './AudioPlayer';

interface AudioPreviewProps {
  audioBlob: Blob | null;
  onPlayWithFilters: (blob: Blob) => void;
  onStop: () => void;
}

export function AudioPreview({ audioBlob, onPlayWithFilters, onStop }: AudioPreviewProps) {
  if (!audioBlob) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 12 }}>
        Raw Recording
      </h3>
      <AudioPlayer src={audioBlob} />
      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <button className="btn btn-secondary" onClick={() => onPlayWithFilters(audioBlob)}>
          Preview with Filters
        </button>
        <button className="btn btn-ghost" onClick={onStop}>Stop Preview</button>
      </div>
    </div>
  );
}
