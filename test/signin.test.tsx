import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { SignIn, type SignInClient } from '../src/components/SignIn.js';

const CONFIG = {
  mode: 'live' as const,
  issuer: 'https://id.acme.test',
  endpoints: { authorization: 'https://id.acme.test/oauth/authorize' },
  social: [{ provider: 'google', name: 'Google' }],
};

const AUTHORIZE = {
  clientId: 'app-1',
  redirectUri: 'https://acme.test/callback',
  codeChallenge: 'challenge-abc',
};

function clientWith(overrides: Partial<SignInClient> = {}): SignInClient {
  return {
    config: vi.fn().mockResolvedValue(CONFIG),
    signIn: vi.fn().mockResolvedValue({ status: 'invalid' }),
    submitSecondFactor: vi.fn().mockResolvedValue({ status: 'invalid' }),
    ...overrides,
  } as SignInClient;
}

async function signInWith(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
}

let assign: ReturnType<typeof vi.fn>;

beforeEach(() => {
  assign = vi.fn();
  Object.defineProperty(window, 'location', { value: { assign }, writable: true });
});

afterEach(() => vi.restoreAllMocks());

describe('SignIn', () => {
  /**
   * THE PROPERTY THE WHOLE DESIGN RESTS ON. Handing tokens to a page that proved a
   * password is the implicit grant; this component's last act is a redirect carrying a
   * ticket and a PKCE challenge, and nothing token-shaped may pass through it.
   */
  it('spends a ticket on the authorize flow and never touches a token', async () => {
    const frontend = clientWith({
      signIn: vi.fn().mockResolvedValue({ status: 'ok', loginTicket: 'lt_abc' }),
    });

    render(<SignIn frontend={frontend} authorize={AUTHORIZE} />);
    await signInWith('ada@acme.test', 'pw');

    await waitFor(() => expect(assign).toHaveBeenCalled());

    const url = new URL(String(assign.mock.calls[0]?.[0]));

    expect(url.origin + url.pathname).toBe('https://id.acme.test/oauth/authorize');
    expect(url.searchParams.get('login_ticket')).toBe('lt_abc');
    expect(url.searchParams.get('code_challenge')).toBe('challenge-abc');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('response_type')).toBe('code');
  });

  /**
   * The server refuses to tell a wrong password, an unknown address and a locked account
   * apart — that is the enumeration oracle. A UI that distinguishes them rebuilds it in
   * the one place a user can see.
   */
  it('reads the same for every refusal', async () => {
    const frontend = clientWith();

    render(<SignIn frontend={frontend} authorize={AUTHORIZE} />);
    await signInWith('nobody@acme.test', 'pw');

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/did not match/i));
    expect(screen.getByRole('alert')).not.toHaveTextContent(/locked|unknown|exist/i);
  });

  it('moves to the code step and stays there when the code is wrong', async () => {
    const frontend = clientWith({
      signIn: vi.fn().mockResolvedValue({ status: 'mfa_required', mfaToken: 'mt_abc' }),
    });

    render(<SignIn frontend={frontend} authorize={AUTHORIZE} />);
    await signInWith('ada@acme.test', 'pw');

    const code = await screen.findByLabelText(/authenticator/i);

    fireEvent.change(code, { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // A wrong code costs an attempt, not the sign-in — the form must not throw the person
    // back to the password field.
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/code did not match/i));
    expect(screen.getByLabelText(/authenticator/i)).toBeInTheDocument();
  });

  it('passes the pending token and the right method to the second factor', async () => {
    const submitSecondFactor = vi.fn().mockResolvedValue({ status: 'ok', loginTicket: 'lt' });
    const frontend = clientWith({
      signIn: vi.fn().mockResolvedValue({ status: 'otp_required', mfaToken: 'mt_abc' }),
      submitSecondFactor,
    });

    render(<SignIn frontend={frontend} authorize={AUTHORIZE} />);
    await signInWith('ada@acme.test', 'pw');

    // The CODE field, named exactly: at this step "email" also matches the label "Code
    // from your email", and the address being verified is kept on the form now.
    fireEvent.change(await screen.findByLabelText(/^code from your email$/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => expect(submitSecondFactor).toHaveBeenCalledWith('mt_abc', '123456', 'otp'));
  });

  /**
   * Telling somebody whose organization mandates SSO that their password is wrong sends
   * them to support instead of to their identity provider.
   */
  it('names single sign-on rather than blaming the password', async () => {
    const frontend = clientWith({ signIn: vi.fn().mockResolvedValue({ status: 'sso_required' }) });

    render(<SignIn frontend={frontend} authorize={AUTHORIZE} />);
    await signInWith('ada@acme.test', 'pw');

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/single sign-on/i));
  });

  it('draws the social buttons the configuration lists', async () => {
    render(<SignIn frontend={clientWith()} authorize={AUTHORIZE} />);

    expect(await screen.findByText(/continue with google/i)).toBeInTheDocument();
  });

  /**
   * A configuration that will not load is a form that cannot be themed or list its social
   * buttons. It is still a form that can take a password.
   */
  it('still takes a password when the configuration will not load', async () => {
    const frontend = clientWith({ config: vi.fn().mockRejectedValue(new Error('offline')) });

    render(<SignIn frontend={frontend} authorize={AUTHORIZE} />);

    expect(await screen.findByLabelText('Password')).toBeInTheDocument();
  });

  it('hands the ticket to a caller who would rather route themselves', async () => {
    const onTicket = vi.fn();
    const frontend = clientWith({
      signIn: vi.fn().mockResolvedValue({ status: 'ok', loginTicket: 'lt_abc' }),
    });

    render(<SignIn frontend={frontend} authorize={AUTHORIZE} onTicket={onTicket} />);
    await signInWith('ada@acme.test', 'pw');

    await waitFor(() => expect(onTicket).toHaveBeenCalledWith('lt_abc'));
    expect(assign).not.toHaveBeenCalled();
  });
});

