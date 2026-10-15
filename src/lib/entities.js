// Single source of truth for every editable thing on the site.
// The admin forms, the validation and the public pages are all driven by this file:
// add a field here and it shows up in the editor and is stored automatically.

import { MONTH_RE, periodText } from './timeline.js';

const MEDIA_RE = /^\/media\/[a-z0-9]+\.webp$/;

export const ENTITIES = {
  project: {
    label: 'Project',
    plural: 'Projects',
    base: '/projects',
    titleField: 'name',
    detail: true,
    help: 'Shown on the home page as a card with a thumbnail. Click-through opens a full case-study page.',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, group: 'Basics' },
      { key: 'blurb', label: 'Short description', type: 'textarea', required: true, max: 300, rows: 3, group: 'Basics',
        help: 'One or two sentences. Used on the card, in search results (meta description) and when the page is shared.' },
      { key: 'outcome', label: 'Result', type: 'text', group: 'Basics', help: 'A measurable outcome: latency, throughput, users, cost.' },
      { key: 'stack', label: 'Tech stack', type: 'csv', group: 'Basics', help: 'Comma separated.' },
      { key: 'image', label: 'Thumbnail', type: 'image', group: 'Media' },
      { key: 'imageAlt', label: 'Thumbnail description', type: 'text', group: 'Media', help: 'Describes the image for screen readers and search engines.' },
      { key: 'source', label: 'Source code URL', type: 'url', group: 'Links' },
      { key: 'demo', label: 'Live demo URL', type: 'url', group: 'Links' },
      { key: 'body', label: 'Case study', type: 'markdown', group: 'Details', help: 'The full write-up shown on the project page. Markdown.' },
    ],
  },
  achievement: {
    label: 'Achievement',
    plural: 'Achievements',
    base: '/achievements',
    titleField: 'title',
    detail: true,
    help: 'Hackathons, symposiums and anything else worth showing off.',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, group: 'Basics' },
      { key: 'kind', label: 'Type', type: 'select', options: ['Hackathon', 'Symposium', 'Award', 'Talk', 'Other'], group: 'Basics' },
      { key: 'event', label: 'Event', type: 'text', group: 'Basics' },
      { key: 'year', label: 'Year', type: 'text', group: 'Basics' },
      { key: 'note', label: 'Short description', type: 'textarea', required: true, max: 300, rows: 3, group: 'Basics' },
      { key: 'image', label: 'Thumbnail', type: 'image', group: 'Media' },
      { key: 'imageAlt', label: 'Thumbnail description', type: 'text', group: 'Media' },
      { key: 'link', label: 'Link', type: 'url', group: 'Links', help: 'Event page, certificate, announcement.' },
      { key: 'body', label: 'Story', type: 'markdown', group: 'Details' },
    ],
  },
  certification: {
    label: 'Certification',
    plural: 'Certifications',
    base: '/certifications',
    titleField: 'name',
    detail: true,
    help: 'Courses and credentials. The thumbnail can be the certificate or the issuer badge.',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, group: 'Basics' },
      { key: 'issuer', label: 'Issuer', type: 'text', required: true, group: 'Basics' },
      { key: 'year', label: 'Year', type: 'text', group: 'Basics' },
      { key: 'note', label: 'Short description', type: 'textarea', required: true, max: 300, rows: 3, group: 'Basics' },
      { key: 'credentialId', label: 'Credential ID', type: 'text', group: 'Basics' },
      { key: 'image', label: 'Thumbnail', type: 'image', group: 'Media' },
      { key: 'imageAlt', label: 'Thumbnail description', type: 'text', group: 'Media' },
      { key: 'href', label: 'Verification URL', type: 'url', group: 'Links' },
      { key: 'body', label: 'What it covered', type: 'markdown', group: 'Details' },
    ],
  },
  timeline: {
    label: 'Timeline entry',
    plural: 'Timeline',
    base: null,
    titleField: 'title',
    detail: false,
    help: 'Work and education, newest first. Use the arrows on the list to reorder.',
    fields: [
      { key: 'kind', label: 'Type', type: 'select', options: ['work', 'education'], required: true, group: 'Basics' },
      { key: 'title', label: 'Role or degree', type: 'text', required: true, group: 'Basics' },
      { key: 'org', label: 'Company or school', type: 'text', required: true, group: 'Basics' },
      { key: 'start', label: 'Started', type: 'month', required: true, group: 'Dates', help: 'Month and year. Used to place it on the timeline.' },
      { key: 'end', label: 'Ended', type: 'month', group: 'Dates', help: 'Leave empty if it is still going on (shown as “Present”).' },
      { key: 'points', label: 'Highlights', type: 'lines', group: 'Details', help: 'One per line.' },
      { key: 'tags', label: 'Tech or topics', type: 'csv', group: 'Details', help: 'Comma separated.' },
    ],
  },
  skill: {
    label: 'Skill group',
    plural: 'Core stack',
    base: null,
    titleField: 'group',
    detail: false,
    help: 'Shown in the left rail. Keep it to the skills that matter most.',
    fields: [
      { key: 'group', label: 'Group name', type: 'text', required: true, group: 'Basics', help: 'For example Languages or Data.' },
      { key: 'items', label: 'Skills', type: 'csv', required: true, group: 'Basics', help: 'Comma separated.' },
    ],
  },
  post: {
    label: 'Post',
    plural: 'Blog',
    base: '/blog',
    titleField: 'title',
    detail: true,
    sortByDate: true,
    help: 'Only you can publish here. Unpublished posts are drafts that only you can preview.',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, group: 'Basics' },
      { key: 'description', label: 'Summary', type: 'textarea', required: true, max: 300, rows: 3, group: 'Basics',
        help: 'Shown in the post list, search results and link previews.' },
      { key: 'date', label: 'Publish date', type: 'date', required: true, group: 'Basics' },
      { key: 'tags', label: 'Tags', type: 'csv', group: 'Basics' },
      { key: 'projects', label: 'Related projects', type: 'refs', of: 'project', group: 'Basics',
        help: 'This post is listed under “Related posts” on each project you tick, and links back to them.' },
      { key: 'image', label: 'Cover image', type: 'image', group: 'Media' },
      { key: 'imageAlt', label: 'Cover description', type: 'text', group: 'Media' },
      { key: 'body', label: 'Post', type: 'markdown', required: true, group: 'Writing',
        help: 'Add links with [text](https://example.com), or the Link button. Link your own pages with a path, e.g. [AlgoMentor](/projects/algomentor).' },
    ],
  },
};

