import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ClipFeed } from '../components/ClipFeed';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

describe('ClipFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockApi.get.mockReturnValue(new Promise(() => {})); // never resolves

    render(
      <MemoryRouter>
        <ClipFeed />
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading clips...')).toBeDefined();
  });

  it('renders clips from API', async () => {
    mockApi.get.mockResolvedValue([
      {
        id: '1',
        username: 'alice',
        title: 'My First Clip',
        duration: 10,
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        username: 'bob',
        title: 'Second Clip',
        duration: 5,
        created_at: '2024-01-02T00:00:00Z',
      },
    ]);

    render(
      <MemoryRouter>
        <ClipFeed />
      </MemoryRouter>,
    );

    expect(await screen.findByText('My First Clip')).toBeDefined();
    expect(await screen.findByText('Second Clip')).toBeDefined();
  });

  it('renders nothing when there are no clips', async () => {
    mockApi.get.mockResolvedValue([]);

    const { container } = render(
      <MemoryRouter>
        <ClipFeed />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading clips...')).toBeNull();
    });
    expect(container.firstChild).toBeNull();
  });
});
