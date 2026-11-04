import {restoreShortlist, recordsFor, searchSchools} from './model.js';

const byId = id => document.getElementById(id);
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function link(text, url) {
  const anchor = element('a', text);
  anchor.href = url;
  return anchor;
}
function button(text, label, action, disabled = false) {
  const node = element('button', text);
  node.type = 'button';
  node.setAttribute('aria-label', label);
  node.onclick = action;
  node.disabled = disabled;
  return node;
}
async function readData(name) {
  const res = await fetch('./data/' + name + '.json');
  if (!res.ok) throw new Error('Could not load ' + name);
  return res.json();
}

async function start() {
  const [schools, sources, criteria] = await Promise.all(['schools','sources','criteria'].map(readData));
  const settings = new Map(schools.map(s => [s.id, s]));
  const storageKey = 'belfast-preschool-planner.shortlist.v1';
  let shortlist = [];
  try {
    shortlist = restoreShortlist(JSON.parse(localStorage.getItem(storageKey)), settings);
  } catch { /* Storage may be disabled or contain older data. */ }
  for (const name of [...new Set(schools.map(s => s.area))].sort()) {
    byId('area').append(new Option(name, name));
  }
  for (const s of sources) {
    const li = element('li');
    const group = {both:'both age groups',target:'target age',underage:'underage'}[s.cohort];
    li.append(link(s.year + ' · ' + group + ' · ' + s.asOf, s.url));
    byId('source-links').append(li);
  }

  function save(ids) {
    shortlist = restoreShortlist(ids, settings);
    try { localStorage.setItem(storageKey, JSON.stringify(shortlist)); }
    catch { byId('short-note').textContent = 'Browser storage is unavailable. This shortlist will last for this visit.'; }
    render();
  }
  function move(index, direction) {
    const ids = shortlist.slice();
    const target = index + direction;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    save(ids);
  }
  function renderShortlist() {
    byId('saved-count').textContent = shortlist.length + ' / 5';
    const nodes = shortlist.map((id, index) => {
      const school = settings.get(id);
      const holder = element('div', undefined, 'short-card');
      const controls = element('div');
      controls.append(
        button('↑', 'Move ' + school.name + ' earlier', () => move(index,-1), index === 0),
        button('↓', 'Move ' + school.name + ' later', () => move(index,1), index === shortlist.length-1),
        button('Remove', 'Remove ' + school.name, () => save(shortlist.filter(x => x !== id)))
      );
      holder.append(element('strong', (index + 1) + '. ' + school.name), controls);
      return holder;
    });
    byId('shortlist').replaceChildren(...nodes);
  }
  function renderComparison() {
    const result = byId('comparison');
    result.replaceChildren();
    if (!shortlist.length) return;
    const rank = Number(byId('rank').value);
    const year = byId('year').value;
    const cohort = byId('cohort').value;
    const scroller = element('div', undefined, 'scroll');
    const table = element('table');
    const tr = table.createTHead().insertRow();
    for (const label of ['Reported programme', 'Applications', 'Allocated']) tr.append(element('th',label));
    const body = table.createTBody();
    for (const id of shortlist) {
      const school = settings.get(id);
      const rows = recordsFor(school, year, cohort);
      if (!rows.length) {
        const row = body.insertRow();
        row.insertCell().textContent = school.name;
        const empty = row.insertCell();
        empty.colSpan = 2;
        empty.textContent = 'No record for this age group';
      }
      for (const record of rows) {
        const row = body.insertRow();
        row.insertCell().textContent = record.programme;
        row.insertCell().textContent = record.applications[rank];
        row.insertCell().textContent = record.allocated[rank];
      }
    }
    scroller.append(table);
    result.append(scroller, element('p', 'Historical counts for the selected intake and age group. One child may have applied to several settings.', 'meta'));
    for (const [index, id] of shortlist.entries()) {
      const rule = criteria[id];
      if (!rule) continue;
      const box = element('div', undefined, 'rules');
      box.append(element('strong',rule.name + ' · ' + rule.year + ' criteria'), element('p',rule.rules));
      if (rule.rankSensitive && index > 0 && cohort === 'target' && year === rule.year) box.append(element('p','Your list places this school below first. In 2026/27, listing it first was a priority within its target-age category.','warn'));
      box.append(element('p','Published session for that intake: ' + rule.hours, 'meta'),link('Read the original criteria ↗',rule.url));
      result.append(box);
    }
  }
  function renderDirectory() {
    const matches = searchSchools(schools, byId('search').value, byId('area').value);
    byId('results-count').textContent = matches.length + ' of ' + schools.length + ' settings';
    const nodes = matches.map(school => {
      const holder = element('div', undefined, 'row');
      const label = element('div');
      label.append(element('strong',school.name), element('small', school.area + ' · ' + school.management));
      const included = shortlist.includes(school.id);
      const toggle = button(included ? 'Remove' : '+ Add', (included ? 'Remove ' : 'Add ') + school.name,
        () => save(included ? shortlist.filter(id => id !== school.id) : [...shortlist,school.id]),
        !included && shortlist.length >= 5);
      holder.append(label, toggle);
      return holder;
    });
    if (!nodes.length) nodes.push(element('p','No settings match. Try another name or constituency.'));
    byId('results').replaceChildren(...nodes);
  }
  function render() {
    renderShortlist();
    renderComparison();
    renderDirectory();
  }
  byId('search').addEventListener('input', renderDirectory);
  byId('area').addEventListener('change', renderDirectory);
  for (const id of ['year','rank','cohort']) byId(id).addEventListener('change', renderComparison);
  render();
}
start().catch(() => { byId('results-count').textContent = 'Admissions records could not be loaded. Reload the page or use the official links below.'; });
