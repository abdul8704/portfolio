// Admin behaviour: confirm dialogs, markdown editor, image upload + library,
// dirty-state guard, local autosave (survives an expired session), shortcuts.
const csrf = document.querySelector('meta[name=csrf]')?.content || '';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* toast dismiss */
$$('.toast').forEach((t) => {
  const timer = t.classList.contains('err') ? 0 : setTimeout(() => t.remove(), 5000);
  $('button', t)?.addEventListener('click', () => { clearTimeout(timer); t.remove(); });
});

/* mobile menu */
const side = $('.a-side');
$('[data-menu]')?.addEventListener('click', (e) => {
  const open = side.classList.toggle('open');
  e.currentTarget.setAttribute('aria-expanded', String(open));
});

/* confirm dialog for risky actions */
const dlg = $('#confirm');
let pending = null;
document.addEventListener('submit', (e) => {
  const f = e.target;
  if (!(f instanceof HTMLFormElement)) return;
  const msg = (e.submitter?.dataset.confirm) || f.dataset.confirm;
  if (msg && dlg && !f.dataset.confirmed) {
    e.preventDefault();
    pending = { form: f, submitter: e.submitter };
    $('#confirm-title', dlg).textContent = (e.submitter?.dataset.confirmTitle) || f.dataset.confirmTitle || 'Are you sure?';
    $('#confirm-text', dlg).textContent = msg;
    const ok = $('#confirm-ok', dlg);
    ok.textContent = (e.submitter?.dataset.confirmLabel) || f.dataset.confirmLabel || 'Confirm';
    ok.className = 'a-btn ' + ((e.submitter?.dataset.confirmDanger ?? f.dataset.confirmDanger) === 'false' ? 'primary' : 'danger-solid');
    dlg.showModal();
    $('#confirm-cancel', dlg).focus(); // never default-focus the destructive button
    return;
  }
  // loading state: no double submits, no layout shift
  const btn = e.submitter && e.submitter.classList.contains('a-btn') ? e.submitter : null;
  if (btn && !btn.dataset.noLoading) {
    const w = btn.offsetWidth; btn.style.minWidth = w + 'px';
    setTimeout(() => btn.classList.add('loading'), 0);
  }
});
$('#confirm-ok')?.addEventListener('click', () => {
  if (!pending) return;
  const { form, submitter } = pending;
  form.dataset.confirmed = '1';
  dlg.close();
  form.requestSubmit(submitter);
  pending = null;
});
$('#confirm-cancel')?.addEventListener('click', () => { pending = null; dlg.close(); });

/* ----- edit form: dirty guard + autosave ----- */
const form = $('form[data-editor]');
if (form) {
  const key = 'draft:' + location.pathname;
  const state = $('[data-state]');
  const snapshot = () => JSON.stringify([...new FormData(form)].filter(([k]) => k !== '_csrf' && !(k.startsWith('_'))));
  let base = snapshot();
  let dirty = false;
  const mark = () => {
    dirty = snapshot() !== base;
    if (state) { state.textContent = dirty ? 'Unsaved changes' : 'All changes saved'; state.classList.toggle('dirty', dirty); }
    if (dirty) { try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), values: [...new FormData(form)].filter(([k]) => !k.startsWith('_')) })); } catch {} }
  };
  form.addEventListener('input', mark);
  form.addEventListener('change', mark);
  addEventListener('beforeunload', (e) => { if (dirty && !form.dataset.submitting) { e.preventDefault(); e.returnValue = ''; } });
  form.addEventListener('submit', () => { form.dataset.submitting = '1'; });
  if (form.dataset.saved) { try { localStorage.removeItem(key); } catch {} }

  // restore banner after a lost session or accidental close
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    const banner = $('#restore');
    if (saved && banner && !form.dataset.saved && !form.dataset.hasErrors && snapshot() !== JSON.stringify(saved.values)) {
      banner.classList.add('show');
      $('[data-restore]', banner).onclick = () => {
        const m = new Map(); saved.values.forEach(([k, v]) => m.set(k, v));
        $$('input, textarea, select', form).forEach((el) => {
          if (!el.name || el.name.startsWith('_') || !m.has(el.name)) {
            if (el.type === 'checkbox' && el.name && !el.name.startsWith('_')) el.checked = false;
            return;
          }
          if (el.type === 'checkbox') el.checked = true; else el.value = m.get(el.name);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        banner.classList.remove('show'); mark();
      };
      $('[data-discard]', banner).onclick = () => { try { localStorage.removeItem(key); } catch {} banner.classList.remove('show'); };
    }
  } catch {}
}

/* Cmd/Ctrl+S saves; Esc closes menus */
addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    const f = $('form[data-editor]');
    if (f) { e.preventDefault(); f.requestSubmit($('[data-save]', f)); }
  }
  if (e.key === 'Escape') { side?.classList.remove('open'); }
});

/* ----- uploads ----- */
async function upload(file) {
  const fd = new FormData();
  fd.set('file', file);
  fd.set('_csrf', csrf);
  const res = await fetch('/admin/api/upload', { method: 'POST', body: fd, headers: { 'x-csrf-token': csrf } });
  const out = await res.json().catch(() => ({ ok: false, error: 'Upload failed. Try again.' }));
  if (!out.ok) throw new Error(out.error);
  return out;
}
function say(msg, ok = false) {
  const live = $('#live'); if (live) live.textContent = msg;
  let t = $('.toast.js-toast');
  t?.remove();
  t = document.createElement('div');
  t.className = 'toast js-toast ' + (ok ? 'ok' : 'err'); t.setAttribute('role', ok ? 'status' : 'alert');
  t.innerHTML = '<span></span><button type="button" aria-label="Dismiss">✕</button>';
  t.firstChild.textContent = msg; t.lastChild.onclick = () => t.remove();
  document.body.append(t);
  if (ok) setTimeout(() => t.remove(), 4000);
}

