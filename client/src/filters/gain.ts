import type { FilterPlugin } from './types';

export const gainFilter: FilterPlugin = {
  id: 'gain',
  name: 'Gain',
  category: 'eq',
  params: [
    { key: 'level', label: 'Level', type: 'range', min: 0, max: 3, step: 0.1, default: 1 },
  ],
  createNodes(ctx, params) {
    const gain = ctx.createGain();
    gain.gain.value = params.level ?? 1;
    return [gain];
  },
};
