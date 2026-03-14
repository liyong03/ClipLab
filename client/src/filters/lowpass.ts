import type { FilterPlugin } from './types';

export const lowpassFilter: FilterPlugin = {
  id: 'lowpass',
  name: 'Low-pass',
  category: 'eq',
  params: [
    { key: 'frequency', label: 'Frequency', type: 'range', min: 20, max: 20000, step: 1, default: 1000 },
    { key: 'Q', label: 'Q', type: 'range', min: 0.1, max: 20, step: 0.1, default: 1 },
  ],
  createNodes(ctx, params) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = params.frequency ?? 1000;
    filter.Q.value = params.Q ?? 1;
    return [filter];
  },
};
