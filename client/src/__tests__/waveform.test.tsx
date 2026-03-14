import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WaveformView } from '../components/WaveformView';

describe('WaveformView', () => {
  it('renders correct number of bars', () => {
    const peaks = [0.5, 0.8, 0.3, 1.0, 0.2];
    const { container } = render(<WaveformView peaks={peaks} />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(5);
  });

  it('renders nothing for empty peaks', () => {
    const { container } = render(<WaveformView peaks={[]} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('colors past bars differently based on progress', () => {
    const peaks = [0.5, 0.5, 0.5, 0.5];
    const { container } = render(
      <WaveformView peaks={peaks} currentTime={5} duration={10} />,
    );
    const rects = container.querySelectorAll('rect');
    // First 3 bars should be "past" (blue, i/n <= 0.5), last 1 "future" (gray)
    expect(rects[0].getAttribute('fill')).toBe('#3b82f6');
    expect(rects[1].getAttribute('fill')).toBe('#3b82f6');
    expect(rects[2].getAttribute('fill')).toBe('#3b82f6');
    expect(rects[3].getAttribute('fill')).toBe('#94a3b8');
  });
});
