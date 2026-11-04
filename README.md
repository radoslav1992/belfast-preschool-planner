# Belfast Preschool Planner

A static, browser-local shortlist for families comparing funded preschool settings in Belfast. The directory covers all 103 settings recorded under Belfast City Council in the Education Authority's September 2026 intake workbook. It includes aggregate admissions history for 2024/25, 2025/26 and 2026/27, with age groups, programmes and preference ranks kept separate.

## Run locally

Requires Node.js 20 or newer. The site has no npm dependencies.

```sh
npm test
npm run build
python3 -m http.server 8080 --directory dist
```

Open http://localhost:8080. For a static host such as Cloudflare Pages, use `npm run build` and output directory `dist`.

## Features

- Search by name and filter by constituency.
- Add, reorder and compare up to five settings. The shortlist is stored on the user's device.
- Inspect reported applications and allocations by intake, preference rank and age group.
- Read manually reviewed 2026/27 criteria for Botanic and McArthur, including Botanic's first-preference rule. For other settings, use the official directory. All rules need review for the next intake.

## Reproduce the data

```sh
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python scripts/import_data.py
npm test && npm run build
```

The importer reads four official workbooks listed in [the source manifest](data/sources.json). For offline imports pass `--from-dir /path/to/downloads` with the original workbook filenames. It uses the 2026/27 council field to select settings and matches prior years by DENI school number. Older full-time and part-time rows with the same identifier are preserved. Past settings absent from the 2026/27 cohort are outside the directory.

The five values in each applications or allocated array represent first, second, third, other and total. Missing cohort rows stay missing. Counts come from the end of Stage 2, exclude later changes, and cannot be read as live capacity or personal odds. School criteria PDFs can report totals for different time periods or populations. Do not combine the PDF totals with the workbook counts. The 2027 criteria are scheduled for publication on 9 December 2026. Dates and rule summaries are maintained manually.

[Education Authority source workbooks](https://www.eani.org.uk/parents/pupil-applications-and-grants/admissions/admissions-support) · [Official dates](https://www.eani.org.uk/parents/pupil-applications-and-grants/admissions/admissions-key-dates) · [Official school directory](https://www.eani.org.uk/find-a-school)

## Research and further markets

See [market research](RESEARCH.md) for the Shansometar comparison and US and UK alternatives. This repository contains the Belfast implementation. It uses aggregate public admissions data and contains no Sofia applicant records.