/* image fields */
$$('[data-image-field]').forEach((box) => {
  const input = $('input[type=hidden]', box);
  const prev = $('.img-prev', box);
  const file = $('input[type=file]', box);
  const set = (url) => {
    input.value = url || '';
    prev.innerHTML = url ? '' : 'No image';
    if (url) { const img = new Image(); img.alt = ''; img.src = url.replace(/\.webp$/, '-sm.webp'); prev.append(img); }
    $('[data-remove]', box).hidden = !url;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  box._set = set;
  $('[data-upload]', box).onclick = () => file.click();
  file.onchange = async () => {
    if (!file.files[0]) return;
    const btn = $('[data-upload]', box); btn.disabled = true; btn.textContent = 'Uploading…';
    try { set((await upload(file.files[0])).url); say('Image uploaded.', true); }
    catch (err) { say(err.message); }
    finally { btn.disabled = false; btn.textContent = 'Upload image'; file.value = ''; }
  };
  $('[data-remove]', box).onclick = () => set('');
  $('[data-library]', box)?.addEventListener('click', () => openLibrary((url) => set(url)));
});

/* media library dialog */
const lib = $('#library');
let onPick = null;
function openLibrary(cb) { if (!lib) return; onPick = cb; lib.showModal(); }
$$('#library [data-pick]').forEach((b) => b.addEventListener('click', () => { onPick?.(b.dataset.pick); lib.close(); }));
$('#library-close')?.addEventListener('click', () => lib.close());

/* markdown editor */
$$('[data-md]').forEach((box) => {
  const ta = $('textarea', box), pv = $('.md-preview', box), foot = $('[data-count]', box);
  const modeBtns = $$('[data-mode]', box);
  const count = () => { const n = (ta.value.match(/\S+/g) || []).length; foot.textContent = `${n} words · ${Math.max(1, Math.round(n / 220))} min read`; };
  count(); ta.addEventListener('input', count);
  const wrap = (a, b = a, ph = 'text') => {
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e) || ph;
    ta.setRangeText(a + sel + b, s, e, 'select'); ta.focus(); ta.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const line = (prefix) => {
    const s = ta.value.lastIndexOf('\n', ta.selectionStart - 1) + 1;
    ta.setRangeText(prefix, s, s, 'end'); ta.focus(); ta.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const actions = {
    h2: () => line('## '), bold: () => wrap('**'), italic: () => wrap('*'), code: () => wrap('`'),
    link: () => wrap('[', '](https://)', 'link text'), list: () => line('- '), quote: () => line('> '),
    block: () => wrap('\n```java\n', '\n```\n', 'code'),
  };
  $$('[data-act]', box).forEach((b) => b.onclick = () => actions[b.dataset.act]());
  $('[data-insert-image]', box).onclick = () => {
    const file = document.createElement('input'); file.type = 'file'; file.accept = 'image/*';
    file.onchange = async () => { try { const r = await upload(file.files[0]); wrap(`![`, `](${r.url})`, 'describe the image'); } catch (err) { say(err.message); } };
    file.click();
  };
  $('[data-insert-library]', box)?.addEventListener('click', () => openLibrary((url) => wrap('![', `](${url})`, 'describe the image')));
  async function show(mode) {
    modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    const preview = mode === 'preview';
    ta.hidden = preview; pv.hidden = !preview;
    $('.md-tools', box).hidden = preview;
    if (preview) {
      pv.innerHTML = '<p class="muted">Rendering…</p>';
      const fd = new FormData(); fd.set('text', ta.value); fd.set('_csrf', csrf);
      try {
        const r = await (await fetch('/admin/api/preview', { method: 'POST', body: fd, headers: { 'x-csrf-token': csrf } })).json();
        pv.innerHTML = '<div class="prose">' + (r.html || '<p class="muted">Nothing to preview yet.</p>') + '</div>';
      } catch { pv.innerHTML = '<p class="muted">Preview failed. Check your connection.</p>'; }
    }
  }
  modeBtns.forEach((b) => b.onclick = () => show(b.dataset.mode));
  // drag & drop / paste images straight into the editor
  ta.addEventListener('paste', async (e) => {
    const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
    if (!f) return; e.preventDefault();
    try { const r = await upload(f); wrap('![', `](${r.url})`, 'describe the image'); } catch (err) { say(err.message); }
  });
});

/* media page: drag and drop uploads */
const drop = $('[data-drop]');
if (drop) {
  const input = $('input[type=file]', drop);
  const go = async (files) => {
    for (const f of files) { try { await upload(f); } catch (err) { say(err.message); return; } }
    location.reload();
  };
  input.onchange = () => go(input.files);
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => go(e.dataTransfer.files));
}
$$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.origin + b.dataset.copy); say('Link copied.', true); } catch { say('Copy failed.'); }
}));

/* password reveal (explicit, keyboard operable) */
$$('[data-reveal-pw]').forEach((b) => b.addEventListener('click', () => {
  const i = b.previousElementSibling; const show = i.type === 'password';
  i.type = show ? 'text' : 'password'; b.textContent = show ? 'Hide' : 'Show'; b.setAttribute('aria-pressed', String(show));
}));
