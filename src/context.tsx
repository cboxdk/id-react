import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import { CSS, STYLE_ID } from './styles.js';
import type { CboxWidgetAppearance, CboxWidgetUrls, CboxWidgetUser } from './types.js';

interface CboxIdContextValue {
  user: CboxWidgetUser | null;
  urls: CboxWidgetUrls;
  appearance: CboxWidgetAppearance;
}

const CboxIdContext = createContext<CboxIdContextValue | null>(null);

export interface CboxIdProviderProps {
  /** The signed-in user, or null when signed out. */
  user?: CboxWidgetUser | null;
  /** URLs the widgets link to (sign-in / sign-out routes and the hosted profile). */
  urls?: CboxWidgetUrls;
  /** Optional theming. */
  appearance?: CboxWidgetAppearance;
  children: ReactNode;
}

/**
 * Wrap the part of your app that uses Cbox ID widgets. Supplies the current user and
 * the flow URLs, and injects the (scoped, themeable) widget stylesheet once.
 */
export function CboxIdProvider({ user = null, urls = {}, appearance = {}, children }: CboxIdProviderProps) {
  return (
    <CboxIdContext.Provider value={{ user, urls, appearance }}>
      {/* React hoists a keyed, precedenced <style> to <head> and dedupes it. */}
      <style href={STYLE_ID} precedence="default">
        {CSS}
      </style>
      {children}
    </CboxIdContext.Provider>
  );
}

/** Access the full widget context. Throws when used outside a {@link CboxIdProvider}. */
export function useCboxId(): CboxIdContextValue {
  const value = useContext(CboxIdContext);
  if (!value) {
    throw new Error('Cbox ID widgets must be rendered inside a <CboxIdProvider>.');
  }
  return value;
}

/** The signed-in user, or null. */
export function useCboxUser(): CboxWidgetUser | null {
  return useCboxId().user;
}

/** Build the inline style that applies an appearance's CSS variables. */
export function appearanceStyle(appearance: CboxWidgetAppearance): CSSProperties {
  const vars: Record<string, string> = {};
  if (appearance.accent) {
    vars['--cbox-id-accent'] = appearance.accent;
  }
  if (appearance.accentForeground) {
    vars['--cbox-id-accent-fg'] = appearance.accentForeground;
  }
  if (appearance.radius) {
    vars['--cbox-id-radius'] = appearance.radius;
  }
  if (appearance.fontFamily) {
    vars['--cbox-id-font'] = appearance.fontFamily;
  }
  return vars as CSSProperties;
}

/** Initials for the avatar fallback, from name or email. */
export function initials(user: CboxWidgetUser): string {
  const source = user.name?.trim() || user.email?.trim() || '';
  if (source === '') {
    return '?';
  }
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
