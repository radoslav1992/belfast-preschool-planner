import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assignSlugs, summarise, yearsOf} from '../src/model.js';
import {makeLayout} from '../src/site/layout.mjs';
import {makeContent} from '../src/site/content.mjs';
import {buildPages} from '../src/site/pages.mjs';

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const [schools, sources, criteria, season, confirmedDates, fixture] = await Promise.all(
  ['../data/schools.json', '../data/sources.json', '../data/criteria.json', '../data/season.json', '../data/key-dates.json', './fixtures/schools.json'].map(read));

function build(list, intake, dates = confirmedDates) {
  const years = yearsOf(list);
  const base = '/';
  const slugs = assignSlugs(list);
  const summaries = new Map(list.map(s => [s.id, Object.fromEntries(years.map(y => [y, summarise(s, y)]))]));
  const pages = buildPages({schools: list, sources, criteria, years, latest: years.at(-1), slugs, summaries, base,
    href: path => base + path.replace(/^\//, ''), layout: makeLayout({base, siteUrl: 'https://example.org', builtAt: 'today'}),
    content: makeContent({intake, confirmedDates: dates, years})});
  return {pages, slugs, paths: new Set(pages.map(p => p.file || p.path))};
}

// Structure is checked on the live data, whatever the latest import contains.
const live = build(schools, season.intake);

test('builds a page for every setting and area', () => {
  for (const slug of live.slugs.values()) assert.ok(live.paths.has('settings/' + slug + '/'));
  assert.ok([...live.paths].filter(p => p.startsWith('areas/')).length >= 4);
  for (const p of ['', 'settings/', 'planner/', 'insights/', 'guide/', 'faq/', 'about/', '404.html']) assert.ok(live.paths.has(p), p);
});

test('pages contain no template leftovers and valid structured data', () => {
  for (const page of live.pages) {
    assert.doesNotMatch(page.html, /undefined|NaN|\[object Object\]|\{base\}/, page.path);
    assert.equal((page.html.match(/<h1[\s>]/g) || []).length, 1, page.path + ' has one h1');
    for (const [, json] of page.html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) JSON.parse(json);
  }
});

test('internal links point at generated pages or assets', () => {
  const assets = /^(assets|images|data)\/|^favicon\.svg$/;
  for (const page of live.pages) {
    for (const [, href] of page.html.matchAll(/href="\/([^"#?]*)/g)) {
      assert.ok(live.paths.has(href) || assets.test(href), `${page.path} links to missing /${href}`);
    }
  }
});

test('setting pages explain the latest intake', () => {
  const {pages} = build(fixture, 2027);
  const botanic = pages.find(p => p.path === 'settings/botanic-ps-nu-belfast/').html;
  assert.match(botanic, /19 target-age children listed Botanic PS NU \(Belfast\) as their first choice/);
  assert.match(botanic, /In 2026\/27, this setting gave priority to children who listed it as their first preference/);
  assert.match(botanic, /data-add="1016499"/);
  assert.match(botanic, /Criteria for September 2027 are due on 9 December 2026/);
});

test('a later season shows no stale dates before anyone confirms new ones', () => {
  const {pages} = build(fixture, 2028, {});
  for (const page of pages) {
    assert.doesNotMatch(page.html, /September 2027|6 January 2027|9 December 2026/, page.path);
    assert.doesNotMatch(page.html, /undefined|NaN/, page.path);
  }
  const home = pages.find(p => p.path === '').html;
  assert.match(home, /SEPTEMBER 2028 ENTRY/);
  assert.match(home, /Early January 2028 \(expected\)/);
});
