import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioPlayer } from '../components/AudioPlayer';

beforeEach(() => {
  // Mock HTMLAudioElement
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  });
});

describe('AudioPlayer', () => {
  it('renders play button', () => {
    const { container } = render(<AudioPlayer src="/test.wav" />);
    const btn = container.querySelector('button[aria-label="Play"]');
    expect(btn).toBeTruthy();
  });

  it('renders time display starting at 0:00', () => {
    render(<AudioPlayer src="/test.wav" />);
    expect(screen.getAllByText('0:00').length).toBeGreaterThanOrEqual(1);
  });

  it('renders waveform bars when peaks provided', () => {
    const peaks = [0.5, 0.8, 0.3, 1.0, 0.2];
    const { container } = render(<AudioPlayer src="/test.wav" peaks={peaks} />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(peaks.length);
  });

  it('renders a progress bar when no peaks provided', () => {
    const { container } = render(<AudioPlayer src="/test.wav" />);
    const rects = container.querySelectorAll('rect');
    // Progress bar renders 2 rects (background + filled)
    expect(rects.length).toBe(2);
  });

  it('accepts a Blob as src', () => {
    const blob = new Blob(['audio-data'], { type: 'audio/wav' });
    const { container } = render(<AudioPlayer src={blob} />);
    const audio = container.querySelector('audio');
    expect(audio).toBeTruthy();
    expect(audio?.src).toContain('blob:mock-url');
  });

  it('accepts custom colors', () => {
    const peaks = [0.5, 0.5];
    const { container } = render(
      <AudioPlayer
        src="/test.wav"
        peaks={peaks}
        playedColor="#ff0000"
        unplayedColor="#00ff00"
      />,
    );
    const rects = container.querySelectorAll('rect');
    // All bars should be unplayed color at progress=0
    rects.forEach((rect) => {
      expect(rect.getAttribute('fill')).toBe('#00ff00');
    });
  });
});
