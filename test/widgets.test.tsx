import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import {
  CboxIdProvider,
  OrganizationBadge,
  OrganizationSwitcher,
  SignInButton,
  UserButton,
  UserProfileCard,
  type CboxWidgetUrls,
  type CboxWidgetUser,
} from '../src/index.js';

const user: CboxWidgetUser = {
  id: 'user-1',
  email: 'ada@acme.com',
  name: 'Ada Lovelace',
  organizationId: 'Acme Inc',
};

const urls: CboxWidgetUrls = {
  signIn: '/auth/sign-in',
  signOut: '/auth/sign-out',
  profile: '/account',
};

function wrap(node: ReactNode, props: Parameters<typeof CboxIdProvider>[0]) {
  return render(<CboxIdProvider {...props}>{node}</CboxIdProvider>);
}

describe('SignInButton', () => {
  it('links to the sign-in route', () => {
    wrap(<SignInButton />, { urls, children: null });
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth/sign-in');
  });

  it('accepts custom label', () => {
    wrap(<SignInButton>Log ind</SignInButton>, { urls, children: null });
    expect(screen.getByRole('link', { name: 'Log ind' })).toBeInTheDocument();
  });
});

describe('UserButton', () => {
  it('falls back to a sign-in button when signed out', () => {
    wrap(<UserButton />, { user: null, urls, children: null });
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('opens a menu with profile and sign-out links when signed in', async () => {
    const events = userEvent.setup();
    wrap(<UserButton />, { user, urls, children: null });

    // Menu starts closed.
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: 'Ada Lovelace' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await events.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('ada@acme.com')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Manage account' })).toHaveAttribute('href', '/account');
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveAttribute('href', '/auth/sign-out');
  });

  it('closes the menu on Escape', async () => {
    const events = userEvent.setup();
    wrap(<UserButton />, { user, urls, children: null });

    await events.click(screen.getByRole('button', { name: 'Ada Lovelace' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await events.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('UserProfileCard', () => {
  it('shows name and email with a manage link', () => {
    wrap(<UserProfileCard />, { user, urls, children: null });
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('ada@acme.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Manage account/ })).toHaveAttribute('href', '/account');
  });

  it('renders nothing when signed out', () => {
    const { container } = wrap(<UserProfileCard />, { user: null, urls, children: null });
    expect(container).toBeEmptyDOMElement();
  });
});

describe('OrganizationBadge', () => {
  it('shows the organization id', () => {
    wrap(<OrganizationBadge />, { user, urls, children: null });
    expect(screen.getByText('Acme Inc')).toBeInTheDocument();
  });

  it('renders nothing without an organization or label', () => {
    const { container } = wrap(<OrganizationBadge />, {
      user: { id: 'u', email: 'x@y.z' },
      urls,
      children: null,
    });
    expect(container).toBeEmptyDOMElement();
  });
});

describe('OrganizationSwitcher', () => {
  const multiOrg: CboxWidgetUser = {
    id: 'user-1',
    name: 'Ada Lovelace',
    organizationId: 'org-acme',
    organizations: [
      { id: 'org-acme', name: 'Acme Inc', role: 'admin' },
      { id: 'org-globex', name: 'Globex', role: 'member' },
    ],
  };

  it('renders nothing when the user belongs to no organization', () => {
    const { container } = wrap(<OrganizationSwitcher />, {
      user: { id: 'u', name: 'Solo' },
      urls,
      children: null,
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the active organization and opens a menu of all orgs, active marked', async () => {
    const events = userEvent.setup();
    wrap(<OrganizationSwitcher />, {
      user: multiOrg,
      urls: { ...urls, switchOrganization: (id) => `/switch-org?o=${id}` },
      children: null,
    });

    const trigger = screen.getByRole('button', { name: /Current organization: Acme Inc/ });
    expect(trigger).toHaveTextContent('Acme Inc');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await events.click(trigger);
    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();

    // The non-active org is a switch link carrying its id…
    const globex = screen.getByRole('menuitem', { name: /Globex/ });
    expect(globex).toHaveAttribute('href', '/switch-org?o=org-globex');
    // …the active org is present but not a link (aria-current).
    const acme = screen.getByRole('menuitem', { name: /Acme Inc/ });
    expect(acme).toHaveAttribute('aria-current', 'true');
    expect(acme).not.toHaveAttribute('href');
  });

  it('lists organizations read-only when no switchOrganization url is given', async () => {
    const events = userEvent.setup();
    wrap(<OrganizationSwitcher />, { user: multiOrg, urls, children: null });

    await events.click(screen.getByRole('button', { name: /Current organization/ }));
    expect(screen.getByRole('menuitem', { name: /Globex/ })).not.toHaveAttribute('href');
  });

  it('shows a create-organization footer when its url is set', async () => {
    const events = userEvent.setup();
    wrap(<OrganizationSwitcher createLabel="New workspace" />, {
      user: multiOrg,
      urls: { ...urls, createOrganization: '/orgs/new' },
      children: null,
    });

    await events.click(screen.getByRole('button', { name: /Current organization/ }));
    expect(screen.getByRole('menuitem', { name: 'New workspace' })).toHaveAttribute('href', '/orgs/new');
  });

  it('closes on Escape', async () => {
    const events = userEvent.setup();
    wrap(<OrganizationSwitcher />, { user: multiOrg, urls, children: null });

    await events.click(screen.getByRole('button', { name: /Current organization/ }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await events.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
