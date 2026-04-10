import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { WaveformBars } from '../components/AudioPlayer';

const MAX_CLIP_SECONDS = 3600;

interface ClipItem {
  id: string;
  title: string;
  waveform: string | null;
  created_at: string;
}

interface PadResponse {
  id: string;
  position: number;
  clip: { id: string; title: string; waveform: string | null };
}

interface TrackResponse {
  id: string;
  position: number;
  pads: PadResponse[];
}

interface SoundboardResponse {
  id: string;
  title: string;
  tracks: TrackResponse[];
}

interface Pad {
  clipId: string;
  title: string;
  peaks: number[] | null;
}

interface Track {
  pads: Pad[];
}

function parsePeaks(waveform: string | null): number[] | null {
  if (!waveform) return null;
  try {
    const parsed = JSON.parse(waveform);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function SoundboardEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState('Untitled Soundboard');
  const [tracks, setTracks] = useState<Track[]>([{ pads: [] }]);
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // UI-visible playback state
  const [activePadInTrack, setActivePadInTrack] = useState<(number | null)[]>([]);
  const [progressInTrack, setProgressInTrack] = useState<number[]>([]);
  const [previewing, setPreviewing] = useState(false);

  // Refs used inside audio-event handlers
  const audiosRef = useRef<HTMLAudioElement[]>([]);
  const tracksRef = useRef<Track[]>([]);
  const modeRef = useRef<'idle' | 'single' | 'all'>('idle');
  const trackCursorsRef = useRef<number[]>([]);
  const blobCacheRef = useRef<Map<string, string>>(new Map());
  const durationCacheRef = useRef<Map<string, number>>(new Map());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  const resolveClipUrl = useCallback(async (clipId: string): Promise<string> => {
    const cached = blobCacheRef.current.get(clipId);
    if (cached) return cached;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/clips/${clipId}/audio`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`Failed to load clip audio (${res.status})`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    blobCacheRef.current.set(clipId, url);
    return url;
  }, []);

  const resolveClipDuration = useCallback(
    async (clipId: string): Promise<number> => {
      const cached = durationCacheRef.current.get(clipId);
      if (cached !== undefined) return cached;
      const url = await resolveClipUrl(clipId);
      return new Promise<number>((resolve, reject) => {
        const probe = new Audio();
        probe.preload = 'metadata';
        probe.src = url;
        probe.onloadedmetadata = () => {
          const d = probe.duration || 0;
          durationCacheRef.current.set(clipId, d);
          resolve(d);
        };
        probe.onerror = () => reject(new Error('Could not read clip metadata'));
      });
    },
    [resolveClipUrl],
  );

  // Load clips and (if editing) the board.
  useEffect(() => {
    if (!user) return;
    const loadClips = api.get<ClipItem[]>(`/clips?username=${user.username}`);
    const loadBoard = isNew
      ? Promise.resolve(null)
      : api.get<SoundboardResponse>(`/soundboards/${id}`);

    Promise.all([loadClips, loadBoard])
      .then(([clipList, board]) => {
        setClips(clipList);
        if (board) {
          setTitle(board.title);
          const loaded: Track[] = board.tracks.map((t) => ({
            pads: t.pads.map((p) => ({
              clipId: p.clip.id,
              title: p.clip.title,
              peaks: parsePeaks(p.clip.waveform),
            })),
          }));
          setTracks(loaded.length > 0 ? loaded : [{ pads: [] }]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, id, isNew]);

  const stopAll = useCallback(() => {
    modeRef.current = 'idle';
    cancelAnimationFrame(rafRef.current);
    audiosRef.current.forEach((a) => {
      a.pause();
      a.currentTime = 0;
    });
    setPreviewing(false);
    setActivePadInTrack((prev) => prev.map(() => null));
    setProgressInTrack((prev) => prev.map(() => 0));
  }, []);

  // Keep audio elements in sync with track count; attach 'ended' handlers
  // once per element via a ref lookup.
  useEffect(() => {
    const audios = audiosRef.current;

    // Grow
    while (audios.length < tracks.length) {
      const index = audios.length;
      const a = new Audio();
      a.addEventListener('ended', () => handleTrackEnded(index));
      audios.push(a);
    }
    // Shrink
    while (audios.length > tracks.length) {
      const a = audios.pop();
      if (a) {
        a.pause();
        a.src = '';
      }
    }

    setActivePadInTrack((prev) => {
      if (prev.length === tracks.length) return prev;
      return Array(tracks.length).fill(null);
    });
    setProgressInTrack((prev) => {
      if (prev.length === tracks.length) return prev;
      return Array(tracks.length).fill(0);
    });
    // We intentionally leave the 'ended' listeners in place across renders so
    // they see the latest tracks via tracksRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks.length]);

  const handleTrackEnded = useCallback(
    async (trackIdx: number) => {
      if (modeRef.current === 'single') {
        modeRef.current = 'idle';
        cancelAnimationFrame(rafRef.current);
        setActivePadInTrack((prev) => {
          const copy = [...prev];
          copy[trackIdx] = null;
          return copy;
        });
        setProgressInTrack((prev) => {
          const copy = [...prev];
          copy[trackIdx] = 0;
          return copy;
        });
        return;
      }

      if (modeRef.current !== 'all') return;

      const trackList = tracksRef.current;
      const cursors = trackCursorsRef.current;
      const nextIdx = (cursors[trackIdx] ?? 0) + 1;
      const track = trackList[trackIdx];

      if (!track || nextIdx >= track.pads.length) {
        cursors[trackIdx] = -1;
        setActivePadInTrack((prev) => {
          const copy = [...prev];
          copy[trackIdx] = null;
          return copy;
        });
        setProgressInTrack((prev) => {
          const copy = [...prev];
          copy[trackIdx] = 0;
          return copy;
        });

        // If every track is done, exit all-mode.
        if (cursors.every((c) => c === -1)) {
          modeRef.current = 'idle';
          cancelAnimationFrame(rafRef.current);
          setPreviewing(false);
        }
        return;
      }

      cursors[trackIdx] = nextIdx;
      const audio = audiosRef.current[trackIdx];
      if (!audio) return;
      try {
        audio.src = await resolveClipUrl(track.pads[nextIdx].clipId);
        await audio.play();
        setActivePadInTrack((prev) => {
          const copy = [...prev];
          copy[trackIdx] = nextIdx;
          return copy;
        });
        setProgressInTrack((prev) => {
          const copy = [...prev];
          copy[trackIdx] = 0;
          return copy;
        });
      } catch (err) {
        console.error(err);
      }
    },
    [resolveClipUrl],
  );

  const tickProgress = useCallback(() => {
    const audios = audiosRef.current;
    setProgressInTrack((prev) => {
      let changed = false;
      const next = prev.slice();
      for (let i = 0; i < audios.length; i++) {
        const a = audios[i];
        if (!a || a.paused || !a.duration) continue;
        const p = a.currentTime / a.duration;
        if (Math.abs(p - next[i]) > 0.001) {
          next[i] = p;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    rafRef.current = requestAnimationFrame(tickProgress);
  }, []);

  const startProgressLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tickProgress);
  }, [tickProgress]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      audiosRef.current.forEach((a) => {
        a.pause();
        a.src = '';
      });
      audiosRef.current = [];
      blobCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobCacheRef.current.clear();
    };
  }, []);

  // ---- interactions ----

  const playPad = async (trackIdx: number, padIdx: number) => {
    const audio = audiosRef.current[trackIdx];
    if (!audio) return;
    const pad = tracks[trackIdx]?.pads[padIdx];
    if (!pad) return;

    const alreadyActive =
      modeRef.current === 'single' && activePadInTrack[trackIdx] === padIdx;
    if (alreadyActive) {
      stopAll();
      return;
    }

    // Single-pad tap: stop everything else first.
    stopAll();
    modeRef.current = 'single';
    try {
      audio.src = await resolveClipUrl(pad.clipId);
      await audio.play();
      setActivePadInTrack((prev) => {
        const copy = Array(tracks.length).fill(null);
        copy[trackIdx] = padIdx;
        return copy;
      });
      setProgressInTrack(Array(tracks.length).fill(0));
      startProgressLoop();
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
      stopAll();
    }
  };

  const startPreview = async () => {
    if (previewing) {
      stopAll();
      return;
    }
    const playableTracks = tracks
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.pads.length > 0);
    if (playableTracks.length === 0) return;

    stopAll();
    modeRef.current = 'all';
    setPreviewing(true);

    const cursors = Array(tracks.length).fill(-1);
    trackCursorsRef.current = cursors;
    const nextActive: (number | null)[] = Array(tracks.length).fill(null);

    try {
      for (const { t, i } of playableTracks) {
        cursors[i] = 0;
        const audio = audiosRef.current[i];
        if (!audio) continue;
        audio.src = await resolveClipUrl(t.pads[0].clipId);
      }
      // Start them as close to the same instant as possible.
      await Promise.all(
        playableTracks.map(({ i }) => {
          const audio = audiosRef.current[i];
          if (!audio) return Promise.resolve();
          nextActive[i] = 0;
          return audio.play();
        }),
      );
      setActivePadInTrack(nextActive);
      setProgressInTrack(Array(tracks.length).fill(0));
      startProgressLoop();
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
      stopAll();
    }
  };

  const addPadToTrack = async (clip: ClipItem, trackIdx: number) => {
    try {
      const duration = await resolveClipDuration(clip.id);
      if (duration > MAX_CLIP_SECONDS) {
        alert(
          `"${clip.title}" is ${Math.round(duration)}s long; the limit is ${MAX_CLIP_SECONDS}s (1 hour).`,
        );
        return;
      }
    } catch (err) {
      console.error(err);
      alert('Could not read clip duration.');
      return;
    }

    setTracks((prev) => {
      const copy = prev.map((t) => ({ pads: [...t.pads] }));
      copy[trackIdx].pads.push({
        clipId: clip.id,
        title: clip.title,
        peaks: parsePeaks(clip.waveform),
      });
      return copy;
    });
  };

  const removePad = (trackIdx: number, padIdx: number) => {
    stopAll();
    setTracks((prev) => {
      const copy = prev.map((t) => ({ pads: [...t.pads] }));
      copy[trackIdx].pads.splice(padIdx, 1);
      return copy;
    });
  };

  const movePad = (trackIdx: number, padIdx: number, delta: -1 | 1) => {
    const target = padIdx + delta;
    setTracks((prev) => {
      const track = prev[trackIdx];
      if (!track) return prev;
      if (target < 0 || target >= track.pads.length) return prev;
      stopAll();
      const copy = prev.map((t) => ({ pads: [...t.pads] }));
      const pads = copy[trackIdx].pads;
      [pads[padIdx], pads[target]] = [pads[target], pads[padIdx]];
      return copy;
    });
  };

  const addTrack = () => {
    setTracks((prev) => {
      const next = [...prev, { pads: [] }];
      setSelectedTrack(next.length - 1);
      return next;
    });
  };

  const removeTrack = (trackIdx: number) => {
    if (tracks.length === 1) {
      alert('A soundboard needs at least one track.');
      return;
    }
    if (!confirm('Delete this track and its pads?')) return;
    stopAll();
    setTracks((prev) => prev.filter((_, i) => i !== trackIdx));
    setSelectedTrack((prev) => {
      if (prev === trackIdx) return 0;
      if (prev > trackIdx) return prev - 1;
      return prev;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        title,
        tracks: tracks.map((t) => ({ clip_ids: t.pads.map((p) => p.clipId) })),
      };
      if (isNew) {
        await api.post('/soundboards', body);
      } else {
        await api.put(`/soundboards/${id}`, body);
      }
      navigate('/soundboards');
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const availableClips = useMemo(() => clips, [clips]);

  if (!user) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Please login to edit soundboards.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <p style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>{isNew ? 'New Soundboard' : 'Edit Soundboard'}</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: 6,
              color: 'var(--text-secondary)',
              fontSize: 13,
            }}
          >
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-primary)',
              fontSize: 14,
            }}
          />
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <h2 style={{ fontSize: 16, margin: 0 }}>
              Tracks ({tracks.length})
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={addTrack}>
                + Add Track
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={startPreview}
                disabled={tracks.every((t) => t.pads.length === 0)}
              >
                {previewing ? 'Stop Preview' : 'Play All'}
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={saving || title.trim().length === 0}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tracks.map((track, trackIdx) => {
              const isSelected = selectedTrack === trackIdx;
              return (
                <div
                  key={trackIdx}
                  onClick={() => setSelectedTrack(trackIdx)}
                  style={{
                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: 12,
                    background: 'var(--surface)',
                    boxShadow: isSelected ? 'var(--shadow-glow)' : 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      Track {trackIdx + 1}
                      {isSelected && (
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--accent)',
                            fontWeight: 500,
                          }}
                        >
                          · selected
                        </span>
                      )}
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTrack(trackIdx);
                      }}
                    >
                      Delete Track
                    </button>
                  </div>

                  {track.pads.length === 0 ? (
                    <div
                      style={{
                        padding: 16,
                        textAlign: 'center',
                        color: 'var(--text-tertiary)',
                        fontSize: 13,
                        border: '1px dashed var(--border)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      {isSelected
                        ? 'Add clips from below to fill this track.'
                        : 'Empty track. Click to select, then add clips.'}
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: 12,
                      }}
                    >
                      {track.pads.map((pad, padIdx) => {
                        const isActive =
                          activePadInTrack[trackIdx] === padIdx;
                        const padProgress = isActive
                          ? progressInTrack[trackIdx] ?? 0
                          : 0;
                        return (
                          <div
                            key={`${pad.clipId}-${padIdx}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              background: isActive
                                ? 'var(--accent-muted)'
                                : 'var(--bg-tertiary)',
                              border: `1px solid ${
                                isActive ? 'var(--accent)' : 'var(--border)'
                              }`,
                              borderRadius: 'var(--radius-md)',
                              padding: 10,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                            }}
                          >
                            <button
                              onClick={() => playPad(trackIdx, padIdx)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                textAlign: 'left',
                                color: 'var(--text-primary)',
                                fontWeight: 600,
                                fontSize: 13,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                              title={isActive ? 'Stop' : 'Play'}
                            >
                              <span style={{ width: 12 }}>
                                {isActive ? '■' : '▶'}
                              </span>
                              <span
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {pad.title}
                              </span>
                            </button>

                            <div
                              onClick={() => playPad(trackIdx, padIdx)}
                              style={{ height: 36, cursor: 'pointer' }}
                            >
                              {pad.peaks && pad.peaks.length > 0 ? (
                                <WaveformBars
                                  peaks={pad.peaks}
                                  progress={padProgress}
                                  height={36}
                                  playedColor="#6366f1"
                                  unplayedColor="#d1d5db"
                                />
                              ) : (
                                <div
                                  style={{
                                    height: 36,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-tertiary)',
                                    fontSize: 10,
                                  }}
                                >
                                  no waveform
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => movePad(trackIdx, padIdx, -1)}
                                disabled={padIdx === 0}
                                style={{ flex: 1, minWidth: 0 }}
                                title="Move left"
                              >
                                ←
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => movePad(trackIdx, padIdx, 1)}
                                disabled={padIdx === track.pads.length - 1}
                                style={{ flex: 1, minWidth: 0 }}
                                title="Move right"
                              >
                                →
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => removePad(trackIdx, padIdx)}
                                style={{ flex: 1, minWidth: 0 }}
                                title="Remove"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: 16, marginBottom: 6 }}>Your Clips</h2>
          <p
            style={{
              color: 'var(--text-tertiary)',
              fontSize: 12,
              marginBottom: 12,
            }}
          >
            Clips up to 1 hour long. They land on Track {selectedTrack + 1} (the
            selected track).
          </p>
          {availableClips.length === 0 ? (
            <div className="empty-state">
              <p>You haven't uploaded any clips yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {availableClips.map((clip) => (
                <div
                  key={clip.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                    {clip.title}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => addPadToTrack(clip, selectedTrack)}
                  >
                    Add to Track {selectedTrack + 1}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
