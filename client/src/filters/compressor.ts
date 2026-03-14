import type { FilterPlugin } from './types';

export const compressorFilter: FilterPlugin = {
  id: 'compressor',
  name: 'Compressor',
  category: 'dynamics',
  params: [
    { key: 'threshold', label: 'Threshold', type: 'range', min: -100, max: 0, step: 1, default: -24 },
    { key: 'ratio', label: 'Ratio', type: 'range', min: 1, max: 20, step: 0.5, default: 12 },
    { key: 'attack', label: 'Attack', type: 'range', min: 0, max: 1, step: 0.001, default: 0.003 },
    { key: 'release', label: 'Release', type: 'range', min: 0, max: 1, step: 0.01, default: 0.25 },
  ],
  createNodes(ctx, params) {
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = params.threshold ?? -24;
    compressor.ratio.value = params.ratio ?? 12;
    compressor.attack.value = params.attack ?? 0.003;
    compressor.release.value = params.release ?? 0.25;
    return [compressor];
  },
};
