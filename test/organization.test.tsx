import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CboxIdProvider,
  OrganizationSwitcher,
  SupportSessionBanner,
  useCboxId,
  useOrganization,
  type CboxIdProviderProps,
  type CboxWidgetUrls,
  type CboxWidgetUser,
  type UseOrganizationResult,
} from '../src/index.js';

const urls: CboxWidgetUrls = {
  signIn: '/auth/sign-in',
  signOut: '/auth/sign-out',
  switchOrganization: (id) => `/auth/switch-organization?org=${encodeURIComponent(id)}`,
};

const member: CboxWidgetUser = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@acme.com',
  organizationId: 'org-acme',
  organization: { id: 'org-acme', name: 'Acme Inc', role: 'owner' },
  organizations: [
    { id: 'org-acme', name: 'Acme Inc', role: 'member', imageUrl: 'https://cdn.test/acme.png' },
    { id: 'org-globex', name: 'Globex', role: 'viewer' },
  ],
};

function wrap(node: ReactNode, props: Omit<CboxIdProviderProps, 'children'>) {
  return render(<CboxIdProvider {...props}>{node}</CboxIdProvider>);
}

function probeOrganization(props: Omit<CboxIdProviderProps, 'children'>): UseOrganizationResult {
  let seen: UseOrganizationResult | undefined;
  function Probe() {
    seen = useOrganization();
    return null;
  }
  wrap(<Probe />, props);
  if (seen === undefined) {
    throw new Error('the probe did not render');
  }
  return seen;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useOrganization', () => {
  it('merges the listed organization with the token, and takes the role from the token', () => {
    const result = probeOrganization({ user: member, urls });

    expect(result.organization).toEqual({
      id: 'org-acme',
      name: 'Acme Inc',
      role: 'owner',
      imageUrl: 'https://cdn.test/acme.png',
    });
    // org_role on the token is authoritative for the organization it is bound to; the
    // list can be a sign-in older than a promotion.
    expect(result.role).toBe('owner');
    expect(result.organizations).toHaveLength(2);
  });

  it('falls back to the list role, then to the id for a name', () => {
    expect(
      probeOrganization({ user: { ...member, organization: undefined }, urls }).role,
    ).toBe('member');

    const unlisted = probeOrganization({
      user: { id: 'u', organizationId: 'org-9', organization: { id: 'org-9' } },
      urls,
    });
    expect(unlisted.organization).toEqual({ id: 'org-9', name: 'org-9', role: null });
  });

  it('reports no organization for a session bound to none, even with a list', () => {
    const result = probeOrganization({
      user: { ...member, organizationId: null, organization: null },
      urls,
    });

    expect(result.organization).toBeNull();
    expect(result.role).toBeNull();
    expect(result.canSwitch).toBe(true);
    expect(result.switchUrl('org-acme')).toBe('/auth/switch-organization?org=org-acme');
  });

  it('builds a switch route for the others, never for the active one', () => {
    const result = probeOrganization({ user: member, urls });

    expect(result.canSwitch).toBe(true);
    expect(result.switchUrl('org-globex')).toBe('/auth/switch-organization?org=org-globex');
    expect(result.switchUrl('org-acme')).toBeNull();
  });

  it('cannot switch without a route', () => {
    const result = probeOrganization({ user: member, urls: { signOut: '/auth/sign-out' } });

    expect(result.canSwitch).toBe(false);
    expect(result.switchUrl('org-globex')).toBeNull();
  });

  it('navigates to the switch route, and does nothing for the active organization', () => {
    const assign = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, assign });

    const result = probeOrganization({ user: member, urls });

    result.switchOrganization('org-acme');
    expect(assign).not.toHaveBeenCalled();

    result.switchOrganization('org-globex');
    expect(assign).toHaveBeenCalledWith('/auth/switch-organization?org=org-globex');
  });
});

