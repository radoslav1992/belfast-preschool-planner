// Pure helpers shared by the static build and the browser. No DOM access here.

export const MAX_SHORTLIST = 8;
export const RANKS = ['First choice', 'Second choice', 'Third choice', 'Other choices', 'All preferences'];

export function restoreShortlist(value, validIds, max = MAX_SHORTLIST) {
  const ids = Array.isArray(value) ? value : [];
  return [...new Set(ids.filter(id => validIds.has(id)))].slice(0, max);
}

export function recordsFor(school, year, cohort) {
  return (school.history[year] || []).filter(row => row.cohort === cohort);
}

const fold = text => String(text).toLocaleLowerCase('en-GB').normalize('NFD').replace(/[̀-ͯ]/g, '');

export function searchSchools(schools, query, area) {
  const term = fold(query.trim());
  return schools.filter(school =>
    (!area || school.area === area) && fold(school.name).includes(term));
}

export function yearsOf(schools) {
  return [...new Set(schools.flatMap(s => Object.keys(s.history)))].sort();
}

function addCounts(total, counts) {
  for (let i = 0; i < 5; i++) total[i] += counts[i];
  return total;
}

/**
 * Summarise one setting for one intake. Programme places cover both age groups,
 * so places left are worked out per programme before adding programmes together.
 */
export function summarise(school, year) {
  const rows = school.history[year] || [];
  if (!rows.length) return null;
  const programmes = new Map();
  const target = {applications: [0, 0, 0, 0, 0], allocated: [0, 0, 0, 0, 0]};
  const underage = {applications: [0, 0, 0, 0, 0], allocated: [0, 0, 0, 0, 0]};
  let hasTarget = false;
  let hasUnderage = false;
  for (const row of rows) {
    const programme = programmes.get(row.programme) || {name: row.programme, places: row.capacity, allocated: 0};
    programme.allocated += row.allocated[4];
    programmes.set(row.programme, programme);
    const group = row.cohort === 'target' ? target : underage;
    if (row.cohort === 'target') hasTarget = true; else hasUnderage = true;
    addCounts(group.applications, row.applications);
    addCounts(group.allocated, row.allocated);
  }
  const places = [...programmes.values()].reduce((sum, p) => sum + p.places, 0);
  const placesLeft = [...programmes.values()].reduce((sum, p) => sum + Math.max(0, p.places - p.allocated), 0);
  const firstChoiceMissed = target.applications[0] - target.allocated[0];
  let status = 'none';
  if (hasTarget) status = firstChoiceMissed > 0 ? 'oversubscribed' : placesLeft > 0 ? 'spaces' : 'full';
  return {
    year,
    programmes: [...programmes.values()],
    places,
    placesLeft,
    target,
    underage,
    hasTarget,
    hasUnderage,
    firstChoice: target.applications[0],
    firstChoicePlaced: target.allocated[0],
    firstChoiceMissed,
    placedBeyondFirst: target.allocated[1] + target.allocated[2] + target.allocated[3],
    targetPlaced: target.allocated[4],
    targetApplicants: target.applications[4],
    underagePlaced: underage.allocated[4],
    underageApplicants: underage.applications[4],
    demand: places ? target.applications[0] / places : null,
    status
  };
}

export const STATUS = {
  oversubscribed: {
    label: 'Oversubscribed',
    tone: 'red',
    short: 'Some first-choice applicants missed out',
    text: 'Some target-age children who listed this setting first were not offered a place here.'
  },
  full: {
    label: 'Filled',
    tone: 'orange',
    short: 'Every first choice placed, no places left',
    text: 'Every target-age child who listed it first was placed, but no places were left at the end of Stage 2.'
  },
  spaces: {
    label: 'Places left',
    tone: 'green',
    short: 'Places remained after Stage 2',
    text: 'Places were still unfilled at the end of Stage 2.'
  },
  none: {
    label: 'No record',
    tone: 'gray',
    short: 'No target-age record',
    text: 'No target-age record was published for this intake.'
  }
};

