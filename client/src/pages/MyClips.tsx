import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface ClipItem {
  id: string;
  title: string;
  created_at: string;
}

export function MyClips() {
  const { user } = useAuth();
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .get<ClipItem[]>(`/clips?username=${user.username}`)
      .then(setClips)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Please login to see your clips.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="page"><p style={{ color: 'var(--text-tertiary)' }}>Loading...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Clips</h1>
        <p>All your recorded and uploaded clips.</p>
      </div>

      {clips.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎙</div>
          <p>You haven't uploaded any clips yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {clips.map((clip) => (
            <div key={clip.id} className="clip-card">
              <div className="clip-card-header">
                <Link to={`/clips/${clip.id}`} className="clip-card-title">
                  {clip.title}
                </Link>
                <span className="clip-card-meta">
                  {new Date(clip.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
