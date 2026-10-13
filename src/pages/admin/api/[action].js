import { ENTITIES } from '../../../lib/entities.js';
import { trashItem, restoreItem, purgeItem, moveItem, duplicateItem, deleteMedia, mediaUsage } from '../../../lib/store.js';
import { destroySession, destroyOthers, destroyAll } from '../../../lib/auth.js';
import { saveUpload } from '../../../lib/media.js';
import { renderMarkdown } from '../../../lib/markdown.js';
import { flash, json, safeNext, isHttps } from '../../../lib/http.js';

export const prerender = false;

export async function POST(ctx) {
  const { action } = ctx.params;
  const form = await ctx.request.formData();
  const type = String(form.get('type') || '');
  const id = Number(form.get('id') || 0);
  const back = safeNext(form.get('_back'), '/admin');
  const done = (kind, msg, to = back) => {
    flash(ctx, kind, msg);
    return ctx.redirect(to, 303);
  };
  const needType = () => (ENTITIES[type] ? null : new Response('Unknown content type', { status: 400 }));

  switch (action) {
    case 'upload': {
      try {
        return json({ ok: true, ...(await saveUpload(form.get('file'))) });
      } catch (e) {
        return json({ ok: false, error: e.message }, 400);
      }
    }
    case 'preview': {
      const { html } = await renderMarkdown(String(form.get('text') || '').slice(0, 120_000));
      return json({ ok: true, html });
    }
    case 'trash': {
      const bad = needType(); if (bad) return bad;
      await trashItem(id);
      return done('ok', 'Moved to trash. You can restore it for 30 days.');
    }
    case 'restore': {
      const bad = needType(); if (bad) return bad;
      await restoreItem(id);
      return done('ok', 'Restored.');
    }
    case 'purge': {
      const bad = needType(); if (bad) return bad;
      await purgeItem(id);
      return done('ok', 'Deleted permanently.');
    }
    case 'move': {
      const bad = needType(); if (bad) return bad;
      await moveItem(type, id, form.get('dir') === 'up' ? 'up' : 'down');
      return ctx.redirect(back, 303);
    }
    case 'duplicate': {
      const bad = needType(); if (bad) return bad;
      const newId = await duplicateItem(type, id);
      return done('ok', 'Duplicated as a draft.', `/admin/${type}/${newId}`);
    }
    case 'media-delete': {
      const mid = String(form.get('mediaId') || '');
      const used = await mediaUsage(mid);
      if (used.length) return done('err', `Still used by ${used.map((u) => u.title).join(', ')}. Remove it there first.`);
      try {
        await deleteMedia(mid);
      } catch (e) {
        console.error('[media]', e?.message || e);
        return done('err', 'Removed from the library, but the file could not be deleted from storage.');
      }
      return done('ok', 'Image deleted.');
    }
    case 'logout': {
      await destroySession(ctx.locals.owner.id);
      ctx.cookies.delete('sid', { path: '/' });
      return ctx.redirect('/admin/login', 303);
    }
    case 'logout-others': {
      await destroyOthers(ctx.locals.owner.id);
      return done('ok', 'Signed out of every other device.');
    }
    case 'logout-all': {
      await destroyAll();
      ctx.cookies.delete('sid', { path: '/' });
      return ctx.redirect('/admin/login', 303);
    }
    default:
      return new Response('Not found', { status: 404 });
  }
}
