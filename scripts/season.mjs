// Move data/season.json on to the next application round when the date says so.
// Runs in the scheduled refresh workflow; it never moves the season backwards.
// Usage: node scripts/season.mjs [YYYY-MM-DD]
import {readFile, writeFile} from 'node:fs/promises';
import {seasonFor} from '../src/model.js';

const file = new URL('../data/season.json', import.meta.url);
const current = JSON.parse(await readFile(file, 'utf8'));
const due = seasonFor(process.argv[2] || new Date());
if (!Number.isInteger(current.intake)) throw new Error('data/season.json needs an integer "intake"');
if (due > current.intake) {
  await writeFile(file, JSON.stringify({...current, intake: due}, null, 2) + '\n');
  console.log(`Season moved from September ${current.intake} to September ${due}.`);
} else {
  console.log(`Season stays at September ${current.intake}.`);
}
