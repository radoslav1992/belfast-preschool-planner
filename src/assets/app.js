// Shared behaviour for every page: navigation, shortlist buttons, age checker, key dates.
import {ageGroup, intakeLabel, MAX_SHORTLIST} from './model.js';
import {getList, onListChange, toggle, syncAddButtons, getChild, setChild} from './store.js';

const base = document.documentElement.dataset.base || '/';
export const href = path => base + path.replace(/^\//, '');

/* Navigation */
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');
hamburger?.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(open));
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navLinks?.classList.contains('open')) {
    navLinks.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.focus();
  }
});

/* Toast */
let toastTimer;
export function toast(message, link) {
  const box = document.getElementById('toast');
  if (!box) return;
  box.replaceChildren(document.createTextNode(message));
  if (link) {
    const a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.text;
    box.append(a);
  }
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.hidden = true; }, 4200);
}

/* Shortlist count and add buttons */
function updateCount(list = getList()) {
  document.querySelectorAll('[data-shortlist-count]').forEach(node => {
    node.textContent = list.length;
    node.hidden = list.length === 0;
    node.setAttribute('aria-label', `${list.length} on shortlist`);
  });
  syncAddButtons();
}
onListChange(updateCount);
updateCount();

document.addEventListener('click', event => {
  const button = event.target.closest('[data-add]');
  if (!button) return;
  const name = button.dataset.name || 'Setting';
  const result = toggle(button.dataset.add);
  const onPlanner = location.pathname.startsWith(href('planner/'));
  if (result === 'added') toast(`${name} added to your shortlist.`, onPlanner ? null : {href: href('planner/'), text: 'Open planner →'});
  else if (result === 'removed') toast(`${name} removed from your shortlist.`);
  else toast(`Your shortlist already has ${MAX_SHORTLIST} settings. Remove one first.`, {href: href('planner/'), text: 'Open planner →'});
});

/* Age group checker */
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pretty = iso => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${months[m - 1]} ${y}`; };

export function ageMessage(dob, intake) {
  const r = ageGroup(dob, intake);
  const link = (path, text) => `<a href="${href(path)}">${text}</a>`;
  switch (r.group) {
    case 'target':
      return {group: r.group, html: `<strong>Target age for September ${intake} (${r.intake}).</strong> Children born ${r.targetWindow.from} – ${r.targetWindow.to} are in their final pre-school year and are placed before underage children. Apply on time in Stage 1. ${link('guide/#dates', 'Key dates')}`};
    case 'underage':
      return {group: r.group, html: `<strong>Underage for September ${intake}.</strong> Your child will be target age for September ${r.targetIntake} (born ${r.targetWindow.from} – ${r.targetWindow.to}). Underage children are only offered places left after target-age children. ${link('settings/?underage=1', 'Settings that placed underage children')}`};
    case 'older':
      return {group: r.group, html: `<strong>Primary school age.</strong> A child born on ${pretty(dob)} was target age for September ${r.targetIntake} and would normally start primary school in September ${r.primaryYear}. If you are thinking about deferral, ${link('guide/#age-check', 'read the guidance')} and contact the Education Authority.`};
    case 'younger':
      return {group: r.group, html: `<strong>Too young for September ${intake}.</strong> Your child will be target age for September ${r.targetIntake} (${r.targetLabel}). Applications for that intake usually open in January ${r.targetIntake}.`};
    default:
      return {group: 'invalid', html: 'Enter a valid date of birth, for example 15/03/2024.'};
  }
}

function renderAge(form) {
  const dob = form.elements.dob.value;
  const intake = Number(form.elements.intake.value);
  const out = form.querySelector('[data-age-result]');
  if (!dob) { out.dataset.group = 'invalid'; out.innerHTML = 'Enter your child’s date of birth.'; return null; }
  const {group, html} = ageMessage(dob, intake);
  out.dataset.group = group;
  out.innerHTML = html;
  return group;
}

document.querySelectorAll('[data-age-form]').forEach(form => {
  const remember = form.hasAttribute('data-remember');
  const saved = getChild();
  if (saved) {
    form.elements.dob.value = saved.dob;
    if ([...form.elements.intake.options].some(o => o.value === String(saved.intake))) form.elements.intake.value = String(saved.intake);
    renderAge(form);
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const group = renderAge(form);
    if (remember && group && group !== 'invalid') setChild({dob: form.elements.dob.value, intake: Number(form.elements.intake.value)});
  });
  form.elements.intake.addEventListener('change', () => { if (form.elements.dob.value) form.requestSubmit(); });
});

/* Key dates: mark past steps and the next one */
document.querySelectorAll('[data-timeline]').forEach(list => {
  const today = new Date().toISOString().slice(0, 10);
  let nextMarked = false;
  list.querySelectorAll('.timeline-step').forEach(step => {
    const date = step.dataset.date;
    if (date && date < today) { step.classList.add('is-past'); return; }
    if (!nextMarked && date) {
      nextMarked = true;
      step.classList.add('is-next');
      const when = step.querySelector('.timeline-when');
      if (when) when.insertAdjacentHTML('beforeend', ' <span class="next-label">NEXT</span>');
    }
  });
});

export {intakeLabel};
