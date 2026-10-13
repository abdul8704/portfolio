// Receives page views and link clicks from src/scripts/track.js.
import { KINDS, isBot, pageExists, record } from '../../lib/analytics.js';
import { clientIp } from '../../lib/http.js';
import { bump } from '../../lib/cache.js';

export const prerender = false;

const clean = (s, max = 200) => String(s ?? '').trim().slice(0, max);

export async function POST(ctx) {
  const nothing = new Response(null, { status: 204 });
  const { request, locals, url } = ctx;
  if (locals.owner) return nothing; // your own visits while signed in don't count
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return new Response(null, { status: 403 });
  const ua = request.headers.get('user-agent') || '';
  if (isBot(ua)) return nothing;
  const ip = clientIp(ctx);
  if ((await bump(`hit-rate:${ip}`, 60)) > 60) return new Response(null, { status: 429 }); // per IP per minute

  let body;
  try { body = JSON.parse((await request.text()).slice(0, 2000)); } catch { return new Response(null, { status: 400 }); }
  const kind = clean(body?.kind, 10);
  let target = clean(body?.target);
  if (!KINDS.includes(kind)) return new Response(null, { status: 400 });

  if (kind === 'view') {
    target = target.replace(/\/+$/, '') || '/';
    if (!(await pageExists(target))) return nothing;
  } else if (kind === 'resume') {
    target = '';
  } else if (kind === 'out') {
    if (target !== 'email' && !/^[a-z0-9.-]+\.[a-z]{2,}(\/[^\s]*)?$/i.test(target)) return new Response(null, { status: 400 });
    target = target.toLowerCase().replace(/\/+$/, '');
  } else if (kind === 'ref') {
    target = target.toLowerCase();
    if (target !== 'direct' && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(target)) return new Response(null, { status: 400 });
  }
  try { await record(kind, target, `${ip}|${ua}`); } catch (e) { console.error('analytics:', e.message); }
  return nothing;
}
