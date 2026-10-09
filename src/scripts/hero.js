// Hero → rail morph. On wide screens the identity block (photo, name, intro, links)
// starts centred and large; scrolling the first screen shrinks each piece into its
// place in the left rail, then the rest of the rail and the content fade in.
// Progress is tied to scroll position, so it reverses when scrolling back up.
// Phones, reduced motion and no-JS all get the finished layout without the glide.
const rail = document.querySelector('[data-rail]');
const spacer = document.querySelector('[data-hero-spacer]');

if (rail && spacer) {
  const root = document.documentElement;
  const wide = matchMedia('(min-width: 901px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const parts = [...rail.querySelectorAll('[data-morph]')];
  const rest = [...rail.querySelectorAll('[data-rail-rest]')];
  const content = [...document.querySelectorAll('[data-content] > :not([data-hero-spacer])')];
  const hint = document.querySelector('[data-scroll-hint]');
  const SCALE = { avatar: 2.5, name: 1.8, role: 1.3, summary: 1.2, links: 1.2 };
  const GAP_AFTER = { avatar: 34, name: 10, role: 14, summary: 34 };

  let on = false;
  let H = 1;
  let targets = [];
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2); // easeInOutCubic
  const set = (els, style) => els.forEach((el) => Object.assign(el.style, style));

  function measure() {
    on = wide.matches;
    root.classList.toggle('hero-on', on);
    set(parts, { transform: '' });
    if (!on) {
      spacer.style.height = '';
      set(rest, { opacity: '', transform: '' });
      set(content, { opacity: '', transform: '' });
      root.style.removeProperty('--hero');
      root.classList.remove('hero-done');
      return;
    }
    H = Math.round(innerHeight * 0.9);
    spacer.style.height = `${H}px`;
    const vw = root.clientWidth;
    const rects = parts.map((el) => el.getBoundingClientRect());
    const sizes = parts.map((el, i) => rects[i].height * SCALE[el.dataset.morph]);
    const total = sizes.reduce((a, h, i) => a + h + (i < parts.length - 1 ? GAP_AFTER[parts[i].dataset.morph] ?? 12 : 0), 0);
    let y = Math.max(24, (innerHeight - total) / 2 - 12);
    targets = parts.map((el, i) => {
      const r = rects[i];
      const cy = y + sizes[i] / 2;
      y += sizes[i] + (GAP_AFTER[el.dataset.morph] ?? 12);
      return { el, s: SCALE[el.dataset.morph], dx: vw / 2 - (r.left + r.width / 2), dy: cy - (r.top + r.height / 2) };
    });
    update();
  }

  function update() {
    if (!on) return;
    const raw = clamp(scrollY / H);
    const p = reduce.matches ? (raw > 0.25 ? 1 : 0) : raw;
    const k = 1 - ease(p);
    for (const t of targets) {
      t.el.style.transform = k > 0.0005 ? `translate3d(${(t.dx * k).toFixed(2)}px, ${(t.dy * k).toFixed(2)}px, 0) scale(${(1 + (t.s - 1) * k).toFixed(4)})` : '';
    }
    const r = clamp((p - 0.6) / 0.4);
    set(rest, { opacity: String(r), transform: r < 1 ? `translateY(${(1 - r) * 16}px)` : '' });
    const c = clamp((p - 0.45) / 0.5);
    set(content, { opacity: String(c), transform: c < 1 ? `translateY(${((1 - ease(c)) * 40).toFixed(1)}px)` : '' });
    root.style.setProperty('--hero', k.toFixed(3));
    if (hint) hint.style.opacity = String(clamp(1 - p * 5));
    root.classList.toggle('hero-done', p >= 1);
  }

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  }, { passive: true });
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(measure, 120); });
  wide.addEventListener('change', measure);
  reduce.addEventListener('change', measure);
  measure();
  // sizes change once web fonts and the photo arrive
  document.fonts?.ready.then(measure);
  rail.querySelector('img.avatar')?.addEventListener('load', measure);
}
