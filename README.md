# Portfolio with a private admin

A fast, server-rendered portfolio (Astro) with an owner-only admin panel. Everything on the public site is editable from `/admin`: intro, core stack, timeline, projects, achievements, certifications and the blog.

## Run it

```bash
npm install
npm run setup        # asks for your admin email + password, writes .env
npm run build
npm start            # http://localhost:4321  ·  admin at /admin
```

Needs Node 22.13 or newer. For local development use `npm run dev`.

## Deploy

Any host that runs Node works (a VPS, Fly.io, Railway, Render). Two things must persist: the **`DATA_DIR` folder** (SQLite database + uploaded images) and your **environment variables**.

```bash
docker build -t portfolio .
docker run -d -p 4321:4321 -v portfolio-data:/data \
  -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD_HASH='…' -e SESSION_SECRET='…' \
  -e SITE_URL=https://yourdomain.com portfolio
```

`npm run setup` prints nothing secret to the screen; it writes `ADMIN_PASSWORD_HASH` and `SESSION_SECRET` into `.env` — copy those two lines into your host's environment settings. Put the site behind HTTPS (Caddy, Nginx, or your host's TLS) and set `TRUST_PROXY=1` when a proxy sits in front.

**Back up the data folder.** It is the whole site.

## What the admin can do

| Area | Actions |
| --- | --- |
| Projects, achievements, certifications | add, edit, delete (30-day trash), reorder, duplicate, draft/publish, thumbnail, case-study page in Markdown |
| Timeline (work + education) | add, edit, delete, reorder |
| Core stack (left rail) | add/remove groups and skills |
| Blog | write in Markdown with live preview, drafts, tags, cover image, paste/drop images |
| Intro & SEO | name, headline, about, links, location, share image, site URL, allow/deny crawlers, accent colour |
| Images | upload (auto-resized WebP, EXIF stripped), library, safe delete |
| Account | change password, see and revoke signed-in devices |

Shortcuts: `Ctrl/Cmd + S` saves. Unsaved edits are kept in your browser if the session expires.

## Security model

- One owner account. Password stored only as a scrypt hash in the environment (or your changed one in the database).
- Server-side sessions, `HttpOnly` + `SameSite=Strict` cookie, CSRF token on every admin write, origin checking, login rate limit (5 tries / 15 min per IP).
- Markdown cannot inject HTML or scripts; SVG uploads are refused; uploads are re-encoded.
- Strict security headers (CSP, frame denial, nosniff). `/admin` is `noindex`.

## SEO and GEO

Per page: title, meta description, canonical, Open Graph / Twitter cards, `robots` directives, and JSON-LD (`WebSite`, `Person`, `ProfilePage`, `SoftwareSourceCode`, `BlogPosting`, `EducationalOccupationalCredential`, `BreadcrumbList`). Site-wide: `/sitemap.xml` (with images), `/robots.txt` (welcomes search and AI crawlers by name), `/rss.xml`, `/llms.txt` and `/llms-full.txt` (a clean, citeable summary of everything for AI assistants). Semantic HTML, one `h1` per page, anchored headings, descriptive image alt text (enforced in the editor) and responsive WebP images with explicit dimensions.

Set **Public site URL** (Intro & SEO) or `SITE_URL` so canonical links and structured data use your real domain.

## Layout

```
src/lib/entities.js   every editable field, defined once (forms + validation + storage)
src/lib/store.js      SQLite content store · seed.js = first-run sample content
src/lib/auth.js       passwords, sessions, CSRF, rate limit
src/pages/admin/      the admin interface
src/pages/            public pages + sitemap/robots/rss/llms routes
```

To add a new editable field, add one line to `src/lib/entities.js`; the admin form and storage pick it up.
