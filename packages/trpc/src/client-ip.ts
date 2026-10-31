/**
 * The client address of a request that reached the API through the reverse proxy.
 *
 * Traefik appends the address it received the connection from to
 * `X-Forwarded-For`, so the rightmost entry is the only one the proxy vouches for.
 * Every entry before it is whatever the caller sent, and keying a limit or an
 * audit trail on the first one lets anyone pick their own identity. Without the
 * header, the caller reached the API directly and the connection address is the
 * best there is.
 */
export function clientIp(forwardedFor: string | null | undefined, peer?: string): string | undefined {
  const forwarded = forwardedFor
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .at(-1);
  return forwarded || peer || undefined;
}