export function pluralise(count, one, many = one + 's') {
  return count + ' ' + (count === 1 ? one : many);
}

/** A plain-English description of one intake, used on setting pages and in the planner. */
export function describe(name, s) {
  if (!s || !s.hasTarget) return `No target-age admissions record for ${name} was published for ${s ? s.year : 'this intake'}.`;
  const parts = [];
  parts.push(`In ${s.year}, ${pluralise(s.firstChoice, 'target-age child', 'target-age children')} listed ${name} as their first choice. The setting had ${pluralise(s.places, 'funded place')}.`);
  if (s.firstChoiceMissed > 0) {
    parts.push(`${s.firstChoicePlaced} of them were offered a place there and ${s.firstChoiceMissed} ${s.firstChoiceMissed === 1 ? 'was' : 'were'} not.`);
  } else if (s.firstChoice > 0) {
    parts.push(`All of them were offered a place.`);
  }
  if (s.placedBeyondFirst > 0) {
    parts.push(`${pluralise(s.placedBeyondFirst, 'place')} went to target-age children who ranked it second or lower.`);
  }
  if (s.underagePlaced > 0) parts.push(`${pluralise(s.underagePlaced, 'underage child', 'underage children')} also got a place.`);
  parts.push(s.placesLeft > 0 ? `${pluralise(s.placesLeft, 'place')} ${s.placesLeft === 1 ? 'was' : 'were'} still unfilled at the end of Stage 2.` : 'No places were left at the end of Stage 2.');
  return parts.join(' ');
}

/** Totals across many settings for a single intake. */
export function aggregate(schools, year) {
  const total = {settings: 0, places: 0, placesLeft: 0, firstChoice: 0, firstChoiceMissed: 0, targetApplicants: 0,
    targetPlaced: 0, underageApplicants: 0, underagePlaced: 0, oversubscribed: 0, full: 0, spaces: 0};
  for (const school of schools) {
    const s = summarise(school, year);
    if (!s) continue;
    total.settings++;
    for (const key of ['places', 'placesLeft', 'firstChoice', 'targetApplicants', 'targetPlaced', 'underageApplicants', 'underagePlaced']) total[key] += s[key];
    total.firstChoiceMissed += Math.max(0, s.firstChoiceMissed);
    if (s.status in total) total[s.status]++;
  }
  total.demand = total.places ? total.firstChoice / total.places : null;
  return total;
}

export function groupBy(items, key) {
  const groups = new Map();
  for (const item of items) {
    const value = typeof key === 'function' ? key(item) : item[key];
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(item);
  }
  return groups;
}

export function slugify(text) {
  return fold(text).replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Unique, stable slugs for setting pages. */
export function assignSlugs(schools) {
  const used = new Map();
  const result = new Map();
  for (const school of [...schools].sort((a, b) => a.id.localeCompare(b.id))) {
    let slug = slugify(school.name) || school.id.toLowerCase();
    if (used.has(slug)) slug += '-' + school.id.toLowerCase();
    used.set(slug, school.id);
    result.set(school.id, slug);
  }
  return result;
}

export function intakeLabel(startYear) {
  return startYear + '/' + String((startYear + 1) % 100).padStart(2, '0');
}

/**
 * Northern Ireland pre-school age groups. A child whose third birthday falls
 * between 2 July and 1 July of the following year is "target age" for the
 * September intake that follows; the next-younger year group is "underage".
 */
export function ageGroup(dob, intakeYear) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dob || ''));
  if (!match) return {group: 'invalid'};
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return {group: 'invalid'};
  const afterCutoff = month > 7 || (month === 7 && day >= 2);
  const targetIntake = year + (afterCutoff ? 4 : 3);
  const window = start => ({from: `2 July ${start - 4}`, to: `1 July ${start - 3}`});
  const base = {targetIntake, targetLabel: intakeLabel(targetIntake), targetWindow: window(targetIntake), intake: intakeLabel(intakeYear)};
  if (targetIntake === intakeYear) return {...base, group: 'target'};
  if (targetIntake === intakeYear + 1) return {...base, group: 'underage'};
  if (targetIntake < intakeYear) return {...base, group: 'older', primaryYear: targetIntake + 1};
  return {...base, group: 'younger'};
}

