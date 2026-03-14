import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

interface ClipItem {
  id: string;
  username: string;
  title: string;
  duration: number | null;
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

  if (loading) return <p>Loading clips...</p>;
  if (clips.length === 0) return <p>No clips yet.</p>;

  return (
    <div>
      <h2>Recent Clips</h2>
      <ul>
        {clips.map((clip) => (
          <li key={clip.id}>
            <Link to={`/clips/${clip.id}`}>
              <strong>{clip.title}</strong>
            </Link>
            {' '}by {clip.username}
            {' '}<span>{new Date(clip.created_at).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