export const ENTITY_KEYS = Object.keys(ENTITIES);

// The site-wide singleton (intro, links, SEO).
export const PROFILE_FIELDS = [
  { key: 'photo', label: 'Profile picture', type: 'image', group: 'Identity',
    help: 'Optional. Shown above your name in the rail. Leave empty and the rail starts with your name.' },
  { key: 'photoAlt', label: 'Profile picture description', type: 'text', group: 'Identity', help: 'For example “Aziz smiling, outdoors”.' },
  { key: 'avatarFallback', label: 'Show an illustration when there is no picture', type: 'checkbox', group: 'Identity',
    help: 'A drawn developer-at-a-laptop avatar. Untick to show no picture at all.' },
  { key: 'name', label: 'Name', type: 'text', required: true, group: 'Identity' },
  { key: 'role', label: 'Role', type: 'text', required: true, group: 'Identity' },
  { key: 'summary', label: 'One-line summary', type: 'textarea', max: 200, rows: 2, required: true, group: 'Identity',
    help: 'Shown under your name in the rail and used as the default meta description.' },
  { key: 'headline', label: 'Hero headline', type: 'lines', group: 'Intro', help: 'Two short lines. The second is highlighted.' },
  { key: 'about', label: 'About', type: 'paras', group: 'Intro', help: 'Separate paragraphs with a blank line.' },
  { key: 'status', label: 'Availability', type: 'text', group: 'Intro' },
  { key: 'location', label: 'Location', type: 'text', group: 'Intro', help: 'Helps search engines and AI answers place you. City and country is plenty.' },
  { key: 'email', label: 'Public email', type: 'email', group: 'Links' },
  { key: 'socials', label: 'Social links', type: 'pairs', group: 'Links', help: 'One per line: Label | https://…' },
  { key: 'resumeFile', label: 'Résumé (PDF)', type: 'pdf', group: 'Links',
    help: 'Upload your résumé. Visitors open it in a popup and can download it. Leave empty to hide the link.' },
  { key: 'resume', label: 'Résumé link (optional)', type: 'url', group: 'Links', help: 'Only used when no PDF is uploaded, for a résumé hosted elsewhere.' },
  { key: 'algomentorHandle', label: 'AlgoMentor public handle', type: 'text', max: 30, group: 'Problem solving',
    help: 'Shows your solved counts from AlgoMentor (turn on Settings → Public profile & API there, with the Stats widget). Leave empty to hide the section.' },
  { key: 'algomentorLink', label: '“View more” link', type: 'url', group: 'Problem solving',
    help: 'Where “View more on AlgoMentor” goes. Defaults to https://algomentor.abdul-aziz.dev' },
  { key: 'siteUrl', label: 'Public site URL', type: 'url', group: 'Search & sharing',
    help: 'Used for canonical links, the sitemap and structured data. Example: https://aziz.dev. The SITE_URL environment variable wins if set.' },
  { key: 'seoTitle', label: 'Home page title', type: 'text', max: 70, group: 'Search & sharing' },
  { key: 'seoDescription', label: 'Home page description', type: 'textarea', max: 170, rows: 3, group: 'Search & sharing' },
  { key: 'ogImage', label: 'Default share image', type: 'image', group: 'Search & sharing', help: '1200×630 works best.' },
  { key: 'ogImageAlt', label: 'Share image description', type: 'text', group: 'Search & sharing' },
  { key: 'indexable', label: 'Allow search engines and AI crawlers', type: 'checkbox', group: 'Search & sharing',
    help: 'Untick to ask crawlers to stay away (robots.txt and noindex).' },
  { key: 'accent', label: 'Accent colour', type: 'select', options: ['#7dd3a8', '#7cc4ff', '#f2b46d', '#c4a7ff'], optionLabels: ['Mint', 'Sky', 'Amber', 'Lilac'], group: 'Look' },
];

