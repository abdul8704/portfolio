// Dependency-free motion: scroll reveal, scroll-spy, progress bar, timeline fill,
// and pointer effects (cursor ring, card spotlight + parallax, magnetic links).
// Every effect is skipped for reduced-motion users; content never depends on JS.
import './hero.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* stagger index */
document.querySelectorAll('[data-stagger]').forEach((parent) => {
  [...parent.children].forEach((child, i) => child.style.setProperty('--i', i));
});

/* reveal on scroll */
const revealEls = document.querySelectorAll('[data-reveal], .section-title');
if (reduce || !('IntersectionObserver' in window)) {
  revealEls.forEach((el) => el.classList.add('in'));
} else {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }),
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );
  revealEls.forEach((el) => io.observe(el));
}

/* scroll-spy for the rail */
const links = [...document.querySelectorAll('[data-spy]')];
if (links.length && 'IntersectionObserver' in window) {
  const spy = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((l) => {
        const on = l.getAttribute('href') === '#' + e.target.id;
        l.classList.toggle('active', on);
        if (on) l.setAttribute('aria-current', 'location'); else l.removeAttribute('aria-current');
      });
    }),
    { rootMargin: '-40% 0px -55% 0px' },
  );
  links.forEach((l) => {
    const target = document.querySelector(l.getAttribute('href'));
    if (target) spy.observe(target);
  });
}

/* scroll progress + timeline fill */
const bar = document.querySelector('.progress i');
const timeline = document.querySelector('[data-timeline]');
let ticking = false;
function update() {
  ticking = false;
  const max = document.documentElement.scrollHeight - innerHeight;
  if (bar) bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  if (timeline) {
    const r = timeline.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.65 - r.top) / r.height));
    timeline.style.setProperty('--tl', p.toFixed(3));
  }
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
addEventListener('resize', update);
update();

/* pointer effects */
if (finePointer && !reduce) {
  // 1. cursor ring that follows with a little inertia
  const cur = document.createElement('div');
  cur.className = 'cursor';
  cur.setAttribute('aria-hidden', 'true');
  cur.innerHTML = '<div class="cursor-ring"><span class="cursor-label"></span></div><div class="cursor-dot"></div>';
  document.body.append(cur);
  const label = cur.querySelector('.cursor-label');
  let tx = -100, ty = -100, x = -100, y = -100, raf = 0;
  const loop = () => {
    x += (tx - x) * 0.2; y += (ty - y) * 0.2;
    cur.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.1 ? requestAnimationFrame(loop) : 0;
  };
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    tx = e.clientX; ty = e.clientY;
    cur.classList.add('on');
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener('pointerleave', () => cur.classList.remove('on'));
  addEventListener('pointerdown', () => cur.classList.add('is-down'));
  addEventListener('pointerup', () => cur.classList.remove('is-down'));
  document.addEventListener('pointerover', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    const labelled = t.closest('[data-cursor-label]');
    cur.classList.toggle('is-link', !!t.closest('a, button, summary, [role=button]'));
    cur.classList.toggle('has-label', !!labelled);
    label.textContent = labelled ? labelled.dataset.cursorLabel : '';
    cur.classList.toggle('is-text', !!t.closest('input, textarea, select'));
  });

  // 2. spotlight + thumbnail parallax follow the pointer inside each card
  document.querySelectorAll('[data-card]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
      card.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      card.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
    card.addEventListener('pointerleave', () => { card.style.setProperty('--px', 0); card.style.setProperty('--py', 0); });
  });

  // 3. magnetic links: nudge toward the pointer
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    el.style.transition = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.transform = `translate(${dx * 8}px, ${dy * 8}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

/* branch timeline: pick an entry to show its details, hover to highlight its bar */
const branch = document.querySelector('[data-branch]');
const details = document.querySelector('[data-tl-details]');
if (branch && details) {
  const items = [...details.querySelectorAll('[data-tl-item][data-placed]')];
  const marks = (k) => branch.querySelectorAll(`[data-for="${k}"], [data-tl-pick="${k}"]`);
  const pick = (k) => {
    branch.querySelectorAll('.on').forEach((el) => el.classList.remove('on'));
    marks(k).forEach((el) => el.classList.add('on'));
    items.forEach((li) => li.classList.toggle('on', li.dataset.tlItem === k));
  };
  if (items.length) {
    details.classList.add('picking');
    pick(items[0].dataset.tlItem);
  }
  const keyOf = (t) => t instanceof Element && t.closest('[data-tl-pick], [data-for]')?.dataset;
  branch.addEventListener('click', (e) => {
    const d = keyOf(e.target);
    if (!d) return;
    e.preventDefault();
    pick(d.tlPick || d.for);
  });
  branch.addEventListener('pointerover', (e) => {
    const d = keyOf(e.target);
    branch.querySelectorAll('.hot').forEach((el) => el.classList.remove('hot'));
    branch.classList.toggle('hovering', !!d);
    if (d) marks(d.tlPick || d.for).forEach((el) => el.classList.add('hot'));
  });
  branch.addEventListener('pointerleave', () => {
    branch.classList.remove('hovering');
    branch.querySelectorAll('.hot').forEach((el) => el.classList.remove('hot'));
  });
}
