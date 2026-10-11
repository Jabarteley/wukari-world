#!/usr/bin/env python3
"""Build and render static contact pages from an existing browser evidence artifact."""

from __future__ import annotations

import hashlib
import html
import json
import math
import os
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile


def png_size(path: Path) -> tuple[int, int]:
    with path.open("rb") as image:
        header = image.read(24)
    if len(header) != 24 or header[:8] != b"\x89PNG\r\n\x1a\n" or header[12:16] != b"IHDR":
        raise ValueError(f"not a valid PNG header: {path}")
    width, height = struct.unpack(">II", header[16:24])
    if width == 0 or height == 0:
        raise ValueError(f"invalid PNG dimensions: {path}")
    return width, height


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def artifact_provenance(artifact: Path, city: str, artifact_run_id: int, app_sha: str, driver_sha: str) -> dict[str, object]:
    receipts = list(artifact.rglob("source-driver-provenance.json"))
    if len(receipts) > 1:
        raise ValueError(f"expected at most one source-driver-provenance.json, found {len(receipts)}")
    if receipts:
        receipt_path = receipts[0]
        provenance = json.loads(receipt_path.read_text(encoding="utf-8"))
        if provenance.get("repository") != "kromate/joinallworld":
            raise ValueError("artifact source-driver provenance names an unexpected repository")
        if provenance.get("appSha") != app_sha or provenance.get("driverSha") != driver_sha:
            raise ValueError("artifact source-driver provenance does not match the requested app and driver SHAs")
        if city not in provenance.get("cities", []):
            raise ValueError("artifact source-driver provenance does not include the requested city")
        return {
            "kind": "city-browser-recapture",
            "repository": provenance["repository"],
            "buildRunId": provenance.get("buildRunId"),
            "artifactRunId": artifact_run_id,
            "sourceDriverProvenancePath": receipt_path.relative_to(artifact).as_posix(),
            "sourceDriverProvenance": provenance,
        }

    def unique_file(name: str) -> Path:
        matches = list(artifact.rglob(name))
        if len(matches) != 1:
            raise ValueError(f"expected one {name}, found {len(matches)}")
        return matches[0]

    app_file = unique_file("app-sha.txt")
    driver_file = unique_file("driver-sha.txt")
    verification_file = unique_file("dist-verification.log")
    if app_file.read_text(encoding="utf-8").strip() != app_sha:
        raise ValueError("artifact app-sha.txt does not match the requested app SHA")
    if driver_file.read_text(encoding="utf-8").strip() != driver_sha:
        raise ValueError("artifact driver-sha.txt does not match the requested driver SHA")
    verification_text = verification_file.read_text(encoding="utf-8")
    verification_lines = verification_text.splitlines()
    if not verification_lines or any(not line.strip() or not line.rstrip().endswith(": OK") for line in verification_lines):
        raise ValueError("artifact dist-verification.log is empty or contains a failed checksum")
    return {
        "kind": "city-browser-fast-workflow",
        "repository": "kromate/joinallworld",
        "buildRunId": artifact_run_id,
        "artifactRunId": artifact_run_id,
        "appShaFile": {"path": app_file.relative_to(artifact).as_posix(), "value": app_sha},
        "driverShaFile": {"path": driver_file.relative_to(artifact).as_posix(), "value": driver_sha},
        "distVerificationLog": {
            "path": verification_file.relative_to(artifact).as_posix(),
            "sha256": sha256(verification_file),
            "verifiedFiles": len(verification_lines),
        },
    }


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--city", required=True)
    parser.add_argument("--artifact-run-id", required=True, type=int)
    parser.add_argument("--app-sha", required=True)
    parser.add_argument("--driver-sha", required=True)
    args = parser.parse_args()

    artifact = args.artifact.resolve(strict=True)
    out = args.out.resolve()
    provenance = artifact_provenance(artifact, args.city, args.artifact_run_id, args.app_sha, args.driver_sha)

    images = sorted(path for path in artifact.rglob("*.png") if out not in path.parents)
    if not images:
        raise ValueError("the browser artifact contains no PNG evidence")
    groups: dict[str, list[Path]] = {"desktop": [], "390": [], "320": []}
    for path in images:
        name = path.name
        group = "390" if "-phone390-" in name else "320" if "-phone320-" in name else "desktop"
        groups[group].append(path)

    out.mkdir(parents=True, exist_ok=True)
    pages: list[dict[str, object]] = []
    for group, files in groups.items():
        per_page, columns = (8, 2) if group == "desktop" else (10, 5)
        for offset in range(0, len(files), per_page):
            chunk = files[offset : offset + per_page]
            card_width = (1500 - 40 - 12 * (columns - 1)) / columns
            sizes = [png_size(path) for path in chunk]
            height = math.ceil(
                90
                + sum(
                    max(card_width * h / w + 46 for w, h in sizes[row : row + columns]) + 12
                    for row in range(0, len(sizes), columns)
                )
            )
            page_number = offset // per_page + 1
            page = out / f"{group}-{page_number}.html"
            screenshot = page.with_suffix(".png")
            cards = "".join(
                '<figure><img src="'
                + html.escape(os.path.relpath(source, out), quote=True)
                + '"><figcaption>'
                + html.escape(source.name)
                + "</figcaption></figure>"
                for source in chunk
            )
            page.write_text(
                '<!doctype html><html lang="en"><meta charset="utf-8">'
                '<meta name="viewport" content="width=device-width,initial-scale=1">'
                f"<title>{html.escape(args.city)} capture contacts</title>"
                "<style>*{box-sizing:border-box}body{margin:0;padding:20px;background:#eef1ee;"
                "font:13px system-ui}h1{font-size:20px;margin:0 0 18px}main{display:grid;"
                f"grid-template-columns:repeat({columns},1fr);gap:12px}}figure{{margin:0;background:white}}"
                "img{display:block;width:100%;height:auto}figcaption{padding:8px;min-height:46px;"
                "overflow-wrap:anywhere}</style></head><body>"
                f"<h1>{html.escape(args.city)} · {group} · page {page_number}</h1><main>{cards}</main></body></html>",
                encoding="utf-8",
            )
            pages.append(
                {
                    "html": page.name,
                    "png": screenshot.name,
                    "width": 1500,
                    "height": height,
                    "sources": [
                        {"path": source.relative_to(artifact).as_posix(), "sha256": sha256(source)}
                        for source in chunk
                    ],
                }
            )

    manifest = {
        "schemaVersion": 1,
        "city": args.city,
        "repository": "kromate/joinallworld",
        "artifactRunId": args.artifact_run_id,
        "buildRunId": provenance.get("sourceDriverProvenance", {}).get("buildRunId"),
        "appSha": args.app_sha,
        "driverSha": args.driver_sha,
        "provenance": provenance,
        "sourcePngCount": len(images),
        "pages": pages,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    chrome = os.environ.get("CHROME_BIN") or shutil.which("google-chrome")
    if not chrome:
        raise RuntimeError("Chrome was not found; set CHROME_BIN or install google-chrome")
    with tempfile.TemporaryDirectory(prefix="aw-city-capture-contacts-") as profile:
        for page in pages:
            page_path = out / str(page["html"])
            screenshot_path = out / str(page["png"])
            command = [
                chrome,
                "--headless=new",
                "--no-sandbox",
                "--disable-gpu",
                "--hide-scrollbars",
                "--no-first-run",
                "--no-default-browser-check",
                f"--user-data-dir={profile}",
                "--allow-file-access-from-files",
                "--virtual-time-budget=1000",
                f"--window-size={page['width']},{page['height']}",
                f"--screenshot={screenshot_path}",
                page_path.as_uri(),
            ]
            subprocess.run(command, timeout=30, check=True)
            if not screenshot_path.is_file() or screenshot_path.stat().st_size == 0:
                raise RuntimeError(f"Chrome did not produce {screenshot_path.name}")

    print(json.dumps({"city": args.city, "sourcePngs": len(images), "contactPages": len(pages)}))


if __name__ == "__main__":
    main()
