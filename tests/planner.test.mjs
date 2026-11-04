import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {restoreShortlist, recordsFor, searchSchools} from '../src/model.js';

const read = async file => JSON.parse(await readFile(new URL('../data/' + file, import.meta.url),'utf8'));
const schools = await read('schools.json');
const byId = new Map(schools.map(s => [s.id,s]));

test('scope is the 2026/27 Belfast council cohort with unique school numbers', () => {
  assert.equal(schools.length,103);
  assert.equal(byId.size,schools.length);
  assert.ok(schools.some(s => s.area === 'Lagan Valley'));
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
  for(const school of schools) {
    for (const rows of Object.values(school.history)) for (const record of rows) {
      for (const counts of [record.applications,record.allocated]) {
        assert.equal(counts.length,5);
        assert.equal(counts.slice(0,4).reduce((sum,n)=>sum+n,0),counts[4]);
      }
    }
  }
});
test('shortlist keeps distinct valid ids in order and enforces five', () => {
  const ids = [...byId.keys()].slice(0,7);
  assert.deepEqual(restoreShortlist(['bad',ids[0],...ids],byId),ids.slice(0,5));
});
test('search combines name and constituency', () => {
  assert.deepEqual(searchSchools(schools,' BOTANIC ','Belfast South').map(s => s.id),['1016499']);
  assert.equal(searchSchools(schools,'botanic','Belfast East').length,0);
});
