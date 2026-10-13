# Portfolio with a private admin

A fast, server-rendered portfolio (Astro) with an owner-only admin panel. Everything on the public site is editable from `/admin`: intro, core stack, timeline, projects, achievements, certifications and the blog.

## Run it

```bash
npm install
npm run db:up        # starts Postgres + Redis in Docker (or point .env at your own)
npm run setup        # asks for your admin email + password, writes .env
npm run build
npm start            # http://localhost:4321  ·  admin at /admin
```

Needs Node 22.13 or newer, Postgres 13+ and (recommended) Redis 6+. Copy `DATABASE_URL` and `REDIS_URL` from `.env.example` into `.env`. Tables are created automatically on first start. For local development use `npm run dev`.

**Coming from the SQLite version?** Run `npm run sqlite-to-postgres` once. It copies `data/portfolio.db` (content, settings, image list, analytics) into Postgres. If you already started the site on Postgres, it has sample content; use `npm run sqlite-to-postgres -- --replace`.

### Where data lives

- **Postgres:** everything that must not be lost: content, profile, admin password changes, sessions, the image list and daily analytics totals.
- **Redis:** things that can be rebuilt: the cache of published pages' data (cleared on every admin save), the AlgoMentor stats cache, login and visit rate limits, and the "already counted today" markers for analytics. If Redis goes down the site keeps working straight from Postgres.
- **S3 or `DATA_DIR/uploads`:** the image files.

## Deploy

Any host that runs Node works (a VPS, Fly.io, Railway, Render). It needs a Postgres database (on AWS: RDS), ideally a Redis (ElastiCache, or Redis on the same box), image storage (S3, or a persistent `DATA_DIR`) and your **environment variables**.

```bash
docker build -t portfolio .
docker run -d -p 4321:4321 -v portfolio-data:/data \
  -e DATABASE_URL='postgres://…' -e REDIS_URL='redis://…' \
  -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD_HASH='…' -e SESSION_SECRET='…' \
  -e SITE_URL=https://yourdomain.com portfolio
```

`npm run setup` prints nothing secret to the screen; it writes `ADMIN_PASSWORD_HASH` and `SESSION_SECRET` into `.env` — copy those two lines into your host's environment settings. Put the site behind HTTPS (Caddy, Nginx, or your host's TLS) and set `TRUST_PROXY=1` when a proxy sits in front.

**Back up Postgres** (RDS automated backups, or `pg_dump`). It is the whole site, apart from images.

### Images in S3

Set `S3_BUCKET` and `AWS_REGION` and uploads go to S3 under `S3_PREFIX` (default `portfolio/media/`) instead of `DATA_DIR/uploads`. The bucket can stay private: the site streams images through `/media/…`, so links in your content don't change. On EC2, attach an IAM role to the instance with `s3:PutObject`, `s3:GetObject` and `s3:DeleteObject` on `arn:aws:s3:::<bucket>/portfolio/media/*`; no access keys needed. Already have uploads? Run `npm run media-to-s3` once to copy them. With images in S3 and the database in Postgres, the server itself holds nothing you need to keep.

### Analytics

The admin's Analytics page counts page views, unique visitors, résumé opens, outbound link clicks and referrers. The site stores daily totals only (table `hits` in Postgres; the per-day visitor markers live in Redis and expire after two days): no cookies, no IP addresses, bots and your own signed-in visits skipped. Days roll over in `ANALYTICS_TZ` (default `Asia/Kolkata`). Behind a proxy or load balancer, set `TRUST_PROXY=1` so visitors are told apart by their real address.

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
src/lib/store.js      Postgres content store (db.js = pool + schema, cache.js = Redis) · seed.js = first-run sample content
src/lib/auth.js       passwords, sessions, CSRF, rate limit
src/pages/admin/      the admin interface
src/pages/            public pages + sitemap/robots/rss/llms routes
```

To add a new editable field, add one line to `src/lib/entities.js`; the admin form and storage pick it up.
