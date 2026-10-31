// Next.js may construct nextUrl with its internal hostname. The Host header
// identifies the address used by the browser, including the preview port.
export function hasSameOrigin(request: { headers: Headers; nextUrl: { protocol: string } }): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;
  try {
    const expected = new URL(`${request.nextUrl.protocol}//${host}`);
    return new URL(origin).origin === origin && origin === expected.origin;
  } catch {
    return false;
  }
}
