import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {summarise, describe, aggregate, ageGroup, listCheck, toCSV, encodeList, decodeList, assignSlugs, slugify, yearsOf, searchSchools, seasonFor}
  from '../src/model.js';
import {keyDates, makeContent} from '../src/site/content.mjs';

const read = async file => JSON.parse(await readFile(new URL(file, import.meta.url), 'utf8'));
// Frozen values for exact checks; live data only for invariants.
const fixture = await read('./fixtures/schools.json');
const schools = await read('../data/schools.json');
const criteria = await read('../data/criteria.json');
const byId = new Map(fixture.map(s => [s.id, s]));

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
  const latest = yearsOf(schools).at(-1);
  const total = aggregate(schools, latest);
  assert.equal(total.settings, schools.length);
  assert.equal(total.oversubscribed + total.full + total.spaces, schools.length);
  assert.equal(total.places, schools.reduce((sum, s) => sum + summarise(s, latest).places, 0));
  const frozen = aggregate(fixture, '2026/27');
  assert.equal(frozen.settings, 10);
  assert.equal(frozen.places, fixture.reduce((sum, s) => sum + summarise(s, '2026/27').places, 0));
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
  assert.equal(assignSlugs(fixture).get('1016499'), 'botanic-ps-nu-belfast');
  assert.equal(slugify('Our Lady’s Nursery School (Deanby)'), 'our-lady-s-nursery-school-deanby');
  for (const slug of slugs.values()) assert.match(slug, /^[a-z0-9-]+$/);
});

test('search ignores accents and case', () => {
  assert.deepEqual(searchSchools(fixture, 'NAÍSCOIL an droichid', '').map(s => s.id), ['1046641']);
});

test('the application season moves on each July and never needs editing', () => {
  assert.equal(seasonFor('2026-11-05'), 2027);
  assert.equal(seasonFor('2027-01-20'), 2027);
  assert.equal(seasonFor('2027-06-30T23:00:00Z'), 2027);
  assert.equal(seasonFor('2027-07-01'), 2028);
  assert.throws(() => seasonFor('not a date'));
});

test('key dates use confirmed values or a clearly expected pattern', () => {
  const confirmed = {'2027': {criteria: '2026-12-09', stage1Open: '2027-01-06', stage1Close: '2027-01-20'}};
  const known = keyDates(2027, confirmed);
  assert.equal(known.confirmed, true);
  assert.equal(known.stage1Open.text, '6 January 2027');
  const next = keyDates(2028, confirmed);
  assert.equal(next.confirmed, false);
  assert.equal(next.stage1Open.date, null);
  assert.match(next.stage1Open.text, /January 2028 \(expected\)/);
});

test('content rolls forward with the season', () => {
  const later = makeContent({intake: 2028, confirmedDates: {}, years: ['2025/26', '2026/27', '2027/28']});
  const text = JSON.stringify(later);
  assert.doesNotMatch(text, /September 2027|9 December 2026|6 January 2027/);
  assert.match(text, /born between 2 July 2024 and 1 July 2025 are target age/);
  assert.match(text, /2025\/26, 2026\/27 and 2027\/28 intakes/);
});
