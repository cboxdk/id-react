# @cboxdk/id-react

Embeddable React widgets for [Cbox ID](https://github.com/cboxdk/laravel-id) — a
drop-in **user button**, sign-in / sign-out buttons, a profile card and an
organization badge, wired to your Cbox ID hosted flows. Themeable, accessible, and
zero-config (the stylesheet is injected for you).

Pairs with [`@cboxdk/id-js`](https://github.com/cboxdk/id-js), which runs the login
on the server; these widgets render the signed-in user it produces.

## Install

```bash
npm install @cboxdk/id-react
```

## Use

Wrap your app once, passing the user your server resolved and the flow URLs:

```tsx
import { CboxIdProvider, UserButton } from '@cboxdk/id-react';

export function AppShell({ user, children }) {
  return (
    <CboxIdProvider
      user={user} // the CboxUser from @cboxdk/id-js, or null when signed out
      urls={{ signIn: '/auth/sign-in', signOut: '/auth/sign-out', profile: '/account' }}
    >
      <header>
        <UserButton />
      </header>
      {children}
    </CboxIdProvider>
  );
}
```

`<UserButton>` shows the user's avatar and opens a menu with **Manage account**
(hosted profile management) and **Sign out**. When signed out, it renders a sign-in
button instead. It's keyboard- and screen-reader-accessible and closes on outside
click or Escape.

## Components

| Component | What it renders |
|---|---|
| `<UserButton>` | Avatar + account menu (manage / sign out); a sign-in button when signed out. |
| `<SignInButton>` / `<SignOutButton>` | Standalone buttons linking to your flow routes. |
| `<UserProfileCard>` | Avatar, name, email, and a manage-account link. |
| `<OrganizationBadge>` | The user's current organization. |
| `<OrganizationSwitcher>` | The active organization + a menu to switch between the user's orgs. |

Hooks: `useCboxUser()` and `useCboxId()`.

### Organization switcher

Provide the user's organizations and a `switchOrganization` URL builder — switching is
a redirect that starts a new sign-in carrying the chosen `organization_id`:

```tsx
<CboxIdProvider
  user={{ ...user, organizations: [
    { id: 'org_a', name: 'Acme', role: 'admin' },
    { id: 'org_b', name: 'Globex', role: 'member' },
  ] }}
  urls={{
    // A route in your app that calls cboxId.createAuthorizationRequest({ organizationId })
    switchOrganization: (id) => `/auth/switch-org?org=${id}`,
    createOrganization: '/organizations/new', // optional footer
  }}
>
  <OrganizationSwitcher />
</CboxIdProvider>
```

Inject `organizations` from the server (the redirect flow doesn't expose the list
client-side). Omit it — or leave the user in one org — and the switcher renders nothing.

## Theming

Pass an `appearance`, or override the `--cbox-id-*` CSS variables yourself:

```tsx
<CboxIdProvider
  user={user}
  urls={urls}
  appearance={{ accent: '#0ea5e9', radius: '12px' }}
>
```

## Scope

These are presentational widgets over Cbox ID's **hosted** flows — sign-in, sign-out,
and hosted profile management. Changing passwords, MFA, passkeys and sessions happens
on the Cbox ID instance's own account page (where `urls.profile` points); the widgets
route users there rather than reimplementing it.

## License

MIT © Cbox.
