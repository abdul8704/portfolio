// First-run content. Everything in [square brackets] is a placeholder the dashboard will flag
// until you replace it from the admin panel.
export const PROFILE_DEFAULTS = {
  name: 'Aziz',
  role: 'Backend Developer',
  headline: ['I build the systems', 'behind the screen.'],
  summary: 'APIs, event-driven pipelines and the plumbing that keeps them reliable.',
  about: [
    "I'm Aziz, a backend developer who likes turning messy, event-heavy problems into small, observable systems. Day to day I work on contract lifecycle management tooling, where correctness and auditability matter as much as speed.",
    "Outside work I build side projects around webhooks, automation and multi-agent AI pipelines, and I'm writing up a computer-vision safety system as a research paper. I like first-principles explanations, so the blog is where I write things down.",
  ],
  status: 'Open to backend roles and interesting problems',
  location: '',
  email: '',
  socials: [
    { label: 'GitHub', href: 'https://github.com/your-handle' },
    { label: 'LinkedIn', href: 'https://linkedin.com/in/your-handle' },
  ],
  resume: '',
  resumeFile: '',
  siteUrl: '',
  seoTitle: '',
  seoDescription: '',
  photo: '',
  algomentorHandle: '',
  algomentorLink: '',
  avatarFallback: true,
  photoAlt: '',
  ogImage: '',
  ogImageAlt: '',
  indexable: true,
  accent: '#7dd3a8',
};

const caseStudy = (what) => `## The problem

[What was broken or missing, and for whom.]

## What I built

${what}

## How it works

[Walk through the design: components, data flow, the trade-offs you made and why.]

## Result

[Numbers if you have them: throughput, latency, cost, adoption.]
`;

export const SEED = {
  timeline: [
    { kind: 'work', start: '2025-11', end: '', period: 'Nov 2025 — Present', title: 'Backend Developer', org: '[Company name]',
      points: ['Build and evaluate contract lifecycle management (CLM) tooling.', '[Add a measurable outcome: latency, throughput, cost, reliability]'],
      tags: ['Java', 'REST APIs'] },
    { kind: 'work', start: '2025-06', end: '2025-08', period: 'Jun 2025 — Aug 2025', title: '[Backend Intern]', org: '[Company name]',
      points: ['[What you owned and what changed because of it]'], tags: [] },
    { kind: 'education', start: '2023-08', end: '2027-05', period: 'Aug 2023 — May 2027', title: '[B.Tech in Computer Science]', org: '[University name]',
      points: ['[CGPA, relevant coursework, thesis or notable activities]'], tags: [] },
  ],
  project: [
    { name: 'Event-driven automation platform', blurb: 'A Zapier/n8n-style backend where GitHub events trigger AI-powered workflows.',
      outcome: '[Add a result: events per second, workflows run, latency]', stack: ['Webhooks', 'Queues', 'Workflow engine'],
      source: 'https://github.com/your-handle/automation-platform', body: caseStudy('A webhook receiver, a durable queue and a small workflow engine that fans events out to AI steps.') },
    { name: 'Auto-docs GitHub App', blurb: 'Installs on a repo, ingests the code with installation tokens, generates docs and keeps them fresh with webhook-driven incremental updates.',
      outcome: '[Add a result: repos supported, update time vs full rebuild]', stack: ['GitHub Apps', 'Webhooks', 'Incremental pipeline'],
      source: 'https://github.com/your-handle/auto-docs', body: caseStudy('A GitHub App that rebuilds only the docs affected by each push.') },
    { name: 'Bench-press safety system', blurb: 'Computer-vision system that detects failed reps and barbell entrapment and alerts front-desk staff. Being written up as an IEEE research paper.',
      outcome: '[Add a result: detection accuracy, alert latency]', stack: ['Computer vision', 'Real-time alerts'],
      source: 'https://github.com/your-handle/bench-safety', body: caseStudy('A real-time pipeline from camera frames to a staff alert.') },
    { name: 'Prompt-quality evaluation pipeline', blurb: 'Multi-agent pipeline that scores prompt quality against LLM coding tools.',
      outcome: '[Add a result: prompts evaluated, agreement with human review]', stack: ['Multi-agent', 'LLM evals'],
      source: 'https://github.com/your-handle/prompt-evals', body: caseStudy('Several judging agents that score a prompt and reconcile their disagreements.') },
    { name: 'DSA progress aggregator', blurb: 'Pulls solved counts from CSES and other platforms into one analytics view.',
      outcome: '[Add a result]', stack: ['API aggregation', 'Analytics'],
      source: 'https://github.com/your-handle/dsa-aggregator', body: caseStudy('Scrapers and API clients that normalise progress into one schema.') },
  ],
  achievement: [
    { kind: 'Hackathon', year: '[2025]', title: '[Winner or finalist: project name]', event: '[Hackathon name]', note: '[One line on what you built and the result]', body: '[Tell the story: the team, the problem, the 24 hours, the result.]' },
    { kind: 'Hackathon', year: '[2024]', title: '[Result: project name]', event: '[Hackathon name]', note: '[One line on what you built]', body: '' },
    { kind: 'Symposium', year: '[2024]', title: '[Paper or project presentation]', event: '[Symposium name]', note: '[One line on the talk]', body: '' },
  ],
  certification: [
    { name: '[Certification name]', issuer: '[Issuer]', year: '[2025]', note: '[One line on what the certification covers]', href: '', credentialId: '', body: '' },
    { name: '[Certification name]', issuer: '[Issuer]', year: '[2024]', note: '[One line on what the certification covers]', href: '', credentialId: '', body: '' },
  ],
  skill: [
    { group: 'Languages', items: ['Java', 'Python', 'SQL'] },
    { group: 'Backend', items: ['REST APIs', 'Webhooks', 'Queues'] },
    { group: 'Data', items: ['PostgreSQL', 'Redis'] },
    { group: 'Infra', items: ['Docker', 'CI/CD'] },
    { group: 'AI', items: ['LLM pipelines', 'Evals'] },
  ],
  post: [
    { title: 'Welcome to the blog', description: 'What this space is for, and how I publish to it.', date: new Date().toISOString().slice(0, 10), tags: ['meta'],
      body: `This is where I write things down: backends, systems and AI pipelines, explained from first principles.

## How posts are written

Posts are written in Markdown from a private admin page that only I can sign in to. Drafts stay hidden until I publish them.

\`\`\`java
// Idempotent handler: the same key always returns the same result.
Response handle(String key, Request req) {
    return cache.computeIfAbsent(key, k -> process(req));
}
\`\`\`

Delete this post once you have written your own.
` },
  ],
};
