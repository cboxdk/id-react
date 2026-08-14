/**
 * The signed-in user a widget renders. Shape-compatible with the `CboxUser` from
 * `@cboxdk/id-js`, and declared here so the widgets have no runtime dependency on the
 * client SDK.
 *
 * PASSING A WHOLE `CboxUser` IS SAFE, BUT NOT BECAUSE OF THIS TYPE. `CboxUser` also
 * carries `accessToken`, `refreshToken` and `idToken`, and TypeScript's excess-property
 * check does not fire when the value is a variable rather than an object literal — so
 * handing the whole thing over compiles clean. This package is `'use client'` throughout,
 * so in a Next.js App Router app that prop crosses the RSC boundary and those credentials
 * would land in the HTML flight payload in plaintext.
 *
 * {@link CboxIdProvider} therefore narrows whatever it is given to the fields below
 * before anything else can see it. Prefer picking the fields yourself at the call site
 * anyway — the narrowing is a backstop, not a licence to hand a token to a component.
 */
export interface CboxWidgetUser {
  /** The stable subject (`sub`). */
  id: string;
  email?: string | null;
  name?: string | null;
  /** The active organization's id (the one the current session is scoped to). */
  organizationId?: string | null;
  /** Optional avatar image URL; falls back to initials when absent. */
  imageUrl?: string | null;
  /**
   * The organizations this user belongs to — powers `<OrganizationSwitcher>`. Inject
   * it from the server (the redirect flow doesn't expose it client-side); omit for a
   * single-org app and the switcher renders nothing.
   */
  organizations?: CboxWidgetOrganization[];
}

/** One organization a user belongs to, as rendered by `<OrganizationSwitcher>`. */
export interface CboxWidgetOrganization {
  /** The stable organization id (matches `CboxWidgetUser.organizationId`). */
  id: string;
  name: string;
  /** The member's role here, shown as a subtitle when present. */
  role?: string | null;
  /** Optional logo/avatar URL; falls back to initials when absent. */
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
  /**
   * Given an organization id, return a route in *your* app that starts a sign-in
   * carrying that `organization_id` — e.g. a handler calling the client's
   * `createAuthorizationRequest({ organizationId })`. Powers the switcher's items;
   * when omitted, `<OrganizationSwitcher>` lists organizations read-only.
   */
  switchOrganization?: (organizationId: string) => string;
  /** Optional route to create a new organization (shown as the switcher's footer). */
  createOrganization?: string;
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
