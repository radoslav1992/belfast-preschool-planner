# Changelog

## 1.0.0 (2026-11-06)

First public release: a multi-page site for families planning a funded preschool place in Belfast.

### Site
- New design shared with Shansometar, including its children’s illustration.
- Home page with setting search, an age group checker, key dates for the next round with the next step highlighted, and a city-wide snapshot.
- Directory of all 103 Belfast settings. Filter by name, area, type, outcome, intake and underage places, and sort by demand, places left or size. Filters stay in the URL.
- A page for every setting: a plain-English summary of the latest intake, three-intake chart, full figures by preference and age group, criteria summary where available, and nearby settings with places left.
- Area pages, demand insights, a guide to the admissions process, FAQ and an About the data page with source checksums.
- Planner: rank up to eight settings, with notes and a checklist for each. It checks your list, compares settings side by side and shares a link containing setting IDs only. It also downloads a CSV and prints. Everything stays in the browser.

### Data and automation
- Scheduled refresh workflow that imports new Education Authority workbooks, tests, builds and publishes, with no manual step. Failures publish nothing and open an issue that closes itself after the next success.
- The site rolls over to the next application round each July. Without confirmed key dates, it shows the usual pattern marked “expected”.
- Download errors explain when the Education Authority site blocks a machine. The `IMPORT_RUNNER` variable runs the refresh on a self-hosted runner.

### Quality
- Accessibility: axe-core reports no WCAG 2.2 AA or best-practice violations on any page type, at desktop or phone width. Scrolling tables are keyboard reachable.
- Security headers via `_headers`: a strict Content Security Policy with scripts from the site only, no framing, no referrer leaks and a locked-down Permissions-Policy. Every feature was tested under the policy.
- CI runs the Python and Node tests and a full build on every pull request.

### Hosting
- Served from https://belfastpreschoolplanner.com on Cloudflare Workers static assets. `wrangler.jsonc` names the Worker, points at `dist/` and serves the 404 page for unknown paths. Preview builds for pull requests no longer fail for want of an assets directory.
- Canonical URLs, social preview images and `sitemap.xml` use the domain from `package.json`.

### Known limitations
- The Education Authority site blocks GitHub-hosted runners, so the automatic refresh needs a self-hosted runner (see `DEPLOY.md`).
- Criteria summaries exist for two settings and describe 2026/27 rules.
