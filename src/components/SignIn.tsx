import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';

import type { CboxFrontendConfig } from '../frontend.js';

/**
 * A sign-in form you drop in, drawn in the customer's own colours.
 *
 * Everything else this package ships is a redirect shell — a link to a hosted page. This
 * is the first component that draws credential UI, and it is the whole reason the Frontend
 * API exists: a page holding a publishable key can read its configuration and prove a
 * password without a backend of its own.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It never touches a token. A completed sign-in hands
 * back a single-use login ticket, and this component's last act is to send the browser to
 * `/oauth/authorize` with that ticket and the PKCE challenge YOU generated. Tokens are
 * minted by the authorize flow as they always were; nothing about issuance moved into the
 * browser, which is what keeps this out of implicit-grant territory.
 *
 * WHY PKCE IS YOURS AND NOT OURS. Generating the verifier here would mean this component
 * holds it, and a component that holds a verifier is a component that has to store it
 * somewhere across a redirect — which is the part applications get wrong. You already
 * create one for the redirect flow; pass the challenge in and keep the verifier where you
 * keep it now.
 */

/** What the component needs to drive a sign-in and hand off to authorize. */
export interface SignInProps {
  /**
   * Anything with the Frontend API's shape. Pass a `CboxIdFrontend` from `@cboxdk/id-js`.
   *
   * Typed structurally rather than by import so this package does not force a dependency
   * on the client for people who already have one wired.
   */
  frontend: SignInClient;
  /** Your OAuth client id, redirect URI and PKCE challenge — see the note above. */
  authorize: AuthorizeParams;
  /** Called instead of navigating, when you would rather route yourself. */
  onTicket?: (loginTicket: string) => void;
  /** Rendered above the form. A logo, usually. */
  header?: ReactNode;
}

export interface AuthorizeParams {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope?: string;
  state?: string;
}

/** The part of `CboxIdFrontend` this component uses. */
export interface SignInClient {
  config(): Promise<CboxFrontendConfig>;
  signIn(email: string, password: string): Promise<SignInOutcome>;
  submitSecondFactor(mfaToken: string, code: string, method?: 'mfa' | 'otp'): Promise<SignInOutcome>;
}

type SignInOutcome =
  | { status: 'ok'; loginTicket: string }
  | { status: 'mfa_required' | 'otp_required'; mfaToken: string }
  | { status: 'sso_required' }
  | { status: 'invalid' }
  | { status: 'rate_limited'; retryAfter?: number };

