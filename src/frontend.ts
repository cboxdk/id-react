import { useEffect, useRef, useState } from 'react';

import type { CboxWidgetAppearance } from './types.js';

/**
 * Reading the environment's own configuration from the browser.
 *
 * The widgets have always been fed by the host app: you pass `user`, `urls` and
 * `appearance` into `<CboxIdProvider>` and your server works out what those are. That is
 * still the right shape when you already have a server rendering the page — it is one
 * fewer request and there is no loading state.
 *
 * It is the wrong shape for a static site, a widget dropped into somebody else's page, or
 * any frontend that has no backend of its own. `useCboxConfig` is for those: given a
 * publishable key, the page reads its own theme and sign-in configuration directly.
 *
 * Deliberately NOT wired into `<CboxIdProvider>` automatically. A provider that silently
 * makes a network request on mount is a provider that turns a server-rendered page into
 * one with a flash of unthemed widgets, and that trade belongs to the person building the
 * page rather than to us.
 */

/** What the hook needs. The key is public — put it in your bundle. */
export interface UseCboxConfigOptions {
  /** Your identity provider's origin, e.g. `https://id.acme.com`. */
  issuer: string;
  /** `pk_live_…` or `pk_test_…`. */
  publishableKey: string;
  /** Injectable for tests and non-browser runtimes. */
  fetch?: typeof globalThis.fetch;
}

/** A social button to draw. */
export interface CboxSocialProvider {
  provider: string;
  name: string;
}

export interface CboxFrontendConfig {
  mode: 'test' | 'live' | null;
  issuer: string;
  endpoints: Record<string, string>;
  social: CboxSocialProvider[];
  appearance?: {
    preset: string;
    radius: string;
    font: string;
    light: Record<string, string>;
    dark: Record<string, string>;
  };
}

export interface UseCboxConfigResult {
  config: CboxFrontendConfig | null;
  /** The widget appearance derived from the environment's theme, ready for the provider. */
  appearance: CboxWidgetAppearance;
  loading: boolean;
  error: Error | null;
}

/**
 * Fetch the environment's public sign-in configuration.
 *
 * ```tsx
 * const { appearance, loading } = useCboxConfig({
 *   issuer: 'https://id.acme.com',
 *   publishableKey: 'pk_live_…',
 * })
 *
 * return <CboxIdProvider appearance={appearance}>{children}</CboxIdProvider>
 * ```
 *
 * `appearance` is `{}` until the document arrives and whenever the environment has set no
 * theme, so the widgets render with their own defaults rather than with nothing — an
 * empty theme and an unloaded one look identical to a component, and they should.
 */
export function useCboxConfig(options: UseCboxConfigOptions): UseCboxConfigResult {
  const { issuer, publishableKey, fetch: fetchImpl } = options;

  const [config, setConfig] = useState<CboxFrontendConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // HELD IN A REF, AND OUT OF THE DEPENDENCY ARRAY. `fetch` is documented as injectable
  // for tests, so the natural way to pass one is an inline arrow — which is a new value
  // on every render, which re-ran this effect, which set state, which rendered again.
  // An infinite request loop against the Frontend API, triggered by using the option the
  // way its own doc comment describes. The identity of the function never needs to
  // re-run the effect; only the issuer and the key do.
  const fetchRef = useRef(fetchImpl);
  fetchRef.current = fetchImpl;

  useEffect(() => {
    // Guards a React 18 StrictMode double-mount and any unmount mid-flight: setting
    // state on a component that is gone is a warning nobody can act on.
    let live = true;
    const doFetch = fetchRef.current ?? globalThis.fetch.bind(globalThis);

    setLoading(true);
    setError(null);

    doFetch(`${issuer.replace(/\/$/, '')}/frontend/v1/config`, {
      headers: {
        'X-Cbox-Publishable-Key': publishableKey,
        Accept: 'application/json',
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `Cbox ID refused the request (${response.status}). Check that this page's origin is on the key's allow-list.`,
          );
        }

        return (await response.json()) as CboxFrontendConfig;
      })
      .then((doc) => {
        if (live) {
          setConfig(doc);
          setLoading(false);
        }
      })
      .catch((cause: unknown) => {
        if (live) {
          setError(cause instanceof Error ? cause : new Error(String(cause)));
          setLoading(false);
        }
      });

    return () => {
      live = false;
    };
  }, [issuer, publishableKey]);

  return { config, appearance: toWidgetAppearance(config), loading, error };
}

/**
 * Map the environment's theme onto the widget appearance the provider takes.
 *
 * Only the accent travels, because that is the only token the widgets actually use — a
 * fuller mapping would be inventing a contract the components do not have, and the
 * mismatch would show up as a widget that ignores half of what you set. The light mode's
 * primary is the accent: widgets sit inside the host page's own theme, and a host that
 * renders dark already has its own dark surface under them.
 *
 * THE FOREGROUND IS DERIVED, NEVER DEFAULTED. It used to be left alone, so
 * `--cbox-id-accent-fg` stayed white whatever the customer's primary was — and a brand
 * whose primary is yellow, lime or pale cyan got white text on a light button as the
 * submit control of its sign-in form. Nobody configures that on purpose, and the customer
 * who does hit it sees it on the one screen they cannot afford to have broken.
 */
function toWidgetAppearance(config: CboxFrontendConfig | null): CboxWidgetAppearance {
  const primary = config?.appearance?.light?.primary;

  return primary ? { accent: primary, accentForeground: readableOn(primary) } : {};
}

/**
 * Black or white, whichever the eye can actually read on that colour.
 *
 * Relative luminance per WCAG 2.x, with the sRGB transfer function applied — the naive
 * `(r+g+b)/3` version gets greens and cyans wrong, which are exactly the brand colours
 * this is for. Anything it cannot parse falls back to white, the previous behaviour.
 */
function readableOn(color: string): string {
  const hex = color.trim().replace(/^#/, '');

  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return '#ffffff';
  }

  const channel = (pair: string): number => {
    const v = parseInt(pair, 16) / 255;

    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };

  const luminance =
    0.2126 * channel(full.slice(0, 2)) + 0.7152 * channel(full.slice(2, 4)) + 0.0722 * channel(full.slice(4, 6));

  // The crossover where contrast against black and against white are equal.
  return luminance > 0.179 ? '#111111' : '#ffffff';
}
