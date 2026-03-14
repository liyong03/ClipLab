import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useFilterChain } from '../hooks/useFilterChain';
import { FilterChain } from './FilterChain';
import { AudioPlayer } from './AudioPlayer';
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

  const handleEdit = async () => {
    if (!clip) return;
    const saved: FilterSetting[] = JSON.parse(clip.filter_settings);
    if (saved.length > 0) {
      setFilterSettings(saved);
    }
    setEditing(true);
  };

  const handleSave = async () => {
    if (!clip || !id) return;
    setSaving(true);
    try {
      const rawResp = await fetch(`/api/clips/${id}/raw`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const rawBlob = await rawResp.blob();
      const filteredBlob = await renderFilteredAudio(rawBlob);

      const formData = new FormData();
      formData.append('filter_settings', JSON.stringify(filterSettings));
      formData.append('filtered_audio', filteredBlob, 'filtered.wav');

      await api.put(`/clips/${id}`, formData);

      const updated = await api.get<ClipData>(`/clips/${id}`);
      setClip(updated);
      setEditing(false);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
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

      <div className="card" style={{ marginBottom: 20 }}>
        <AudioPlayer
          src={`/api/clips/${clip.id}/audio`}
          peaks={peaks}
        />
      </div>

      {isOwner && !editing && (
        <button className="btn btn-secondary" onClick={handleEdit}>
          Edit Filters
        </button>
      )}

      {editing && (
        <div className="card" style={{ marginTop: 16 }}>
          <FilterChain
            filterSettings={filterSettings}
            onToggle={toggleFilter}
            onParamChange={updateParam}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
