import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assignSlugs, summarise, yearsOf} from '../src/model.js';
import {makeLayout} from '../src/site/layout.mjs';
import {buildPages} from '../src/site/pages.mjs';

const read = async file => JSON.parse(await readFile(new URL('../data/' + file, import.meta.url), 'utf8'));
const [schools, sources, criteria] = await Promise.all(['schools.json', 'sources.json', 'criteria.json'].map(read));
const years = yearsOf(schools);
const base = '/';
const slugs = assignSlugs(schools);
const summaries = new Map(schools.map(s => [s.id, Object.fromEntries(years.map(y => [y, summarise(s, y)]))]));
const pages = buildPages({schools, sources, criteria, years, latest: years.at(-1), slugs, summaries, base,
  href: path => base + path.replace(/^\//, ''), layout: makeLayout({base, siteUrl: 'https://example.org', builtAt: 'today'})});
const paths = new Set(pages.map(p => p.file || p.path));

test('builds a page for every setting and area', () => {
  for (const id of slugs.keys()) assert.ok(paths.has('settings/' + slugs.get(id) + '/'));
  for (const area of new Set(schools.map(s => s.area))) assert.ok([...paths].some(p => p.startsWith('areas/') && p.length > 7), area);
  for (const p of ['', 'settings/', 'planner/', 'insights/', 'guide/', 'faq/', 'about/', '404.html']) assert.ok(paths.has(p), p);
});

test('pages contain no template leftovers and valid structured data', () => {
  for (const page of pages) {
    assert.doesNotMatch(page.html, /undefined|NaN|\[object Object\]|\{base\}/, page.path);
    assert.equal((page.html.match(/<h1[\s>]/g) || []).length, 1, page.path + ' has one h1');
    for (const [, json] of page.html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) JSON.parse(json);
  }
});

test('internal links point at generated pages or assets', () => {
  const assets = /^(assets|images|data)\/|^favicon\.svg$/;
  for (const page of pages) {
    for (const [, href] of page.html.matchAll(/href="\/([^"#?]*)/g)) {
      assert.ok(paths.has(href) || assets.test(href), `${page.path} links to missing /${href}`);
    }
  }
});

test('setting pages explain the latest intake', () => {
  const botanic = pages.find(p => p.path === 'settings/botanic-ps-nu-belfast/').html;
  assert.match(botanic, /19 target-age children listed Botanic PS NU \(Belfast\) as their first choice/);
  assert.match(botanic, /gave priority to children who listed it as their first preference/);
  assert.match(botanic, /data-add="1016499"/);
});
