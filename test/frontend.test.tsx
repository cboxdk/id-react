import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCboxConfig } from '../src/frontend.js';

const CONFIG = {
  mode: 'live',
  issuer: 'https://id.acme.test',
  endpoints: { authorization: 'https://id.acme.test/oauth/authorize' },
  social: [],
  appearance: {
    preset: 'midnight',
    radius: '0rem',
    font: 'sans',
    light: { primary: '#5b5bd6' },
    dark: { primary: '#8f8ff0' },
  },
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function Probe({ fetchImpl }: { fetchImpl: typeof fetch }) {
  const { appearance, loading, error } = useCboxConfig({
    issuer: 'https://id.acme.test',
    publishableKey: 'pk_live_abc',
    fetch: fetchImpl,
  });

  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="accent">{appearance.accent ?? 'none'}</span>
      <span data-testid="error">{error?.message ?? 'none'}</span>
    </div>
  );
}

describe('useCboxConfig', () => {
  it('reads the environment theme and hands back a widget appearance', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respond(CONFIG)) as unknown as typeof fetch;

    render(<Probe fetchImpl={fetchImpl} />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('accent').textContent).toBe('#5b5bd6');
  });

  /**
   * An empty theme and an unloaded one look identical to a component, and they should:
   * both mean "use your own defaults". Anything else gives a flash of unthemed widgets
   * that then restyle themselves.
   */
  it('hands back an empty appearance when the environment has set no theme', async () => {
    const { appearance: _unused, ...rest } = CONFIG;
    const fetchImpl = vi.fn().mockResolvedValue(respond(rest)) as unknown as typeof fetch;

    render(<Probe fetchImpl={fetchImpl} />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('accent').textContent).toBe('none');
  });

  it('names the origin allow-list when the request is refused', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respond({}, 401)) as unknown as typeof fetch;

    render(<Probe fetchImpl={fetchImpl} />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('error').textContent).toMatch(/allow-list/i);
  });

  it('sends the key as a header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respond(CONFIG));

    render(<Probe fetchImpl={fetchImpl as unknown as typeof fetch} />);

    await waitFor(() => expect(fetchImpl).toHaveBeenCalled());

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit & { headers: Record<string, string> };
    expect(init.headers['X-Cbox-Publishable-Key']).toBe('pk_live_abc');
  });
});
