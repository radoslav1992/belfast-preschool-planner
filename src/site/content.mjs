// Text and dates that depend on the application round. Everything here is
// derived from data/season.json (rolled forward automatically each July) and
// data/key-dates.json (optional confirmed dates). With no confirmed dates for
// an intake, the site shows the usual pattern as "expected" rather than stale dates.
import {intakeLabel} from '../model.js';

export const SITE_NAME = 'Belfast Preschool Planner';

export const OFFICIAL = {
  dates: 'https://www.eani.org.uk/parents/pupil-applications-and-grants/admissions/admissions-key-dates',
  data: 'https://www.eani.org.uk/parents/pupil-applications-and-grants/admissions/admissions-support',
  find: 'https://www.eani.org.uk/find-a-school',
  admissions: 'https://www.eani.org.uk/parents/pupil-applications-and-grants/admissions',
  de: 'https://www.education-ni.gov.uk/articles/pre-school-education-places',
  deferral: 'https://nidirect.gov.uk/node/16332'
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const longDate = iso => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
const listYears = years => years.length < 2 ? years.join('') : years.slice(0, -1).join(', ') + ' and ' + years.at(-1);

/** Key dates for an intake: confirmed where known, otherwise the usual pattern marked as expected. */
export function keyDates(intake, confirmed = {}) {
  const c = confirmed[String(intake)] || {};
  const known = iso => typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso);
  return {
    confirmed: known(c.criteria) && known(c.stage1Open) && known(c.stage1Close),
    criteria: known(c.criteria) ? {date: c.criteria, text: longDate(c.criteria)} : {date: null, text: `December ${intake - 1} (expected)`},
    stage1Open: known(c.stage1Open) ? {date: c.stage1Open, text: longDate(c.stage1Open)} : {date: null, text: `early January ${intake} (expected)`},
    stage1Close: known(c.stage1Close) ? {date: c.stage1Close, text: longDate(c.stage1Close) + ', noon'} : {date: null, text: `late January ${intake} (expected)`}
  };
}

const capital = text => text.charAt(0).toUpperCase() + text.slice(1);

