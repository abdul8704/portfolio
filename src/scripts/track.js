// Counts page views, résumé opens and outbound link clicks for the admin's Analytics page.
// No cookies; the server only keeps daily totals.
const body = document.body;
if (body.dataset.track !== undefined) {
  const send = (kind, target = '') => {
    const data = JSON.stringify({ kind, target });
    try {
      if (!navigator.sendBeacon?.('/api/hit', new Blob([data], { type: 'text/plain' }))) {
        fetch('/api/hit', { method: 'POST', body: data, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {});
      }
    } catch { /* never break the page over analytics */ }
  };
  const host = (u) => u.hostname.replace(/^www\./, '');

  send('view', location.pathname);

  // where the visit came from: once per browser tab session
  try {
    if (!sessionStorage.getItem('vref')) {
      sessionStorage.setItem('vref', '1');
      const r = document.referrer ? new URL(document.referrer) : null;
      if (!r) send('ref', 'direct');
      else if (r.host !== location.host) send('ref', host(r));
    }
  } catch { /* storage blocked */ }

  const resume = body.dataset.resume ? new URL(body.dataset.resume, location.href).href : '';
  const onClick = (e) => {
    if (e.type === 'auxclick' && e.button !== 1) return;
    const a = e.target.closest?.('a[href]');
    if (!a) return;
    let u;
    try { u = new URL(a.href, location.href); } catch { return; }
    if (resume && u.href === resume) send('resume');
    else if (u.protocol === 'mailto:') send('out', 'email');
    else if (/^https?:$/.test(u.protocol) && u.host !== location.host) send('out', host(u) + u.pathname.replace(/\/+$/, ''));
  };
  document.addEventListener('click', onClick, { capture: true });
  document.addEventListener('auxclick', onClick, { capture: true });
}
