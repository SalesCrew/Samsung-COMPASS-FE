type SessionToken = { access_token: string; user: { id: string } };
type AuthTransport = {
  current: () => Promise<SessionToken | null>;
  refresh: () => Promise<SessionToken | null>;
};

export class SessionUnavailable extends Error {
  constructor() { super('Die Sitzung ist abgelaufen. Bitte erneut anmelden.'); }
}

/** Polling callbacks may hold an old token after Supabase refreshes the session. */
export async function sessionFetch(url: string, options: RequestInit, owner: string, auth: AuthTransport, send: typeof fetch = fetch) {
  const checked = async (session: SessionToken | null) => {
    options.signal?.throwIfAborted();
    if (!session || session.user.id !== owner) throw new SessionUnavailable();
    return session;
  };
  const request = (session: SessionToken) => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', 'Bearer ' + session.access_token);
    return send(url, { ...options, headers, cache: 'no-store' });
  };
  const session = await checked(await auth.current());
  const response = await request(session);
  // A wrong old password also returns 401. Only expired authentication is retried.
  if (response.status !== 401 || !response.headers.get('content-type')?.includes('application/json')) return response;
  const failure = await response.clone().json();
  if (failure.code !== 'AUTH_REQUIRED') return response;
  const current = await checked(await auth.current());
  const renewed = current.access_token !== session.access_token ? current : await checked(await auth.refresh());
  // A logout or account switch during refresh must never revive the old request.
  await checked(await auth.current());
  return request(renewed);
}
