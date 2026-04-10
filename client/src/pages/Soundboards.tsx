import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface SoundboardSummary {
  id: string;
  title: string;
  pad_count: number;
  created_at: string;
}

export function Soundboards() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<SoundboardSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .get<SoundboardSummary[]>('/soundboards')
      .then(setBoards)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this soundboard?')) return;
    await api.delete(`/soundboards/${id}`);
    setBoards((prev) => prev.filter((b) => b.id !== id));
  };

  if (!user) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Please login to see your soundboards.</p>
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div className="page">
        <p style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
      </div>
    );

  return (
    <div className="page">
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <h1>Soundboards</h1>
          <p>Grids of clips you can trigger on tap.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/soundboards/new')}>
          New Soundboard
        </button>
      </div>

      {boards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">#</div>
          <p>No soundboards yet. Create one to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {boards.map((b) => (
            <div key={b.id} className="clip-card">
              <div className="clip-card-header">
                <Link to={`/soundboards/${b.id}`} className="clip-card-title">
                  {b.title}
                </Link>
                <span className="clip-card-meta">
                  {b.pad_count} {b.pad_count === 1 ? 'pad' : 'pads'} ·{' '}
                  {new Date(b.created_at).toLocaleDateString()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Link to={`/soundboards/${b.id}`} className="btn btn-secondary btn-sm">
                  Edit
                </Link>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(b.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
