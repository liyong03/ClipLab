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
    <div>
      <h1>ClipLab</h1>

      {user && (
        <section>
          <h2>Record a Clip</h2>
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
                onPlay={playWithFilters}
                onStop={stopPlayback}
              />
              <div>
                <input
                  type="text"
                  placeholder="Clip title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <button onClick={handleUpload} disabled={uploading || !title.trim()}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
              {error && <p style={{ color: 'red' }}>{error}</p>}
            </>
          )}
        </section>
      )}

      {!user && <p>Login or register to start recording clips.</p>}

      <ClipFeed />
    </div>
  );
}
