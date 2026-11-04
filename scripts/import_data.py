"""Build a Belfast directory from official End of Stage 2 workbooks."""
import argparse
from collections import defaultdict
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
from urllib.parse import unquote, urlparse
from tempfile import NamedTemporaryFile
from time import sleep

from ea_sources import SUPPORT, SITEMAP, attach_directory, discover_sources, download

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]


def read_sheet(source, local_dir):
    url = source["url"]
    if local_dir:
        raw = (local_dir / unquote(urlparse(url).path.split("/")[-1])).read_bytes()
    else:
        sleep(10)
        raw = download(url)
    source["sha256"] = sha256(raw).hexdigest()
    workbook = load_workbook(BytesIO(raw), read_only=True, data_only=True)
    try:
        return list(workbook.active.values)
    finally:
        workbook.close()


def counts(cells):
    if len(cells) != 5 or any(type(n) is not int or n < 0 for n in cells):
        raise ValueError(f"Unexpected count or suppressed entry: {cells}")
    if sum(cells[:4]) != cells[4]:
        raise ValueError(f"Preference counts do not sum to total: {cells}")
    return list(cells)


def assemble(sources, local_dir=None):
    sheets = [(s, read_sheet(s, local_dir)) for s in sources]
    current_year = max(source["year"] for source in sources)
    latest = next(rows for source, rows in sheets if source["year"] == current_year)
    if latest[1][:4] != ("DENI", "School", "ManagementType", "Council"):
        raise ValueError("Latest source schema changed")
    schools = {}
    for row in latest[2:]:
        if row[3] != "Belfast":
            continue
        code = str(row[0])
        if code in schools:
            raise ValueError(f"Multiple current programmes for {code}; review their identity")
        schools[code] = dict(id=code, name=row[1], management=row[2], area=row[4], history=defaultdict(list))
    if not schools:
        raise ValueError("Belfast council records missing")
    for s, rows in sheets:
        year = s["year"]
        older = s["cohort"] != "both"
        start = 5 if rows[1][1] == "School Name" else 7
        header = rows[0] if older else rows[1]
        capacity_column = 4 if older else start - 2
        if (header[1 if older else 0] != "DENI" or
                "adm" not in str(header[capacity_column]).lower() or
                "flex" not in str(header[capacity_column + 1]).lower() or
                "1st" not in str(header[start]) or "Total" not in str(header[start + 4])):
            raise ValueError(f"Review columns for {year}")
        if not older and [str(rows[0][start + i]).strip().lower() for i in (0, 5, 10, 15)] != [
            "target age applications", "target age allocated", "underage applications", "underage allocated"
        ]:
            raise ValueError(f"Review columns for {year}")
        cohorts = [s["cohort"]] if older else ["target", "underage"]
        for index, cohort in enumerate(cohorts):
            offset = start + 10 * index
            for j, rank in enumerate(("1st", "2nd", "3rd", "other", "total") * 2):
                label = str(header[offset + j]).strip().lower()
                if not label.startswith(rank) or (older and cohort not in label):
                    raise ValueError(f"Unexpected {cohort} preference columns in {year}")
        for row in rows[1 if older else 2:]:
            code = str(row[1] if older else row[0])
            if code not in schools:
                continue
            name = row[2] if older else row[1]
            base, flex = row[capacity_column:capacity_column + 2]
            if type(base) is not int or base < 0 or type(flex) is not int or base + flex < 0:
                raise ValueError(f"Unexpected admission number for {code} in {year}")
            capacity = base + flex
            if (older and row[6] != capacity) or (not older and start == 7 and row[27] != capacity):
                raise ValueError(f"Published capacity does not reconcile for {code} in {year}")
            # Preserve programmes reported separately under a single school number.
            for index, cohort in enumerate(cohorts):
                at = start + 10 * index
                apps = counts(row[at:at+5])
                allocated = counts(row[at+5:at+10])
                if any(n > a for n, a in zip(allocated, apps)):
                    raise ValueError(f"Allocations exceed applications for {code}")
                schools[code]["history"][year].append(dict(programme=name, cohort=cohort, capacity=capacity, applications=apps, allocated=allocated))
    return sorted(schools.values(), key=lambda s: s["name"].casefold())


def write_json(path, value, pretty=False):
    payload = (json.dumps(value, ensure_ascii=False, indent=2) if pretty else
               json.dumps(value, ensure_ascii=False, separators=(",", ":"))) + "\n"
    with NamedTemporaryFile("w", dir=path.parent, encoding="utf-8", delete=False) as f:
        f.write(payload)
    Path(f.name).replace(path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--from-dir", type=Path, help="Use previously downloaded workbooks")
    opts = parser.parse_args()
    manifest = ROOT / "data/sources.json"
    output = ROOT / "data/schools.json"
    previous = json.loads(manifest.read_text())
    if opts.from_dir:
        page = opts.from_dir / "support"
        sources = discover_sources(page.read_text(), previous) if page.exists() else previous
        directory = opts.from_dir / "sitemap"
        sitemap = directory.read_bytes() if directory.exists() else None
    else:
        sources = discover_sources(download(SUPPORT).decode("utf-8"), previous)
        sleep(10)
        sitemap = download(SITEMAP)
    schools = assemble(sources, opts.from_dir)
    prior_schools = json.loads(output.read_text()) if output.exists() else []
    prior_urls = {s["id"]: s["profileUrl"] for s in prior_schools if s.get("profileUrl")}
    if sitemap is None:
        for school in schools:
            if school["id"] in prior_urls:
                school["profileUrl"] = prior_urls[school["id"]]
    else:
        attach_directory(schools, sitemap)
        lost = [s["id"] for s in schools if s["id"] in prior_urls and not s.get("profileUrl")]
        if lost:
            raise ValueError(f"Previously matched profile URLs disappeared. Review EA changes for {lost}")
    write_json(output, schools)
    write_json(manifest, sources, pretty=True)
    print(f"Imported {len(schools)} Belfast settings from {len(sources)} workbooks; "
          f"{sum('profileUrl' in s for s in schools)} directory matches.")
