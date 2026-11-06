# Belfast Preschool Planner

A static, browser-local planning site for families applying for funded preschool places in Belfast. It covers all 103 settings recorded under Belfast City Council in the Education Authority's September 2026 intake workbook, with aggregate admissions history for 2024/25, 2025/26 and 2026/27. Age groups, programmes and preference ranks are kept separate.

The design follows [Shansometar](https://github.com/radoslav1992/shansometar): warm ivory paper, deep teal, sunshine yellow, and the same children's illustration (see `src/images/`, originally documented in Shansometar's `docs/design-assets.md`).

## Run locally

Requires Node.js 20 or newer. The site has no npm dependencies.

```sh
npm test
npm run build
python3 -m http.server 8080 --directory dist
```

Open http://localhost:8080. For a static host such as Cloudflare Pages, use `npm run build` and output directory `dist`. Optional build settings:

- `SITE_URL=https://example.org` adds canonical URLs, social image tags and `sitemap.xml`.
- `BASE_PATH=/belfast/` builds for hosting under a sub-path (default `/`).

## Pages and features

- **Home**: search by name or area, an age group checker, the September 2027 key dates with the next step highlighted, a city-wide snapshot and settings by area.
- **Settings directory** (`/settings/`): filter by name, area, type, outcome (oversubscribed, filled, places left), intake and whether underage children were placed. Sort by demand, places left or size. Filters are kept in the URL so a filtered view can be shared.
- **A page for every setting** (`/settings/{name}/`): a plain-English summary of the latest intake, key figures, a three-intake chart, full figures by preference and age group, the criteria summary where one exists, a pre-ranking checklist and nearby settings that had places left.
- **Area pages** (`/areas/{constituency}/`): totals, outcome split and places left for each constituency.
- **Planner** (`/planner/`): rank up to eight settings, reorder them, keep notes and a checklist for each, and get a list check. It warns about single choices, all-oversubscribed lists, first-preference criteria ranked below first, and underage applications. It also suggests nearby settings with places left. Compare side by side in any intake and drill into figures by age group and preference. Copy a share link (setting IDs only), download a CSV or print. The child's date of birth, notes and list stay in the browser.
- **Insights** (`/insights/`): outcome split, demand by area and type of setting, the highest-demand settings, the most places left and the biggest changes since 2024/25.
- **Guide**, **FAQ** and **About the data**: age groups, dates, criteria, Stage 1 and Stage 2, what to do without a place, definitions, sources with checksums, and the figures' limits.

### How the figures are summarised

`src/model.js` holds the shared logic. Places are summed across programmes, and places left are worked out per programme across both age groups, never below zero. The outcome labels describe target-age children at the end of Stage 2:

- **Oversubscribed**: some first-choice applicants were not placed there.
- **Filled**: every first choice was placed but no places were left.
- **Places left**: places remained unfilled.

The age checker uses the Northern Ireland 2 July to 1 July windows. Target age for September *Y* means born 2 July *Y−4* to 1 July *Y−3*. Underage is the following year.

## Project structure

```
src/model.js          Pure data helpers shared by build, browser and tests
src/ui.js             HTML string templates and SVG charts shared by build and browser
src/site/             Page layout, page templates and hand-maintained content (dates, FAQ)
src/assets/           Stylesheet and browser modules (app, store, directory, planner, insights)
src/images/, static/  Illustration, favicon and Cloudflare Pages headers
scripts/build.mjs     Zero-dependency static site generator
data/                 Imported Education Authority data and criteria summaries
```

Text that depends on the application round lives in `src/site/content.mjs` and is generated from `data/season.json`, so nothing needs editing each year.

## Automatic updates

`.github/workflows/refresh-data.yml` keeps the site current with no manual steps. It runs every Monday, daily through May and June (when the end-of-Stage-2 workbooks appear) and on 1 July. Each run:

1. moves `data/season.json` on to the next September intake each July (`node scripts/season.mjs`);
2. runs the importer, which finds and downloads any new Education Authority workbooks and profile links;
3. runs the Python and Node tests and builds the site;
4. commits `data/` to the default branch only when something changed and every check passed. Cloudflare Pages, connected to the repository, deploys each push.

If any step fails, nothing is published and the site keeps its last good data. The workflow opens an issue titled “Automatic data refresh failed”, comments on it for repeat failures and closes it after the next successful run. The importer stops deliberately when a workbook changes layout or name, a publication is missing or a previously matched profile link disappears, because publishing unchecked figures would be worse than keeping last year’s.

Key dates come from `data/key-dates.json` when confirmed dates are listed for the intake. Otherwise the site shows the usual pattern marked “expected” (criteria in December, Stage 1 in January) and links to the official timetable, so it never shows the previous year’s dates. Adding the official dates there is optional.

The Education Authority site is behind Cloudflare bot protection. If it blocks GitHub’s hosted runners, the run fails and opens an issue. Set the repository variable `IMPORT_RUNNER` (for example to `self-hosted`) to run the same job on your own machine, as Shansometar does.

Tests that check exact values use the frozen fixture in `tests/fixtures/`. Tests on `data/` check invariants only, such as unique IDs, totals that reconcile and a plausible setting count, so a new intake does not break them.

## Reproduce the data

```sh
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python scripts/import_data.py
python3 -m unittest discover -s tests -p 'test_*.py'
npm test && npm run build
```

The online importer requires Python 3.10+, curl and openpyxl. It discovers preschool preference workbooks on the official EA Admissions Support page, downloads the data and reads the EA sitemap for published preschool profiles. Requests are spaced at least ten seconds apart. Each manifest entry records the intake, published snapshot date, exact source URL and SHA-256 of the downloaded workbook. A missing publication, duplicate intake/cohort or incompatible layout stops the import for review before replacing the snapshot. Compatible combined releases populate the intake selector automatically.

For an offline rebuild, pass `--from-dir /path/to/downloads` with the original workbook filenames. Optionally include snapshots of the admissions page and sitemap named `support` and `sitemap`. Without them the importer reuses the checked-in manifest and existing profile links.

The most recent workbook’s council field selects settings. Prior years are matched by DENI school number. Profile URLs use exact normalized school names in the EA preschool sitemap, with two DE-number-verified aliases for changed titles. Unmatched new settings have no profile link until reviewed. Older full-time and part-time rows with the same identifier are preserved. Past settings absent from the 2026/27 cohort are outside the directory.

The five values in each applications or allocated array represent first, second, third, other and total. Missing cohort rows stay missing. Counts come from the end of Stage 2, exclude later changes, and cannot be read as live capacity or personal odds. School criteria PDFs can report totals for different time periods or populations. Do not combine the PDF totals with the workbook counts. Confirmed key dates (`data/key-dates.json`) and the criteria summaries (`data/criteria.json`) are optional manual additions; criteria summaries are labelled with the year they describe.

[Education Authority source workbooks](https://www.eani.org.uk/parents/pupil-applications-and-grants/admissions/admissions-support) · [Official dates](https://www.eani.org.uk/parents/pupil-applications-and-grants/admissions/admissions-key-dates) · [Official school directory](https://www.eani.org.uk/find-a-school)

## Research and further markets

See [market research](RESEARCH.md) for the Shansometar comparison and US and UK alternatives. This repository contains the Belfast implementation. It uses aggregate public admissions data and contains no Sofia applicant records.
