import { useEffect, useId, useRef, useState } from 'react';
import { appearanceStyle, initialsOf, useCboxId } from '../context.js';
import type { CboxWidgetOrganization } from '../types.js';

export interface OrganizationSwitcherProps {
  /** Heading above the organization list. */
  label?: string;
  /** Label for the create-organization footer (shown when `urls.createOrganization` is set). */
  createLabel?: string;
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
 * user's organizations with a one-click switch. Switching is a redirect that starts
 * a new sign-in carrying the chosen `organization_id` (via `urls.switchOrganization`);
 * without that URL the list is read-only. Renders nothing when the user belongs to no
 * organization. Keyboard- and screen-reader-accessible; closes on outside click or Escape.
 */
export function OrganizationSwitcher({
  label = 'Organizations',
  createLabel = 'Create organization',
  className,
}: OrganizationSwitcherProps) {
  const { user, urls, appearance } = useCboxId();
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

  const orgs = user?.organizations ?? [];
  if (!user || orgs.length === 0) {
    return null;
  }

  const active = orgs.find((o) => o.id === user.organizationId) ?? orgs[0]!;

  return (
    <span className={`cbox-id-root ${className ?? ''}`} style={appearanceStyle(appearance)}>
      <span className="cbox-id-anchor" ref={anchorRef}>
        <button
          type="button"
          className="cbox-id-orgswitch"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          aria-label={`Current organization: ${active.name}. Switch organization`}
          onClick={() => setOpen((value) => !value)}
        >
          <OrgAvatar org={active} />
          <span className="cbox-id-orgswitch__name">{active.name}</span>
          <svg className="cbox-id-orgswitch__chev" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>

        {open ? (
          <div className="cbox-id-menu" role="menu" id={menuId} aria-label={label}>
            <div className="cbox-id-menu__grouplabel">{label}</div>
            {orgs.map((org) => {
              const isActive = org.id === active.id;
              const href = !isActive ? urls.switchOrganization?.(org.id) : undefined;
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

            {urls.createOrganization ? (
              <>
                <hr className="cbox-id-menu__sep" />
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
