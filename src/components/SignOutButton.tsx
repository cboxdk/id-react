import type { ReactNode } from 'react';
import { appearanceStyle, useCboxId } from '../context.js';

export interface SignOutButtonProps {
  children?: ReactNode;
  className?: string;
}

/** A button that links to your app's sign-out route. */
export function SignOutButton({ children = 'Sign out', className }: SignOutButtonProps) {
  const { urls, appearance } = useCboxId();
  return (
    <span className="cbox-id-root" style={appearanceStyle(appearance)}>
      <a className={className ?? 'cbox-id-btn'} href={urls.signOut ?? '#'}>
        {children}
      </a>
    </span>
  );
}
