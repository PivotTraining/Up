"""
Axis Vault Scanner — File Discovery and Text Extraction

Walks configured paths (Vault drive + local document folders),
discovers supported file types, and extracts plain text for embedding.

Supported formats:
  .txt, .md     — read directly
  .pdf          — pdfplumber (already an OpenJarvis optional dep)
  .docx         — zipfile + XML extraction (no pandoc needed)
  .csv          — read as plain text rows

Files are fingerprinted by path + mtime to skip unchanged documents
on re-index runs.
"""

from __future__ import annotations

import hashlib
import os
import zipfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator, Optional


# ── Configurable scan paths ───────────────────────────────────────────────────

DEFAULT_SCAN_PATHS = [
    "/Volumes/The Vault 2",                          # External Vault drive
    os.path.expanduser("~/Documents"),               # Local documents
    os.path.expanduser("~/Downloads"),               # Downloads (proposals, scripts)
    os.path.expanduser("~/Desktop"),                 # Desktop projects
]

SUPPORTED_EXTENSIONS = {".txt", ".md", ".pdf", ".docx", ".csv"}

# Paths to always skip
SKIP_PATTERNS = [
    "node_modules", ".git", ".venv", "__pycache__",
    "Library", ".Trash", ".cursor", ".nvm",
    "ChromeUserData", "Application Support",
]

# Max file size to index (10 MB)
MAX_FILE_BYTES = 10 * 1024 * 1024


@dataclass
class ScannedFile:
    path: Path
    extension: str
    size_bytes: int
    fingerprint: str        # sha256 of path + mtime — changes when file changes
    text: str = ""
    error: Optional[str] = None

    @property
    def name(self) -> str:
        return self.path.name

    @property
    def relative_label(self) -> str:
        """Human-readable path label for the source field."""
        try:
            return str(self.path.relative_to(Path.home()))
        except ValueError:
            return str(self.path)


def _should_skip(path: Path) -> bool:
    for part in path.parts:
        if any(skip in part for skip in SKIP_PATTERNS):
            return True
    return False


def _fingerprint(path: Path) -> str:
    stat = path.stat()
    raw = f"{path}{stat.st_mtime}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


# ── Text extractors ───────────────────────────────────────────────────────────

def _extract_txt(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def _extract_md(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def _extract_docx(path: Path) -> str:
    """Extract text from .docx using zipfile + XML — no external tools needed."""
    texts: list[str] = []
    ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    try:
        with zipfile.ZipFile(path) as z:
            with z.open("word/document.xml") as f:
                tree = ET.parse(f)
                root = tree.getroot()
                for p in root.iter(f"{{{ns}}}p"):
                    runs = []
                    for t in p.iter(f"{{{ns}}}t"):
                        if t.text:
                            runs.append(t.text)
                    line = "".join(runs).strip()
                    if line:
                        texts.append(line)
    except Exception as e:
        return f"[docx extraction error: {e}]"
    return "\n".join(texts)


def _extract_pdf(path: Path) -> str:
    """Extract text from PDF using pdfplumber."""
    try:
        import pdfplumber
        texts: list[str] = []
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages[:30]:  # cap at 30 pages
                t = page.extract_text()
                if t:
                    texts.append(t)
        return "\n".join(texts)
    except ImportError:
        return "[PDF extraction requires pdfplumber: uv add pdfplumber]"
    except Exception as e:
        return f"[PDF extraction error: {e}]"


def _extract_csv(path: Path) -> str:
    """Read CSV as plain text — let the embedder handle it."""
    try:
        return path.read_text(encoding="utf-8", errors="ignore")[:8000]
    except Exception:
        return ""


_EXTRACTORS = {
    ".txt":  _extract_txt,
    ".md":   _extract_md,
    ".docx": _extract_docx,
    ".pdf":  _extract_pdf,
    ".csv":  _extract_csv,
}


# ── Scanner ───────────────────────────────────────────────────────────────────

class VaultScanner:
    """
    Discovers and extracts text from documents across configured paths.

    Usage:
        scanner = VaultScanner()
        for doc in scanner.scan():
            print(doc.name, len(doc.text))
    """

    def __init__(
        self,
        paths: Optional[list[str]] = None,
        extensions: Optional[set[str]] = None,
    ) -> None:
        self._paths = [Path(p) for p in (paths or DEFAULT_SCAN_PATHS)]
        self._extensions = extensions or SUPPORTED_EXTENSIONS

    def scan(self) -> Iterator[ScannedFile]:
        """Yield ScannedFile objects for all discovered documents."""
        for base_path in self._paths:
            if not base_path.exists():
                continue
            yield from self._walk(base_path)

    def _walk(self, base: Path) -> Iterator[ScannedFile]:
        try:
            for entry in base.rglob("*"):
                if not entry.is_file():
                    continue
                if _should_skip(entry):
                    continue
                if entry.suffix.lower() not in self._extensions:
                    continue
                if entry.stat().st_size > MAX_FILE_BYTES:
                    continue

                fp = _fingerprint(entry)
                extractor = _EXTRACTORS.get(entry.suffix.lower())
                if not extractor:
                    continue

                try:
                    text = extractor(entry)
                    yield ScannedFile(
                        path=entry,
                        extension=entry.suffix.lower(),
                        size_bytes=entry.stat().st_size,
                        fingerprint=fp,
                        text=text,
                    )
                except Exception as e:
                    yield ScannedFile(
                        path=entry,
                        extension=entry.suffix.lower(),
                        size_bytes=entry.stat().st_size,
                        fingerprint=fp,
                        error=str(e),
                    )
        except PermissionError:
            pass
