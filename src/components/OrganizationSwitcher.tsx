import { useEffect, useId, useRef, useState } from 'react';
import { appearanceStyle, initialsOf, useCboxId } from '../context.js';
import { useOrganization } from '../organization.js';
import type { CboxWidgetOrganization } from '../types.js';

export interface OrganizationSwitcherProps {
  /** Heading above the organization list. */
  label?: string;
  /** Label for the create-organization footer (shown when `urls.createOrganization` is set). */
  createLabel?: string;
  /** Label for the hosted-picker footer (shown when `urls.selectOrganization` is set). */
  selectLabel?: string;
  /** Trigger text when the session is bound to no organization yet. */
  placeholder?: string;
  className?: string;
}

/** A square logo/initials tile for an organization. */
function OrgAvatar({ org }: { org: CboxWidgetOrganization }) {
  return (
    <span className="cbox-id-avatar cbox-id-avatar--org" aria-hidden="true">
      {org.imageUrl ? <img src={org.imageUrl} alt="" /> : initialsOf(org.name)}
    </span>
  );
}

/**
 * The drop-in organization control: the active organization, opening a menu of the
 * user's organizations with a one-click switch. Switching is a redirect that starts a new
 * sign-in bound to the chosen organization (`organization=<id>`, via
 * `urls.switchOrganization`); without that URL the list is read-only.
 *
 * The list is `user.organizations`, which Cbox ID only sends when the sign-in requested
 * the `organizations` scope. Without it, and with `urls.selectOrganization` set, the
 * control is a single link to the hosted picker; with neither, it renders nothing.
 * Keyboard- and screen-reader-accessible; closes on outside click or Escape.
 */
export function OrganizationSwitcher({
  label = 'Organizations',
  createLabel = 'Create organization',
  selectLabel = 'All organizations',
  placeholder = 'Select organization',
  className,
}: OrganizationSwitcherProps) {
  const { user, urls, appearance } = useCboxId();
  const { organization: active, organizations: orgs, switchUrl } = useOrganization();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onClick = (event: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) {
    return null;
  }

  if (orgs.length === 0) {
    // No list to draw — the sign-in did not ask for the `organizations` scope. The hosted
    // picker still knows every membership, so link to it rather than render nothing.
    if (!urls.selectOrganization) {
      return null;
    }
    return (
      <span className={`cbox-id-root ${className ?? ''}`} style={appearanceStyle(appearance)}>
        <a
          className="cbox-id-orgswitch"
          href={urls.selectOrganization}
          aria-label={active ? `Current organization: ${active.name}. Switch organization` : placeholder}
        >
          {active ? <OrgAvatar org={active} /> : null}
          <span className="cbox-id-orgswitch__name">{active ? active.name : placeholder}</span>
        </a>
      </span>
    );
  }

  return (
    <span className={`cbox-id-root ${className ?? ''}`} style={appearanceStyle(appearance)}>
      <span className="cbox-id-anchor" ref={anchorRef}>
        <button
          type="button"
          className="cbox-id-orgswitch"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          // Not the first organization in the list when the session is bound to none:
          // naming one as current would show its name over data it does not own.
          aria-label={active ? `Current organization: ${active.name}. Switch organization` : placeholder}
          onClick={() => setOpen((value) => !value)}
        >
          {active ? <OrgAvatar org={active} /> : null}
          <span className="cbox-id-orgswitch__name">{active ? active.name : placeholder}</span>
          <svg className="cbox-id-orgswitch__chev" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>

        {open ? (
          <div className="cbox-id-menu" role="menu" id={menuId} aria-label={label}>
            <div className="cbox-id-menu__grouplabel">{label}</div>
            {orgs.map((org) => {
              const isActive = org.id === active?.id;
              const href = switchUrl(org.id);
              const inner = (
                <>
                  <OrgAvatar org={org} />
                  <span className="cbox-id-menu__label">
                    <span className="cbox-id-menu__name">{org.name}</span>
                    {org.role ? <span className="cbox-id-menu__itemsub">{org.role}</span> : null}
                  </span>
                  {isActive ? (
                    <svg className="cbox-id-menu__check" width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.5 8.5l3 3 6-7" />
                    </svg>
                  ) : null}
                </>
              );

              return href ? (
                <a key={org.id} className="cbox-id-menu__item" role="menuitem" href={href}>
                  {inner}
                </a>
              ) : (
                <div
                  key={org.id}
                  className={`cbox-id-menu__item${isActive ? ' cbox-id-menu__item--active' : ''}`}
                  role="menuitem"
                  aria-current={isActive ? 'true' : undefined}
                >
                  {inner}
                </div>
              );
            })}

            {urls.selectOrganization || urls.createOrganization ? <hr className="cbox-id-menu__sep" /> : null}

            {urls.selectOrganization ? (
              <a className="cbox-id-menu__item" role="menuitem" href={urls.selectOrganization}>
                <span className="cbox-id-menu__name">{selectLabel}</span>
              </a>
            ) : null}

            {urls.createOrganization ? (
              <>
                <a className="cbox-id-menu__item" role="menuitem" href={urls.createOrganization}>
                  <span className="cbox-id-avatar cbox-id-avatar--org cbox-id-avatar--ghost" aria-hidden="true">+</span>
                  <span className="cbox-id-menu__name">{createLabel}</span>
                </a>
              </>
            ) : null}
          </div>
        ) : null}
      </span>
    </span>
  );
}