export function SignIn({ frontend, authorize, onTicket, header }: SignInProps) {
  const [config, setConfig] = useState<CboxFrontendConfig | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState<{ token: string; method: 'mfa' | 'otp' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;

    frontend
      .config()
      .then((doc) => live && setConfig(doc))
      // A configuration that will not load is a form that cannot be themed or list its
      // social buttons; it is still a form that can take a password, so this is not fatal.
      .catch(() => undefined);

    return () => {
      live = false;
    };
  }, [frontend]);

  /**
   * Hand the completed sign-in to the authorize endpoint.
   *
   * A full navigation, not a fetch: the authorize flow ends at YOUR redirect URI, and a
   * page that tried to follow it in the background would be reading somebody else's
   * response and losing the redirect that carries the code.
   */
  const spend = useCallback(
    async (loginTicket: string) => {
      if (onTicket) {
        onTicket(loginTicket);

        return;
      }

      // AWAITED, not read from state. Somebody who types fast can complete a sign-in
      // before the configuration has landed, and reading the state here threw their
      // ticket away and told them sign-in was unavailable — with a valid ticket in hand
      // and sixty seconds to spend it. `config()` is deduplicated by the client, so this
      // is the same request the effect above already made.
      let endpoint: string | undefined;

      try {
        endpoint = (await frontend.config()).endpoints?.authorization;
      } catch {
        endpoint = undefined;
      }

      if (!endpoint) {
        setError('Sign-in is unavailable right now. Please try again.');

        return;
      }

      const query = new URLSearchParams({
        client_id: authorize.clientId,
        redirect_uri: authorize.redirectUri,
        response_type: 'code',
        code_challenge: authorize.codeChallenge,
        code_challenge_method: 'S256',
        login_ticket: loginTicket,
        ...(authorize.scope ? { scope: authorize.scope } : {}),
        ...(authorize.state ? { state: authorize.state } : {}),
      });

      window.location.assign(`${endpoint}?${query.toString()}`);
    },
    [authorize, frontend, onTicket],
  );

  /**
   * Turn an outcome into the next thing on screen.
   *
   * EVERY REFUSAL READS THE SAME, because the server refuses to tell a wrong password, an
   * unknown address and a locked account apart — that is the enumeration oracle — and a UI
   * that distinguishes them rebuilds it in the one place a user can see.
   */
  const handle = useCallback(
    (outcome: SignInOutcome) => {
      switch (outcome.status) {
        case 'ok':
          void spend(outcome.loginTicket);

          return;
        case 'mfa_required':
        case 'otp_required':
          setPending({ token: outcome.mfaToken, method: outcome.status === 'otp_required' ? 'otp' : 'mfa' });
          setError(null);

          return;
        case 'sso_required':
          // Named rather than folded into "wrong password": telling somebody whose
          // organization mandates SSO that their password is wrong sends them to support
          // instead of to their identity provider.
          setError('Your organization signs in with single sign-on. Use the button above.');

          return;
        case 'rate_limited':
          setError(
            outcome.retryAfter
              ? `Too many attempts. Try again in ${outcome.retryAfter} seconds.`
              : 'Too many attempts. Try again shortly.',
          );

          return;
        default:
          setError('That email and password did not match.');
      }
    },
    [spend],
  );

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      handle(await frontend.signIn(email, password));
    } catch {
      setError('We could not reach the sign-in service. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();

    if (!pending) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const outcome = await frontend.submitSecondFactor(pending.token, code, pending.method);

      // A wrong code costs an attempt, not the sign-in — so the form stays on this step
      // rather than throwing the person back to the password field.
      outcome.status === 'ok' ? handle(outcome) : setError('That code did not match.');
    } catch {
      setError('We could not reach the sign-in service. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cbox-id-root cbox-id-card cbox-id-signin">
      {header}

      {pending ? (
        <form onSubmit={submitCode} className="cbox-id-signin__form">
          <label className="cbox-id-signin__label" htmlFor="cbox-id-code">
            {pending.method === 'otp' ? 'Code from your email' : 'Code from your authenticator'}
          </label>
          <input
            id="cbox-id-code"
            className="cbox-id-signin__input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            // `one-time-code` is what lets a phone offer the code from a message, and
            // `off` on autocorrect stops a keyboard helpfully mangling six digits.
            autoComplete="one-time-code"
            inputMode="numeric"
            autoFocus
            required
          />
          <button className="cbox-id-btn cbox-id-btn--primary" type="submit" disabled={busy}>
            {busy ? 'Checking…' : 'Continue'}
          </button>
        </form>
      ) : (
        <form onSubmit={submitPassword} className="cbox-id-signin__form">
          <label className="cbox-id-signin__label" htmlFor="cbox-id-email">
            Email
          </label>
          <input
            id="cbox-id-email"
            className="cbox-id-signin__input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />

          <label className="cbox-id-signin__label" htmlFor="cbox-id-password">
            Password
          </label>
          <input
            id="cbox-id-password"
            className="cbox-id-signin__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <button className="cbox-id-btn cbox-id-btn--primary" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}

      {/* Announced, not just coloured: a message a screen reader never reaches is a
          message somebody using one cannot act on. */}
      {error ? (
        <p className="cbox-id-signin__error" role="alert">
          {error}
        </p>
      ) : null}

      {!pending && config?.social?.length ? (
        <div className="cbox-id-signin__social">
          {config.social.map((provider) => (
            <a
              key={provider.provider}
              className="cbox-id-btn"
              href={`${config.issuer}/auth/${provider.provider}/redirect`}
            >
              Continue with {provider.name}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
