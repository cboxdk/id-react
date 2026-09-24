import type { ReactNode } from 'react';
import { appearanceStyle, useCboxId } from '../context.js';
import { useSupportSession, type UseSupportSessionResult } from '../organization.js';

export interface SupportSessionBannerProps {
  /**
   * Replace the built-in text. A function receives the session (`actor`, `user`), so you
   * can word it yourself or look the staff member up by `actor.sub`.
   */
  children?: ReactNode | ((session: UseSupportSessionResult) => ReactNode);
  /**
   * Label for the end-session link, drawn when `urls.signOut` is set. Ending a support
   * session is signing out: the acted tokens have no refresh token and nothing to return to.
   */
  endLabel?: string;
  /**
   * Replaces the built-in `cbox-id-support` class, which drops its styling — the banner is
   * then an unstyled region carrying only your class, like `<OrganizationBadge>`.
   */
  className?: string;
}

/**
 * A banner that is drawn only in a SUPPORT SESSION — while a member of staff is signed in
 * as this person (the token carries the RFC 8693 `act` claim). Place it at the top of your
 * layout; it renders nothing in an ordinary session.
 *
 * The person at the keyboard is a member of staff inside somebody else's account. The
 * banner keeps that in front of them on every page, and makes any screenshot or screen
 * share of the session say whose account it was. It is a labelled region rather than a
 * live announcement, because it is there from the first paint and is not news.
 *
 * Fail-closed like the rest: a token whose `act` claim could not be read still draws it.
 *
 * Headless use: `useSupportSession()` returns the same `active` / `actor` this reads.
 */
export function SupportSessionBanner({
  children,
  endLabel = 'End support session',
  className,
}: SupportSessionBannerProps) {
  const { urls, appearance } = useCboxId();
  const session = useSupportSession();

  if (!session.active) {
    return null;
  }

  const who = session.user?.name?.trim() || session.user?.email?.trim() || 'this user';

  const content =
    typeof children === 'function'
      ? children(session)
      : (children ?? (
          <>
            <strong>Support session.</strong> You are signed in as {who}. Everything you do
            here is audited.
          </>
        ));

  return (
    <div className="cbox-id-root cbox-id-root--block" style={appearanceStyle(appearance)}>
      <section className={className ?? 'cbox-id-support'} aria-label="Support session">
        <span className="cbox-id-support__text">{content}</span>
        {urls.signOut ? (
          <a className="cbox-id-support__end" href={urls.signOut}>
            {endLabel}
          </a>
        ) : null}
      </section>
    </div>
  );
}