export function encodeList(ids) {
  return ids.map(encodeURIComponent).join(',');
}

export function decodeList(text, validIds) {
  const raw = String(text || '').split(',').map(part => {
    try { return decodeURIComponent(part.trim()); } catch { return ''; }
  }).filter(Boolean);
  return restoreShortlist(raw, validIds);
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  // Neutralise spreadsheet formulas and quote every cell.
  const safe = /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export function toCSV(rows) {
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/**
 * Practical checks on an ordered shortlist.
 * items: [{school, summary, criteria}] in preference order.
 */
export function listCheck(items, {group, intake} = {}) {
  const notes = [];
  if (!items.length) return notes;
  const latest = items.map(item => item.summary).filter(Boolean);
  const year = latest[0] ? latest[0].year : '';
  const spaces = items.filter(item => item.summary && item.summary.status === 'spaces');
  const oversubscribed = items.filter(item => item.summary && item.summary.status === 'oversubscribed');
  if (items.length === 1) {
    notes.push({tone: 'warn', title: 'Only one preference',
      text: 'If this setting is oversubscribed and your child does not meet its higher criteria, there is no other preference to fall back on at Stage 1. Listing further settings you would accept gives you more chances of an offer.'});
  }
  if (oversubscribed.length === items.length) {
    notes.push({tone: 'warn', title: 'Every setting was oversubscribed',
      text: `In ${year}, every setting on this list turned away some target-age children who chose it first. Consider adding a setting that had places left.`});
  } else if (spaces.length) {
    notes.push({tone: 'good', title: `${pluralise(spaces.length, 'setting')} had places left`,
      text: `${spaces.map(item => item.school.name).join(', ')} still had unfilled places at the end of Stage 2 in ${year}. Demand changes every year.`});
  }
  const first = items[0];
  if (first.summary && first.summary.status === 'oversubscribed') {
    notes.push({tone: 'info', title: 'Your first choice is in high demand',
      text: `In ${first.summary.year}, ${first.summary.firstChoice} target-age children chose ${first.school.name} first for ${first.summary.places} places, and ${first.summary.firstChoiceMissed} of them were not placed. Its admissions criteria will decide who gets a place.`});
  }
  items.forEach((item, index) => {
    if (item.criteria && item.criteria.rankSensitive && index > 0) {
      notes.push({tone: 'warn', title: `${item.school.name} rewards a first preference`,
        text: `Its ${item.criteria.year} criteria gave priority to children who listed it first. At position ${index + 1}, your child may rank lower there. Check the criteria for ${intake || 'your intake'}.`});
    }
  });
  if (group === 'underage') {
    const placedUnderage = items.filter(item => item.summary && item.summary.underagePlaced > 0);
    notes.push(placedUnderage.length
      ? {tone: 'info', title: 'Underage applications',
        text: `Underage children are only considered if places remain after target-age children. In ${year}, ${pluralise(placedUnderage.length, 'setting')} on your list placed underage children: ${placedUnderage.map(item => item.school.name).join(', ')}.`}
      : {tone: 'warn', title: 'Underage applications',
        text: `Underage children are only considered if places remain after target-age children. None of these settings placed an underage child in ${year}.`});
  }
  if (group === 'older') {
    notes.push({tone: 'warn', title: 'Check your child’s age group',
      text: 'The date of birth you entered suggests your child is due to start primary school. Contact the Education Authority before applying for pre-school.'});
  }
  return notes;
}
