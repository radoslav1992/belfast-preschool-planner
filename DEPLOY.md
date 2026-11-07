# Deploying Belfast Preschool Planner

The site is static: `npm run build` writes everything to `dist/`. It has no server code and no npm dependencies.

## 1. Cloudflare Workers (static assets)

The site runs as the Worker `belfast-preschool-planner` with static assets only, at https://belfastpreschoolplanner.com. `wrangler.jsonc` in the repository holds its configuration. The `name` there must match the Worker’s name in the dashboard.

Workers Builds settings (Worker → Settings → Build):

- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`
- **Non-production branch deploy command:** `npx wrangler versions upload`, which gives each pull request a preview
- Node.js comes from `.node-version` (22).

No variables are needed. An assets-only Worker cannot have runtime variables anyway. The public address comes from `homepage` in `package.json`, which the build uses for canonical URLs, social preview images, `sitemap.xml` and `robots.txt`.

From `dist/`, Cloudflare applies `_headers` (Content Security Policy, other security headers and cache times). Because of `"not_found_handling": "404-page"`, it serves `404.html` with a 404 status for unknown paths. Addresses without a trailing slash redirect to the slash version. Every push to `main` deploys, including commits from the refresh workflow.

`www.belfastpreschoolplanner.com` does not answer at the moment. To make it work, add it under the Worker’s **Domains** tab, or redirect it to the main domain with a redirect rule. Canonical tags already point search engines at the main domain.

To check a build locally in Cloudflare’s runtime: `npm run build && npx wrangler dev`.

## 2. Automatic data refresh

`.github/workflows/refresh-data.yml` runs every Monday, daily in May and June, and on 1 July. See the README’s “Automatic updates” section for what each run does.

The Education Authority site blocks GitHub-hosted runners, so run the job on a machine it accepts:

1. On that machine, check access. It should print `200`:
   ```sh
   curl -sS -o /dev/null -w "%{http_code}\n" https://www.eani.org.uk/parents/pupil-applications-and-grants/admissions/admissions-support
   ```
   If it prints `403`, that network is blocked too. Use the offline import instead (step 4).
2. Go to **Settings → Actions → Runners → New self-hosted runner**, choose the machine’s OS and run the commands shown in a new folder. Then install it as a service so it survives restarts:
   ```sh
   ./svc.sh install && ./svc.sh start
   ```
3. Go to **Settings → Secrets and variables → Actions → Variables** and add `IMPORT_RUNNER` = `self-hosted`. Then go to **Actions → Refresh admissions data → Run workflow** to test it.
4. Offline fallback: download the workbooks in a browser, then run `python3 scripts/import_data.py --from-dir <folder>`, `npm test` and `npm run build`, and commit `data/`.

A failed run publishes nothing. It opens or updates the issue “Automatic data refresh failed”, which closes itself after the next successful run.

## 3. Release checklist

- [ ] Merge the release pull request and wait for **CI** to pass on `main`.
- [ ] Confirm the Workers Builds check on the pull request passes and its preview looks right.
- [ ] Smoke test the live site: home, `/settings/`, a setting page, `/planner/` (add, reorder, share link, CSV), `/insights/`, `/guide/` and a missing URL (the 404 page).
- [ ] Check the headers: `curl -sI https://belfastpreschoolplanner.com/ | grep -i content-security-policy`.
- [ ] Set up the self-hosted runner and run **Refresh admissions data** once.
- [ ] Tag the release: `git tag -a v1.0.0 -m "Belfast Preschool Planner 1.0.0" && git push origin v1.0.0`, then create a GitHub release from the tag using the `CHANGELOG.md` entry.

## 4. Optional yearly additions

These are not needed for the site to stay correct:

- `data/key-dates.json`: add the confirmed criteria and Stage 1 dates for the coming intake to replace the “expected” dates.
- `data/criteria.json`: add or update criteria summaries. Each is labelled with the year it describes.
