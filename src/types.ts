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
  /**
   * The organization the session is bound to, with its name and the person's membership
   * tier there (`org`, `org_name`, `org_role`). Produced by `@cboxdk/id-js` 0.17 or later
   * as `CboxUser.organization`; pass it through and `useOrganization()` reports the role.
   */
  organization?: CboxWidgetActiveOrganization | null;
  /**
   * Set when a member of staff is signed in as this person — a support session (the
   * RFC 8693 `act` claim). Produced by `@cboxdk/id-js` 0.17 or later as
   * `CboxUser.actor`; pass it through and `<SupportSessionBanner>` shows itself.
   */
  actor?: CboxWidgetActor | null;
  /** Optional avatar image URL; falls back to initials when absent. */
  imageUrl?: string | null;
  /**
   * The organizations this user belongs to — powers `<OrganizationSwitcher>`. It is
   * `CboxUser.organizations` from `@cboxdk/id-js`, which Cbox ID only fills when the
   * sign-in requested the `organizations` scope. Inject it from the server; omit it and
   * the switcher lists nothing (it can still link to the hosted picker, see
   * `urls.selectOrganization`).
   */
  organizations?: CboxWidgetOrganization[];
}

/** The organization a session is bound to. Shape-compatible with id-js's `CboxActiveOrganization`. */
export interface CboxWidgetActiveOrganization {
  id: string;
  name?: string | null;
  /** The membership tier: `owner`, `admin`, `developer`, `member` or `viewer`. */
  role?: string | null;
}

/**
 * Who is driving a support session. Shape-compatible with id-js's `CboxActor`. `sub` is
 * null when the token was acted but the actor could not be read — still a support session.
 */
export interface CboxWidgetActor {
  sub: string | null;
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
   * Given an organization id, return a route in *your* app that starts a sign-in bound
   * to that organization — a handler calling id-js's `switchOrganization(id)` (or
   * `createAuthorizationRequest({ organization: id })`), which sends `organization=<id>`.
   * Powers the switcher's items and `useOrganization().switchOrganization`; when
   * omitted, `<OrganizationSwitcher>` lists organizations read-only.
   */
  switchOrganization?: (organizationId: string) => string;
  /**
   * Route that starts a `prompt=select_organization` sign-in — Cbox ID's hosted
   * organization picker. Shown at the foot of the switcher, and used on its own when the
   * sign-in did not request the `organizations` scope and there is no list to draw.
   */
  selectOrganization?: string;
  /**
   * Route that starts a `prompt=create_organization` sign-in — the hosted "create a team"
   * step; the person becomes its owner and comes back bound to it. Shown as the
   * switcher's footer. Any route of your own works too.
   */
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
