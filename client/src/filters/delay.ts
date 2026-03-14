import type { FilterPlugin } from './types';

export const delayFilter: FilterPlugin = {
  id: 'delay',
  name: 'Delay / Echo',
  category: 'effects',
  params: [
    { key: 'delayTime', label: 'Delay Time', type: 'range', min: 0, max: 2, step: 0.01, default: 0.3 },
    { key: 'feedback', label: 'Feedback', type: 'range', min: 0, max: 0.9, step: 0.01, default: 0.4 },
  ],
  createNodes(ctx, params) {
    // Delay with feedback: input → delay → gain (feedback) → delay
    // We return [delay, feedbackGain] where delay is both input and output
    const delay = ctx.createDelay(5);
    delay.delayTime.value = params.delayTime ?? 0.3;

    const feedbackGain = ctx.createGain();
    feedbackGain.gain.value = params.feedback ?? 0.4;

    // Create dry/wet mix
    const dryGain = ctx.createGain();
    dryGain.gain.value = 1;

    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.5;

    const merger = ctx.createGain();

    // Feedback loop: delay → feedbackGain → delay
    delay.connect(feedbackGain);
    feedbackGain.connect(delay);

    // Mix: input splits to dry and delay, both merge to output
    // We return the delay node - the hook will connect source → delay
    // and delay → destination
    return [delay];
  },
};