export function makeContent({intake, confirmedDates = {}, years}) {
  const dates = keyDates(intake, confirmedDates);
  const target = {from: `2 July ${intake - 4}`, to: `1 July ${intake - 3}`};
  const underage = {from: `2 July ${intake - 3}`, to: `1 July ${intake - 2}`};
  const criteriaDue = dates.criteria.date ? `are due on ${dates.criteria.text}` : `are usually published in December ${intake - 1}`;

  const timeline = [
    {date: dates.criteria.date, when: capital(dates.criteria.text), title: 'Criteria published',
      text: `Each setting’s admissions criteria for September ${intake} appear on its Education Authority profile. Read them before ranking your preferences.`},
    {date: dates.stage1Open.date, when: capital(dates.stage1Open.text), title: 'Stage 1 opens',
      text: 'Apply online through the Education Authority. You rank the settings you would accept in order of preference.'},
    {date: dates.stage1Close.date, when: capital(dates.stage1Close.text), title: 'Stage 1 closes',
      text: 'On-time applications are considered first. An application made after the deadline is treated as late and considered later in the process.'},
    {date: null, when: `Spring ${intake}`, title: 'Offers and Stage 2',
      text: 'Families hear about Stage 1 outcomes. Stage 2 fills the remaining places from children still without one, late applications and underage children. Check the official timetable for exact dates.'},
    {date: null, when: `Late spring ${intake}`, title: 'End of Stage 2 figures',
      text: 'The Education Authority publishes applications and allocations for every setting at the end of Stage 2. This planner picks them up automatically.'}
  ];

  const faq = [
    {group: 'Getting started', items: [
      ['What is a funded preschool place?',
        'A funded place is pre-school education in your child’s final pre-school year, paid for through the Department of Education. Places are offered in statutory nursery schools and nursery units in primary schools, and in voluntary and private settings that take part in the Pre-School Education Programme. Parents do not pay a fee for the funded sessions.'],
      ['Is my child target age or underage?',
        `For September ${intake} entry, children born between ${target.from} and ${target.to} are target age. Children born between ${underage.from} and ${underage.to} are underage and can only be offered a place if one remains after target-age children have been placed. Use the <a href="{base}guide/#age-check">age group checker</a> for other dates.`],
      [`When do I apply for September ${intake}?`,
        dates.confirmed
          ? `Stage 1 applications open on ${dates.stage1Open.text} and close at noon on ${dates.stage1Close.text.replace(', noon', '')}. The criteria for each setting ${criteriaDue}. Always confirm dates on the <a href="${OFFICIAL.dates}">Education Authority timetable</a>.`
          : `Stage 1 applications usually open in early January ${intake} and close in late January. Criteria ${criteriaDue}. The exact dates are on the <a href="${OFFICIAL.dates}">Education Authority timetable</a>.`],
      ['Do I apply through this website?',
        'No. This is an independent planning tool. Applications are made only through the Education Authority. Nothing you do here changes an application.']
    ]},
    {group: 'Choosing settings', items: [
      ['How many settings should I list?',
        'There is no single right number. List the settings you would genuinely accept, in your real order of preference. If your first choice was oversubscribed in recent years, also include settings that had places left. Check each setting’s criteria, because a few give extra priority to children who list them first.'],
      ['What does “Oversubscribed” mean on this site?',
        'In that intake, some target-age children who listed the setting as their first choice were not offered a place there. “Filled” means every target-age first choice was placed but no places were left at the end of Stage 2. “Places left” means places were still unfilled at the end of Stage 2.'],
      ['Can this site tell me my child’s chances?',
        'No. Offers depend on each setting’s criteria, such as siblings, distance or circumstances. The published figures do not show where applicants ranked under those criteria. Past demand helps you judge how competitive a setting has been, but it is not a prediction.'],
      ['Does a nursery unit place guarantee a place in the primary school?',
        'Generally no. Primary school admission is a separate application with its own criteria. Read the primary school’s criteria if this matters to you.']
    ]},
    {group: 'The figures and your data', items: [
      ['Where do the numbers come from?',
        `From the Education Authority’s published “Analysis of Preference” workbooks for the ${listYears(years)} intakes, counted at the end of Stage 2. The site checks for new workbooks automatically. See <a href="{base}about/">About the data</a> for every source file and how it is processed.`],
      ['Why might a school’s own document show different numbers?',
        'Criteria documents sometimes report totals for a different date or group of children. This site keeps to the end-of-Stage-2 workbooks so that every setting is counted in the same way.'],
      ['Is my shortlist private?',
        'Yes. Your shortlist, notes and any date of birth you enter are stored only in this browser on this device. There is no account. A share link contains only the setting reference numbers in your list.'],
      ['What if my child gets no place?',
        'Target-age children without a place after Stage 1 are considered at Stage 2 for places that remain. Use the “Places left” filter to find settings that had spare places in previous years, and contact the Education Authority admissions team for current advice.']
    ]}
  ];

  return {intake, intakeText: intakeLabel(intake), dates, target, underage, criteriaDue, timeline, faq,
    // The 2026 consultation note only applies to the round it was written for.
    policyNote: intake === 2027
      ? `The Department of Education consulted in autumn 2026 on changing the socially disadvantaged circumstances criterion. Read the final rules and each setting’s criteria for September ${intake} when they are published.`
      : `Statutory rules and each setting’s criteria can change between years. Read the rules for September ${intake} when they are published.`};
}

export const MANAGEMENT_NOTES = {
  'Controlled': 'Managed by the Education Authority.',
  'Catholic Maintained': 'Catholic maintained schools, supported by CCMS.',
  'Voluntary': 'Voluntary playgroups and settings funded through the Pre-School Education Programme.',
  'Private': 'Private settings funded through the Pre-School Education Programme for their funded places.',
  'Irish Medium': 'Education through the Irish language.',
  'Voluntary Irish Medium': 'Voluntary settings teaching through Irish.',
  'Voluntary Integrated Irish Medium': 'Voluntary integrated settings teaching through Irish.',
  'Grant Maintained Integrated': 'Integrated schools educating children from different backgrounds together.',
  'Controlled Integrated': 'Controlled schools that have become integrated.'
};
