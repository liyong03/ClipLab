import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Recorder } from '../components/Recorder';
import { FilterChain } from '../components/FilterChain';
import { AudioPreview } from '../components/AudioPreview';
import { ClipFeed } from '../components/ClipFeed';
import { useFilterChain } from '../hooks/useFilterChain';
import { api } from '../lib/api';

function LoggedInHome() {
  const navigate = useNavigate();
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const {
    filterSettings,
    toggleFilter,
    updateParam,
    playWithFilters,
    stopPlayback,
    renderFilteredAudio,
  } = useFilterChain();

  const handleRecordingComplete = (blob: Blob, dur: number) => {
    setAudioBlob(blob);
    setDuration(dur);
    setError('');
  };

  const handleUpload = async () => {
    if (!audioBlob || !title.trim()) return;
    setUploading(true);
    setError('');
    try {
      const filteredBlob = await renderFilteredAudio(audioBlob);

      const formData = new FormData();
      formData.append('title', title);
      formData.append('filter_settings', JSON.stringify(filterSettings));
      formData.append('raw_audio', audioBlob, 'raw.webm');
      formData.append('filtered_audio', filteredBlob, 'filtered.wav');

      const clip = await api.post<{ id: string }>('/clips', formData);
      navigate(`/clips/${clip.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page">
      <section className="record-section">
        <h2>Record a Clip</h2>
        <p>Capture audio, apply filters, and share with the community.</p>
        {!audioBlob && <Recorder onRecordingComplete={handleRecordingComplete} />}

        {audioBlob && (
          <>
            <FilterChain
              filterSettings={filterSettings}
              onToggle={toggleFilter}
              onParamChange={updateParam}
            />
            <AudioPreview
              audioBlob={audioBlob}
              onPlayWithFilters={playWithFilters}
              onStop={stopPlayback}
            />
            <div className="upload-section">
              <input
                className="input"
                type="text"
                placeholder="Give your clip a title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <button
                className="btn btn-primary btn-lg"
                onClick={handleUpload}
                disabled={uploading || !title.trim()}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => { setAudioBlob(null); setDuration(0); setTitle(''); stopPlayback(); }}
              >
                Discard
              </button>
            </div>
            {error && <p className="form-error" style={{ marginTop: 8 }}>{error}</p>}
          </>
        )}
      </section>

      <div style={{ marginTop: 32 }}>
        <ClipFeed />
      </div>
    </div>
  );
}

function LoggedOutHome() {
  return (
    <div className="page">
      <div className="hero-cta">
        <div className="hero-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </div>
        <h2 className="hero-title">Record, Filter, Share</h2>
        <p className="hero-subtitle">Capture audio clips, apply real-time filters, and share your creations with the community.</p>
        <div className="hero-actions">
          <Link to="/login" className="btn btn-primary btn-lg">Log In</Link>
          <Link to="/register" className="btn btn-secondary btn-lg">Create Account</Link>
        </div>
      </div>
    </div>
  );
}

export function Home() {
  const { user } = useAuth();
  return user ? <LoggedInHome /> : <LoggedOutHome />;
}
