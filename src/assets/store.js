// Browser-local storage for the shortlist, notes and the child's details.
import {MAX_SHORTLIST} from './model.js';

const KEYS = {
  list: 'belfast-preschool-planner.shortlist.v1',
  notes: 'belfast-preschool-planner.notes.v1',
  child: 'belfast-preschool-planner.child.v1'
};
const memory = {};
const listeners = new Set();
export let storageAvailable = true;

function readKey(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return key in memory ? memory[key] : fallback;
  }
}
function writeKey(key, value) {
  memory[key] = value;
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    storageAvailable = false;
  }
}

const cleanIds = value => [...new Set((Array.isArray(value) ? value : []).filter(id => typeof id === 'string' && /^[0-9A-Za-z]{1,16}$/.test(id)))].slice(0, MAX_SHORTLIST);

export function getList() {
  return cleanIds(readKey(KEYS.list, []));
}
export function setList(ids) {
  const list = cleanIds(ids);
  writeKey(KEYS.list, list);
  listeners.forEach(fn => fn(list));
  return list;
}
export function onListChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
/** Returns 'added', 'removed' or 'full'. */
export function toggle(id) {
  const list = getList();
  if (list.includes(id)) { setList(list.filter(x => x !== id)); return 'removed'; }
  if (list.length >= MAX_SHORTLIST) return 'full';
  setList([...list, id]);
  return 'added';
}

export function getNotes() {
  const notes = readKey(KEYS.notes, {});
  return notes && typeof notes === 'object' && !Array.isArray(notes) ? notes : {};
}
export function setNote(id, patch) {
  const notes = getNotes();
  notes[id] = {...(notes[id] || {}), ...patch};
  writeKey(KEYS.notes, notes);
}

export function getChild() {
  const child = readKey(KEYS.child, null);
  return child && typeof child.dob === 'string' ? child : null;
}
export function setChild(child) {
  writeKey(KEYS.child, child);
  document.dispatchEvent(new CustomEvent('child-change', {detail: child}));
}

// Keep tabs in sync.
window.addEventListener('storage', event => {
  if (event.key === KEYS.list) listeners.forEach(fn => fn(getList()));
});

export function syncAddButtons(root = document) {
  const list = getList();
  const full = list.length >= MAX_SHORTLIST;
  root.querySelectorAll('[data-add]').forEach(button => {
    const added = list.includes(button.dataset.add);
    const big = button.classList.contains('btn-primary') || button.dataset.big !== undefined;
    if (big) button.dataset.big = '';
    button.classList.toggle('is-added', added);
    button.classList.toggle('btn-primary', big && !added);
    button.textContent = added ? (big ? '✓ On your shortlist' : '✓ Shortlisted') : (big ? '+ Add to my shortlist' : '+ Shortlist');
    button.setAttribute('aria-pressed', String(added));
    button.disabled = !added && full;
    button.title = !added && full ? `Your shortlist is full (${MAX_SHORTLIST}). Remove a setting first.` : '';
  });
}
