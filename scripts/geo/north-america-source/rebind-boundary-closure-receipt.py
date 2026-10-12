#!/usr/bin/env python3
"""Bind a closure-assembled boundary candidate to its verified full source."""

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path


SHA256 = re.compile(r"[0-9a-fA-F]{64}\Z")


def require(condition, message):
    if not condition:
        raise ValueError("HOLD: " + message)


def read_json(path):
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"cannot read JSON receipt {path}: {error}") from error
    require(isinstance(value, dict), f"receipt must be a JSON object: {path}")
    return value


def digest_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def positive_int(value):
    return type(value) is int and value > 0


def normalized_ways(records, label):
    require(isinstance(records, list) and records, f"{label} must be a nonempty list")
    ways = []
    for member in records:
        require(isinstance(member, dict), f"{label} contains a non-object")
        if "id" in member:
            way_id, role = member.get("id"), member.get("role")
        else:
            require(member.get("type") == "w", f"{label} contains a non-way member")
            way_id, role = member.get("ref"), member.get("role")
        require(positive_int(way_id), f"{label} contains an invalid way ID")
        require(isinstance(role, str), f"{label} contains an invalid way role")
        ways.append((way_id, role))
    require(len(ways) == len(set(ways)), f"{label} contains duplicate way ID/role pairs")
    return sorted(ways)


