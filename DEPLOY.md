# Deploying Belfast Preschool Planner

The site is static: `npm run build` writes everything to `dist/`. It has no runtime server and no npm dependencies.

## 1. Cloudflare Pages

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git** and choose `radoslav1992/belfast-preschool-planner`.
2. Build settings:
   - **Framework preset:** None
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - Node.js comes from `.node-version` (22).
3. **Environment variables (production):**
   - `SITE_URL`: the public address, e.g. `https://belfast.example.org`. It turns on canonical URLs, social preview images, `sitemap.xml` and the `Sitemap:` line in `robots.txt`.
   - `BASE_PATH`: only if the site is served under a sub-path. The default is `/`.
4. Optional: add a custom domain under **Custom domains**.

Cloudflare Pages applies `dist/_headers`, which sets the Content Security Policy, other security headers and cache times. It serves `dist/404.html` for unknown paths. Every push to `main` deploys automatically, including commits from the refresh workflow.

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
- [ ] Set `SITE_URL` in Cloudflare Pages and redeploy.
- [ ] Smoke test the live site: home, `/settings/`, a setting page, `/planner/` (add, reorder, share link, CSV), `/insights/`, `/guide/` and a missing URL (the 404 page).
- [ ] Check the headers: `curl -sI https://<your-domain>/ | grep -i content-security-policy`.
- [ ] Set up the self-hosted runner and run **Refresh admissions data** once.
- [ ] Tag the release: `git tag -a v1.0.0 -m "Belfast Preschool Planner 1.0.0" && git push origin v1.0.0`, then create a GitHub release from the tag using the `CHANGELOG.md` entry.

## 4. Optional yearly additions

These are not needed for the site to stay correct:

- `data/key-dates.json`: add the confirmed criteria and Stage 1 dates for the coming intake to replace the “expected” dates.
- `data/criteria.json`: add or update criteria summaries. Each is labelled with the year it describes.