/**
 * THE COMPONENT HAS TO WORK WITH NO PROVIDER ABOVE IT.
 *
 * It is the one thing in this package aimed at a page with no backend — the README's own
 * example has no provider — and it used `cbox-id-*` classes while the stylesheet was
 * injected only by `<CboxIdProvider>`. A customer following that example got browser
 * default inputs and a browser default button for their sign-in page. Tests passed;
 * nobody could see the form.
 */
describe('drawn, not just rendered', () => {
  it('brings its own stylesheet', () => {
    render(<SignIn frontend={clientWith({})} authorize={AUTHORIZE} />);

    const styles = Array.from(document.querySelectorAll('style'));

    expect(styles.some((s) => (s.textContent ?? '').includes('.cbox-id-signin'))).toBe(true);
  });

  it('wears the customer colours it was given', () => {
    const { container } = render(
      <SignIn frontend={clientWith({})} authorize={AUTHORIZE} appearance={{ accent: '#0ea5e9', accentForeground: '#111111' }} />,
    );

    const root = container.querySelector('.cbox-id-signin') as HTMLElement;

    expect(root.style.getPropertyValue('--cbox-id-accent')).toBe('#0ea5e9');
    expect(root.style.getPropertyValue('--cbox-id-accent-fg')).toBe('#111111');
  });

  /**
   * Two on one page — or a host that already owns `cbox-id-email` — broke every
   * `<label for>` association, which is the exact failure labels exist to prevent.
   */
  it('does not collide with a second instance on the same page', () => {
    const { container } = render(
      <>
        <SignIn frontend={clientWith({})} authorize={AUTHORIZE} />
        <SignIn frontend={clientWith({})} authorize={AUTHORIZE} />
      </>,
    );

    const ids = Array.from(container.querySelectorAll('input[type="email"]')).map((i) => i.id);

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('usable by somebody who cannot see it', () => {
  /**
   * React keeps the identical node when the same message repeats, so nothing changes and
   * no announcement fires: two wrong passwords in a row used to be announced once.
   */
  it('announces the same refusal twice when it happens twice', async () => {
    const frontend = clientWith({ signIn: vi.fn().mockResolvedValue({ status: 'invalid' }) });

    render(<SignIn frontend={frontend} authorize={AUTHORIZE} />);

    await signInWith('ada@acme.test', 'wrong');
    const first = await screen.findByRole('alert');

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByRole('alert')).not.toBe(first));
  });

  it('marks the fields invalid and points at the reason', async () => {
    const frontend = clientWith({ signIn: vi.fn().mockResolvedValue({ status: 'invalid' }) });

    render(<SignIn frontend={frontend} authorize={AUTHORIZE} />);
    await signInWith('ada@acme.test', 'wrong');

    const field = await screen.findByLabelText(/^email$/i);

    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(field.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
  });

  /**
   * A slow or lost code used to end the sign-in: no resend, no back, and reloading the
   * page was the only escape.
   */
  it('offers a way back from the second factor', async () => {
    const frontend = clientWith({
      signIn: vi.fn().mockResolvedValue({ status: 'mfa_required', mfaToken: 'mt' }),
    });

    render(<SignIn frontend={frontend} authorize={AUTHORIZE} />);
    await signInWith('ada@acme.test', 'pw');

    fireEvent.click(await screen.findByRole('button', { name: /start again/i }));

    expect(await screen.findByLabelText(/^password$/i)).toBeInTheDocument();
  });

  /**
   * The old copy said "use the button above" — the social buttons render BELOW, and for an
   * organization with a SAML connection and no social providers there is no button
   * anywhere. A dead end on the one path the code went out of its way to name honestly.
   */
  it('does not point somebody mandated onto SSO at a button that is not there', async () => {
    const frontend = clientWith({ signIn: vi.fn().mockResolvedValue({ status: 'sso_required' }) });

    render(<SignIn frontend={frontend} authorize={AUTHORIZE} />);
    await signInWith('ada@acme.test', 'pw');

    const alert = await screen.findByRole('alert');

    expect(alert.textContent).toMatch(/single sign-on/i);
    expect(alert.textContent).not.toMatch(/above/i);
  });
});
