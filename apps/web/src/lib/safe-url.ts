export function safeHttpUrl(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	let url: URL;
	try {
		url = new URL(value.trim());
	} catch {
		return null;
	}
	const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
	if (url.protocol === 'https:' || (url.protocol === 'http:' && local)) return url.href;
	return null;
}
