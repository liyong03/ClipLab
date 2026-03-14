import { useRecorder } from '../hooks/useRecorder';

interface RecorderProps {
  onRecordingComplete?: (blob: Blob, duration: number) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function Recorder({ onRecordingComplete }: RecorderProps) {
  const { state, audioBlob, audioUrl, duration, error, start, stop, reset } =
    useRecorder();

  const handleUseRecording = () => {
    if (audioBlob) {
      onRecordingComplete?.(audioBlob, duration);
    }
  };

  return (
    <div>
      {error && <p className="form-error">{error}</p>}

      {state === 'idle' && (
        <div className="record-controls">
          <button className="btn-record" onClick={start} aria-label="Start recording">
            <div className="btn-record-inner" />
          </button>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Click to start recording</span>
        </div>
      )}

      {state === 'recording' && (
        <div className="record-controls">
          <button className="btn-record recording" onClick={stop} aria-label="Stop recording">
            <div className="btn-record-inner" />
          </button>
          <div>
            <div className="recording-indicator">
              <span className="recording-dot" />
              Recording
            </div>
            <span className="recording-time">{formatDuration(duration)}</span>
          </div>
        </div>
      )}

      {state === 'stopped' && audioUrl && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleUseRecording}>Use Recording</button>
            <button className="btn btn-ghost" onClick={reset}>Discard</button>
          </div>
        </div>
      )}
    </div>
  );
}
