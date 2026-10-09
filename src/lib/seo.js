// SEO + GEO helpers: canonical URLs, meta text, JSON-LD graphs, llms.txt content.
import { SITE_URL } from './config.js';
import { getProfile, listItems } from './store.js';
import { ENTITIES } from './entities.js';
import { plainText } from './markdown.js';

export const hasPlaceholder = (s) => /\[[^\]]{2,}\]/.test(String(s ?? ''));
const clean = (arr) => arr.filter((x) => x && !hasPlaceholder(x));

export function originOf(url, profile = getProfile()) {
  return SITE_URL || (profile.siteUrl || '').replace(/\/+$/, '') || url.origin;
}
export const abs = (origin, p) => (!p ? '' : /^https?:\/\//.test(p) ? p : origin + p);
export const small = (src) => (src ? src.replace(/\.webp$/, '-sm.webp') : '');

export function clip(text, n = 158) {
  const t = plainText(text);
  if (t.length <= n) return t;
  return t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
}

export function fmtDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });
}

/** Everything a public page needs, in one call. */
export function siteContext(Astro) {
  const profile = getProfile();
  const origin = originOf(Astro.url, profile);
  const owner = !!Astro.locals.owner;
  return { profile, origin, owner, drafts: owner };
}

export function personLd(profile, origin, { skills = [], achievements = [] } = {}) {
  const sameAs = clean((profile.socials || []).map((s) => s.href)).filter((h) => /^https?:/.test(h) && !/your-handle/.test(h));
  const timeline = listItems('timeline');
  const school = timeline.find((t) => t.kind === 'education' && !hasPlaceholder(t.org));
  const job = timeline.find((t) => t.kind === 'work' && !hasPlaceholder(t.org));
  return {
    '@type': 'Person',
    '@id': `${origin}/#person`,
    name: profile.name,
    jobTitle: profile.role,
    description: profile.summary,
    url: origin + '/',
    ...(profile.email && { email: `mailto:${profile.email}` }),
    ...(profile.location && { address: { '@type': 'PostalAddress', addressLocality: profile.location } }),
    ...((profile.photo || profile.ogImage) && { image: abs(origin, profile.photo || profile.ogImage) }),
    ...(sameAs.length && { sameAs }),
    ...(skills.length && { knowsAbout: skills }),
    ...(school && { alumniOf: { '@type': 'CollegeOrUniversity', name: school.org } }),
    ...(job && { worksFor: { '@type': 'Organization', name: job.org } }),
    ...(achievements.length && { award: achievements }),
  };
}

export const websiteLd = (profile, origin) => ({
  '@type': 'WebSite',
  '@id': `${origin}/#website`,
  url: origin + '/',
  name: `${profile.name}, ${profile.role}`,
  description: profile.seoDescription || profile.summary,
  inLanguage: 'en',
  publisher: { '@id': `${origin}/#person` },
});

export const crumbsLd = (origin, crumbs) => ({
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(origin, c.path) })),
});

/** JSON-LD node for one detail page, by content type. */
export function itemLd(type, it, origin, profile) {
  const url = `${origin}${ENTITIES[type].base}/${it.slug}`;
  const image = it.image ? abs(origin, it.image) : undefined;
  const author = { '@id': `${origin}/#person` };
  const common = { '@id': `${url}#main`, url, mainEntityOfPage: { '@id': `${url}#webpage` }, ...(image && { image }) };
  const modified = new Date(it.updatedAt).toISOString();
  switch (type) {
    case 'project':
      return { '@type': 'SoftwareSourceCode', ...common, name: it.name, description: it.blurb, author, dateModified: modified,
        ...(it.source && { codeRepository: it.source }), ...(it.stack?.length && { keywords: it.stack.join(', '), programmingLanguage: it.stack[0] }) };
    case 'post':
      return { '@type': 'BlogPosting', ...common, headline: it.title, description: it.description, datePublished: it.date, dateModified: modified,
        author, publisher: author, inLanguage: 'en', wordCount: plainText(it.body).split(' ').length,
        ...(it.tags?.length && { keywords: it.tags.join(', ') }), isPartOf: { '@id': `${origin}/blog#blog` } };
    case 'certification':
      return { '@type': 'EducationalOccupationalCredential', ...common, name: it.name, description: it.note, credentialCategory: 'certificate',
        recognizedBy: { '@type': 'Organization', name: it.issuer }, ...(it.credentialId && { identifier: it.credentialId }), dateModified: modified };
    default:
      return { '@type': 'CreativeWork', ...common, name: it.title, description: it.note, author, dateModified: modified,
        ...(it.year && { dateCreated: it.year }), ...(it.event && { about: it.event }), genre: it.kind };
  }
}

export const pageLd = (url, name, description, origin, image) => ({
  '@type': 'WebPage', '@id': `${url}#webpage`, url, name, description, isPartOf: { '@id': `${origin}/#website` },
  ...(image && { primaryImageOfPage: { '@type': 'ImageObject', url: image } }),
});

export const ldScript = (graph) =>
  JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');

/* ------------------------ llms.txt / llms-full.txt ------------------------ */
function lines(origin, profile, full) {
  const out = [];
  out.push(`# ${profile.name}: ${profile.role}`, '', `> ${profile.seoDescription || profile.summary}`, '');
  if (profile.location) out.push(`Location: ${profile.location}`);
  if (profile.status) out.push(`Availability: ${profile.status}`);
  if (profile.email) out.push(`Contact: ${profile.email}`);
  for (const s of profile.socials || []) out.push(`${s.label}: ${s.href}`);
  out.push('', '## About', '', ...(profile.about || []).flatMap((p) => [p, '']));
  const skills = listItems('skill');
  if (skills.length) out.push('## Core stack', '', ...skills.map((s) => `- ${s.group}: ${s.items.join(', ')}`), '');
  const tl = listItems('timeline');
  if (tl.length) {
    out.push('## Timeline', '');
    for (const t of tl) out.push(`- ${t.period}: ${t.title}, ${t.org}${t.points?.length ? '. ' + t.points.join(' ') : ''}`);
    out.push('');
  }
  const sections = [['project', 'Projects'], ['achievement', 'Achievements'], ['certification', 'Certifications'], ['post', 'Writing']];
  for (const [type, heading] of sections) {
    const cfg = ENTITIES[type];
    const items = listItems(type);
    if (!items.length) continue;
    out.push(`## ${heading}`, '');
    for (const it of items) {
      const title = it[cfg.titleField];
      const desc = it.blurb || it.note || it.description || '';
      out.push(`- [${title}](${origin}${cfg.base}/${it.slug}): ${desc}`);
    }
    out.push('');
    if (full) {
      for (const it of items) {
        if (!it.body) continue;
        out.push(`### ${it[cfg.titleField]}`, '', it.body.trim(), '');
      }
    }
  }
  return out.join('\n');
}
export const llmsTxt = (origin, profile) => lines(origin, profile, false);
export const llmsFullTxt = (origin, profile) => lines(origin, profile, true);
