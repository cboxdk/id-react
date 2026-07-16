import { useEffect, useId, useRef, useState } from 'react';
import { appearanceStyle, useCboxId } from '../context.js';
import { Avatar } from './Avatar.js';
import { SignInButton } from './SignInButton.js';

export interface UserButtonProps {
  /** Label for the profile-management item. */
  manageLabel?: string;
  /** Label for the switch-account item (shown when `urls.switchAccount` is set). */
  switchLabel?: string;
  /** Label for the add-account item (shown when `urls.addAccount` is set). */
  addLabel?: string;
  /** Label for the sign-out item. */
  signOutLabel?: string;
  className?: string;
}

/**
 * The drop-in account control: a signed-in user's avatar that opens a menu with
 * hosted profile management and sign-out. When signed out, it renders a
 * {@link SignInButton} instead. Keyboard- and screen-reader-accessible; closes on
 * outside click or Escape.
 */
export function UserButton({
  manageLabel = 'Manage account',
  switchLabel = 'Switch account',
  addLabel = 'Add another account',
  signOutLabel = 'Sign out',
  className,
}: UserButtonProps) {
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

  if (!user) {
    return <SignInButton />;
  }

  return (
    <span className={`cbox-id-root ${className ?? ''}`} style={appearanceStyle(appearance)}>
      <span className="cbox-id-anchor" ref={anchorRef}>
        <button
          type="button"
          className="cbox-id-userbtn"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          aria-label={user.name ?? user.email ?? 'Account menu'}
          onClick={() => setOpen((value) => !value)}
        >
          <Avatar user={user} />
        </button>

        {open ? (
          <div className="cbox-id-menu" role="menu" id={menuId}>
            <div className="cbox-id-menu__head">
              <Avatar user={user} />
              <div>
                <div className="cbox-id-menu__name">{user.name ?? user.email ?? user.id}</div>
                {user.email ? <div className="cbox-id-menu__email">{user.email}</div> : null}
              </div>
            </div>
            <hr className="cbox-id-menu__sep" />
            {urls.profile ? (
              <a className="cbox-id-menu__item" role="menuitem" href={urls.profile}>
                {manageLabel}
              </a>
            ) : null}
            {urls.switchAccount ? (
              <a className="cbox-id-menu__item" role="menuitem" href={urls.switchAccount}>
                {switchLabel}
              </a>
            ) : null}
            {urls.addAccount ? (
              <a className="cbox-id-menu__item" role="menuitem" href={urls.addAccount}>
                {addLabel}
              </a>
            ) : null}
            {(urls.switchAccount || urls.addAccount) && urls.signOut ? (
              <hr className="cbox-id-menu__sep" />
            ) : null}
            {urls.signOut ? (
              <a className="cbox-id-menu__item" role="menuitem" href={urls.signOut}>
                {signOutLabel}
              </a>
            ) : null}
          </div>
        ) : null}
      </span>
    </span>
  );
}