def validate_relation_match(closure, helper):
    require(closure.get("countryISO") == helper.get("countryISO"), "country ISO differs")
    cr, hr = closure.get("relation"), helper.get("relation")
    require(isinstance(cr, dict) and isinstance(hr, dict), "relation records are required")
    for field in ("id", "version", "timestamp", "tags"):
        require(cr.get(field) == hr.get(field), f"relation {field} differs")
    helper_relation_ways = [m for m in hr.get("members", [])
                            if isinstance(m, dict) and m.get("type") == "w"]
    closure_ways = normalized_ways(cr.get("acceptedBoundaryWays"), "closure acceptedBoundaryWays")
    relation_ways = normalized_ways(helper_relation_ways, "helper relation way members")
    helper_manifest = normalized_ways(helper.get("memberWays"), "helper memberWays")
    require(closure_ways == relation_ways == helper_manifest,
            "accepted boundary way IDs/roles differ across closure and helper")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_receipt", type=Path, help="SOURCE_VERIFIED full-PBF receipt")
    parser.add_argument("closure_receipt", type=Path, help="BOUNDARY_CLOSURE_EXTRACTED receipt")
    parser.add_argument("boundary_receipt", type=Path, help="helper-generated candidate receipt")
    parser.add_argument("--subset-pbf", required=True, type=Path,
                        help="actual boundary-closure.pbf produced by the extractor")
    parser.add_argument("--out", required=True, type=Path, help="new output receipt path")
    args = parser.parse_args()

    inputs = [path.resolve(strict=True) for path in
              (args.source_receipt, args.closure_receipt, args.boundary_receipt)]
    require(all(path.is_file() for path in inputs), "all input receipts must be regular files")
    subset_pbf = args.subset_pbf.resolve(strict=True)
    require(subset_pbf.is_file(), "subset PBF must be a regular file")
    output = args.out.resolve()
    subset_copy = output.with_name("subset-receipt.json")
    require(output not in inputs and subset_copy not in inputs,
            "output paths must not overwrite any input receipt")
    require(not output.exists() and not subset_copy.exists(), "output receipt paths must be new")

    source_receipt, closure, helper = [read_json(path) for path in inputs]
    require(source_receipt.get("status") == "SOURCE_VERIFIED", "source receipt status is not SOURCE_VERIFIED")
    src = source_receipt.get("source", source_receipt)
    require(isinstance(src, dict), "source metadata is missing")
    source_sha = src.get("sha256", source_receipt.get("sha256"))
    source_bytes = src.get("bytes", source_receipt.get("bytes"))
    source_url = src.get("url", src.get("sourceUrl", source_receipt.get("url", source_receipt.get("sourceUrl"))))
    source_date = src.get("date", src.get("snapshotDate", source_receipt.get("date", source_receipt.get("snapshotDate"))))
    source_iso = source_receipt.get("countryISO", src.get("countryISO"))
    require(isinstance(source_sha, str) and SHA256.fullmatch(source_sha), "verified full-source SHA-256 is missing or invalid")
    require(positive_int(source_bytes), "verified full-source byte count is missing or invalid")
    require(isinstance(source_url, str) and source_url.startswith("https://"), "verified full-source URL is missing or invalid")
    require(isinstance(source_date, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", source_date),
            "verified full-source date is missing or invalid")
    require(isinstance(source_iso, str) and re.fullmatch(r"[A-Z]{2}", source_iso),
            "verified full-source country ISO is missing or invalid")

    require(closure.get("status") == "BOUNDARY_CLOSURE_EXTRACTED", "closure receipt status is invalid")
    require(closure.get("countryISO") == source_iso,
            "closure country ISO differs from source receipt")
    csrc = closure.get("source")
    require(isinstance(csrc, dict), "closure source metadata is missing")
    require(csrc.get("sha256", "").lower() == source_sha.lower(), "closure parent source SHA-256 differs")
    require(csrc.get("bytes") == source_bytes, "closure parent source byte count differs")
    closure_date = csrc.get("headerDate", csrc.get("expectedHeaderDate"))
    require(closure_date == source_date, "closure parent source date differs")
    source_header = csrc.get("headerTimestamp")
    require(isinstance(source_header, str) and source_header.startswith(source_date + "T"),
            "closure-derived full-source header timestamp is missing or invalid")

    outputs = closure.get("outputs")
    subset = outputs.get("boundary-closure.pbf") if isinstance(outputs, dict) else None
    require(isinstance(subset, dict), "closure subset output proof is missing")
    require(positive_int(subset.get("bytes")) and isinstance(subset.get("sha256"), str)
            and SHA256.fullmatch(subset["sha256"]), "closure subset bytes/hash proof is invalid")
    require(subset_pbf.stat().st_size == subset["bytes"] and
            digest_file(subset_pbf).lower() == subset["sha256"].lower(),
            "actual subset PBF bytes/hash do not match closure output manifest")

    require(helper.get("status") == "OSM_COUNTRY_BOUNDARY_CANDIDATE",
            "helper receipt is not a boundary candidate")
    require(helper.get("countryISO") == closure.get("countryISO"), "helper country ISO differs")
    hsrc = helper.get("source")
    require(isinstance(hsrc, dict), "helper source proof is missing")
    require(hsrc.get("bytes") == subset["bytes"] and
            isinstance(hsrc.get("sha256"), str) and hsrc["sha256"].lower() == subset["sha256"].lower(),
            "helper source bytes/hash do not match the extracted subset")
    require(hsrc.get("url") == source_url and hsrc.get("date") == source_date,
            "helper source URL/date differs from the verified parent source")
    require(hsrc.get("headerTimestamp") == source_header,
            "helper subset header timestamp differs from the closure-derived full-source timestamp")
    validate_relation_match(closure, helper)
    policy = helper.get("memberRolePolicy")
    require(isinstance(policy, dict) and policy.get("excludedNonBoundaryMembers") ==
            closure.get("relation", {}).get("excludedMembers"),
            "helper excluded-member policy differs from the closure receipt")

    assembly, geometry = helper.get("assembly"), helper.get("geometry")
    require(isinstance(assembly, dict) and positive_int(assembly.get("completeMemberSegments")),
            "complete member-segment assembly proof is missing")
    require(positive_int(assembly.get("polygonCount")) and type(assembly.get("holeCount")) is int
            and assembly["holeCount"] >= 0, "polygon assembly counts are invalid")
    require(isinstance(assembly.get("sourceMemberEdgesSha256"), str)
            and SHA256.fullmatch(assembly["sourceMemberEdgesSha256"]), "member-edge proof hash is missing")
    require(isinstance(geometry, dict) and positive_int(geometry.get("bytes"))
            and isinstance(geometry.get("sha256"), str) and SHA256.fullmatch(geometry["sha256"]),
            "assembled geometry proof is missing")

    helper_hash = digest_file(inputs[2])
    source_hash = digest_file(inputs[0])
    closure_hash = digest_file(inputs[1])
    rebound = dict(helper)
    rebound["source"] = {
        "url": source_url, "date": source_date, "headerTimestamp": source_header,
        "bytes": source_bytes, "sha256": source_sha,
        **({"license": src.get("license", hsrc.get("license"))}
           if isinstance(src.get("license", hsrc.get("license")), str) else {}),
    }
    rebound["processingInput"] = {
        "kind": "exact-member-way-closure",
        "bytes": subset["bytes"], "sha256": subset["sha256"],
        "closureReceiptSha256": closure_hash, "sourceReceiptSha256": source_hash,
        "osmiumToolVersion": closure.get("osmiumToolVersion"),
        "commands": closure.get("commands"),
        "polygonProofDeclaration": (
            "Polygon assembly and member-segment proof ran against the exact accepted member-way closure "
            "extracted from the verified full PBF; source identity above refers to that full PBF."
        ),
    }
    rebound["subsetReceipt"] = {"path": subset_copy.name, "sha256": helper_hash}

    output.parent.mkdir(parents=True, exist_ok=True)
    subset_copy.write_bytes(inputs[2].read_bytes())
    try:
        output.write_text(json.dumps(rebound, indent=2, sort_keys=True, allow_nan=False) + "\n", encoding="utf-8")
    except Exception:
        subset_copy.unlink(missing_ok=True)
        raise
    print(json.dumps({"status": "BOUNDARY_RECEIPT_REBOUND", "receipt": str(output),
                      "subsetReceipt": str(subset_copy), "sourceSha256": source_sha,
                      "processingInputSha256": subset["sha256"]}, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
