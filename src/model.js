export function restoreShortlist(value, validIds) {
  const ids = Array.isArray(value) ? value : [];
  return [...new Set(ids.filter(id => validIds.has(id)))].slice(0, 5);
}

export function recordsFor(school, year, cohort) {
  return (school.history[year] || []).filter(row => row.cohort === cohort);
}

export function searchSchools(schools, query, area) {
  const term = query.trim().toLocaleLowerCase('en-GB');
  return schools.filter(school =>
    (!area || school.area === area) && school.name.toLocaleLowerCase('en-GB').includes(term));
}
