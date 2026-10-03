#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

from lxml import etree, html
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "data" / "pioneer-articles.json"


class DoiReleaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.data = json.loads(REGISTRY.read_text(encoding="utf-8"))
        cls.records = cls.data["records"]

    def test_exact_registry(self) -> None:
        self.assertEqual(len(self.records), 60)
        self.assertEqual([r["article_id"] for r in self.records], [f"e{i:03d}" for i in range(1, 61)])
        dois = [r["registered_doi"] for r in self.records]
        self.assertEqual(len(set(dois)), 60)

    def test_registered_doi_mapping_and_issue_architecture(self) -> None:
        for number, record in enumerate(self.records, 1):
            eid = f"e{number:03d}"
            doi = f"10.68232/cj.{eid}"
            self.assertEqual(record["article_id"], eid)
            self.assertEqual(record["registered_doi"], doi)
            self.assertEqual(record["doi_status"], "REGISTERED")
            self.assertEqual(record["canonical_doi_url"], "https://doi.org/" + doi)
            self.assertIn("https://doi.org/" + doi, record["recommended_citation"])
            self.assertEqual(record["volume"], "1")
            self.assertEqual(record["issue"], "1" if number <= 25 else "2")
            self.assertEqual(record["issue_title"], "Pioneer Volume · July 2026 · Part 1" if number <= 25 else "Pioneer Volume · August 2026 · Part 2")

    def test_article_html_and_jsonld(self) -> None:
        for record in self.records:
            eid = record["article_id"]
            for path in (ROOT / "papers" / eid / "index.html", ROOT / "papers" / eid / "html" / "index.html"):
                self.assertTrue(path.is_file(), path)
                raw = path.read_text(encoding="utf-8")
                doc = html.fromstring(raw)
                self.assertEqual(doc.xpath('string(//html/@lang)'), "en")
                self.assertEqual(len(doc.xpath('//link[@rel="canonical"]')), 1)
                self.assertEqual(doc.xpath('string(//meta[@name="citation_doi"]/@content)'), record["registered_doi"])
                self.assertEqual(doc.xpath('string(//meta[@name="citation_issue"]/@content)'), record["issue"])
                self.assertEqual(doc.xpath('string(//meta[@name="citation_volume"]/@content)'), "1")
                self.assertIn(record["canonical_doi_url"], raw)
                self.assertNotRegex(raw, r"(?i)DOI (?:registration )?pending|PENDING_REGISTRATION|TO BE REGISTERED")
                identifiers = []
                for node in doc.xpath('//script[@type="application/ld+json"]'):
                    identifiers.append(json.loads(node.text)["identifier"])
                self.assertIn(record["canonical_doi_url"], identifiers)

    def test_pdf_cover_and_metadata(self) -> None:
        for record in self.records:
            eid = record["article_id"]
            path = ROOT / "papers" / eid / "pdf" / f"{eid}.pdf"
            reader = PdfReader(str(path))
            cover = reader.pages[0].extract_text() or ""
            self.assertGreater(len(reader.pages), 1)
            self.assertIn(record["registered_doi"], cover)
            self.assertIn(f"Volume 1, Issue {record['issue']}", cover)
            self.assertIn(record["title"], reader.metadata.title)
            self.assertNotRegex(cover, r"(?i)DOI (?:registration )?pending|TO BE REGISTERED")

    def test_part_one_full_text_preserves_source_body(self) -> None:
        evidence_root = ROOT / "crossref" / "2026-pioneer" / "source-evidence"
        for record in self.records[:25]:
            source = evidence_root / "papers" / record["article_id"] / "index.html"
            source_text = " ".join(html.fromstring(source.read_text(encoding="utf-8")).text_content().split())
            output = ROOT / "papers" / record["article_id"] / "html" / "index.html"
            output_text = " ".join(html.fromstring(output.read_text(encoding="utf-8")).text_content().split())
            # The wrapper adds metadata, while only old navigation/citation furniture
            # is removed. A large drop is therefore evidence of lost article content.
            self.assertGreaterEqual(len(output_text), int(len(source_text) * 0.85), record["article_id"])

    def test_public_explanatory_video_records(self) -> None:
        published_video_ids = {"e002", "e003", "e004", "e005"}
        for record in self.records:
            eid = record["article_id"]
            video = record.get("video") or {}
            if eid not in published_video_ids:
                self.assertFalse(video.get("url"), eid)
                continue
            expected = {
                "url": f"https://journal.chiatechsolutions.com/papers/{eid}/media/{eid}-explanatory-summary.mp4",
                "poster_url": f"https://journal.chiatechsolutions.com/papers/{eid}/media/{eid}-explanatory-summary-poster.png",
                "captions_vtt_url": f"https://journal.chiatechsolutions.com/papers/{eid}/media/{eid}-explanatory-summary.vtt",
                "transcript_url": f"https://journal.chiatechsolutions.com/papers/{eid}/explanatory-transcript.html",
            }
            for key, value in expected.items():
                self.assertEqual(video.get(key), value, f"{eid} {key}")
            for relative in (
                f"papers/{eid}/media/{eid}-explanatory-summary.mp4",
                f"papers/{eid}/media/{eid}-explanatory-summary-poster.png",
                f"papers/{eid}/media/{eid}-explanatory-summary.vtt",
                f"papers/{eid}/explanatory-transcript.html",
            ):
                self.assertGreater((ROOT / relative).stat().st_size, 0, relative)
            landing = (ROOT / "papers" / eid / "index.html").read_text(encoding="utf-8")
            self.assertIn("<video controls", landing)
            self.assertIn(expected["poster_url"], landing)
            self.assertIn(expected["captions_vtt_url"], landing)
            captions = (ROOT / "papers" / eid / "media" / f"{eid}-explanatory-summary.vtt").read_text(encoding="utf-8")
            self.assertIn(f"10.68232/cj.{eid}", captions)
            self.assertNotRegex(captions, r"(?i)DOI (?:registration )?pending")
        copy_paste = (ROOT / "reports" / "doi-release" / "CHIEF_EDITOR_VIDEO_COPY_PASTE_e002-e005.txt").read_text(encoding="utf-8")
        for eid in published_video_ids:
            self.assertIn(f"ARTICLE ID: {eid}", copy_paste)
            self.assertIn(f"10.68232/cj.{eid}", copy_paste)

    def test_manifest_and_internal_links(self) -> None:
        manifest = json.loads((ROOT / "data" / "public-asset-manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(len(manifest["articles"]), 60)
        self.assertEqual([a["id"] for a in manifest["articles"]], [f"e{i:03d}" for i in range(1, 61)])
        for article in manifest["articles"]:
            paths = {item["path"] for item in article["files"]}
            eid = article["id"]
            self.assertIn(f"papers/{eid}/index.html", paths)
            self.assertIn(f"papers/{eid}/html/index.html", paths)
            self.assertIn(f"papers/{eid}/pdf/{eid}.pdf", paths)
            for item in article["files"]:
                path = ROOT / item["path"]
                self.assertTrue(path.is_file(), path)
                self.assertEqual(path.stat().st_size, item["bytes"])

    def test_discovery_and_legacy_routes(self) -> None:
        etree.parse(str(ROOT / "sitemap.xml"))
        etree.parse(str(ROOT / "feed.xml"))
        sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
        redirects = (ROOT / "_redirects").read_text(encoding="utf-8")
        for record in self.records:
            self.assertIn(record["html_url"], sitemap)
            if record["issue"] == "2":
                eid = record["article_id"]
                self.assertIn(f"/papers/2026_V1I1_PIONEER_JULY_AUGUST_PART2/{eid}/html/{eid}.html /papers/{eid}/ 301!", redirects)


if __name__ == "__main__":
    unittest.main(verbosity=2)
