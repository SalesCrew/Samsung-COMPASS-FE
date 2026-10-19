import type { SECAccount } from './secApi';

/** The URL follows the verified server profile, never a client-side role choice. */
export function roleRoute(role: SECAccount['role']) {
  return role === 'sec' ? '/' : '/admin';
}
