import { useState } from 'react';
import { AudioPlayer } from './AudioPlayer';

interface AudioPreviewProps {
  audioBlob: Blob | null;
  onPlayWithFilters: (blob: Blob, onEnded?: () => void) => void;
  onStop: () => void;
  showRawPlayer?: boolean;
}

export function AudioPreview({ audioBlob, onPlayWithFilters, onStop, showRawPlayer = true }: AudioPreviewProps) {
  const [previewing, setPreviewing] = useState(false);

  if (!audioBlob) return null;

  const handlePreview = () => {
    onPlayWithFilters(audioBlob, () => setPreviewing(false));
    setPreviewing(true);
  };

  const handleStop = () => {
    onStop();
    setPreviewing(false);
  };

  return (
    <div style={{ marginTop: 16 }}>
      {showRawPlayer && (
        <>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 12 }}>
            Raw Recording
          </h3>
          <AudioPlayer src={audioBlob} />
        </>
      )}

      <div style={{ marginTop: 12 }}>
        {!previewing ? (
          <button
            className="preview-filter-btn"
            onClick={handlePreview}
          >
            <span className="preview-filter-btn-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            </span>
            Preview with Filters
            <span className="preview-filter-btn-arrow">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          </button>
        ) : (
          <button
            className="preview-filter-btn active"
            onClick={handleStop}
          >
            <span className="preview-filter-btn-icon active">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </span>
            <span className="preview-filter-btn-label">
              Previewing
              <span className="preview-dots">
                <span className="preview-dot" />
                <span className="preview-dot" />
                <span className="preview-dot" />
              </span>
            </span>
            <span className="preview-filter-btn-stop">Stop</span>
          </button>
        )}
      </div>
    </div>
  );
}
