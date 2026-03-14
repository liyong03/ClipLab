import type { FilterPlugin } from './types';

export const highpassFilter: FilterPlugin = {
  id: 'highpass',
  name: 'High-pass',
  category: 'eq',
  params: [
    { key: 'frequency', label: 'Frequency', type: 'range', min: 20, max: 20000, step: 1, default: 200 },
    { key: 'Q', label: 'Q', type: 'range', min: 0.1, max: 20, step: 0.1, default: 1 },
  ],
  createNodes(ctx, params) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = params.frequency ?? 200;
    filter.Q.value = params.Q ?? 1;
    return [filter];
  },
};
