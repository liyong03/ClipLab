import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Recorder } from '../components/Recorder';
import { FilterChain } from '../components/FilterChain';
import { AudioPreview } from '../components/AudioPreview';
import { ClipFeed } from '../components/ClipFeed';
import { useFilterChain } from '../hooks/useFilterChain';
import { api } from '../lib/api';

export function Home() {
  const { user } = useAuth();
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
      {user && (
        <section className="record-section">
          <h2>Record a Clip</h2>
          <p>Capture audio, apply filters, and share with the community.</p>
          <Recorder onRecordingComplete={handleRecordingComplete} />

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
              </div>
              {error && <p className="form-error" style={{ marginTop: 8 }}>{error}</p>}
            </>
          )}
        </section>
      )}

      {!user && (
        <div className="empty-state">
          <div className="empty-state-icon">🎙</div>
          <p>Login or register to start recording clips.</p>
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <ClipFeed />
      </div>
    </div>
  );
}
