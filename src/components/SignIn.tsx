import { useCallback, useEffect, useId, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';

import type { CboxFrontendConfig } from '../frontend.js';
import { CSS, STYLE_ID } from '../styles.js';
import type { CboxWidgetAppearance } from '../types.js';

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
  /**
   * The customer's colours.
   *
   * Pass the `appearance` from `useCboxConfig()` and the form draws itself in the
   * environment's own brand. Optional, because this component is the one thing in the
   * package that has to work with no provider above it — a page with no backend is
   * exactly who it is for.
   */
  appearance?: CboxWidgetAppearance;
  /** Extra classes on the root, for a host that wants to place it. */
  className?: string;
  /** Where "Forgot your password?" goes. Omitted, no link is drawn. */
  forgotPasswordUrl?: string;
  /** Where "Create an account" goes. Omitted, no link is drawn. */
  signUpUrl?: string;
  /**
   * Told about every failure this component absorbs, for your own error reporting.
   *
   * The component still renders whatever the user needs to see; this is the developer's
   * copy, with the original cause intact — a `FrontendApiError` from `@cboxdk/id-js`
   * carries a `code`, so `origin_not_allowed` arrives here as itself rather than as the
   * sentence a person is shown.
   */
  onError?: (cause: unknown) => void;
}

/**
 * The `code` off a Frontend API error, if this is one.
 *
 * Read structurally rather than with `instanceof`, for the same reason `SignInClient` is
 * a shape: this package does not depend on `@cboxdk/id-js`, and two copies of it in one
 * bundle would fail an `instanceof` check that looks correct.
 */
