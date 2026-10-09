import MarkdownIt from 'markdown-it';
import Shiki from '@shikijs/markdown-it';
import { slugify } from './entities.js';

const LANGS = ['java', 'python', 'sql', 'javascript', 'typescript', 'json', 'bash', 'shell', 'yaml', 'html', 'css', 'markdown', 'go', 'rust', 'c', 'cpp', 'dockerfile', 'diff', 'xml', 'toml', 'kotlin'];

async function build() {
  // html:false means raw HTML in posts is escaped, so stored content cannot inject scripts.
  const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
  try {
    md.use(await Shiki({ themes: { light: 'github-dark-dimmed', dark: 'github-dark-dimmed' }, langs: LANGS, fallbackLanguage: 'text', defaultColor: false }));
  } catch (e) {
    console.warn('[markdown] code highlighting unavailable:', e.message);
  }
  // Heading ids so sections can be linked to and quoted.
  md.core.ruler.push('heading_ids', (state) => {
    const seen = new Map();
    const headings = (state.env.headings = []);
    state.tokens.forEach((t, i) => {
      if (t.type !== 'heading_open') return;
      const text = state.tokens[i + 1].content;
      let id = slugify(text);
      const n = seen.get(id) || 0;
      seen.set(id, n + 1);
      if (n) id += `-${n + 1}`;
      t.attrSet('id', id);
      headings.push({ level: Number(t.tag.slice(1)), id, text });
    });
  });
  const defLink = md.renderer.rules.link_open || ((t, i, o, e, s) => s.renderToken(t, i, o));
  md.renderer.rules.link_open = (tokens, i, o, env, self) => {
    const href = tokens[i].attrGet('href') || '';
    if (/^https?:/i.test(href)) tokens[i].attrSet('rel', 'noopener');
    if (!/^(https?:|mailto:|\/|#)/i.test(href)) tokens[i].attrSet('href', '#');
    return defLink(tokens, i, o, env, self);
  };
  const defImg = md.renderer.rules.image || ((t, i, o, e, s) => s.renderToken(t, i, o));
  md.renderer.rules.image = (tokens, i, o, env, self) => {
    tokens[i].attrSet('loading', 'lazy');
    tokens[i].attrSet('decoding', 'async');
    return defImg(tokens, i, o, env, self);
  };
  return md;
}

const mdPromise = (globalThis.__mdPromise ??= build());

export async function renderMarkdown(src = '') {
  const md = await mdPromise;
  const env = {};
  const html = md.render(String(src), env);
  return { html, headings: env.headings || [] };
}

export function plainText(src = '') {
  return String(src)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^[#>\-*\d.\s]+/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
export const readingMinutes = (src) => Math.max(1, Math.round(plainText(src).split(' ').length / 220));
