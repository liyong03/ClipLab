import type { FilterPlugin } from './types';
import { gainFilter } from './gain';
import { lowpassFilter } from './lowpass';
import { highpassFilter } from './highpass';
import { compressorFilter } from './compressor';
import { delayFilter } from './delay';

const registry = new Map<string, FilterPlugin>();

export function registerFilter(plugin: FilterPlugin): void {
  registry.set(plugin.id, plugin);
}

export function getFilter(id: string): FilterPlugin | undefined {
  return registry.get(id);
}

export function getAllFilters(): FilterPlugin[] {
  return Array.from(registry.values());
}

export function getFiltersByCategory(category: string): FilterPlugin[] {
  return getAllFilters().filter((f) => f.category === category);
}

// Register built-in filters
registerFilter(gainFilter);
registerFilter(lowpassFilter);
registerFilter(highpassFilter);
registerFilter(compressorFilter);
registerFilter(delayFilter);
