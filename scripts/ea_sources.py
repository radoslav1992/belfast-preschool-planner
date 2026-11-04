"""Discover official EA publications and link settings to the preschool directory."""
from datetime import datetime
from html.parser import HTMLParser
from pathlib import PurePosixPath
import re
import subprocess
import unicodedata
from urllib.parse import unquote, urljoin, urlsplit
from xml.etree import ElementTree

ORIGIN = "https://www.eani.org.uk"
SUPPORT = ORIGIN + "/parents/pupil-applications-and-grants/admissions/admissions-support"
SITEMAP = ORIGIN + "/sitemap.xml"
DIRECTORY = ORIGIN + "/parents/types-of-school/school-type/pre-school/"

# These two directory titles differ from the workbooks. The school profiles
# give DE numbers 1010325 and 1AB-0670 respectively.
ALIASES = {
    "1010325": "ligoniel-ps-nu-formerly-glenbank-nursery-school",
    "1AB0670": "naiscoil-na-seolta-integrated-irish-medium-pre",
}


def download(url):
    if not url.startswith(ORIGIN + "/"):
        raise ValueError(f"Expected an Education Authority URL: {url}")
    return subprocess.run(
        ["curl", "--fail", "--silent", "--show-error", "--location", "--proto", "=https",
         "--proto-redir", "=https", "--max-time", "90", url],
        capture_output=True, check=True,
    ).stdout


class WorkbookLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = set()

    def handle_starttag(self, tag, attrs):
        if tag != "a":
            return
        href = dict(attrs).get("href") or ""
        url = urljoin(SUPPORT, href.strip())
        parts = urlsplit(url)
        filename = unquote(PurePosixPath(parts.path).name)
        if (url.startswith(ORIGIN + "/sites/default/files/") and
                re.search(r"pre[ -]?school.*preferenc.*\.xlsx$", filename, re.I)):
            self.urls.add(url)


def discover_sources(page, previous):
    links = WorkbookLinks()
    links.feed(page)
    found = {}
    for url in sorted(links.urls):
        name = unquote(PurePosixPath(urlsplit(url).path).name)
        year = re.search(r'\b(20\d\d)[-–](?:20)?(\d\d)\b', name)
        date = re.search(r'\bas at\s+(\d{1,2}\s+[A-Za-z]+\s+20\d\d)\b', name, re.I)
        if not year or not date or not re.search(r"end (?:of )?stage 2",name,re.I):
            raise ValueError(f"Review the new EA publication before importing: {name}")
        start, end = year.groups()
        if (int(start) + 1) % 100 != int(end):
            raise ValueError(f"Invalid intake in {name}")
        target = "target" in name.lower()
        underage = "underage" in name.lower()
        if not target and not underage:
            raise ValueError(f"Unknown age group in {name}")
        cohort = "both" if target and underage else "target" if target else "underage"
        intake = f"{start}/{end}"
        key = (intake, cohort)
        if key in found:
            raise ValueError(f"Multiple publications for {key}. Review before replacing.")
        found[key] = dict(year=intake, cohort=cohort,
                          asOf=datetime.strptime(date[1], "%d %B %Y").date().isoformat(), url=url)
    missing = {(s["year"], s["cohort"]) for s in previous} - found.keys()
    if missing or not found:
        raise ValueError(f"EA workbook links missing. Preserving previous data: {sorted(missing)}")
    for year in {s["year"] for s in found.values()}:
        cohorts = {cohort for intake, cohort in found if intake == year}
        if cohorts not in ({"both"}, {"target", "underage"}):
            raise ValueError(f"Incomplete or overlapping publications for {year}")
    return [found[key] for key in sorted(found)]


def directory_slug(name):
    # The historical FT/PT suffix identifies a programme at the same school.
    name = re.sub(r"\s+(?:FT|PT)$", "", name)
    name = unicodedata.normalize("NFKD", name.casefold()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", name.replace("'", "").replace("&", "and")).strip("-")


def attach_directory(schools, sitemap):
    urls = {n.text for n in ElementTree.fromstring(sitemap).findall(".//{*}loc")
            if n.text and n.text.startswith(DIRECTORY)}
    if not urls:
        raise ValueError("The EA sitemap contains no preschool pages")
    matched = set()
    for school in schools:
        slug = ALIASES.get(school["id"], directory_slug(school["name"]))
        url = DIRECTORY + slug
        if url in urls:
            if url in matched:
                raise ValueError(f"Ambiguous directory match for {url}")
            school["profileUrl"] = url
            matched.add(url)
    return len(matched)