function apiCode(cause: unknown): string | undefined {
  if (typeof cause !== 'object' || cause === null || !('code' in cause)) {
    return undefined;
  }

  const { code } = cause as { code: unknown };

  return typeof code === 'string' ? code : undefined;
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

export function SignIn({
  frontend,
  authorize,
  onTicket,
  header,
  appearance = {},
  className,
  forgotPasswordUrl,
  signUpUrl,
  onError,
}: SignInProps) {
  // IDS THAT CANNOT COLLIDE. Two of these on one page — or a host that already owns
  // `cbox-id-email` — broke every `<label for>` association, which is the exact failure
  // labels exist to prevent. Both sibling components already do this.
  const uid = useId();
  const ids = {
    email: `${uid}-email`,
    password: `${uid}-password`,
    code: `${uid}-code`,
    error: `${uid}-error`,
    status: `${uid}-status`,
  };
  const [config, setConfig] = useState<CboxFrontendConfig | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState<{ token: string; method: 'mfa' | 'otp' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A counter, so the same message twice in a row is still announced: React keeps the
  // identical node otherwise, nothing changes, and two wrong passwords produce one
  // announcement.
  const [errorSeq, setErrorSeq] = useState(0);

  // Set only when the Frontend API has told us this page may never talk to it. Distinct
  // from `error`, which is about the sign-in attempt: this one is about the integration,
  // it does not clear when the user tries again, and it replaces the form rather than
  // sitting under it — see the effect below.
  const [setupError, setSetupError] = useState<string | null>(null);

  const refuse = useCallback((message: string) => {
    setError(message);
    setErrorSeq((n) => n + 1);
  }, []);

  /**
   * The developer's copy of a failure the user is being shown a sentence about.
   *
   * EVERY absorbed failure comes through here. Five `catch` blocks in this file used to
   * discard the cause outright, so the single most common way to get this component
   * wrong — a publishable key whose allow-list does not have this page's origin —
   * produced a form that looked completely normal and said nothing anywhere. Not in the
   * UI, not in the console, not to any reporter the host had wired.
   *
   * `console.error` unconditionally, because the person who hits this is at a dev server
   * with the console open, and `onError` is a prop they have not heard of yet.
   */
  const report = useCallback(
    (cause: unknown, context: string) => {
      console.error(`[cbox-id] ${context}`, cause);
      onError?.(cause);
    },
    [onError],
  );

  useEffect(() => {
    let live = true;

    frontend
      .config()
      .then((doc) => live && setConfig(doc))
      .catch((cause: unknown) => {
        if (!live) {
          return;
        }

        report(cause, 'could not read the Frontend API configuration');

        // `origin_not_allowed` is not a bad moment, it is a permanent answer: every other
        // call this component makes will get it too. Rendering the password form anyway
        // meant the person typed their credentials, waited, and was told their email and
        // password did not match — about a request that never reached authentication.
        // Everything else (a 5xx, a dropped connection) is transient by assumption: the
        // form stays, unthemed and without social buttons, and can still sign somebody in.
        if (apiCode(cause) === 'origin_not_allowed') {
          setSetupError(
            'This page is not allowed to talk to Cbox ID. Add its origin to the publishable key\'s allow-list in the console.',
          );
        }
      });

    return () => {
      live = false;
    };
  }, [frontend, report]);

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
      } catch (cause) {
        // The worst-timed failure in the component: authentication SUCCEEDED and a
        // single-use ticket is in hand with about a minute to spend it. Whatever the
        // reason is, it needs to reach the developer — the user is about to be told
        // something true but useless.
        report(cause, 'sign-in succeeded but the authorization endpoint could not be read');
        endpoint = undefined;
      }

      if (!endpoint) {
        refuse('Sign-in is unavailable right now. Please try again.');

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
    [authorize, frontend, onTicket, refuse, report],
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
          // POINTED AT SOMETHING THAT EXISTS. It used to say "use the button above" while
          // the social buttons render BELOW the form — and for an organization with a SAML
          // connection and no social providers, there is no button anywhere. Naming the
          // portal is the only instruction that is true in both cases.
          refuse('Your organization signs in with single sign-on. Continue from your organization\'s sign-in page.');

          return;
        case 'rate_limited':
          refuse(
            outcome.retryAfter
              ? `Too many attempts. Try again in ${outcome.retryAfter} seconds.`
              : 'Too many attempts. Try again shortly.',
          );

          return;
        default:
          refuse('That email and password did not match.');
      }
    },
    [refuse, spend],
  );

  /**
   * What a thrown failure says on screen.
   *
   * "We could not reach the sign-in service" was the answer to all four, and it is only
   * true for one of them. A rate-limited person was told to try again, which is the exact
   * thing that keeps them limited; a page whose origin is refused was told about the
   * network. The codes come off `FrontendApiError` — see `apiCode`.
   */
  const refuseFor = useCallback(
    (cause: unknown) => {
      const retryAfter = (cause as { retryAfter?: unknown })?.retryAfter;

      switch (apiCode(cause)) {
        case 'rate_limited':
          refuse(
            typeof retryAfter === 'number'
              ? `Too many attempts. Try again in ${retryAfter} seconds.`
              : 'Too many attempts. Try again shortly.',
          );

          return;
        case 'origin_not_allowed':
          // Deliberately not the developer's sentence: the person in front of the screen
          // cannot edit an allow-list, and telling them which control failed helps nobody.
          // `report` has already put the real cause in the console.
          refuse('Sign-in is unavailable on this page. Please contact support.');

          return;
        default:
          refuse('We could not reach the sign-in service. Please try again.');
      }
    },
    [refuse],
  );

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();

    // THE GUARD THE COMMENT BELOW ALREADY PROMISED. The submit button stays enabled while
    // busy on purpose — disabling the focused control drops focus to <body> — and the
    // handler was supposed to be what guards instead, except it did not. A second Enter
    // during the request spent a second password attempt against the rate limiter, and
    // whichever response landed last won.
    if (busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      handle(await frontend.signIn(email, password));
    } catch (cause) {
      report(cause, 'the sign-in request failed');
      refuseFor(cause);
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();

    if (!pending || busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const outcome = await frontend.submitSecondFactor(pending.token, code, pending.method);

      // A wrong code costs an attempt, not the sign-in — so the form stays on this step
      // rather than throwing the person back to the password field.
      outcome.status === 'ok' ? handle(outcome) : refuse('That code did not match.');
    } catch (cause) {
      report(cause, 'the second-factor request failed');
      refuseFor(cause);
    } finally {
      setBusy(false);
    }
  };

  const style: CSSProperties = {};

  if (appearance.accent) {
    (style as Record<string, string>)['--cbox-id-accent'] = appearance.accent;
  }

  if (appearance.accentForeground) {
    (style as Record<string, string>)['--cbox-id-accent-fg'] = appearance.accentForeground;
  }

  if (appearance.radius) {
    (style as Record<string, string>)['--cbox-id-radius'] = appearance.radius;
  }

  if (appearance.fontFamily) {
    (style as Record<string, string>)['--cbox-id-font'] = appearance.fontFamily;
  }

  return (
    <div className={['cbox-id-root', 'cbox-id-card', 'cbox-id-signin', className].filter(Boolean).join(' ')} style={style}>
      {/*
        THE STYLESHEET, EMITTED HERE. Every other component in this package gets it from
        `<CboxIdProvider>` — and this is the one that ships to a page with no backend and
        no provider, which the README's own example demonstrates. Without it the customer
        following that example gets browser-default inputs and a browser-default button
        for their sign-in page. React hoists a keyed, precedenced <style> to <head> and
        dedupes it, so rendering it twice beside a provider costs nothing.
      */}
      <style href={STYLE_ID} precedence="default">
        {CSS}
      </style>

      {header}

      {/*
        THE INTEGRATION IS BROKEN, SAID ON THE PAGE. Only for `origin_not_allowed`, which
        is permanent: every request this form would make gets the same answer, so drawing
        the password fields underneath would collect a credential in order to throw it
        away. Every other config failure leaves the form standing.

        role="alert" because it appears after the first render, once the failed request
        comes back — a person using a screen reader is otherwise sitting on a page that
        went quiet.
      */}
      {setupError ? (
        <p className="cbox-id-signin__error" role="alert">
          {setupError}
        </p>
      ) : null}

      {/*
        The pending state, announced. `disabled` on the focused button is what browsers
        answer by dropping focus to <body>, so the button stays enabled and the handler
        guards instead — otherwise the alert below fires while the caret sits at the top
        of the page and the person has to tab all the way back.
      */}
      <p className="cbox-id-signin__pending" id={ids.status} role="status" aria-live="polite">
        {busy ? 'Checking your details…' : ''}
      </p>

      {setupError ? null : pending ? (
        <form onSubmit={submitCode} className="cbox-id-signin__form" aria-busy={busy}>
          <label className="cbox-id-signin__label" htmlFor={ids.code}>
            {pending.method === 'otp' ? 'Code from your email' : 'Code from your authenticator'}
          </label>
          {/*
            The address being verified stays on screen. It vanished at this step, so
            somebody who mistyped it had no way to see that — and no way back.
          */}
          <input type="hidden" autoComplete="username" value={email} readOnly />
          <input
            id={ids.code}
            className="cbox-id-signin__input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            // `one-time-code` is what lets a phone offer the code from a message.
            // Autocorrect and autocapitalise are off because a recovery code is not a
            // word, and iOS will helpfully make it one.
            autoComplete="one-time-code"
            inputMode="numeric"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? ids.error : undefined}
            autoFocus
            required
          />
          <button className="cbox-id-btn cbox-id-btn--primary" type="submit">
            {busy ? 'Checking…' : 'Continue'}
          </button>
          {/*
            A WAY BACK. Without it a slow or lost code ends the sign-in: there is no
            resend here, and the only escape was reloading the page.
          */}
          <button
            className="cbox-id-btn"
            type="button"
            onClick={() => {
              setPending(null);
              setCode('');
              setError(null);
            }}
          >
            Start again
          </button>
        </form>
      ) : (
        <form onSubmit={submitPassword} className="cbox-id-signin__form" aria-busy={busy}>
          <label className="cbox-id-signin__label" htmlFor={ids.email}>
            Email
          </label>
          <input
            id={ids.email}
            name="username"
            className="cbox-id-signin__input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="next"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? ids.error : undefined}
            required
          />

          <label className="cbox-id-signin__label" htmlFor={ids.password}>
            Password
          </label>
          <input
            id={ids.password}
            name="password"
            className="cbox-id-signin__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            enterKeyHint="go"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? ids.error : undefined}
            required
          />

          <button className="cbox-id-btn cbox-id-btn--primary" type="submit">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          {forgotPasswordUrl ? (
            <a className="cbox-id-signin__link" href={forgotPasswordUrl}>
              Forgot your password?
            </a>
          ) : null}
        </form>
      )}

      {/* Announced, not just coloured: a message a screen reader never reaches is a
          message somebody using one cannot act on. The key is what makes the SAME
          message twice in a row announce twice. */}
      {error ? (
        <p className="cbox-id-signin__error" id={ids.error} key={errorSeq} role="alert">
          {error}
        </p>
      ) : null}

      {/*
        ABOVE nothing and below the form — but the sso_required message no longer points
        at these, because for an organization with a SAML connection there is no button
        here to point at.
      */}
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

      {!pending && signUpUrl ? (
        <a className="cbox-id-signin__link" href={signUpUrl}>
          Create an account
        </a>
      ) : null}
    </div>
  );
}
