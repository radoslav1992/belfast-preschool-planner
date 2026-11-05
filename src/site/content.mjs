// Hand-maintained text and dates. Review every autumn before the next intake.

export const SITE_NAME = 'Belfast Preschool Planner';
export const NEXT_INTAKE = 2027; // September start year of the next application round

export const OFFICIAL = {
  dates: 'https://www.eani.org.uk/parents/pupil-applications-and-grants/admissions/admissions-key-dates',
  data: 'https://www.eani.org.uk/parents/pupil-applications-and-grants/admissions/admissions-support',
  find: 'https://www.eani.org.uk/find-a-school',
  admissions: 'https://www.eani.org.uk/parents/pupil-applications-and-grants/admissions',
  de: 'https://www.education-ni.gov.uk/articles/pre-school-education-places',
  deferral: 'https://nidirect.gov.uk/node/16332'
};

/** `date` is ISO when the official date is known, otherwise null with a `when` label. */
export const TIMELINE = [
  {date: '2026-12-09', when: '9 December 2026', title: 'Criteria published',
    text: 'Each setting’s admissions criteria for September 2027 appear on its Education Authority profile. Read them before ranking your preferences.'},
  {date: '2027-01-06', when: '6 January 2027', title: 'Stage 1 opens',
    text: 'Apply online through the Education Authority. You rank the settings you would accept in order of preference.'},
  {date: '2027-01-20', when: '20 January 2027, noon', title: 'Stage 1 closes',
    text: 'On-time applications are considered first. An application made after the deadline is treated as late and considered later in the process.'},
  {date: null, when: 'Spring 2027', title: 'Offers and Stage 2',
    text: 'Families hear about Stage 1 outcomes. Stage 2 fills the remaining places from children still without one, late applications and underage children. Check the official timetable for exact dates.'},
  {date: null, when: 'Late spring 2027', title: 'End of Stage 2 figures',
    text: 'The Education Authority publishes applications and allocations for every setting at the end of Stage 2. These are the figures this planner shows.'}
];

export const FAQ = [
  {group: 'Getting started', items: [
    ['What is a funded preschool place?',
      'A funded place is pre-school education in your child’s final pre-school year, paid for through the Department of Education. Places are offered in statutory nursery schools and nursery units in primary schools, and in voluntary and private settings that take part in the Pre-School Education Programme. Parents do not pay a fee for the funded sessions.'],
    ['Is my child target age or underage?',
      'For September 2027 entry, children born between 2 July 2023 and 1 July 2024 are target age. Children born between 2 July 2024 and 1 July 2025 are underage and can only be offered a place if one remains after target-age children have been placed. Use the <a href="{base}guide/#age-check">age group checker</a> for other dates.'],
    ['When do I apply for September 2027?',
      'Stage 1 applications open on 6 January 2027 and close at noon on 20 January 2027. The criteria for each setting are due on 9 December 2026. Always confirm dates on the <a href="https://www.eani.org.uk/parents/pupil-applications-and-grants/admissions/admissions-key-dates">Education Authority timetable</a>.'],
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
      'From the Education Authority’s published “Analysis of Preference” workbooks for the 2024/25, 2025/26 and 2026/27 intakes, counted at the end of Stage 2. See <a href="{base}about/">About the data</a> for every source file and how it is processed.'],
    ['Why might a school’s own document show different numbers?',
      'Criteria documents sometimes report totals for a different date or group of children. This site keeps to the end-of-Stage-2 workbooks so that every setting is counted in the same way.'],
    ['Is my shortlist private?',
      'Yes. Your shortlist, notes and any date of birth you enter are stored only in this browser on this device. There is no account. A share link contains only the setting reference numbers in your list.'],
    ['What if my child gets no place?',
      'Target-age children without a place after Stage 1 are considered at Stage 2 for places that remain. Use the “Places left” filter to find settings that had spare places in previous years, and contact the Education Authority admissions team for current advice.']
  ]}
];

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
