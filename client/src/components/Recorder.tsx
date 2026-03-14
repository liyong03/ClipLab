import { useRecorder } from '../hooks/useRecorder';

interface RecorderProps {
  onRecordingComplete?: (blob: Blob, duration: number) => void;
}

export function Recorder({ onRecordingComplete }: RecorderProps) {
  const { state, audioBlob, audioUrl, duration, error, start, stop, reset } =
    useRecorder();

  const handleStop = () => {
    stop();
  };

  const handleUseRecording = () => {
    if (audioBlob) {
      onRecordingComplete?.(audioBlob, duration);
    }
  };

  return (
    <div>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {state === 'idle' && (
        <button onClick={start}>Record</button>
      )}

      {state === 'recording' && (
        <div>
          <span>Recording... {duration}s</span>
          <button onClick={handleStop}>Stop</button>
        </div>
      )}

      {state === 'stopped' && audioUrl && (
        <div>
          <audio controls src={audioUrl} />
          <p>Duration: {duration}s</p>
          <button onClick={handleUseRecording}>Use Recording</button>
          <button onClick={reset}>Discard</button>
        </div>
      )}
    </div>
  );
}
