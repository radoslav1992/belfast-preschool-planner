import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {summarise, describe, aggregate, ageGroup, listCheck, toCSV, encodeList, decodeList, assignSlugs, slugify, yearsOf, searchSchools}
  from '../src/model.js';

const read = async file => JSON.parse(await readFile(new URL('../data/' + file, import.meta.url), 'utf8'));
const schools = await read('schools.json');
const criteria = await read('criteria.json');
const byId = new Map(schools.map(s => [s.id, s]));

test('summarise adds programmes and shares places across age groups', () => {
  const botanic = summarise(byId.get('1016499'), '2026/27');
  assert.equal(botanic.places, 26);
  assert.equal(botanic.firstChoice, 19);
  assert.equal(botanic.firstChoiceMissed, 0);
  assert.equal(botanic.placedBeyondFirst, 4);
  assert.equal(botanic.underagePlaced, 3);
  assert.equal(botanic.placesLeft, 0);
  assert.equal(botanic.status, 'full');

  const braniel = summarise(byId.get('4011683'), '2024/25');
  assert.equal(braniel.programmes.length, 2);
  assert.equal(braniel.places, 78);
  assert.equal(braniel.firstChoice, 38);
  assert.equal(braniel.firstChoiceMissed, 10);
  assert.equal(braniel.status, 'oversubscribed');
});

test('places left never go below zero', () => {
  const greenwood = summarise(byId.get('1010304'), '2026/27');
  assert.equal(greenwood.placesLeft, 0);
  for (const school of schools) for (const year of yearsOf(schools)) {
    const s = summarise(school, year);
    if (s) assert.ok(s.placesLeft >= 0 && s.placesLeft <= s.places, `${school.name} ${year}`);
  }
});

test('a setting with spare places is labelled as such', () => {
  const benmore = summarise(byId.get('1BB0024'), '2026/27');
  assert.equal(benmore.placesLeft, 9);
  assert.equal(benmore.status, 'spaces');
  assert.equal(summarise(byId.get('1BB0024'), '2019/20'), null);
});

test('describe explains an intake in plain English', () => {
  const text = describe('Botanic', summarise(byId.get('1016499'), '2026/27'));
  assert.match(text, /19 target-age children listed Botanic as their first choice/);
  assert.match(text, /All of them were offered a place/);
  assert.match(text, /No places were left/);
  const missed = describe('Dundela', summarise(byId.get('1016242'), '2026/27'));
  assert.match(missed, /52 of them were offered a place there and 20 were not/);
});

test('aggregate totals reconcile with per-setting summaries', () => {
  const total = aggregate(schools, '2026/27');
  assert.equal(total.settings, 103);
  assert.equal(total.oversubscribed + total.full + total.spaces, 103);
  assert.equal(total.places, schools.reduce((sum, s) => sum + summarise(s, '2026/27').places, 0));
});

test('age groups follow the 2 July to 1 July windows', () => {
  assert.equal(ageGroup('2022-07-02', 2026).group, 'target');
  assert.equal(ageGroup('2023-07-01', 2026).group, 'target');
  assert.equal(ageGroup('2023-07-02', 2026).group, 'underage');
  assert.equal(ageGroup('2024-07-01', 2026).group, 'underage');
  assert.equal(ageGroup('2023-07-02', 2027).group, 'target');
  assert.equal(ageGroup('2024-07-01', 2027).group, 'target');
  assert.equal(ageGroup('2024-07-02', 2027).group, 'underage');
  const older = ageGroup('2023-07-01', 2027);
  assert.equal(older.group, 'older');
  assert.equal(older.primaryYear, 2027);
  const younger = ageGroup('2025-07-02', 2027);
  assert.equal(younger.group, 'younger');
  assert.equal(younger.targetIntake, 2029);
  assert.deepEqual(ageGroup('2024-07-02', 2027).targetWindow, {from: '2 July 2024', to: '1 July 2025'});
  for (const bad of ['', '2024-02-30', '15/03/2024', null]) assert.equal(ageGroup(bad, 2027).group, 'invalid');
});

test('list check warns about single, oversubscribed and rank-sensitive choices', () => {
  const item = id => ({school: byId.get(id), summary: summarise(byId.get(id), '2026/27'), criteria: criteria[id]});
  const lone = listCheck([item('1016242')]).map(n => n.title);
  assert.ok(lone.includes('Only one preference'));
  assert.ok(lone.includes('Every setting was oversubscribed'));
  assert.ok(lone.includes('Your first choice is in high demand'));
  const ranked = listCheck([item('1BB0024'), item('1016499')], {group: 'underage', intake: '2027/28'});
  assert.ok(ranked.some(n => n.title.includes('rewards a first preference') && n.text.includes('2027/28')));
  assert.ok(ranked.some(n => n.tone === 'good'));
  assert.ok(ranked.some(n => n.title === 'Underage applications'));
  assert.deepEqual(listCheck([]), []);
});

test('share links round-trip and drop unknown ids', () => {
  const ids = ['1016499', '1AB0427'];
  assert.deepEqual(decodeList(encodeList(ids), byId), ids);
  assert.deepEqual(decodeList('1016499,nope,%E0%A4%A,1016499', byId), ['1016499']);
});

test('CSV export quotes cells and neutralises formulas', () => {
  assert.equal(toCSV([['=1+1', 'a"b', 3, null]]), '"\'=1+1","a""b","3",""\r\n');
});

test('slugs are unique and readable', () => {
  const slugs = assignSlugs(schools);
  assert.equal(new Set(slugs.values()).size, schools.length);
  assert.equal(slugs.get('1016499'), 'botanic-ps-nu-belfast');
  assert.equal(slugify('Our Lady’s Nursery School (Deanby)'), 'our-lady-s-nursery-school-deanby');
  for (const slug of slugs.values()) assert.match(slug, /^[a-z0-9-]+$/);
});

test('search ignores accents and case', () => {
  assert.ok(searchSchools(schools, 'NAÍSCOIL', '').length >= 8);
});
