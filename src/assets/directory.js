// Directory filters, sorting and URL state. Enhances the pre-rendered list.
import {summarise, yearsOf} from './model.js';
import {settingCard} from './ui.js';
import {getList, onListChange, syncAddButtons} from './store.js';
import {href} from './app.js';

const form = document.getElementById('filters');
const results = document.getElementById('results');
const count = document.getElementById('results-count');
const empty = document.getElementById('no-results');
const fields = ['q', 'area', 'type', 'status', 'year', 'sort'];
const checks = ['underage', 'mine'];
const fold = text => String(text).toLocaleLowerCase('en-GB').normalize('NFD').replace(/[̀-ͯ]/g, '');

async function start() {
  const [schools, slugs] = await Promise.all(['schools', 'slugs'].map(name =>
    fetch(href('data/' + name + '.json')).then(res => { if (!res.ok) throw new Error(name); return res.json(); })));
  const years = yearsOf(schools);
  const cache = new Map(schools.map(s => [s.id, Object.fromEntries(years.map(y => [y, summarise(s, y)]))]));

  const params = new URLSearchParams(location.search);
  for (const name of fields) if (params.has(name) && form.elements[name]) form.elements[name].value = params.get(name);
  for (const name of checks) form.elements[name].checked = params.get(name) === '1';
  if (!form.elements.year.value) form.elements.year.value = years.at(-1);

  function state() {
    return Object.fromEntries([...fields.map(n => [n, form.elements[n].value]), ...checks.map(n => [n, form.elements[n].checked])]);
  }
  function syncUrl(s) {
    const next = new URLSearchParams();
    for (const n of fields) if (s[n] && !(n === 'year' && s[n] === years.at(-1)) && !(n === 'sort' && s[n] === 'name')) next.set(n, s[n]);
    for (const n of checks) if (s[n]) next.set(n, '1');
    const query = next.toString();
    history.replaceState(null, '', location.pathname + (query ? '?' + query : ''));
  }
  function render() {
    const s = state();
    const term = fold(s.q.trim());
    const mine = new Set(getList());
    let list = schools.filter(school => {
      const summary = cache.get(school.id)[s.year];
      if (term && !fold(school.name).includes(term)) return false;
      if (s.area && school.area !== s.area) return false;
      if (s.type && school.management !== s.type) return false;
      if (s.status && (!summary || summary.status !== s.status)) return false;
      if (s.underage && (!summary || summary.underagePlaced === 0)) return false;
      if (s.mine && !mine.has(school.id)) return false;
      return true;
    });
    const get = school => cache.get(school.id)[s.year];
    const value = (school, key, missing) => (get(school) && get(school)[key] !== null ? get(school)[key] : missing);
    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name, 'en-GB'),
      demand: (a, b) => value(b, 'demand', -1) - value(a, 'demand', -1),
      calm: (a, b) => value(a, 'demand', 99) - value(b, 'demand', 99),
      left: (a, b) => value(b, 'placesLeft', -1) - value(a, 'placesLeft', -1),
      places: (a, b) => value(b, 'places', -1) - value(a, 'places', -1)
    };
    list = list.sort((a, b) => (sorters[s.sort] || sorters.name)(a, b) || a.name.localeCompare(b.name, 'en-GB'));
    results.innerHTML = list.map(school => {
      const points = years.map(y => cache.get(school.id)[y]);
      return settingCard(school, get(school), points, href('settings/' + slugs[school.id] + '/'), {headingLevel: 2});
    }).join('');
    const filtered = list.length !== schools.length;
    count.textContent = `${filtered ? list.length + ' of ' + schools.length : schools.length} settings · ${s.year} intake`;
    empty.hidden = list.length > 0;
    syncAddButtons(results);
    syncUrl(s);
  }

  let timer;
  form.addEventListener('input', event => {
    clearTimeout(timer);
    timer = setTimeout(render, event.target.type === 'search' ? 120 : 0);
  });
  form.addEventListener('submit', event => { event.preventDefault(); render(); });
  form.addEventListener('reset', () => setTimeout(() => { form.elements.year.value = years.at(-1); render(); }, 0));
  onListChange(() => { if (form.elements.mine.checked) render(); });
  render();
}

start().catch(() => {
  count.textContent = 'Filters could not load. The full list below is still available.';
});
