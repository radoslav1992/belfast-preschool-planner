import {cp, mkdir, rm} from 'node:fs/promises';
const out = new URL('../dist/', import.meta.url);
await rm(out, {force:true, recursive:true});
await mkdir(out, {recursive:true});
for (const [from, to] of [['../src/', './'], ['../data/', './data/']]) {
  await cp(new URL(from, import.meta.url), new URL(to, out), {recursive:true});
}
console.log('Static site ready in dist/');
