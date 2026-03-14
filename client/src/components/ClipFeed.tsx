import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { AudioPlayer } from './AudioPlayer';

interface ClipItem {
  id: string;
  username: string;
  title: string;
  duration: number | null;
  waveform: string | null;
  created_at: string;
}

export function ClipFeed() {
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ClipItem[]>('/clips')
      .then(setClips)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: 'var(--text-tertiary)' }}>Loading clips...</p>;
  if (clips.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🎵</div>
        <p>No clips yet. Be the first to record one!</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Recent Clips</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {clips.map((clip) => {
          const peaks = clip.waveform ? JSON.parse(clip.waveform) : undefined;
          return (
            <div key={clip.id} className="clip-card">
              <div className="clip-card-header">
                <Link to={`/clips/${clip.id}`} className="clip-card-title">
                  {clip.title}
                </Link>
                <span className="clip-card-meta">
                  {clip.username} &middot; {new Date(clip.created_at).toLocaleDateString()}
                </span>
              </div>
              <AudioPlayer
                src={`/api/clips/${clip.id}/audio`}
                peaks={peaks}
                height={40}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
