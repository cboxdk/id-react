import { useCboxId } from './context.js';
import type { CboxWidgetActor, CboxWidgetOrganization, CboxWidgetUser } from './types.js';

/** What {@link useOrganization} returns. */
export interface UseOrganizationResult {
  /**
   * The organization the session is bound to, or null when it is bound to none. Its
   * name and logo come from the `organizations` list when that carries it, and from the
   * token's `org_name` otherwise; when neither has a name, it is the id.
   */
  organization: CboxWidgetOrganization | null;
  /**
   * The person's membership tier in that organization (`org_role`: `owner`, `admin`,
   * `developer`, `member`, `viewer`), or null. Who may administer the organization — not
   * what they may do in your app; that is `roles` / `permissions` on the server.
   */
  role: string | null;
  /** Every organization the person is an active member of; empty without the `organizations` scope. */
  organizations: CboxWidgetOrganization[];
  /** Whether there is another organization to switch to and a route to do it with. */
  canSwitch: boolean;
  /**
   * The route that switches to `organizationId` (`urls.switchOrganization`), or null when
   * there is none, or when it is the organization the session is already bound to.
   */
  switchUrl(organizationId: string): string | null;
  /**
   * Navigate to {@link switchUrl}. Does nothing when it is null. The switch is a full
   * sign-in bound to the other organization, so the page is replaced — the new
   * organization's role and permissions arrive with the tokens, not in this tab's state.
   */
  switchOrganization(organizationId: string): void;
}

/**
 * The active organization, the person's role in it, and the means to switch — the
 * headless half of `<OrganizationSwitcher>`, for building your own.
 *
 * ```tsx
 * const { organization, role, organizations, switchOrganization } = useOrganization();
 * ```
 */
export function useOrganization(): UseOrganizationResult {
  const { user, urls } = useCboxId();
  const organizations = user?.organizations ?? [];
  const organization = activeOrganization(user);
  const activeId = organization?.id ?? null;

  const switchUrl = (organizationId: string): string | null =>
    organizationId !== activeId && urls.switchOrganization ? urls.switchOrganization(organizationId) : null;

  return {
    organization,
    role: user?.organization?.role ?? organizations.find((org) => org.id === activeId)?.role ?? null,
    organizations,
    canSwitch: urls.switchOrganization !== undefined && organizations.some((org) => org.id !== activeId),
    switchUrl,
    switchOrganization(organizationId) {
      const url = switchUrl(organizationId);
      if (url !== null) {
        window.location.assign(url);
      }
    },
  };
}

/** What {@link useSupportSession} returns. */
export interface UseSupportSessionResult {
  /** Whether a member of staff is signed in as this person. */
  active: boolean;
  /** Who, when known; null when the session is not acted, or the actor could not be read. */
  actor: CboxWidgetActor | null;
  /** The person being acted as. */
  user: CboxWidgetUser | null;
}

/**
 * Whether this is a support session — a member of staff signed in as the person, with a
 * recorded reason and a time limit. The headless half of `<SupportSessionBanner>`; use it
 * to hide what a helper should never do on somebody's behalf.
 *
 * Reads `user.actor`, which `@cboxdk/id-js` 0.17+ sets from the token's `act` claim. Pass
 * a user without it and this reports `active: false` — it cannot see a claim it was not
 * given.
 */
export function useSupportSession(): UseSupportSessionResult {
  const { user } = useCboxId();
  const actor = user?.actor ?? null;

  return { active: actor !== null, actor, user };
}

function activeOrganization(user: CboxWidgetUser | null): CboxWidgetOrganization | null {
  const id = user?.organization?.id ?? user?.organizationId ?? null;

  if (user === null || id === null || id === '') {
    return null;
  }

  const listed = user.organizations?.find((org) => org.id === id);
  const name = listed?.name ?? user.organization?.name ?? id;

  return {
    ...listed,
    id,
    name,
    role: user.organization?.role ?? listed?.role ?? null,
  };
}
