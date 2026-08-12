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

    fireEvent.change(await screen.findByLabelText(/email/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

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
