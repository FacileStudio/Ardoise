const SECRET_PARAMS = ['token', 'ticket', 'code', 'state'];

export function redactUrl(raw: string): string {
  try {
    const url = new URL(raw);
    for (const name of SECRET_PARAMS) {
      if (url.searchParams.has(name)) url.searchParams.set(name, '[redacted]');
    }
    return url.toString();
  } catch {
    return raw.split('?')[0];
  }
}
