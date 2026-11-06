import {STATUS, describe, intakeLabel, pluralise, slugify, groupBy, aggregate} from '../model.js';
import {esc, num, ratio, badge, settingCard, statusBar, historyChart, barList, rankCells, SERIES} from '../ui.js';
import {SITE_NAME, OFFICIAL, MANAGEMENT_NOTES} from './content.mjs';

const ext = (url, text) => `<a href="${esc(url)}" rel="noopener">${text} <span aria-hidden="true">↗</span></a>`;
const stripTags = html => html.replace(/<[^>]+>/g, '');
const fillBase = (html, base) => html.replaceAll('{base}', base);
const cohortName = {target: 'Target age', underage: 'Underage'};

function ageChecker(id, intake, {remember = false} = {}) {
  const intakes = [0, 1, 2].map(i => intake + i);
  return `<form class="age-form" data-age-form${remember ? ' data-remember' : ''} novalidate>
    <div class="age-fields">
      <div><label class="form-label" for="${id}-dob">Child’s date of birth</label>
      <input class="form-input" type="date" id="${id}-dob" name="dob" min="2018-01-01" max="2030-12-31" required></div>
      <div><label class="form-label" for="${id}-intake">Starting preschool in</label>
      <select class="form-select" id="${id}-intake" name="intake">${intakes.map(y => `<option value="${y}">September ${y}</option>`).join('')}</select></div>
    </div>
    <button class="btn btn-primary" type="submit">Check age group <span aria-hidden="true">→</span></button>
    <div class="age-result" data-age-result role="status" aria-live="polite"></div>
  </form>`;
}

function timeline(steps, compact = false) {
  return `<ol class="timeline${compact ? ' timeline-compact' : ''}" data-timeline>${steps.map((step, i) => `
    <li class="timeline-step"${step.date ? ` data-date="${step.date}"` : ''}>
      <span class="timeline-dot" aria-hidden="true">${i + 1}</span>
      <div><p class="timeline-when">${esc(step.when)}</p><h3>${esc(step.title)}</h3>${compact ? '' : `<p>${esc(step.text)}</p>`}</div>
    </li>`).join('')}
  </ol>`;
}

function faqBlock(items, base) {
  return items.map(([q, a]) => `<details class="faq-item"><summary>${esc(q)}</summary><p>${fillBase(a, base)}</p></details>`).join('\n');
}

function faqJsonLd(items) {
  return {'@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(([q, a]) => ({
    '@type': 'Question', name: q, acceptedAnswer: {'@type': 'Answer', text: stripTags(a)}}))};
}

const icon = {
  search: '<svg class="tool-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22 24 6l19 16M10 19v23h28V19M20 42V29h8v13"/><circle cx="24" cy="20" r="4"/></svg>',
  list: '<svg class="tool-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="25" width="16" height="16" rx="3"/><rect x="25" y="25" width="16" height="16" rx="3"/><rect x="16" y="7" width="16" height="16" rx="3" transform="rotate(-8 24 15)"/></svg>',
  book: '<svg class="tool-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M24 12c-6-5-13-5-19-3v29c6-2 13-2 19 3 6-5 13-5 19-3V9c-6-2-13-2-19 3Zm0 0v29M11 17l7 1M11 24l7 1M31 18l6-1M31 25l6-1"/></svg>',
  chart: '<svg class="tool-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 42h36M11 36V24M20 36V14M29 36V20M38 36V8"/></svg>'
};

function statusExplainer() {
  return `<details class="explainer"><summary>What do the labels mean?</summary>
    <ul class="status-explain">${['oversubscribed', 'full', 'spaces'].map(key => `<li>${badge(key)} <span>${esc(STATUS[key].text)}</span></li>`).join('')}</ul>
    <p class="small-note">Labels describe target-age children at the end of Stage 2 in the selected intake. They are not a forecast for your child.</p>
  </details>`;
}

