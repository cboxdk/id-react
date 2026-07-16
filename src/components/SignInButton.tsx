import type { ReactNode } from 'react';
import { appearanceStyle, useCboxId } from '../context.js';

export interface SignInButtonProps {
  children?: ReactNode;
  className?: string;
}

/** A primary button that links to your app's sign-in route. */
export function SignInButton({ children = 'Sign in', className }: SignInButtonProps) {
  const { urls, appearance } = useCboxId();
  return (
    <span className="cbox-id-root" style={appearanceStyle(appearance)}>
      <a className={className ?? 'cbox-id-btn cbox-id-btn--primary'} href={urls.signIn ?? '#'}>
        {children}
      </a>
    </span>
  );
}
