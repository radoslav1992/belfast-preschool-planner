"""Build a Belfast directory from official End of Stage 2 workbooks."""
import argparse
from collections import defaultdict
from io import BytesIO
import json
from pathlib import Path
from urllib.parse import unquote, urlparse
from urllib.request import urlopen

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]


def read_sheet(source, local_dir):
    url = source["url"]
    if local_dir:
        raw = (local_dir / unquote(urlparse(url).path.split("/")[-1])).read_bytes()
    else:
        with urlopen(url, timeout=60) as response:
            raw = response.read()
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
    latest = next(rows for s, rows in sheets if s["year"] == "2026/27")
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
        older = year == "2024/25"
        start = 5 if year == "2025/26" else 7
        header = rows[0] if older else rows[1]
        if "1st" not in str(header[start]) or "Total" not in str(header[start + 4]):
            raise ValueError(f"Review columns for {year}")
        for row in rows[1 if older else 2:]:
            code = str(row[1] if older else row[0])
            if code not in schools:
                continue
            name = row[2] if older else row[1]
            # Preserve programmes reported separately under a single school number.
            cohorts = [s["cohort"]] if older else ["target", "underage"]
            for index, cohort in enumerate(cohorts):
                at = start + 10 * index
                apps = counts(row[at:at+5])
                allocated = counts(row[at+5:at+10])
                if any(n > a for n, a in zip(allocated, apps)):
                    raise ValueError(f"Allocations exceed applications for {code}")
                schools[code]["history"][year].append(dict(programme=name, cohort=cohort, applications=apps, allocated=allocated))
    return sorted(schools.values(), key=lambda s: s["name"].casefold())


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--from-dir", type=Path, help="Use previously downloaded workbooks")
    opts = parser.parse_args()
    sources = json.loads((ROOT / "data/sources.json").read_text())
    schools = assemble(sources, opts.from_dir)
    output = ROOT / "data/schools.json"
    temporary = output.with_suffix(".tmp")
    temporary.write_text(json.dumps(schools, ensure_ascii=False, separators=(",", ":")) + "\n")
    temporary.replace(output)
    print(f"Imported {len(schools)} settings in Belfast council.")