export function buildPages(ctx) {
  const {schools, sources, criteria, years, latest, slugs, summaries, href, base, layout, content} = ctx;
  const {intake, dates, faq: FAQ, timeline: steps} = content;
  const intakeCount = years.length === 1 ? 'one intake' : years.length === 2 ? 'two intakes' : years.length === 3 ? 'three intakes' : years.length + ' intakes';
  const pages = [];
  const settingHref = school => href('settings/' + slugs.get(school.id) + '/');
  const areaNames = [...new Set(schools.map(s => s.area))].sort();
  const areaHref = area => href('areas/' + slugify(area) + '/');
  const areaLink = area => `<a href="${areaHref(area)}"><span>${esc(area)}</span><span class="muted">${schools.filter(s => s.area === area).length} settings →</span></a>`;
  const managementNames = [...new Set(schools.map(s => s.management))].sort();
  const points = school => years.map(y => summaries.get(school.id)[y] || null);
  const now = summaries;
  const cityLatest = aggregate(schools, latest);
  const latestOf = school => now.get(school.id)[latest];
  const card = (school, h) => settingCard(school, latestOf(school), points(school), settingHref(school), {headingLevel: h});
  const ranked = schools.filter(s => latestOf(s) && latestOf(s).hasTarget && latestOf(s).places > 0);

  /* ---------- Home ---------- */
  const homeFaq = [FAQ[0].items[1], FAQ[1].items[2], FAQ[1].items[0], FAQ[2].items[2]];
  pages.push({path: '', html: layout({
    title: 'Belfast Preschool Planner | Funded nursery and playgroup places',
    description: `Compare all ${schools.length} funded preschool settings in Belfast, check your child’s age group and see how places were allocated over ${intakeCount}.`,
    path: '', active: 'home',
    jsonld: [{'@context': 'https://schema.org', '@type': 'WebApplication', name: SITE_NAME, applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web', inLanguage: 'en-GB', offers: {'@type': 'Offer', price: '0', priceCurrency: 'GBP'},
      areaServed: {'@type': 'City', name: 'Belfast'}}, faqJsonLd(homeFaq)],
    body: `<div class="page-container home-page">
  <div class="home-workspace">
    <section class="home-intro" aria-labelledby="home-title">
      <p class="eyebrow"><span class="sun-dot" aria-hidden="true">☀</span> FUNDED PRESCHOOL · BELFAST</p>
      <h1 id="home-title">Plan your child’s <span>funded preschool place in Belfast</span></h1>
      <p class="home-description">See how places were allocated at all ${schools.length} Belfast settings over ${intakeCount}, check your child’s age group and build a shortlist before Stage 1 applications open ${dates.stage1Open.date ? 'on ' + dates.stage1Open.text : 'in January ' + intake}.</p>
      <div class="home-proof"><span>Free</span><span>No sign-up</span><span>Official Education Authority figures</span></div>
    </section>
    <section class="lookup-panel" id="quick-check" aria-labelledby="lookup-title">
      <div class="lookup-intro">
        <h2 id="lookup-title">Find a setting</h2>
        <p class="lookup-description">Search by name or start with your area. Every setting page explains how its places were filled.</p>
        <form class="search-form" action="${href('settings/')}" method="get" role="search">
          <label class="form-label" for="home-q">Setting name</label>
          <input class="form-input" id="home-q" name="q" type="search" placeholder="e.g. Botanic, Glendhu, Naiscoil" autocomplete="off">
          <label class="form-label" for="home-area">Area</label>
          <select class="form-select" id="home-area" name="area"><option value="">All of Belfast</option>${areaNames.map(a => `<option>${esc(a)}</option>`).join('')}</select>
          <button class="btn btn-primary" type="submit">Search settings <span aria-hidden="true">→</span></button>
        </form>
      </div>
      <div class="lookup-form-area">
        <h2>Which age group is my child in?</h2>
        <p class="lookup-description">Target-age children are placed first. Underage children are only offered places that remain.</p>
        ${ageChecker('home', intake)}
      </div>
      <p class="small-note lookup-note">Independent guide. Applications are made only through the ${ext(OFFICIAL.admissions, 'Education Authority')}. <a href="${href('about/')}">How we read the figures</a></p>
    </section>
    <figure class="home-illustration"><img src="${href('images/kindergarten-play.webp')}" srcset="${href('images/kindergarten-play-small.webp')} 640w, ${href('images/kindergarten-play.webp')} 1200w" sizes="(max-width: 640px) calc(100vw - 36px), (max-width: 860px) 46vw, 560px" width="1200" height="800" alt="Children playing with a ball and building blocks and watering a flower outside a sunny nursery." fetchpriority="high" decoding="async"><figcaption>Big steps for little feet.</figcaption></figure>
  </div>

  <section class="season-card" aria-labelledby="season-title">
    <div class="section-heading"><div><p class="eyebrow">SEPTEMBER ${intake} ENTRY</p><h2 id="season-title">Key dates for the next application round</h2></div>${ext(OFFICIAL.dates, 'Official timetable')}</div>
    ${timeline(steps, true)}
  </section>

  <section class="data-strip" aria-label="What the planner covers">
    <div><strong>${schools.length}</strong><span>Belfast settings</span></div>
    <div><strong>${num(cityLatest.places)}</strong><span>funded places in ${latest}</span></div>
    <div><strong>${years.length}</strong><span>intakes of history</span></div>
    <div class="data-strip-note"><span>${cityLatest.oversubscribed} settings turned away first-choice applicants in ${latest}; ${cityLatest.spaces} still had places at the end of Stage 2.</span><a href="${href('insights/')}">See where demand is highest →</a></div>
  </section>

  <section class="home-tools" aria-labelledby="tools-title">
    <div class="section-heading"><div><p class="eyebrow">STEP BY STEP, TOGETHER</p><h2 id="tools-title">A calmer start for the whole family.</h2></div></div>
    <div class="tool-grid">
      <a class="tool-card" href="${href('settings/')}"><span class="tool-number">${icon.search}01 / EXPLORE</span><h3>Find settings near you</h3><p>Filter by area, type and how full each setting was. Open any setting for three years of figures in plain English.</p><span class="text-link">Browse settings →</span></a>
      <a class="tool-card" href="${href('planner/')}"><span class="tool-number">${icon.list}02 / PLAN</span><h3>Build your shortlist</h3><p>Rank up to eight settings, keep notes and a checklist, and get practical warnings about your list.</p><span class="text-link">Open my planner →</span></a>
      <a class="tool-card" href="${href('guide/')}"><span class="tool-number">${icon.book}03 / PREPARE</span><h3>Understand the process</h3><p>Age groups, criteria, Stage 1 and Stage 2, and what to do if your child is not placed.</p><span class="text-link">Read the guide →</span></a>
    </div>
  </section>

  <section class="glance" aria-labelledby="glance-title">
    <div class="section-heading"><div><p class="eyebrow">BELFAST AT A GLANCE · ${latest}</p><h2 id="glance-title">How full were Belfast settings?</h2></div><a class="text-link" href="${href('insights/')}">All insights →</a></div>
    <div class="glance-grid">
      <div class="card glance-card">${statusBar(cityLatest, `Settings by outcome in ${latest}`)}${statusExplainer()}</div>
      <div class="card glance-card">
        <h3>Most first-choice applicants per place</h3>
        ${barList([...ranked].sort((a, b) => latestOf(b).demand - latestOf(a).demand).slice(0, 5).map(s => ({label: s.name, href: settingHref(s), value: latestOf(s).demand, display: ratio(latestOf(s).demand), note: s.area.replace('Belfast ', '')})))}
        <p class="small-note">A value above 1 means more children chose it first than it had places.</p>
      </div>
    </div>
  </section>

  <section class="district-section" aria-labelledby="area-title"><div class="section-heading"><div><p class="eyebrow">CLOSE TO HOME</p><h2 id="area-title">Settings by area</h2></div><a class="text-link" href="${href('settings/?status=spaces')}">Settings with places left →</a></div>
    <div class="district-grid">${areaNames.map(areaLink).join('')}</div>
  </section>

  <section class="faq-section"><div class="section-heading"><div><p class="eyebrow">GOOD TO KNOW</p><h2>Before you start</h2></div><a class="text-link" href="${href('faq/')}">All questions →</a></div>${faqBlock(homeFaq, base)}</section>
</div>`
  })});

  /* ---------- Directory ---------- */
  pages.push({path: 'settings/', html: layout({
    title: `All ${schools.length} funded preschool settings in Belfast | ${SITE_NAME}`,
    description: 'Search and filter every funded preschool setting in Belfast by area, type and how full it was. Compare places, first choices and places left after Stage 2.',
    path: 'settings/', active: 'settings', scripts: ['directory.js'], crumbs: [['Settings', 'settings/']],
    body: `<div class="page-container">
  <header class="page-heading"><p class="eyebrow">SETTINGS DIRECTORY</p><h1>Find a funded preschool setting in Belfast</h1>
    <p>Every setting the Education Authority recorded under Belfast City Council for the ${latest} intake. Filter to narrow the list, then open a setting for its full history or add it to your planner.</p></header>
  <form class="filter-panel" id="filters" role="search" aria-label="Filter settings">
    <div class="filter-main">
      <label class="form-label" for="f-q">Search by name</label>
      <input class="form-input" id="f-q" name="q" type="search" placeholder="e.g. McArthur" autocomplete="off">
    </div>
    <div><label class="form-label" for="f-area">Area</label><select class="form-select" id="f-area" name="area"><option value="">All areas</option>${areaNames.map(a => `<option>${esc(a)}</option>`).join('')}</select></div>
    <div><label class="form-label" for="f-type">Type</label><select class="form-select" id="f-type" name="type"><option value="">All types</option>${managementNames.map(a => `<option>${esc(a)}</option>`).join('')}</select></div>
    <div><label class="form-label" for="f-status">Outcome</label><select class="form-select" id="f-status" name="status"><option value="">Any outcome</option><option value="spaces">Places left</option><option value="full">Filled</option><option value="oversubscribed">Oversubscribed</option></select></div>
    <div><label class="form-label" for="f-year">Intake</label><select class="form-select" id="f-year" name="year">${[...years].reverse().map(y => `<option>${y}</option>`).join('')}</select></div>
    <div><label class="form-label" for="f-sort">Sort by</label><select class="form-select" id="f-sort" name="sort"><option value="name">Name (A–Z)</option><option value="demand">Highest demand first</option><option value="calm">Lowest demand first</option><option value="left">Most places left</option><option value="places">Most places</option></select></div>
    <div class="filter-extra">
      <label class="check"><input type="checkbox" id="f-underage" name="underage" value="1"> Placed underage children</label>
      <label class="check"><input type="checkbox" id="f-shortlisted" name="mine" value="1"> Only my shortlist</label>
      <button type="reset" class="link-button" id="f-reset">Clear all filters</button>
    </div>
  </form>
  ${statusExplainer()}
  <div class="results-bar"><p id="results-count" role="status">${schools.length} settings · ${latest}</p><a class="text-link" href="${href('planner/')}">Go to my planner →</a></div>
  <div id="results" class="setting-grid">${schools.map(s => card(s, 2)).join('\n')}</div>
  <p class="empty-state" id="no-results" hidden>No settings match these filters. Try another name, clear a filter or choose a different intake.</p>
  <section class="district-section"><h2 class="sub-title">Browse by area</h2><div class="district-grid">${areaNames.map(areaLink).join('')}</div></section>
</div>`
  })});

  /* ---------- Setting pages ---------- */
  const areaRanks = new Map();
  for (const [area, list] of groupBy(ranked, 'area')) {
    [...list].sort((a, b) => latestOf(b).demand - latestOf(a).demand).forEach((s, i) => areaRanks.set(s.id, [i + 1, list.length, area]));
  }
  for (const school of schools) {
    const pts = points(school);
    const s = latestOf(school);
    const rule = criteria[school.id];
    const rank = areaRanks.get(school.id);
    const alternatives = schools.filter(o => o.id !== school.id && o.area === school.area && latestOf(o) && latestOf(o).status === 'spaces')
      .sort((a, b) => latestOf(b).placesLeft - latestOf(a).placesLeft).slice(0, 4);
    const history = [...years].reverse().map(year => {
      const rows = school.history[year] || [];
      if (!rows.length) return `<h3 class="table-title">${year}</h3><p class="muted">No record published for this intake.</p>`;
      return `<div class="table-scroll" tabindex="0" role="region" aria-label="${year} figures by preference"><table class="data-table">
        <caption>${year} intake <span class="muted">· end of Stage 2</span></caption>
        <thead><tr><th rowspan="2" scope="col">Programme</th><th rowspan="2" scope="col">Age group</th><th rowspan="2" scope="col">Places</th><th colspan="5" scope="colgroup" class="group">Applications</th><th colspan="5" scope="colgroup" class="group">Offered a place</th></tr>
        <tr>${['1st', '2nd', '3rd', 'Other', 'Total', '1st', '2nd', '3rd', 'Other', 'Total'].map(l => `<th scope="col">${l}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr><th scope="row">${esc(r.programme)}</th><td>${cohortName[r.cohort]}</td><td>${num(r.capacity)}</td>${rankCells(r.applications)}${rankCells(r.allocated)}</tr>`).join('')}</tbody>
      </table></div>`;
    }).join('');
    const facts = s ? `<div class="fact-grid">
        <div class="fact"><strong>${num(s.places)}</strong><span>funded places</span></div>
        <div class="fact"><strong>${num(s.firstChoice)}</strong><span>target-age first choices</span></div>
        <div class="fact"><strong>${num(Math.max(0, s.firstChoiceMissed))}</strong><span>first choices not placed</span></div>
        <div class="fact"><strong>${num(s.placesLeft)}</strong><span>places left after Stage 2</span></div>
      </div>` : '';
    pages.push({path: 'settings/' + slugs.get(school.id) + '/', html: layout({
      title: `${school.name} admissions | ${school.area} | ${SITE_NAME}`,
      description: s ? `${school.name}: ${s.places} funded places and ${s.firstChoice} target-age first-choice applicants in ${latest}. Three years of Education Authority admissions figures explained.` : `${school.name} preschool admissions figures.`,
      path: 'settings/' + slugs.get(school.id) + '/', active: 'settings',
      crumbs: [['Settings', 'settings/'], [school.area, 'areas/' + slugify(school.area) + '/'], [school.name, 'settings/' + slugs.get(school.id) + '/']],
      jsonld: [{'@context': 'https://schema.org', '@type': 'Preschool', name: school.name, identifier: school.id,
        address: {'@type': 'PostalAddress', addressLocality: 'Belfast', addressCountry: 'GB'}, ...(school.profileUrl ? {sameAs: school.profileUrl} : {})}],
      body: `<div class="page-container setting-page">
  <header class="setting-hero">
    <div>
      <p class="eyebrow">${esc(school.area.toUpperCase())} · ${esc(school.management.toUpperCase())}</p>
      <h1>${esc(school.name)}</h1>
      <p class="setting-ids">DE reference ${esc(school.id)}${MANAGEMENT_NOTES[school.management] ? ' · ' + esc(MANAGEMENT_NOTES[school.management]) : ''}</p>
    </div>
    <div class="hero-actions">
      <button type="button" class="btn btn-primary add-btn" data-add="${esc(school.id)}" data-name="${esc(school.name)}">+ Add to my shortlist</button>
      ${school.profileUrl ? `<a class="btn btn-outline" href="${esc(school.profileUrl)}" rel="noopener">Official profile and criteria <span aria-hidden="true">↗</span></a>` : ''}
    </div>
  </header>

  <section class="card summary-card" aria-labelledby="latest-title">
    <div class="summary-head"><h2 id="latest-title">${latest} intake in brief</h2>${s ? badge(s.status, 'badge-lg') : ''}</div>
    <p class="summary-text">${esc(describe(school.name, s))}</p>
    ${facts}
    ${rank ? `<p class="small-note">Ranked ${rank[0]} of ${rank[1]} ${esc(rank[2])} settings by first-choice applicants per place (${ratio(s.demand)} here; ${ratio(cityLatest.demand)} across Belfast).</p>` : ''}
  </section>

  <div class="two-col">
    <section class="card" aria-labelledby="trend-title">
      <h2 id="trend-title">${esc(intakeCount.charAt(0).toUpperCase() + intakeCount.slice(1))} compared</h2>
      <p class="section-sub">Funded places against the number of target-age children who listed this setting first.</p>
      ${historyChart(pts, school.name)}
      <ul class="trend-notes">${pts.filter(Boolean).map(p => `<li><strong>${p.year}</strong> ${badge(p.status)} <span>${num(p.firstChoice)} first choices for ${num(p.places)} places · ${num(p.placesLeft)} left</span></li>`).join('')}</ul>
    </section>
    <section class="card" aria-labelledby="criteria-title">
      <h2 id="criteria-title">Admissions criteria</h2>
      ${rule ? `<div class="criteria-box"><p class="criteria-year">${esc(rule.year)} criteria (manually summarised)</p><p>${esc(rule.rules)}</p>
        ${rule.rankSensitive ? `<p class="alert alert-warning">In ${esc(rule.year)}, this setting gave priority to children who listed it as their first preference. Where you rank it may matter.</p>` : ''}
        <p class="small-note">Session for that intake: ${esc(rule.hours)}</p>${ext(rule.url, 'Read the original criteria')}</div>` :
        `<p>Each setting decides who gets a place when it has more applicants than places. Criteria commonly include target age, siblings, distance or other circumstances. Some give priority to a first preference.</p>`}
      <p class="small-note">Criteria for September ${intake} ${content.criteriaDue}. ${school.profileUrl ? ext(school.profileUrl, 'Find them on the EA profile') : ext(OFFICIAL.find, 'Find them on the EA website')}.</p>
      <h3 class="sub-title">Before you rank it</h3>
      <ul class="check-list">
        <li>Read the criteria for your intake year, not an older one.</li>
        <li>Check the session times (full-time or part-time) suit your family.</li>
        <li>Visit or call if you can, and ask whether the setting holds an open day.</li>
      </ul>
    </section>
  </div>

  <section class="card" aria-labelledby="detail-title">
    <h2 id="detail-title">Full figures by preference</h2>
    <p class="section-sub">“1st” counts children who listed this setting as their first preference, and so on. “Other” is fourth or later. Places cover the whole programme, shared by both age groups.</p>
    ${history}
  </section>

  ${alternatives.length ? `<section aria-labelledby="alt-title"><div class="section-heading"><div><p class="eyebrow">ALTERNATIVES</p><h2 id="alt-title">${esc(school.area)} settings with places left in ${latest}</h2></div><a class="text-link" href="${href('settings/?status=spaces&area=' + encodeURIComponent(school.area))}">See all →</a></div>
    <div class="setting-grid">${alternatives.map(o => card(o, 3)).join('')}</div></section>` : ''}

  <details class="explainer"><summary>How to read these figures</summary>
    <p>The Education Authority counts applications and allocations at the end of Stage 2. A child can appear in several settings’ application counts but is offered at most one place. Late changes, withdrawals and offers made after Stage 2 are not included, so the figures are not live vacancies.</p>
    <p>“Target age” children are in their final pre-school year and are placed first. “Underage” children are a year younger and only receive places that remain. <a href="${href('about/')}">More about the data</a>.</p>
  </details>
</div>`
    })});
  }

  /* ---------- Area pages ---------- */
  for (const area of areaNames) {
    const list = schools.filter(s => s.area === area);
    const total = aggregate(list, latest);
    const left = list.filter(s => latestOf(s) && latestOf(s).placesLeft > 0).sort((a, b) => latestOf(b).placesLeft - latestOf(a).placesLeft);
    const path = 'areas/' + slugify(area) + '/';
    pages.push({path, html: layout({
      title: `Funded preschool settings in ${area} | ${SITE_NAME}`,
      description: `${list.length} funded preschool settings in ${area}: ${total.places} places and ${total.firstChoice} target-age first choices in ${latest}. See which settings had places left.`,
      path, active: 'settings', crumbs: [['Settings', 'settings/'], [area, path]],
      body: `<div class="page-container">
  <header class="page-heading"><p class="eyebrow">AREA</p><h1>Funded preschool in ${esc(area)}</h1>
    <p>${pluralise(list.length, 'setting')} in ${esc(area)} recorded under Belfast City Council. Figures are for the ${latest} intake at the end of Stage 2. Areas follow the constituency field in the Education Authority workbook.</p></header>
  <div class="stat-tiles">
    <div class="stat-tile"><strong>${num(total.places)}</strong><span>funded places</span></div>
    <div class="stat-tile"><strong>${num(total.firstChoice)}</strong><span>target-age first choices</span></div>
    <div class="stat-tile"><strong>${num(total.firstChoiceMissed)}</strong><span>first choices not placed there</span></div>
    <div class="stat-tile"><strong>${num(total.placesLeft)}</strong><span>places left after Stage 2</span></div>
  </div>
  <div class="card">${statusBar(total, `${area} settings by outcome in ${latest}`)}</div>
  ${left.length ? `<section class="card"><h2>Places left at the end of Stage 2</h2>${barList(left.map(s => ({label: s.name, href: settingHref(s), value: latestOf(s).placesLeft})), {colour: '#1f9a6a'})}</section>` : ''}
  <div class="results-bar"><h2 class="sub-title">All ${esc(area)} settings</h2><a class="text-link" href="${href('settings/?area=' + encodeURIComponent(area))}">Filter in the directory →</a></div>
  <div class="setting-grid">${list.map(s => card(s, 3)).join('')}</div>
  <section class="district-section"><h2 class="sub-title">Other areas</h2><div class="district-grid">${areaNames.filter(a => a !== area).map(areaLink).join('')}</div></section>
</div>`
    })});
  }

  /* ---------- Planner ---------- */
  pages.push({path: 'planner/', html: layout({
    title: `My preschool planner | ${SITE_NAME}`,
    description: 'Build a ranked shortlist of Belfast preschool settings, compare their admissions history and check your list before you apply.',
    path: 'planner/', active: 'planner', scripts: ['planner.js'], crumbs: [['My planner', 'planner/']],
    body: `<div class="page-container planner-page">
  <header class="page-heading"><p class="eyebrow">MY PLANNER</p><h1>Build and check your shortlist</h1>
    <p>Add up to eight settings, put them in the order you would rank them and see how each one filled in past intakes. Your list, notes and child’s date of birth stay in this browser.</p></header>
  <div id="shared-banner" class="alert alert-info" hidden></div>
  <noscript><p class="alert alert-warning">The planner needs JavaScript. You can still browse every setting in the <a href="${href('settings/')}">directory</a>.</p></noscript>
  <div class="planner-grid">
    <section class="card step-card" aria-labelledby="child-title">
      <p class="step-tag">STEP 1</p><h2 id="child-title">Your child</h2>
      <p class="form-hint">Optional. We use the date of birth only to show the right age group and figures.</p>
      ${ageChecker('planner', intake, {remember: true})}
      <button type="button" class="link-button" id="forget-child">Forget date of birth</button>
    </section>
    <section class="card step-card" aria-labelledby="add-title">
      <p class="step-tag">STEP 2</p><h2 id="add-title">Add settings</h2>
      <form id="quick-add-form" class="quick-add">
        <label class="form-label" for="quick-add">Setting name</label>
        <div class="inline-field"><input class="form-input" id="quick-add" list="setting-names" autocomplete="off" placeholder="Start typing a name"><button class="btn btn-primary" type="submit">Add</button></div>
        <datalist id="setting-names"></datalist>
        <p class="form-hint" id="quick-add-msg" role="status"></p>
      </form>
      <p class="form-hint">Or <a href="${href('settings/')}">browse the directory</a> and use “+ Shortlist” on any setting.</p>
      <div id="suggestions"></div>
    </section>
  </div>

  <section class="card" aria-labelledby="list-title">
    <div class="section-heading"><div><p class="step-tag">STEP 3</p><h2 id="list-title">Your order of preference</h2></div><span class="pill" id="saved-count">0 / 8</span></div>
    <p class="form-hint">Rank settings as you would on the application. Use the arrows to reorder. Notes and ticks are just for you.</p>
    <ol id="shortlist" class="shortlist"></ol>
    <div id="empty-list" class="empty-state" hidden>
      <img src="${href('images/kindergarten-play-small.webp')}" alt="" width="320" height="213" loading="lazy">
      <p><strong>Your shortlist is empty.</strong> Add settings with the search above or from the directory.</p>
      <a class="btn btn-outline" href="${href('settings/')}">Browse settings →</a>
    </div>
  </section>

  <section class="card" id="check-section" aria-labelledby="check-title" data-criteria-note="Criteria for September ${intake} ${esc(content.criteriaDue)}." hidden>
    <p class="step-tag">STEP 4</p><h2 id="check-title">List check</h2>
    <p class="form-hint">Practical points based on the most recent intake. They are prompts, not predictions.</p>
    <div id="list-check" class="check-notes"></div>
  </section>

  <section class="card" id="compare-section" aria-labelledby="compare-title" hidden>
    <div class="section-heading"><div><p class="step-tag">STEP 5</p><h2 id="compare-title">Compare side by side</h2></div>
      <div class="inline-controls"><label class="form-label" for="compare-year">Intake</label><select class="form-select" id="compare-year">${[...years].reverse().map(y => `<option>${y}</option>`).join('')}</select></div></div>
    <div id="compare-table"></div>
    <details class="explainer" id="detail-explorer"><summary>Explore figures by age group and preference</summary>
      <div class="controls"><label class="form-label">Age group<select class="form-select" id="cohort"><option value="target">Target age</option><option value="underage">Underage</option></select></label>
      <label class="form-label">Preference<select class="form-select" id="rank"><option value="4">All preferences</option><option value="0">First choice</option><option value="1">Second choice</option><option value="2">Third choice</option><option value="3">Other choices</option></select></label></div>
      <div id="comparison"></div>
    </details>
  </section>

  <section class="card no-print" id="export-section" aria-labelledby="export-title" hidden>
    <p class="step-tag">STEP 6</p><h2 id="export-title">Save and share</h2>
    <p class="form-hint">Share links contain only the setting reference numbers, never your notes or date of birth.</p>
    <div class="button-row">
      <button type="button" class="btn btn-primary" id="copy-link">Copy share link</button>
      <button type="button" class="btn btn-outline" id="download-csv">Download spreadsheet (CSV)</button>
      <button type="button" class="btn btn-outline" id="print-list">Print</button>
      <button type="button" class="btn btn-ghost" id="clear-list">Clear list</button>
    </div>
  </section>
</div>`
  })});

  /* ---------- Insights ---------- */
  const insightPanel = year => {
    const total = aggregate(schools, year);
    const withData = schools.filter(s => now.get(s.id)[year] && now.get(s.id)[year].hasTarget && now.get(s.id)[year].places > 0);
    const sy = s => now.get(s.id)[year];
    const byArea = [...groupBy(withData, 'area')].map(([area, list]) => ({area, t: aggregate(list, year)})).sort((a, b) => b.t.demand - a.t.demand);
    const byType = [...groupBy(withData, 'management')].map(([type, list]) => ({type, t: aggregate(list, year)})).sort((a, b) => b.t.places - a.t.places);
    const firstShare = total.targetApplicants ? Math.round(100 * total.firstChoice / total.targetApplicants) : 0;
    const groupTable = (rows, key, label) => `<div class="table-scroll" tabindex="0" role="region" aria-label="${label === 'Area' ? 'Demand by area' : 'Demand by type of setting'}, ${year}"><table class="data-table compact">
      <thead><tr><th scope="col">${label}</th><th scope="col">Settings</th><th scope="col">Places</th><th scope="col">First choices</th><th scope="col">Per place</th><th scope="col">Oversubscribed</th><th scope="col">Places left</th></tr></thead>
      <tbody>${rows.map(r => `<tr><th scope="row">${key === 'area' ? `<a href="${areaHref(r.area)}">${esc(r.area)}</a>` : esc(r[key])}</th><td>${r.t.settings}</td><td>${num(r.t.places)}</td><td>${num(r.t.firstChoice)}</td><td>${ratio(r.t.demand)}</td><td>${r.t.oversubscribed}</td><td>${num(r.t.placesLeft)}</td></tr>`).join('')}</tbody></table></div>`;
    return `<div class="year-panel" data-year-panel="${year}"${year === latest ? '' : ' hidden'}>
      <div class="stat-tiles">
        <div class="stat-tile"><strong>${total.settings}</strong><span>settings with records</span></div>
        <div class="stat-tile"><strong>${num(total.places)}</strong><span>funded places</span></div>
        <div class="stat-tile"><strong>${num(total.firstChoice)}</strong><span>target-age first choices</span></div>
        <div class="stat-tile"><strong>${num(total.firstChoiceMissed)}</strong><span>first choices not placed there</span></div>
        <div class="stat-tile"><strong>${num(total.placesLeft)}</strong><span>places left after Stage 2</span></div>
        <div class="stat-tile"><strong>${num(total.underagePlaced)}</strong><span>underage children placed</span></div>
      </div>
      <div class="two-col">
        <section class="card"><h2>Settings by outcome</h2>${statusBar(total, `Settings by outcome in ${year}`)}
          <p class="small-note">${firstShare}% of target-age applications to Belfast settings were first preferences. Relatively few applications named a Belfast setting as a second or later choice.</p></section>
        <section class="card"><h2>First choices per place by area</h2>${barList(byArea.map(r => ({label: r.area, href: areaHref(r.area), value: r.t.demand, display: ratio(r.t.demand)})), {colour: SERIES.firstChoice})}
          <p class="small-note">Across all of Belfast: ${ratio(total.demand)} first choices per place.</p></section>
      </div>
      <div class="two-col">
        <section class="card"><h2>Highest demand</h2><p class="section-sub">Target-age first choices per funded place.</p>
          ${barList([...withData].sort((a, b) => sy(b).demand - sy(a).demand).slice(0, 10).map(s => ({label: s.name, href: settingHref(s), value: sy(s).demand, display: ratio(sy(s).demand), note: `${sy(s).firstChoice} for ${sy(s).places}`})))}</section>
        <section class="card"><h2>Most places left</h2><p class="section-sub">Places still unfilled at the end of Stage 2.</p>
          ${barList([...withData].filter(s => sy(s).placesLeft > 0).sort((a, b) => sy(b).placesLeft - sy(a).placesLeft).slice(0, 10).map(s => ({label: s.name, href: settingHref(s), value: sy(s).placesLeft, note: s.area.replace('Belfast ', '')})), {colour: '#1f9a6a'})}</section>
      </div>
      <section class="card"><h2>By area</h2>${groupTable(byArea, 'area', 'Area')}</section>
      <section class="card"><h2>By type of setting</h2>${groupTable(byType, 'type', 'Type')}</section>
    </div>`;
  };
  const first = years[0];
  const changes = schools.map(s => ({s, a: now.get(s.id)[first], b: latestOf(s)}))
    .filter(x => x.a && x.b && x.a.hasTarget && x.b.hasTarget && x.a.places && x.b.places)
    .map(x => ({...x, delta: x.b.demand - x.a.demand}));
  const cityTrend = years.map(y => ({y, t: aggregate(schools, y)}));
  pages.push({path: 'insights/', html: layout({
    title: `Belfast preschool demand insights | ${SITE_NAME}`,
    description: `Which Belfast preschool settings were most in demand, which had places left, and how demand changed across ${intakeCount}, by area and type of setting.`,
    path: 'insights/', active: 'insights', scripts: ['insights.js'], crumbs: [['Insights', 'insights/']],
    body: `<div class="page-container insights-page">
  <header class="page-heading"><p class="eyebrow">INSIGHTS</p><h1>Where demand for preschool places is highest</h1>
    <p>City-wide patterns from the Education Authority’s end-of-Stage-2 figures. Choose an intake to update every chart below.</p></header>
  <div class="segmented" role="group" aria-label="Choose intake">${[...years].reverse().map(y => `<button type="button" data-year="${y}" aria-pressed="${y === latest}">${y}</button>`).join('')}</div>
  ${years.map(insightPanel).join('')}
  <section class="card"><h2>Trend across Belfast</h2>
    <div class="table-scroll" tabindex="0" role="region" aria-label="Trend across Belfast"><table class="data-table compact"><thead><tr><th scope="col">Intake</th><th scope="col">Places</th><th scope="col">Target-age first choices</th><th scope="col">Per place</th><th scope="col">First choices not placed there</th><th scope="col">Oversubscribed settings</th><th scope="col">Places left</th></tr></thead>
    <tbody>${cityTrend.map(({y, t}) => `<tr><th scope="row">${y}</th><td>${num(t.places)}</td><td>${num(t.firstChoice)}</td><td>${ratio(t.demand)}</td><td>${num(t.firstChoiceMissed)}</td><td>${t.oversubscribed}</td><td>${num(t.placesLeft)}</td></tr>`).join('')}</tbody></table></div>
    <p class="small-note">Target-age first choices ${cityLatest.firstChoice < cityTrend[0].t.firstChoice ? 'fell' : cityLatest.firstChoice > cityTrend[0].t.firstChoice ? 'rose' : 'stayed'} ${cityLatest.firstChoice === cityTrend[0].t.firstChoice ? 'at ' + num(cityLatest.firstChoice) : 'from ' + num(cityTrend[0].t.firstChoice) + ' in ' + first + ' to ' + num(cityLatest.firstChoice)} in ${latest}, while places changed from ${num(cityTrend[0].t.places)} to ${num(cityLatest.places)}.</p>
  </section>
  <div class="two-col">
    <section class="card"><h2>Biggest rise in demand</h2><p class="section-sub">Change in first choices per place, ${first} to ${latest}.</p>
      ${barList([...changes].sort((a, b) => b.delta - a.delta).slice(0, 8).map(x => ({label: x.s.name, href: settingHref(x.s), value: x.delta, display: '+' + ratio(x.delta), note: `${ratio(x.a.demand)} → ${ratio(x.b.demand)}`})))}</section>
    <section class="card"><h2>Biggest fall in demand</h2><p class="section-sub">Change in first choices per place, ${first} to ${latest}.</p>
      ${barList([...changes].sort((a, b) => a.delta - b.delta).slice(0, 8).map(x => ({label: x.s.name, href: settingHref(x.s), value: -x.delta, display: '−' + ratio(-x.delta), note: `${ratio(x.a.demand)} → ${ratio(x.b.demand)}`})), {colour: SERIES.places})}</section>
  </div>
  <p class="small-note">A demand ratio is a rough guide only. Settings’ criteria decide who is offered a place, and a high ratio can hide many children who qualified under higher criteria.</p>
</div>`
  })});

  /* ---------- Guide ---------- */
  const window = y => `2 July ${y - 4} – 1 July ${y - 3}`;
  pages.push({path: 'guide/', html: layout({
    title: `How preschool admissions work in Belfast | ${SITE_NAME}`,
    description: 'A plain-English guide to funded preschool admissions in Belfast: age groups, criteria, Stage 1 and Stage 2, ranking preferences and what to do if your child is not placed.',
    path: 'guide/', active: 'guide', crumbs: [['Guide', 'guide/']],
    body: `<div class="page-container guide-page">
  <header class="page-heading"><p class="eyebrow">GUIDE</p><h1>How funded preschool admissions work</h1>
    <p>A plain-English walk-through for Belfast families applying for September ${intake}. Rules can change between years, so confirm the details with the Education Authority before you apply.</p></header>
  <div class="guide-layout">
    <nav class="guide-toc" aria-label="On this page"><p class="eyebrow">ON THIS PAGE</p><ol>
      <li><a href="#age-check">Check your child’s age group</a></li><li><a href="#dates">Key dates</a></li><li><a href="#settings">Types of setting</a></li>
      <li><a href="#criteria">How places are decided</a></li><li><a href="#ranking">Ranking your preferences</a></li><li><a href="#stages">Stage 1 and Stage 2</a></li>
      <li><a href="#no-place">If your child is not placed</a></li><li><a href="#using">Using this planner</a></li></ol></nav>
    <div class="guide-body">
      <section class="card" id="age-check"><h2>1. Check your child’s age group</h2>
        <p>Funded pre-school education is for children in their <strong>final pre-school year</strong>. They are called <strong>target age</strong> and are placed first. Children a year younger are <strong>underage</strong>. They are only offered places left after target-age children have been placed, so underage places are much less certain.</p>
        ${ageChecker('guide', intake)}
        <div class="table-scroll" tabindex="0" role="region" aria-label="Age groups by intake"><table class="data-table compact"><caption>Age groups by intake</caption><thead><tr><th scope="col">Starting in</th><th scope="col">Target age if born</th><th scope="col">Underage if born</th></tr></thead>
        <tbody>${[0, 1, 2].map(i => intake + i).map(y => `<tr><th scope="row">September ${y}</th><td>${window(y)}</td><td>${window(y + 1)}</td></tr>`).join('')}</tbody></table></div>
        <p class="small-note">Summer-born children may be able to defer starting school in some circumstances. See ${ext(OFFICIAL.deferral, 'nidirect guidance on deferral')} and ask the Education Authority before applying.</p>
      </section>
      <section class="card" id="dates"><h2>2. Key dates for September ${intake}</h2>${timeline(steps)}<p class="small-note">${ext(OFFICIAL.dates, 'Check the official timetable')} for offer and Stage 2 dates.</p></section>
      <section class="card" id="settings"><h2>3. Types of setting</h2>
        <p>Funded places in Belfast are offered by:</p>
        <ul class="guide-list"><li><strong>Nursery schools and nursery units</strong> in primary schools. Programmes are listed as full-time (FT) or part-time (PT) where a setting runs both.</li>
        <li><strong>Voluntary and private settings</strong> such as playgroups (often “PG” in names), funded through the Pre-School Education Programme for their funded places.</li>
        <li><strong>Irish-medium</strong> settings (naíscoileanna) and <strong>integrated</strong> settings.</li></ul>
        <p>Session lengths differ between settings and programmes. Check hours on each setting’s profile, especially if you need to fit work or wraparound care around them.</p>
        <p>The directory’s <a href="${href('settings/')}">type filter</a> uses the management type the Education Authority publishes.</p>
      </section>
      <section class="card" id="criteria"><h2>4. How places are decided</h2>
        <p>When a setting has more applicants than places, it uses its published <strong>admissions criteria</strong> in order. Target-age children come before underage children. Statutory rules have required priority for target-age children from socially disadvantaged circumstances. Settings then add their own criteria, for example:</p>
        <ul class="guide-list"><li>a brother or sister at the setting or school;</li><li>a first or only child, or a family connection to the setting;</li><li>distance from home, often measured in a straight line;</li><li>listing the setting as a first preference (only some settings use this).</li></ul>
        <div class="alert alert-info"><span class="alert-icon" aria-hidden="true">i</span><div>${esc(content.policyNote)}</div></div>
        <p>You may need to provide evidence for the criteria you rely on. The application and each setting’s criteria explain what is accepted.</p>
      </section>
      <section class="card" id="ranking"><h2>5. Ranking your preferences</h2>
        <ul class="guide-list"><li><strong>Rank in your true order.</strong> Put the setting you most want first.</li>
        <li><strong>Check for first-preference rules.</strong> If a setting gives priority to first preferences, ranking it lower may reduce your chance there. The planner warns you where this site has a criteria summary.</li>
        <li><strong>Add realistic options.</strong> If your favourites turned away first-choice applicants in recent years, add settings that had places left. Use the <a href="${href('settings/?status=spaces')}">“Places left” filter</a>.</li>
        <li><strong>Only list settings you would accept.</strong> Think about travel, session hours and wraparound care for each one.</li></ul>
      </section>
      <section class="card" id="stages"><h2>6. Stage 1 and Stage 2</h2>
        <p><strong>Stage 1</strong> covers applications made on time. Settings apply their criteria and children are offered places.</p>
        <p><strong>Stage 2</strong> fills places that remain. It considers target-age children still without a place, late applications and underage children.</p>
        <p>At the end of Stage 2 the Education Authority publishes, for each setting, how many children applied and were offered a place at each preference. Those workbooks are the source for this site.</p>
      </section>
      <section class="card" id="no-place"><h2>7. If your child is not placed</h2>
        <ul class="guide-list"><li>Look at settings that had <a href="${href('settings/?status=spaces')}">places left</a> in recent years, including in neighbouring areas.</li>
        <li>Make sure your child is considered at Stage 2 and follow the Education Authority’s instructions.</li>
        <li>Contact the ${ext(OFFICIAL.admissions, 'Education Authority admissions team')} for current advice.</li></ul>
      </section>
      <section class="card" id="using"><h2>8. Using this planner</h2>
        <ol class="how-it-works"><li><span class="how-step-num">1</span><div><strong>Check the age group</strong><p>Use the checker above or in your planner.</p></div></li>
        <li><span class="how-step-num">2</span><div><strong>Explore settings</strong><p>Filter the <a href="${href('settings/')}">directory</a> by area, type and outcome, and read each setting’s page.</p></div></li>
        <li><span class="how-step-num">3</span><div><strong>Build your list</strong><p>Add up to eight settings to <a href="${href('planner/')}">your planner</a>, order them and note what matters to you.</p></div></li>
        <li><span class="how-step-num">4</span><div><strong>Check and apply</strong><p>Review the list check, read the criteria, then apply through the Education Authority.</p></div></li></ol>
      </section>
    </div>
  </div>
</div>`
  })});

  /* ---------- FAQ ---------- */
  const allFaq = FAQ.flatMap(g => g.items);
  pages.push({path: 'faq/', html: layout({
    title: `Preschool admissions questions | ${SITE_NAME}`,
    description: 'Answers to common questions about funded preschool places in Belfast: age groups, dates, how many settings to list and what the figures mean.',
    path: 'faq/', active: 'faq', crumbs: [['FAQ', 'faq/']], jsonld: [faqJsonLd(allFaq)],
    body: `<div class="page-container">
  <header class="page-heading"><p class="eyebrow">QUESTIONS</p><h1>Frequently asked questions</h1><p>Short answers for Belfast families. For anything about your own application, contact the Education Authority.</p></header>
  ${FAQ.map(g => `<section class="faq-section"><h2 class="sub-title">${esc(g.group)}</h2>${faqBlock(g.items, base)}</section>`).join('')}
</div>`
  })});

  /* ---------- About ---------- */
  pages.push({path: 'about/', html: layout({
    title: `About the data | ${SITE_NAME}`,
    description: 'Where the Belfast Preschool Planner figures come from, how they are processed and what they can and cannot tell you.',
    path: 'about/', active: 'about', crumbs: [['About the data', 'about/']],
    body: `<div class="page-container about-page">
  <header class="page-heading"><p class="eyebrow">ABOUT THE DATA</p><h1>Where the figures come from</h1>
    <p>Every number on this site comes from the Education Authority’s published “Analysis of Preference” workbooks, counted at the end of Stage 2. Nothing is estimated or modelled.</p></header>
  <section class="card"><h2>Source workbooks</h2>
    <div class="table-scroll" tabindex="0" role="region" aria-label="Source workbooks"><table class="data-table compact"><thead><tr><th scope="col">Intake</th><th scope="col">Age groups</th><th scope="col">As at</th><th scope="col">File</th><th scope="col">SHA-256</th></tr></thead>
    <tbody>${sources.map(s => `<tr><th scope="row">${esc(s.year)}</th><td>${{both: 'Target and underage', target: 'Target age', underage: 'Underage'}[s.cohort]}</td><td>${esc(s.asOf)}</td><td>${ext(s.url, 'Download')}</td><td><code class="hash">${esc(s.sha256.slice(0, 12))}…</code></td></tr>`).join('')}</tbody></table></div>
    <p class="small-note">${ext(OFFICIAL.data, 'Education Authority admissions support page')} · ${ext(OFFICIAL.find, 'Find a school')}</p>
  </section>
  <div class="two-col">
    <section class="card"><h2>What we count</h2><dl class="definitions">
      <dt>Funded places</dt><dd>The programme’s admission number plus any temporary adjustment, as published. Places are shared by both age groups. Where a setting reports full-time and part-time programmes separately, their places are added.</dd>
      <dt>First choices</dt><dd>Target-age children who listed the setting as their first preference.</dd>
      <dt>First choices not placed</dt><dd>First-choice target-age applicants minus those offered a place there. They may have been placed elsewhere.</dd>
      <dt>Places left after Stage 2</dt><dd>Places minus all children offered a place in either age group, worked out per programme and never below zero.</dd>
      <dt>First choices per place</dt><dd>First choices divided by funded places. Above 1 means more children chose it first than it had places.</dd>
      <dt>Outcome labels</dt><dd>${['oversubscribed', 'full', 'spaces'].map(k => `${badge(k)} ${esc(STATUS[k].text)}`).join('<br>')}</dd>
    </dl></section>
    <section class="card"><h2>What the figures cannot tell you</h2><ul class="guide-list">
      <li>Your child’s chance of a place. That depends on criteria and on the other applicants, which are not published.</li>
      <li>Live vacancies. Offers, refusals and withdrawals after Stage 2 are not included.</li>
      <li>Next year’s demand. Birth rates, new settings and changes to criteria all move it.</li>
      <li>Why a child was not placed. A child counted as not placed at their first choice may have been placed elsewhere.</li></ul>
      <h3 class="sub-title">Coverage</h3>
      <p>The directory covers the ${schools.length} settings recorded under Belfast City Council in the ${latest} workbook. Earlier years are matched by DE reference number. Settings that closed before ${latest} are not listed. Criteria summaries exist only for a few settings and are written by hand.</p>
      <h3 class="sub-title">Corrections</h3>
      <p>If something looks wrong, compare it with the source workbook above. The importer stops rather than guessing when a file changes shape.</p>
    </section>
  </div>
  <section class="card"><h2>Reproduce the data</h2><p>The importer, tests and site build are open source. Run <code>python3 scripts/import_data.py</code> to download and check the workbooks, then <code>npm test</code> and <code>npm run build</code>.</p></section>
</div>`
  })});

  /* ---------- 404 ---------- */
  pages.push({path: '404.html', file: '404.html', html: layout({
    title: `Page not found | ${SITE_NAME}`, description: 'This page could not be found.', path: '404.html', noindex: true,
    body: `<div class="page-container not-found"><p class="eyebrow">PAGE NOT FOUND</p><h1>We couldn’t find that page</h1><p>It may have moved. Try the <a href="${href('settings/')}">settings directory</a> or go <a href="${href('')}">back home</a>.</p>
      <img src="${href('images/kindergarten-play-small.webp')}" alt="" width="480" height="320" loading="lazy"></div>`
  })});

  return pages;
}
