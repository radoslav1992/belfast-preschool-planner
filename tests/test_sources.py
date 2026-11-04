import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from ea_sources import DIRECTORY, attach_directory, discover_sources


class RefreshTests(unittest.TestCase):
    def setUp(self):
        self.sources = json.loads((ROOT / "data/sources.json").read_text())
        self.page = "".join(f'<a href=" {s["url"]}">file</a>' for s in self.sources)

    def test_discovery_reads_official_links_once(self):
        records = discover_sources(self.page * 2, self.sources)
        expected = [{k: v for k, v in s.items() if k != "sha256"} for s in self.sources]
        self.assertEqual(records, expected)

    def test_absent_source_blocks_refresh(self):
        with self.assertRaises(ValueError):
            discover_sources(self.page.replace(self.sources[-1]["url"], "/other.xlsx"), self.sources)

    def test_directory_matches_in_sitemap_only(self):
        rows = [{"name":"Braniel PS NU (Belfast) FT", "id":"4011683"},
                {"name":"Unknown nursery", "id":"other"}]
        url = DIRECTORY + "braniel-ps-nu-belfast"
        sitemap = f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>{url}</loc></url></urlset>'
        self.assertEqual(attach_directory(rows, sitemap), 1)
        self.assertEqual(rows[0]["profileUrl"], url)
        self.assertNotIn("profileUrl", rows[1])
