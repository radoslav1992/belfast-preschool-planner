import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {restoreShortlist, recordsFor, searchSchools, yearsOf, MAX_SHORTLIST} from '../src/model.js';

// Value checks use a frozen fixture. Checks on data/ are invariants, so they keep
// passing when the scheduled refresh imports a new intake.
const readJSON = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const fixture = await readJSON('./fixtures/schools.json');
const byId = new Map(fixture.map(s => [s.id, s]));
const schools = await readJSON('../data/schools.json');
const sources = await readJSON('../data/sources.json');

test('live data is a plausible Belfast council cohort with unique school numbers', () => {
  assert.ok(schools.length >= 60 && schools.length <= 200, `unexpected setting count ${schools.length}`);
  assert.equal(new Set(schools.map(s => s.id)).size, schools.length);
  const areas = new Set(schools.map(s => s.area));
  for (const area of ['Belfast East', 'Belfast North', 'Belfast South', 'Belfast West']) assert.ok(areas.has(area), area);
  const latest = yearsOf(schools).at(-1);
  assert.ok(schools.every(s => (s.history[latest] || []).length), 'every setting has a record for the latest intake');
  assert.deepEqual(yearsOf(schools), [...new Set(sources.map(s => s.year))].sort());
});

test('keeps Belfast admissions across years, age groups and preference ranks distinct', () => {
  const school = byId.get('1016499');
  assert.deepEqual(recordsFor(school,'2026/27','target')[0].allocated, [19,3,1,0,23]);
  assert.deepEqual(recordsFor(school,'2026/27','underage')[0].allocated, [2,1,0,0,3]);
  assert.deepEqual(recordsFor(school,'2024/25','target')[0].applications, [21,2,4,0,27]);
  assert.equal(recordsFor(byId.get('1056483'),'2025/26','target').length,2);
  assert.equal(recordsFor(byId.get('1AB0427'),'2024/25','underage').length,0);
});

test('source totals reconcile in every included row', () => {
  for (const school of schools) {
    for (const rows of Object.values(school.history)) for (const record of rows) {
      for (const counts of [record.applications,record.allocated]) {
        assert.equal(counts.length,5);
        assert.equal(counts.slice(0,4).reduce((sum,n)=>sum+n,0),counts[4]);
      }
      for (let i = 0; i < 5; i++) assert.ok(record.allocated[i] <= record.applications[i]);
    }
  }
});

test('shortlist keeps distinct valid ids in order and enforces the maximum', () => {
  const all = new Map(schools.map(s => [s.id, s]));
  const ids = [...all.keys()].slice(0,MAX_SHORTLIST + 2);
  assert.equal(MAX_SHORTLIST, 8);
  assert.deepEqual(restoreShortlist(['bad',ids[0],...ids],all),ids.slice(0,MAX_SHORTLIST));
  assert.deepEqual(restoreShortlist(ids,all,5),ids.slice(0,5));
  assert.deepEqual(restoreShortlist('not a list',all),[]);
});

test('search combines name and constituency', () => {
  assert.deepEqual(searchSchools(fixture,' BOTANIC ','Belfast South').map(s => s.id),['1016499']);
  assert.equal(searchSchools(fixture,'botanic','Belfast East').length,0);
});

test('published programme capacity is preserved across age groups and ranks', () => {
  const botanic = byId.get('1016499');
  for (const cohort of ['target','underage']) {
    assert.equal(recordsFor(botanic,'2026/27',cohort)[0].capacity,26);
  }
  for (const school of schools) for (const rows of Object.values(school.history)) {
    for (const r of rows) assert.ok(Number.isInteger(r.capacity) && r.capacity >= 0);
  }
});
