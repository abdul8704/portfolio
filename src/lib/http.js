export function clientIp(ctx) {
  if (process.env.TRUST_PROXY === '1') {
    const xf = ctx.request.headers.get('x-forwarded-for');
    if (xf) return xf.split(',')[0].trim();
  }
  try { return ctx.clientAddress || 'unknown'; } catch { return 'unknown'; }
}
export function isHttps(ctx) {
  return ctx.url.protocol === 'https:' || ctx.request.headers.get('x-forwarded-proto') === 'https';
}
export function safeNext(next, fallback = '/admin') {
  return typeof next === 'string' && /^\/admin(\/|\?|$)/.test(next) && !next.startsWith('//') ? next : fallback;
}
export function flash(ctx, type, message) {
  ctx.cookies.set('flash', JSON.stringify({ type, message }), { path: '/admin', maxAge: 60, httpOnly: true, sameSite: 'strict' });
}
export function takeFlash(ctx) {
  const c = ctx.cookies.get('flash');
  if (!c) return null;
  ctx.cookies.delete('flash', { path: '/admin' });
  try { return JSON.parse(c.value); } catch { return null; }
}
export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
