import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useFilterChain } from '../hooks/useFilterChain';
import { FilterChain } from './FilterChain';
import { AudioPlayer } from './AudioPlayer';
import { AudioPreview } from './AudioPreview';
import type { FilterSetting } from '../filters/types';

interface ClipData {
  id: string;
  user_id: string;
  username: string;
  title: string;
  filter_settings: string;
  duration: number | null;
  waveform: string | null;
  created_at: string;
}

export function ClipDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [clip, setClip] = useState<ClipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rawBlob, setRawBlob] = useState<Blob | null>(null);
  const [audioCacheBust, setAudioCacheBust] = useState(0);

  const {
    filterSettings,
    setFilterSettings,
    toggleFilter,
    updateParam,
    playWithFilters,
    stopPlayback,
    renderFilteredAudio,
  } = useFilterChain();

  useEffect(() => {
    if (!id) return;
    api
      .get<ClipData>(`/clips/${id}`)
      .then((data) => {
        setClip(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const isOwner = user && clip && user.id === clip.user_id;

  const fetchRawAudio = useCallback(async () => {
    if (!id) return null;
    const resp = await fetch(`/api/clips/${id}/raw`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return await resp.blob();
  }, [id]);

  const handleEdit = async () => {
    if (!clip) return;
    const saved: FilterSetting[] = JSON.parse(clip.filter_settings);
    if (saved.length > 0) {
      setFilterSettings(saved);
    }
    // Fetch raw audio for preview
    const blob = await fetchRawAudio();
    setRawBlob(blob);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!clip || !id || !rawBlob) return;
    setSaving(true);
    try {
      const filteredBlob = await renderFilteredAudio(rawBlob);

      const formData = new FormData();
      formData.append('filter_settings', JSON.stringify(filterSettings));
      formData.append('filtered_audio', filteredBlob, 'filtered.wav');

      await api.put(`/clips/${id}`, formData);

      const updated = await api.get<ClipData>(`/clips/${id}`);
      setClip(updated);
      setAudioCacheBust(Date.now());
      setEditing(false);
      setRawBlob(null);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    stopPlayback();
    setEditing(false);
    setRawBlob(null);
  };

  if (loading) return <div className="page"><p style={{ color: 'var(--text-tertiary)' }}>Loading...</p></div>;
  if (!clip) return <div className="page"><p style={{ color: 'var(--text-tertiary)' }}>Clip not found.</p></div>;

  const peaks = clip.waveform ? JSON.parse(clip.waveform) : undefined;

  return (
    <div className="page">
      <div className="page-header">
        <h1>{clip.title}</h1>
        <p>
          by {clip.username} &middot; {new Date(clip.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* Main player - shows saved filtered audio */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h4 style={{ marginBottom: 12, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {editing ? 'Saved Version' : 'Filtered Audio'}
        </h4>
        <AudioPlayer
          src={`/api/clips/${clip.id}/audio${audioCacheBust ? `?t=${audioCacheBust}` : ''}`}
          peaks={peaks}
        />
      </div>

      {isOwner && !editing && (
        <button className="btn btn-secondary" onClick={handleEdit}>
          Edit Filters
        </button>
      )}

      {editing && rawBlob && (
        <>
          <div className="card" style={{ marginTop: 16 }}>
            <FilterChain
              filterSettings={filterSettings}
              onToggle={toggleFilter}
              onParamChange={updateParam}
            />

            <AudioPreview
              audioBlob={rawBlob}
              onPlayWithFilters={playWithFilters}
              onStop={stopPlayback}
              showRawPlayer={false}
            />

          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="btn btn-ghost" onClick={handleCancelEdit}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}