describe('OrganizationSwitcher with organization selection', () => {
  it('does not name an organization as current when the session is bound to none', async () => {
    const events = userEvent.setup();
    wrap(<OrganizationSwitcher />, { user: { ...member, organizationId: null, organization: null }, urls });

    const trigger = screen.getByRole('button', { name: 'Select organization' });
    expect(trigger).toHaveTextContent('Select organization');

    await events.click(trigger);
    for (const item of screen.getAllByRole('menuitem')) {
      expect(item).not.toHaveAttribute('aria-current');
    }
    expect(screen.getByRole('menuitem', { name: /Acme Inc/ })).toHaveAttribute(
      'href',
      '/auth/switch-organization?org=org-acme',
    );
  });

  it('offers the hosted picker at the foot of the menu', async () => {
    const events = userEvent.setup();
    wrap(<OrganizationSwitcher />, {
      user: member,
      urls: { ...urls, selectOrganization: '/auth/select-organization' },
    });

    await events.click(screen.getByRole('button', { name: /Current organization: Acme Inc/ }));
    expect(screen.getByRole('menuitem', { name: 'All organizations' })).toHaveAttribute(
      'href',
      '/auth/select-organization',
    );
  });

  it('links to the hosted picker when there is no list to draw', () => {
    // A sign-in without the `organizations` scope: the id and name, but no memberships.
    wrap(<OrganizationSwitcher />, {
      user: { id: 'u', organizationId: 'org-acme', organization: { id: 'org-acme', name: 'Acme Inc' } },
      urls: { ...urls, selectOrganization: '/auth/select-organization' },
    });

    const link = screen.getByRole('link', { name: /Current organization: Acme Inc/ });
    expect(link).toHaveAttribute('href', '/auth/select-organization');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens its menu from its left edge, where a header puts it', async () => {
    // Right-aligned like the user menu, it opened off the left of the page. jsdom-style
    // environments do no layout, so this pins the rule's hook; the rendered check is the
    // real test.
    const events = userEvent.setup();
    wrap(<OrganizationSwitcher />, { user: member, urls });

    await events.click(screen.getByRole('button', { name: /Current organization/ }));
    expect(screen.getByRole('menu').parentElement).toHaveClass('cbox-id-anchor--start');
  });

  it('renders nothing without a list or a picker route', () => {
    const { container } = wrap(<OrganizationSwitcher />, {
      user: { id: 'u', organizationId: 'org-acme' },
      urls,
    });

    expect(container).toBeEmptyDOMElement();
  });
});

describe('SupportSessionBanner', () => {
  it('renders nothing in an ordinary session', () => {
    const { container } = wrap(<SupportSessionBanner />, { user: member, urls });

    expect(container).toBeEmptyDOMElement();
  });

  it('names whose account the staff member is in, and offers to end the session', () => {
    wrap(<SupportSessionBanner />, { user: { ...member, actor: { sub: 'staff-9' } }, urls });

    const banner = screen.getByRole('region', { name: 'Support session' });
    expect(banner).toHaveTextContent('You are signed in as Ada Lovelace.');
    expect(banner).toHaveClass('cbox-id-support');
    expect(screen.getByRole('link', { name: 'End support session' })).toHaveAttribute('href', '/auth/sign-out');
  });

  it('shows itself when the actor could not be read (fail-closed)', () => {
    wrap(<SupportSessionBanner />, { user: { ...member, actor: { sub: null } }, urls });

    expect(screen.getByRole('region', { name: 'Support session' })).toBeInTheDocument();
  });

  it('is unstyled with your own class, and takes your own words', () => {
    wrap(
      <SupportSessionBanner className="my-banner">
        {({ actor }) => `Acting as support agent ${actor?.sub ?? 'unknown'}`}
      </SupportSessionBanner>,
      { user: { ...member, actor: { sub: 'staff-9' } }, urls: {} },
    );

    const banner = screen.getByRole('region', { name: 'Support session' });
    expect(banner).toHaveAttribute('class', 'my-banner');
    expect(banner).toHaveTextContent('Acting as support agent staff-9');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('CboxIdProvider narrows the new fields too', () => {
  it('keeps only the actor subject and the organization id, name and role', () => {
    let seen: unknown;
    function Probe() {
      seen = useCboxId().user;
      return null;
    }

    const fromIdJs = {
      id: 'user-1',
      organizationId: 'org-acme',
      organization: { id: 'org-acme', name: 'Acme Inc', role: 'admin', token: 'at_secret' },
      actor: { sub: 'staff-9', actor: { sub: 'svc-1', actor: null }, reason: 'ticket 4411' },
      accessToken: 'at_secret',
    } as unknown as CboxWidgetUser;

    render(
      <CboxIdProvider user={fromIdJs}>
        <Probe />
      </CboxIdProvider>,
    );

    expect(seen).toMatchObject({
      organization: { id: 'org-acme', name: 'Acme Inc', role: 'admin' },
      actor: { sub: 'staff-9' },
    });
    const serialized = JSON.stringify(seen);
    expect(serialized).not.toContain('at_secret');
    expect(serialized).not.toContain('svc-1');
    expect(serialized).not.toContain('ticket 4411');
  });

  it('keeps an unreadable actor as an actor, so the banner still shows', () => {
    let seen: CboxWidgetUser | null = null;
    function Probe() {
      seen = useCboxId().user;
      return null;
    }

    render(
      <CboxIdProvider user={{ id: 'u', actor: { sub: 42 } } as unknown as CboxWidgetUser}>
        <Probe />
      </CboxIdProvider>,
    );

    expect(seen).toMatchObject({ actor: { sub: null } });
  });
});
