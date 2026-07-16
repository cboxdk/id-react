/**
 * The signed-in user a widget renders. Shape-compatible with the `CboxUser` from
 * `@cboxdk/id-js` — pass that straight through — but declared here so the widgets
 * have no runtime dependency on the client SDK.
 */
export interface CboxWidgetUser {
  /** The stable subject (`sub`). */
  id: string;
  email?: string | null;
  name?: string | null;
  organizationId?: string | null;
  /** Optional avatar image URL; falls back to initials when absent. */
  imageUrl?: string | null;
}

/**
 * The URLs the widgets link to. `signIn` / `signOut` are routes in *your* app that
 * trigger the Cbox ID flows; `profile` is the hosted account page (or an app route
 * that redirects there, e.g. via `cboxId.profileRedirect()`).
 */
export interface CboxWidgetUrls {
  signIn?: string;
  signOut?: string;
  profile?: string;
  /**
   * Route that starts a `prompt=select_account` sign-in — lets the user switch to
   * another account they're signed into on Cbox ID. Point it at a handler that
   * calls the client's redirect with `prompt: 'select_account'`.
   */
  switchAccount?: string;
  /**
   * Route that starts a `prompt=login` sign-in — adds another account (Notion/Slack
   * "add account"). Point it at a handler that calls `addAccount()` / redirect with
   * `prompt: 'login'`.
   */
  addAccount?: string;
}

/** Theming hooks. Any omitted value keeps the built-in default. */
export interface CboxWidgetAppearance {
  /** Accent color used for primary buttons and the avatar. */
  accent?: string;
  /** Text color on the accent (for contrast). */
  accentForeground?: string;
  /** Corner radius, e.g. `"8px"` or `"0.5rem"`. */
  radius?: string;
  /** Base font family; defaults to the host app's `inherit`. */
  fontFamily?: string;
}
