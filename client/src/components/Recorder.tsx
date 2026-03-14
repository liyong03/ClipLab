import { useEffect } from 'react';
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
  const { state, audioBlob, duration, error, start, stop, reset } =
    useRecorder();

  useEffect(() => {
    if (state === 'stopped' && audioBlob) {
      onRecordingComplete?.(audioBlob, duration);
      reset();
    }
  }, [state, audioBlob, duration, onRecordingComplete, reset]);

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
    </div>
  );
}
