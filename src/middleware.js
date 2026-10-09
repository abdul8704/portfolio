import { defineMiddleware } from 'astro:middleware';
import { getSession, csrfValid } from './lib/auth.js';

const CSP = [
  "default-src 'self'",
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export const onRequest = defineMiddleware(async (ctx, next) => {
  const { pathname } = ctx.url;
  const token = ctx.cookies.get('sid')?.value;
  ctx.locals.owner = token ? getSession(token) : null;

  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const isLogin = pathname === '/admin/login';

  if (isAdmin && !isLogin) {
    if (!ctx.locals.owner) {
      if (ctx.request.method === 'GET') {
        const next = encodeURIComponent(pathname + ctx.url.search);
        return ctx.redirect(`/admin/login?next=${next}`, 303);
      }
      return new Response('Sign in required', { status: 401 });
    }
    if (!['GET', 'HEAD'].includes(ctx.request.method)) {
      let sent = ctx.request.headers.get('x-csrf-token');
      if (!sent && /form/.test(ctx.request.headers.get('content-type') || '')) {
        try { sent = (await ctx.request.clone().formData()).get('_csrf'); } catch { /* handled below */ }
      }
      if (!csrfValid(ctx.locals.owner.id, sent)) {
        return new Response('This form expired. Go back, reload the page and try again.', { status: 403 });
      }
    }
  }

  const res = await next();
  try {
    res.headers.set('Content-Security-Policy', CSP);
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (isAdmin) {
      res.headers.set('Cache-Control', 'private, no-store');
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    } else if (ctx.locals.owner) {
      res.headers.set('Cache-Control', 'private, no-store'); // owner always sees fresh edits and drafts
    } else if (!res.headers.has('Cache-Control') && (res.headers.get('content-type') || '').includes('text/html')) {
      res.headers.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
    }
    if (ctx.url.protocol === 'https:' || ctx.request.headers.get('x-forwarded-proto') === 'https') {
      res.headers.set('Strict-Transport-Security', 'max-age=15552000');
    }
  } catch { /* immutable response headers: skip */ }
  return res;
});
