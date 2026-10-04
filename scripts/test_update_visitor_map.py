"""Regression checks for provider outages without making network requests."""

import contextlib
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError, URLError

import update_visitor_map as updater


class UpdateVisitorMapTests(unittest.TestCase):
    def test_timeout_then_success(self):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = b"source"
        with patch.object(updater, "urlopen", side_effect=[URLError("timed out"), response]) as fetch:
            with patch.object(updater.time, "sleep"):
                self.assertEqual(updater.fetch_source(), "source")
        self.assertEqual(fetch.call_count, 2)

    def test_outage_preserves_cached_file(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "visitor-map.json"
            original = updater.OUTPUT_PATH.read_bytes()
            output.write_bytes(original)
            with patch.object(updater, "OUTPUT_PATH", output), patch.object(
                updater, "urlopen", side_effect=URLError("timed out")
            ) as fetch, patch.object(updater.time, "sleep"), contextlib.redirect_stdout(io.StringIO()) as log:
                updater.main()
            self.assertEqual(fetch.call_count, 3)
            self.assertEqual(output.read_bytes(), original)
            self.assertIn("::warning::", log.getvalue())

    def test_outage_without_cache_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(updater, "OUTPUT_PATH", Path(directory) / "missing.json"), patch.object(
                updater, "fetch_source", side_effect=URLError("timed out")
            ), self.assertRaises(URLError):
                updater.main()

    def test_missing_source_page_fails_without_retry(self):
        error = HTTPError(updater.SOURCE_URL, 404, "Not Found", {}, None)
        with patch.object(updater, "urlopen", side_effect=error) as fetch, self.assertRaises(HTTPError):
            updater.main()
        self.assertEqual(fetch.call_count, 1)

    def test_unparseable_page_preserves_data_and_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "visitor-map.json"
            original = updater.OUTPUT_PATH.read_bytes()
            output.write_bytes(original)
            with patch.object(updater, "OUTPUT_PATH", output), patch.object(
                updater, "fetch_source", return_value="Unexpected page"
            ), self.assertRaises(RuntimeError):
                updater.main()
            self.assertEqual(output.read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