export function slugify(s) {
  return (
    String(s || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'untitled'
  );
}

const safeUrl = (v) => {
  if (!v) return '';
  if (v.startsWith('/') && !v.startsWith('//')) return v;
  try {
    const u = new URL(v);
    return ['http:', 'https:'].includes(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
};
const safeLink = (v) => (v.startsWith('mailto:') ? v : safeUrl(v));

/** Turn submitted form values into clean, typed data. Returns { data, errors }. */
export function coerce(fields, form) {
  const data = {};
  const errors = {};
  for (const f of fields) {
    const raw = form.get(f.key);
    const str = typeof raw === 'string' ? raw.replace(/\r\n/g, '\n') : '';
    let val;
    switch (f.type) {
      case 'checkbox':
        val = form.get(f.key) === 'on' || form.get(f.key) === '1';
        break;
      case 'lines':
        val = str.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 60);
        break;
      case 'paras':
        val = str.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean).slice(0, 20);
        break;
      case 'refs':
        val = [...new Set(form.getAll(f.key).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 20);
        break;
      case 'csv':
        val = [...new Set(str.split(/[,\n]/).map((s) => s.trim()).filter(Boolean))].slice(0, 40);
        break;
      case 'pairs': {
        val = [];
        for (const line of str.split('\n')) {
          const [label, ...rest] = line.split('|');
          const href = safeLink((rest.join('|') || '').trim());
          if (!label?.trim() && !rest.length) continue;
          if (!label?.trim() || href === null || !href) {
            errors[f.key] = 'Use one link per line in the form Label | https://example.com';
            break;
          }
          val.push({ label: label.trim().slice(0, 40), href });
        }
        break;
      }
      case 'url': {
        const u = safeUrl(str.trim());
        if (u === null) errors[f.key] = 'Enter a full web address starting with https://';
        val = u ?? '';
        break;
      }
      case 'email':
        val = str.trim();
        if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) errors[f.key] = 'Enter a valid email address.';
        break;
      case 'month':
        val = str.trim();
        if (val && !MONTH_RE.test(val)) errors[f.key] = 'Pick a month, or type it as YYYY-MM (for example 2025-06).';
        break;
      case 'date':
        val = str.trim();
        if (val && !/^\d{4}-\d{2}-\d{2}$/.test(val)) errors[f.key] = 'Use the date picker or YYYY-MM-DD.';
        break;
      case 'select':
        val = str.trim();
        if (val && !f.options.includes(val)) errors[f.key] = 'Pick one of the options.';
        break;
      case 'pdf':
        val = str.trim();
        if (val && !/^resume-[a-f0-9]{16}\.pdf$/.test(val)) errors[f.key] = 'Upload the PDF again.';
        break;
      case 'image':
        val = str.trim();
        if (val && !MEDIA_RE.test(val)) errors[f.key] = 'Upload the image again.';
        break;
      case 'markdown':
        val = str.trim().slice(0, 120_000);
        break;
      case 'textarea':
        val = str.trim().slice(0, f.max ?? 2000);
        break;
      default:
        val = str.trim().slice(0, f.max ?? 300);
    }
    const empty = Array.isArray(val) ? val.length === 0 : !val && val !== false;
    if (f.required && empty && f.type !== 'checkbox') errors[f.key] = `${f.label} is required.`;
    data[f.key] = val;
  }
  // An image without a description hurts accessibility and search; make it a clear error.
  if ('image' in data && data.image && !data.imageAlt) errors.imageAlt = 'Describe the image in a few words.';
  if ('algomentorHandle' in data) {
    data.algomentorHandle = data.algomentorHandle.toLowerCase();
    if (data.algomentorHandle && !/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/.test(data.algomentorHandle))
      errors.algomentorHandle = 'Use your AlgoMentor handle: 3–30 lowercase letters, digits or hyphens.';
  }
  // Timeline entries: the end can't come before the start; the period label is derived.
  if ('start' in data && 'end' in data) {
    if (data.start && data.end && !errors.start && !errors.end && data.end < data.start) errors.end = 'The end month is before the start month.';
    data.period = periodText(data.start, data.end);
  }
  if ('photo' in data && data.photo && !data.photoAlt) errors.photoAlt = 'Describe the picture in a few words.';
  return { data, errors };
}
