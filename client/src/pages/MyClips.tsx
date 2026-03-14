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

  if (!user) return <p>Please login to see your clips.</p>;
  if (loading) return <p>Loading...</p>;
  if (clips.length === 0) return <p>You haven't uploaded any clips yet.</p>;

  return (
    <div>
      <h2>My Clips</h2>
      <ul>
        {clips.map((clip) => (
          <li key={clip.id}>
            <Link to={`/clips/${clip.id}`}>
              <strong>{clip.title}</strong>
            </Link>
            {' '}<span>{new Date(clip.created_at).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
