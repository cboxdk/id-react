# Changelog

All notable changes to `@cboxdk/id-react` are recorded here. Earlier releases are described
in their [GitHub releases](https://github.com/cboxdk/id-react/releases).

## [0.7.0] - 2026-09-24

Organization selection and support sessions. **Requires `@cboxdk/id-js` 0.17 or later**
on your server, which sends the `organization` parameter and fills the `organization`,
`organizations` and `actor` fields these widgets read, against a Cbox ID instance that
supports organization selection (laravel-id 1.19).

### Added

- `useOrganization()`: the active organization, the person's membership tier in it
  (`org_role`), their organizations, and `switchOrganization(id)` / `switchUrl(id)`.
- `<SupportSessionBanner>` and `useSupportSession()`: shown only while a member of staff is
  signed in as the user (the RFC 8693 `act` claim). Fail-closed: an actor id-js could not
  read still counts. Pass `className` for an unstyled element carrying only your class,
  and a function child for your own wording.
- `CboxWidgetUser.organization` (`{ id, name, role }`) and `CboxWidgetUser.actor`
  (`{ sub }`), shape-compatible with id-js 0.17's `CboxUser`; the provider narrows both
  (the actor to its subject alone).
- `urls.selectOrganization` (a `prompt=select_organization` route): the hosted picker at
  the foot of `<OrganizationSwitcher>`, and the whole switcher when the sign-in did not
  request the `organizations` scope and there is no list to draw.
- `@cboxdk/id-js` `^0.17.0` as an optional peer dependency. The widgets never import it;
  it states which version produces the fields they draw.

### Changed

- `<OrganizationSwitcher>` no longer names the first listed organization as current when
  the session is bound to none; it reads "Select organization" (`placeholder`) and marks
  nothing active. Showing one organization's name over a session that is not bound to it
  is the mistake organization binding exists to prevent.
- `<OrganizationSwitcher>` takes the active organization's role from the token's
  `org_role` when present, over the (possibly older) `organizations` list.

### Fixed

- The README told you to call `createAuthorizationRequest({ organizationId })`, an option
  id-js never had; the switch route now uses id-js's `switchOrganization(id)`, which sends
  `organization=<id>`.
