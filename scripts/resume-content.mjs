// Portfolio content taken from the October 2026 résumé and the AlgoMentor
// architecture notes. `npm run load-resume` writes it into the database.
// After that, edit everything from /admin; this file is only the starting point.

export const PROFILE = {
  name: 'Abdul Aziz M A',
  role: 'Backend Developer',
  summary: 'CS undergrad building backend systems: APIs, async job pipelines and cloud deployments.',
  about: [
    "I'm Abdul Aziz, a Computer Science undergraduate at St. Joseph's Institute of Technology (class of 2027) with hands-on experience building, deploying and maintaining backend systems.",
    'Most of my work is API development, asynchronous job processing, database design and cloud deployment. I have solved 770+ problems on LeetCode, and I built AlgoMentor to track that practice across platforms.',
  ],
  email: 'abdulaziz87047@gmail.com',
  socials: [
    { label: 'GitHub', href: 'https://github.com/abdul8704' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/abdulaziz120/' },
    { label: 'Codolio', href: 'https://codolio.com/profile/abdul_01' },
  ],
  resume: '/resume.pdf',
  algomentorLink: 'https://algomentor.abdul-aziz.dev',
};

export const ITEMS = {
  timeline: [
    { kind: 'work', start: '2025-06', end: '2025-08', title: 'Full Stack Intern', org: 'Zuntra Digital',
      points: [
        'Developed an internal HR Management System to streamline employee operations across multiple workflows.',
        'Designed MongoDB schemas with Mongoose and implemented backend workflow logic across four core services.',
        'Implemented JWT authentication and role-based access control (RBAC) for protected APIs and role-specific operations.',
      ],
      tags: ['Node.js', 'Express.js', 'MongoDB', 'Mongoose', 'JWT', 'RBAC'] },
    { kind: 'education', start: '2023-08', end: '2027-05', title: 'B.E. Computer Science and Engineering', org: "St. Joseph's Institute of Technology",
      points: ['CGPA 8.64 / 10'], tags: [] },
    { kind: 'education', start: '2021-06', end: '2023-03', title: '12th Grade', org: "St. John's English School and Junior College",
      points: ['Scored 87.6%'], tags: [] },
  ],

  project: [
    { name: 'AutoDocs',
      blurb: 'An AI-powered GitHub App that watches repository changes through webhooks and opens pull requests that keep the documentation up to date.',
      outcome: '',
      stack: ['Node.js', 'Express.js', 'PostgreSQL', 'Prisma', 'BullMQ', 'GitHub Apps', 'Docker', 'Gemini'],
      source: 'https://github.com/abdul8704/AutoDocs',
      demo: 'https://autodocs.abdul-aziz.dev/',
      body: `## What it does

AutoDocs is a GitHub App. Once it is installed on a repository, it listens for changes, works out which parts of the documentation they affect, and proposes the updates as a pull request.

## How it works

- **Webhooks in, verified.** Every GitHub webhook is checked with an HMAC-SHA256 signature before anything else runs.
- **Asynchronous pipeline.** Accepted events go onto a BullMQ queue. Workers process the repository, classify each change and generate the documentation update, so the webhook endpoint stays fast.
- **Pluggable LLM layer.** Model providers sit behind Factory and Strategy patterns, so provider-specific code stays out of the application logic.
- **Prompt caching.** Static codebase context is cached with Google GenAI prompt caching, which cuts repeated token usage.
- **State and deployment.** PostgreSQL with Prisma keeps the workflow state; Docker makes the whole thing reproducible to deploy.
` },
    { name: 'AlgoMentor',
      blurb: 'A DSA tracking and mentorship platform that combines LeetCode, Codeforces and AtCoder data into one dashboard, with mentor workflows on top.',
      outcome: '',
      stack: ['Next.js', 'React', 'TypeScript', 'Supabase', 'PostgreSQL', 'Express.js', 'Docker', 'AWS EC2', 'AWS S3', 'GitHub Actions'],
      source: 'https://github.com/abdul8704/dsa-mentor-worker',
      demo: 'https://algomentor.abdul-aziz.dev/',
      body: `## What it does

AlgoMentor pulls a student's progress from LeetCode, Codeforces and AtCoder into one place: solved counts by difficulty, a daily activity heatmap, streaks, contest rating history and topic gap analysis. On top of that, mentors can manage a roster of mentees, organise them into groups, assign problems and leave notes.

## How it works

- **One data model for every judge.** A backend normalises each platform's data (LeetCode GraphQL, the Codeforces API, AtCoder via Kenkoooo) into shared tables for solved problems, daily counts, streaks and contests.
- **Background sync.** A Dockerized worker on AWS EC2, deployed through GitHub Actions CI/CD, refreshes every user's data on a schedule.
- **Resilient fetching.** Retries and rate-limit handling for HTTP 429 and 503 responses keep the sync going when an external API pushes back.
- **Mentorship workflows.** Email invitations, mentee groups, batch problem assignments and automatic completion checks against the mentee's real solve history.
- **App stack.** Next.js 16 App Router with React 19 and TypeScript, Server Components and Server Actions, Supabase for PostgreSQL, auth and row-level security, and S3 for avatars.
- **Public API.** A read-only API lets other sites, like this portfolio, show a user's stats.
` },
  ],

  achievement: [
    { kind: 'Other', year: '', title: '770+ problems solved on LeetCode', event: 'LeetCode',
      note: 'Consistent DSA practice on LeetCode, alongside Codeforces, AtCoder and CSES.', body: '' },
    { kind: 'Other', year: '2025', title: "1st Place, Innothon '25 CodeArena", event: "CodeArena: Innothon '25 Debugging Competition",
      note: "Won first place in the CodeArena debugging competition at Innothon '25.", body: '' },
    { kind: 'Hackathon', year: '', title: '1st Place, Blaze-A-Trial', event: 'Blaze-A-Trial Hackathon',
      note: 'Won first place at the Blaze-A-Trial Hackathon.', body: '' },
    { kind: 'Hackathon', year: '', title: '3rd Place, Innovation Software Hackathon', event: 'Innovation Software Hackathon',
      note: 'Placed third at the Innovation Software Hackathon.', body: '' },
  ],

  certification: [
    { name: 'Introduction to Git and GitHub', issuer: 'Google', year: '',
      note: 'Version control with Git and collaborating on code through GitHub.', href: '', credentialId: '', body: '' },
    { name: 'Data Structures and Algorithms Using Java', issuer: 'NPTEL', year: '',
      note: 'Core data structures and algorithms, implemented in Java.', href: '', credentialId: '', body: '' },
    { name: 'Database Management Systems', issuer: 'NPTEL', year: '',
      note: 'Relational database design, SQL and how database systems work.', href: '', credentialId: '', body: '' },
  ],

  skill: [
    { group: 'Languages', items: ['Java', 'JavaScript', 'TypeScript', 'Python'] },
    { group: 'Backend', items: ['Node.js', 'Express.js', 'REST APIs', 'Webhooks', 'BullMQ', 'Asynchronous processing'] },
    { group: 'Databases', items: ['PostgreSQL', 'MongoDB', 'Prisma', 'Supabase'] },
    { group: 'Cloud & DevOps', items: ['Docker', 'AWS EC2', 'GitHub Actions', 'Nginx', 'CI/CD'] },
    { group: 'Core CS', items: ['Data Structures and Algorithms', 'OOP', 'DBMS', 'Operating Systems', 'Computer Networks'] },
    { group: 'Design', items: ['Factory pattern', 'Strategy pattern', 'Modular architecture', 'API design'] },
  ],
};
