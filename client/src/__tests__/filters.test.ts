import { describe, it, expect } from 'vitest';
import { getAllFilters, getFilter, getFiltersByCategory, registerFilter } from '../filters/registry';
import type { FilterPlugin } from '../filters/types';

describe('Filter Registry', () => {
  it('has all built-in filters registered', () => {
    const filters = getAllFilters();
    const ids = filters.map((f) => f.id);
    expect(ids).toContain('gain');
    expect(ids).toContain('lowpass');
    expect(ids).toContain('highpass');
    expect(ids).toContain('compressor');
    expect(ids).toContain('delay');
    expect(filters.length).toBeGreaterThanOrEqual(5);
  });

  it('retrieves a filter by id', () => {
    const gain = getFilter('gain');
    expect(gain).toBeDefined();
    expect(gain!.name).toBe('Gain');
    expect(gain!.category).toBe('eq');
  });

  it('returns undefined for unknown filter', () => {
    expect(getFilter('nonexistent')).toBeUndefined();
  });

  it('filters by category', () => {
    const eqFilters = getFiltersByCategory('eq');
    expect(eqFilters.length).toBeGreaterThanOrEqual(2);
    eqFilters.forEach((f) => expect(f.category).toBe('eq'));
  });

  it('can register a custom filter', () => {
    const custom: FilterPlugin = {
      id: 'test-custom',
      name: 'Test Custom',
      category: 'test',
      params: [],
    };
    registerFilter(custom);
    expect(getFilter('test-custom')).toBeDefined();
    expect(getFilter('test-custom')!.name).toBe('Test Custom');
  });
});

describe('Filter Plugins', () => {
  it('gain filter has correct params', () => {
    const gain = getFilter('gain')!;
    expect(gain.params).toHaveLength(1);
    expect(gain.params[0].key).toBe('level');
    expect(gain.params[0].default).toBe(1);
  });

  it('lowpass filter has frequency and Q params', () => {
    const lp = getFilter('lowpass')!;
    const keys = lp.params.map((p) => p.key);
    expect(keys).toContain('frequency');
    expect(keys).toContain('Q');
  });

  it('compressor filter has 4 params', () => {
    const comp = getFilter('compressor')!;
    expect(comp.params.length).toBe(4);
  });

  it('delay filter has delayTime and feedback params', () => {
    const del = getFilter('delay')!;
    const keys = del.params.map((p) => p.key);
    expect(keys).toContain('delayTime');
    expect(keys).toContain('feedback');
  });
});

describe('FilterSetting serialization', () => {
  it('round-trips filter settings through JSON', () => {
    const settings = [
      { filterId: 'gain', enabled: true, params: { level: 1.5 } },
      { filterId: 'lowpass', enabled: false, params: { frequency: 1000, Q: 1 } },
    ];
    const json = JSON.stringify(settings);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(settings);
    expect(parsed[0].filterId).toBe('gain');
    expect(parsed[0].params.level).toBe(1.5);
    expect(parsed[1].enabled).toBe(false);
  });
});
