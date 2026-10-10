/**
 * Subdomain detection utility for Admin/Ops portal isolation (Phương án 2).
 * Separates administrative console access to dedicated subdomains
 * (e.g., ops.layameet.com, admin.layameet.com, ops.localhost).
 */

export function isOpsSubdomain(): boolean {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname.toLowerCase();
  const configuredSubdomain = (import.meta.env.VITE_OPS_SUBDOMAIN || 'ops').toLowerCase();

  // 1. Explicit hostname configured via environment variable
  const explicitHost = (import.meta.env.VITE_OPS_HOSTNAME || '').toLowerCase().trim();
  if (explicitHost && hostname === explicitHost) {
    return true;
  }

  // 2. Subdomain prefixes (e.g. ops.layameet.com, admin.layameet.com, ops-internal.layameet.com)
  if (
    hostname.startsWith(`${configuredSubdomain}.`) ||
    hostname.startsWith('admin.') ||
    hostname.startsWith('ops-')
  ) {
    return true;
  }

  // 3. Localhost development flags (?ops=1 query or dedicated port 3001)
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('ops') === '1' || window.location.port === '3001') {
      return true;
    }
  }

  return false;
}

export function getOpsPortalUrl(): string {
  if (typeof window === 'undefined') return 'https://ops.layameet.com';

  const protocol = window.location.protocol;
  const configuredHost = import.meta.env.VITE_OPS_HOSTNAME;
  if (configuredHost) {
    return `${protocol}//${configuredHost}`;
  }

  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//ops.localhost:${window.location.port || '3000'}`;
  }

  const configuredSubdomain = import.meta.env.VITE_OPS_SUBDOMAIN || 'ops';
  // If already at layameet.com, prepend ops.
  return `${protocol}//${configuredSubdomain}.${hostname.replace(/^www\./, '')}`;
}
