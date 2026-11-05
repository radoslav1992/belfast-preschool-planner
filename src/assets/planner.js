// The planner: ranked shortlist, notes, list check, comparison and export.
import {MAX_SHORTLIST, RANKS, ageGroup, decodeList, encodeList, intakeLabel, listCheck, recordsFor, restoreShortlist,
  STATUS, summarise, toCSV, yearsOf} from './model.js';
import {badge, esc, num, ratio, sparkline, trendLabel} from './ui.js';
import {getChild, getList, getNotes, onListChange, setList, setNote} from './store.js';
import {href, toast} from './app.js';

const $ = id => document.getElementById(id);
const CHECKS = [['criteria', 'Read the criteria for this intake'], ['visit', 'Visited, called or attended an open day'], ['hours', 'Session hours and travel work for us']];

async function start() {
  const load = name => fetch(href('data/' + name + '.json')).then(res => { if (!res.ok) throw new Error(name); return res.json(); });
  const [schools, criteria, slugs] = await Promise.all(['schools', 'criteria', 'slugs'].map(load));
  const byId = new Map(schools.map(s => [s.id, s]));
  const years = yearsOf(schools);
  const latest = years.at(-1);
  const cache = new Map(schools.map(s => [s.id, Object.fromEntries(years.map(y => [y, summarise(s, y)]))]));
  const page = school => href('settings/' + slugs[school.id] + '/');
  let ids = restoreShortlist(getList(), byId);

  /* Shared links */
  const match = /^#list=(.*)$/.exec(location.hash);
  if (match) {
    const shared = decodeList(match[1], byId);
    history.replaceState(null, '', location.pathname);
    if (shared.length && (!ids.length || shared.join() === ids.join())) {
      ids = setList(shared);
      if (shared.length) toast(`Loaded a shared list of ${shared.length} settings.`);
    } else if (shared.length) {
      const banner = $('shared-banner');
      banner.innerHTML = `<span class="alert-icon" aria-hidden="true">i</span><div><strong>Someone shared a list of ${shared.length} settings with you.</strong> ${shared.map(id => esc(byId.get(id).name)).join(', ')}.<div class="button-row"><button class="btn btn-primary" type="button" id="use-shared">Replace my list</button><button class="btn btn-ghost" type="button" id="dismiss-shared">Keep my list</button></div></div>`;
      banner.hidden = false;
      $('use-shared').onclick = () => { setList(shared); banner.hidden = true; toast('Shared list loaded.'); };
      $('dismiss-shared').onclick = () => { banner.hidden = true; };
    }
  }

  /* Quick add */
  $('setting-names').innerHTML = schools.map(s => `<option value="${esc(s.name)}"></option>`).join('');
  $('quick-add-form').addEventListener('submit', event => {
    event.preventDefault();
    const input = $('quick-add');
    const term = input.value.trim().toLocaleLowerCase('en-GB');
    const msg = $('quick-add-msg');
    if (!term) { msg.textContent = 'Type part of a setting’s name.'; return; }
    const exact = schools.find(s => s.name.toLocaleLowerCase('en-GB') === term);
    const partial = schools.filter(s => s.name.toLocaleLowerCase('en-GB').includes(term));
    const school = exact || (partial.length === 1 ? partial[0] : null);
    if (!school) {
      msg.textContent = partial.length ? `${partial.length} settings match. Pick one from the suggestions.` : 'No setting matches that name.';
      return;
    }
    if (ids.includes(school.id)) { msg.textContent = `${school.name} is already on your list.`; return; }
    if (ids.length >= MAX_SHORTLIST) { msg.textContent = `Your list is full. Remove a setting to add another.`; return; }
    setList([...ids, school.id]);
    msg.textContent = `Added ${school.name}.`;
    input.value = '';
  });

  function childGroup() {
    const child = getChild();
    if (!child) return null;
    const result = ageGroup(child.dob, child.intake);
    return result.group === 'invalid' ? null : {...result, intakeYear: child.intake};
  }

  function move(index, step) {
    const next = ids.slice();
    [next[index], next[index + step]] = [next[index + step], next[index]];
    setList(next);
    requestAnimationFrame(() => document.querySelector(`[data-item="${next[index + step]}"] [data-move="${step}"]`)?.focus());
  }

  function renderList() {
    const notes = getNotes();
    $('saved-count').textContent = `${ids.length} / ${MAX_SHORTLIST}`;
    $('empty-list').hidden = ids.length > 0;
    for (const id of ['check-section', 'compare-section', 'export-section']) $(id).hidden = ids.length === 0;
    $('shortlist').innerHTML = ids.map((id, index) => {
      const school = byId.get(id);
      const s = cache.get(id)[latest];
      const rule = criteria[id];
      const note = notes[id] || {};
      const done = CHECKS.filter(([key]) => note[key]).length;
      return `<li class="short-item" data-item="${esc(id)}">
        <span class="short-rank" aria-label="Preference ${index + 1}">${index + 1}</span>
        <div>
          <h3><a href="${page(school)}">${esc(school.name)}</a></h3>
          <div class="short-meta">${s ? badge(s.status) : ''}<span>${esc(school.area)} · ${esc(school.management)}</span>
            ${s ? `<span>${latest}: ${num(s.firstChoice)} first choices for ${num(s.places)} places · ${num(s.placesLeft)} left</span>` : ''}
            <span data-done>${done}/${CHECKS.length} checks done</span></div>
        </div>
        <div class="short-actions">
          <button type="button" class="icon-btn" data-move="-1" aria-label="Move ${esc(school.name)} up" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="icon-btn" data-move="1" aria-label="Move ${esc(school.name)} down" ${index === ids.length - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" class="icon-btn remove" data-remove aria-label="Remove ${esc(school.name)}">✕</button>
        </div>
        ${rule && rule.rankSensitive && index > 0 ? `<p class="short-warning">In ${esc(rule.year)}, this setting gave priority to children who listed it first.</p>` : ''}
        <div class="short-extra">
          <div><label class="form-label" for="note-${esc(id)}">Your notes</label><textarea id="note-${esc(id)}" data-note placeholder="Open day, hours, travel, wraparound care…">${esc(note.text || '')}</textarea></div>
          <fieldset class="short-checks"><legend class="form-label">Checklist</legend>${CHECKS.map(([key, label]) => `<label class="check"><input type="checkbox" data-check="${key}" ${note[key] ? 'checked' : ''}> ${label}</label>`).join('')}</fieldset>
        </div>
      </li>`;
    }).join('');
  }

  function renderSuggestions() {
    const box = $('suggestions');
    if (!ids.length) { box.innerHTML = ''; return; }
    const areas = new Set(ids.map(id => byId.get(id).area));
    const picks = schools.filter(s => !ids.includes(s.id) && areas.has(s.area) && cache.get(s.id)[latest]?.status === 'spaces')
      .sort((a, b) => cache.get(b.id)[latest].placesLeft - cache.get(a.id)[latest].placesLeft).slice(0, 4);
    box.innerHTML = picks.length ? `<p class="suggest-title">Had places left in ${latest}, in ${[...areas].map(esc).join(' and ')}</p><ul class="suggest-list">${picks.map(s =>
      `<li><a href="${page(s)}">${esc(s.name)}</a><span class="muted">${cache.get(s.id)[latest].placesLeft} left</span><button type="button" class="btn btn-small add-btn" data-add="${esc(s.id)}" data-name="${esc(s.name)}">+ Shortlist</button></li>`).join('')}</ul>` : '';
  }

  function renderCheck() {
    const child = childGroup();
    const items = ids.map(id => ({school: byId.get(id), summary: cache.get(id)[latest], criteria: criteria[id]}));
    const notes = listCheck(items, {group: child?.group, intake: child ? intakeLabel(child.intakeYear) : undefined});
    const unread = ids.filter(id => !(getNotes()[id] || {}).criteria).length;
    if (ids.length && unread) notes.push({tone: 'info', title: 'Read the criteria', text: `You have not ticked “Read the criteria” for ${unread} of your settings. Criteria for September 2027 are due on 9 December 2026.`});
    if (!child) notes.push({tone: 'info', title: 'Add your child’s date of birth', text: 'Step 1 tells you whether your child is target age or underage, which changes how places are offered.'});
    const icon = {warn: '!', good: '✓', info: 'i'};
    $('list-check').innerHTML = notes.map(n => `<div class="check-note ${n.tone}"><span class="alert-icon" aria-hidden="true">${icon[n.tone]}</span><div><strong>${esc(n.title)}</strong>${esc(n.text)}</div></div>`).join('');
  }

  function renderCompare() {
    const year = $('compare-year').value;
    const child = childGroup();
    const rows = ids.map((id, index) => {
      const school = byId.get(id);
      const s = cache.get(id)[year];
      const points = years.map(y => cache.get(id)[y]);
      if (!s) return `<tr><td>${index + 1}</td><th scope="row"><a href="${page(school)}">${esc(school.name)}</a></th><td colspan="8" class="muted">No record for ${year}</td></tr>`;
      return `<tr><td>${index + 1}</td><th scope="row"><a href="${page(school)}">${esc(school.name)}</a></th><td>${badge(s.status)}</td><td>${num(s.places)}</td><td>${num(s.firstChoice)}</td><td>${num(Math.max(0, s.firstChoiceMissed))}</td><td>${num(s.placedBeyondFirst)}</td><td>${num(s.underagePlaced)}</td><td>${num(s.placesLeft)}</td><td>${sparkline(points, trendLabel(points))}</td></tr>`;
    }).join('');
    $('compare-table').innerHTML = `<div class="table-scroll"><table class="data-table compare-table">
      <thead><tr><th scope="col">#</th><th scope="col">Setting</th><th scope="col">Outcome</th><th scope="col">Places</th><th scope="col">First choices</th><th scope="col">First choices not placed</th><th scope="col">Placed from 2nd+ choice</th><th scope="col">Underage placed</th><th scope="col">Left after Stage 2</th><th scope="col">Demand trend</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
      <p class="small-note">Target-age figures at the end of Stage 2 in ${year}, except “Underage placed”. The trend line shows first choices per place across ${years.join(', ')}; the grey line marks one first choice per place.${child?.group === 'underage' ? ' Your child is underage: look closely at “Underage placed” and “Left after Stage 2”.' : ''}</p>`;
  }

  function renderDetail() {
    const result = $('comparison');
    const year = $('compare-year').value;
    const cohort = $('cohort').value;
    const rank = Number($('rank').value);
    const body = ids.map(id => {
      const school = byId.get(id);
      const records = recordsFor(school, year, cohort);
      if (!records.length) return `<tr><th scope="row">${esc(school.name)}</th><td colspan="3" class="muted">No ${cohort === 'target' ? 'target-age' : 'underage'} record</td></tr>`;
      return records.map(r => `<tr><th scope="row"><a href="${page(school)}">${esc(r.programme)}</a></th><td>${num(r.capacity)}</td><td>${num(r.applications[rank])}</td><td>${num(r.allocated[rank])}</td></tr>`).join('');
    }).join('');
    result.innerHTML = `<div class="table-scroll"><table class="data-table compact"><caption>${year} · ${cohort === 'target' ? 'Target age' : 'Underage'} · ${RANKS[rank]}</caption>
      <thead><tr><th scope="col">Programme</th><th scope="col">Programme places</th><th scope="col">Applications</th><th scope="col">Offered a place</th></tr></thead><tbody>${body}</tbody></table></div>
      <p class="small-note">Programme places include temporary adjustments and are shared by both age groups. These historical counts are not vacancies.</p>`;
  }

  function renderAll() {
    renderList();
    renderSuggestions();
    renderCheck();
    if (ids.length) { renderCompare(); renderDetail(); }
    const group = childGroup()?.group || null;
    if (group !== lastGroup) {
      lastGroup = group;
      $('cohort').value = group === 'underage' ? 'underage' : 'target';
      if (ids.length) renderDetail();
    }
  }
  let lastGroup = null;

  /* Events */
  $('shortlist').addEventListener('click', event => {
    const item = event.target.closest('[data-item]');
    if (!item) return;
    const index = ids.indexOf(item.dataset.item);
    const moveBtn = event.target.closest('[data-move]');
    if (moveBtn) move(index, Number(moveBtn.dataset.move));
    if (event.target.closest('[data-remove]')) {
      const name = byId.get(item.dataset.item).name;
      setList(ids.filter(id => id !== item.dataset.item));
      toast(`${name} removed.`);
    }
  });
  let noteTimer;
  $('shortlist').addEventListener('input', event => {
    const item = event.target.closest('[data-item]');
    if (!item) return;
    if (event.target.matches('[data-note]')) {
      clearTimeout(noteTimer);
      const id = item.dataset.item;
      const text = event.target.value.slice(0, 2000);
      noteTimer = setTimeout(() => setNote(id, {text}), 250);
    }
  });
  $('shortlist').addEventListener('change', event => {
    const item = event.target.closest('[data-item]');
    if (item && event.target.matches('[data-check]')) {
      setNote(item.dataset.item, {[event.target.dataset.check]: event.target.checked});
      renderCheck();
      const meta = item.querySelector('[data-done]');
      const note = getNotes()[item.dataset.item] || {};
      if (meta) meta.textContent = `${CHECKS.filter(([key]) => note[key]).length}/${CHECKS.length} checks done`;
    }
  });
  $('compare-year').addEventListener('change', () => { renderCompare(); renderDetail(); });
  for (const id of ['cohort', 'rank']) $(id).addEventListener('change', renderDetail);
  $('forget-child').addEventListener('click', () => {
    try { localStorage.removeItem('belfast-preschool-planner.child.v1'); } catch { /* storage unavailable */ }
    document.querySelectorAll('[data-age-form]').forEach(f => { f.reset(); const out = f.querySelector('[data-age-result]'); out.innerHTML = ''; delete out.dataset.group; });
    renderAll();
    toast('Date of birth removed from this browser.');
  });
  document.addEventListener('child-change', renderAll);
  onListChange(list => { ids = restoreShortlist(list, byId); renderAll(); });

  $('copy-link').addEventListener('click', async () => {
    const url = location.origin + href('planner/') + '#list=' + encodeList(ids);
    try { await navigator.clipboard.writeText(url); toast('Share link copied.'); }
    catch { window.prompt('Copy this link:', url); }
  });
  $('download-csv').addEventListener('click', () => {
    const notes = getNotes();
    const header = ['Preference', 'Setting', 'Area', 'Type', 'DE reference', `Outcome ${latest}`, 'Places', 'First choices', 'First choices not placed', 'Places left after Stage 2', 'Underage placed', ...CHECKS.map(([, label]) => label), 'Notes', 'Education Authority profile'];
    const rows = ids.map((id, i) => {
      const school = byId.get(id);
      const s = cache.get(id)[latest];
      const note = notes[id] || {};
      return [i + 1, school.name, school.area, school.management, school.id, s ? STATUS[s.status].label : '', s?.places, s?.firstChoice, s ? Math.max(0, s.firstChoiceMissed) : '', s?.placesLeft, s?.underagePlaced,
        ...CHECKS.map(([key]) => note[key] ? 'Yes' : 'No'), note.text || '', school.profileUrl || ''];
    });
    const blob = new Blob(['﻿' + toCSV([header, ...rows])], {type: 'text/csv;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'belfast-preschool-shortlist.csv';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('print-list').addEventListener('click', () => window.print());
  $('clear-list').addEventListener('click', () => {
    if (window.confirm('Remove every setting from your shortlist? Your notes are kept.')) { setList([]); toast('Shortlist cleared.'); }
  });

  renderAll();
}

start().catch(() => {
  $('saved-count').textContent = '–';
  const box = $('empty-list');
  box.hidden = false;
  box.querySelector('p').textContent = 'The admissions data could not be loaded. Reload the page, or browse the settings directory.';
});
