import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('api client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('includes auth token in requests when available', async () => {
    localStorage.setItem('token', 'test-jwt-token');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { api } = await import('../lib/api');
    await api.get('/auth/me');

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Authorization']).toBe('Bearer test-jwt-token');
  });

  it('does not include auth token when not available', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { api } = await import('../lib/api');
    await api.get('/health');

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Authorization']).toBeUndefined();
  });

  it('throws on non-ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ detail: 'Invalid credentials' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { api } = await import('../lib/api');
    await expect(api.post('/auth/login', {})).rejects.toThrow('Invalid credentials');
  });
});
