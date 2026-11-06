// Zero-dependency static site build. Usage: npm run build
// Optional environment: BASE_PATH (default "/") and SITE_URL (for canonical and social tags).
import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {assignSlugs, summarise, yearsOf} from '../src/model.js';
import {makeLayout} from '../src/site/layout.mjs';
import {makeContent} from '../src/site/content.mjs';
import {buildPages} from '../src/site/pages.mjs';

const root = new URL('../', import.meta.url);
const out = new URL('dist/', root);
const read = async file => JSON.parse(await readFile(new URL('data/' + file, root), 'utf8'));

let base = process.env.BASE_PATH || '/';
if (!base.startsWith('/')) base = '/' + base;
if (!base.endsWith('/')) base += '/';
const siteUrl = process.env.SITE_URL || '';

const [schools, sources, criteria, season, confirmedDates] = await Promise.all(
  ['schools.json', 'sources.json', 'criteria.json', 'season.json', 'key-dates.json'].map(read));
const years = yearsOf(schools);
const latest = years.at(-1);
const slugs = assignSlugs(schools);
const summaries = new Map(schools.map(s => [s.id, Object.fromEntries(years.map(y => [y, summarise(s, y)]))]));
const href = path => base + path.replace(/^\//, '');
const builtAt = new Date().toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London'});
const layout = makeLayout({base, siteUrl, builtAt});
const content = makeContent({intake: season.intake, confirmedDates, years});

await rm(out, {force: true, recursive: true});
await mkdir(out, {recursive: true});

const pages = buildPages({schools, sources, criteria, years, latest, slugs, summaries, href, base, layout, content});
for (const page of pages) {
  const file = page.file ? new URL(page.file, out) : new URL(page.path + 'index.html', out);
  await mkdir(new URL('./', file), {recursive: true});
  await writeFile(file, page.html);
}

for (const [from, to] of [
  ['src/assets/', 'assets/'],
  ['src/model.js', 'assets/model.js'],
  ['src/ui.js', 'assets/ui.js'],
  ['src/images/', 'images/'],
  ['src/static/', './'],
  ['data/', 'data/']
]) {
  await cp(new URL(from, root), new URL(to, out), {recursive: true});
}

// Setting slugs for client-side links.
await writeFile(new URL('data/slugs.json', out), JSON.stringify(Object.fromEntries(slugs)) + '\n');

const sitemapUrls = pages.filter(p => !p.file).map(p => p.path);
if (siteUrl) {
  const origin = siteUrl.replace(/\/$/, '');
  await writeFile(new URL('sitemap.xml', out), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map(p => `  <url><loc>${origin}${base}${p}</loc></url>`).join('\n')}\n</urlset>\n`);
  await writeFile(new URL('robots.txt', out), `User-agent: *\nAllow: /\nDisallow: ${base}data/\nSitemap: ${origin}${base}sitemap.xml\n`);
} else {
  await writeFile(new URL('robots.txt', out), `User-agent: *\nAllow: /\nDisallow: ${base}data/\n`);
}

console.log(`Built ${pages.length} pages for ${schools.length} settings (${years.join(', ')}), September ${season.intake} round${content.dates.confirmed ? '' : ' (expected dates)'}, in dist/`);
