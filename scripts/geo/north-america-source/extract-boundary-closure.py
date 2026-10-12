#!/usr/bin/env python3
"""Extract a source-verified country relation and its accepted way/node closure."""

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import osmium


KNOWN_HIGHEST_POINTS = {
    ("CA", 1428125): 618700710,
    ("US", 148838): 2748929230,
}
GEOMETRY_ROLES = {"", "outer", "inner"}
IGNORED_NODE_ROLES = {"admin_centre", "label"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def run(command, commands):
    commands.append(command)
    try:
        completed = subprocess.run(command, check=False, text=True, capture_output=True)
    except FileNotFoundError as error:
        raise ValueError("HOLD: osmium-tool is required but was not found on PATH") from error
    require(completed.returncode == 0,
            f"HOLD: command exited {completed.returncode}: {' '.join(command)}; {completed.stderr.strip()}")
    return completed


class RelationScanner(osmium.SimpleHandler):
    def __init__(self, country_iso):
        super().__init__()
        self.country_iso = country_iso
        self.matches = []

    def relation(self, relation):
        tags = {tag.k: tag.v for tag in relation.tags}
        country_codes = [tags[key] for key in ("ISO3166-1:alpha2", "ISO3166-1") if key in tags]
        if tags.get("admin_level") == "2" and self.country_iso in country_codes:
            require(all(code == self.country_iso for code in country_codes),
                    f"HOLD: conflicting ISO tags on admin-level-2 relation {relation.id}")
            self.matches.append({
                "id": relation.id,
                "version": relation.version,
                "timestamp": str(relation.timestamp),
                "tags": tags,
                "members": [{"type": member.type, "ref": member.ref, "role": member.role}
                            for member in relation.members],
            })


class ObjectScanner(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.relations = []
        self.ways = []

    def relation(self, relation):
        self.relations.append({
            "id": relation.id,
            "version": relation.version,
            "timestamp": str(relation.timestamp),
            "tags": {tag.k: tag.v for tag in relation.tags},
            "members": [{"type": member.type, "ref": member.ref, "role": member.role}
                        for member in relation.members],
        })

    def way(self, way):
        self.ways.append(way.id)


def header_timestamp(path):
    reader = osmium.io.Reader(str(path))
    try:
        value = reader.header().get("osmosis_replication_timestamp")
    finally:
        reader.close()
    require(value is not None, f"HOLD: PBF has no replication timestamp in its header: {path.name}")
    return str(value)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path, help="full source PBF")
    parser.add_argument("--country-iso", required=True, help="two-letter ISO country code")
    parser.add_argument("--expected-sha256", required=True)
    parser.add_argument("--expected-bytes", required=True, type=int)
    parser.add_argument("--expected-root-relation-id", required=True, type=int)
    parser.add_argument("--highest-point-node-id", required=True, type=int)
    parser.add_argument("--dataset-date", required=True, help="expected PBF header date, YYYY-MM-DD")
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()

    require(shutil.which("osmium") is not None, "HOLD: osmium-tool is required but was not found on PATH")
    country_iso = args.country_iso.upper()
    require(re.fullmatch(r"[A-Fa-f0-9]{64}", args.expected_sha256) is not None, "invalid expected SHA-256")
    require(re.fullmatch(r"[A-Z]{2}", country_iso) is not None, "country ISO must be two uppercase letters")
    require(args.expected_bytes > 0 and args.expected_root_relation_id > 0 and args.highest_point_node_id > 0,
            "expected byte count and object IDs must be positive")
    require(re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.dataset_date) is not None, "dataset date must be YYYY-MM-DD")
    expected_highest = KNOWN_HIGHEST_POINTS.get((country_iso, args.expected_root_relation_id))
    require(expected_highest is not None, "HOLD: no reviewed exact highest_point tuple for this country/relation")
    require(args.highest_point_node_id == expected_highest,
            "HOLD: highest_point node ID differs from the reviewed country/relation tuple")
    source = args.source.resolve(strict=True)
    require(source.is_file(), "source PBF is not a regular file")
    require(source.stat().st_size == args.expected_bytes, "HOLD: source byte count mismatch")
    actual_sha = sha256_file(source)
    require(actual_sha.lower() == args.expected_sha256.lower(), "HOLD: source SHA-256 mismatch")

    actual_header_timestamp = header_timestamp(source)
    actual_date = actual_header_timestamp[:10]
    require(actual_date == args.dataset_date, f"HOLD: source header date {actual_date} != {args.dataset_date}")

    scanner = RelationScanner(country_iso)
    scanner.apply_file(str(source), locations=False, idx="flex_mem")
    require(len(scanner.matches) == 1,
            f"HOLD: expected exactly one ISO {country_iso} admin-level-2 relation; found {len(scanner.matches)}")
    relation = scanner.matches[0]
    tags = relation["tags"]
    require(relation["id"] == args.expected_root_relation_id,
            f"HOLD: unique ISO admin-level-2 relation is {relation['id']}, expected {args.expected_root_relation_id}")
    require(tags.get("boundary") == "administrative", "HOLD: root relation boundary tag is not administrative")
    require(tags.get("type") in {"boundary", "multipolygon"}, "HOLD: unsupported root relation type")

    members = []
    way_ids = []
    excluded = []
    highest_count = 0
    seen_members = set()
    for record in relation["members"]:
        key = (record["type"], record["ref"], record["role"])
        require(key not in seen_members, f"HOLD: duplicate relation member {key}")
        seen_members.add(key)
        if record["type"] == "n" and record["role"] in IGNORED_NODE_ROLES:
            excluded.append(record)
        elif record["type"] == "r" and record["role"] == "subarea":
            excluded.append(record)
        elif record["type"] == "n" and record["role"] == "highest_point":
            require(record["ref"] == args.highest_point_node_id,
                    f"HOLD: unexpected highest_point node {record['ref']}")
            highest_count += 1
            excluded.append(record)
        elif record["type"] == "w" and record["role"] in GEOMETRY_ROLES:
            way_ids.append(record["ref"])
            members.append(record)
        else:
            raise ValueError(f"HOLD: unsupported boundary relation member {record}")
    require(highest_count == 1, f"HOLD: expected one exact highest_point node member; found {highest_count}")
    require(bool(way_ids), "HOLD: relation has no accepted boundary way members")
    require(len(way_ids) == len(set(way_ids)), "HOLD: duplicate boundary way member references")

    output = args.out.resolve()
    output.mkdir(parents=True, exist_ok=True)
    require(not any(output.iterdir()), "HOLD: output directory must be empty")
    relation_ids = output / "root-relation.ids"
    way_ids_file = output / "boundary-ways.ids"
    relation_pbf = output / "root-relation.pbf"
    ways_pbf = output / "boundary-ways-with-nodes.pbf"
    subset_pbf = output / "boundary-closure.pbf"
    relation_ids.write_text(f"r{relation['id']}\n", encoding="ascii")
    way_ids_file.write_text("".join(f"w{way_id}\n" for way_id in sorted(way_ids)), encoding="ascii")

    version_command = ["osmium", "--version"]
    commands = []
    version = run(version_command, commands).stdout.strip()
    run(["osmium", "getid", str(source), "--id-file", str(relation_ids), "--output", str(relation_pbf)], commands)
    run(["osmium", "getid", "--add-referenced", str(source), "--id-file", str(way_ids_file), "--output", str(ways_pbf)], commands)
    run(["osmium", "merge", str(relation_pbf), str(ways_pbf), "--output", str(subset_pbf),
         f"--output-header=osmosis_replication_timestamp={actual_header_timestamp}"], commands)
    for path in (relation_pbf, ways_pbf, subset_pbf):
        require(path.is_file() and path.stat().st_size > 0, f"HOLD: expected nonempty output missing: {path.name}")

    relation_check = ObjectScanner()
    relation_check.apply_file(str(relation_pbf), locations=False, idx="flex_mem")
    require(relation_check.relations == [relation], "HOLD: relation-only extraction metadata or members differ from source")
    require(not relation_check.ways, "HOLD: relation-only extraction unexpectedly included ways")
    ways_check = ObjectScanner()
    ways_check.apply_file(str(ways_pbf), locations=False, idx="flex_mem")
    require(sorted(ways_check.ways) == sorted(way_ids), "HOLD: extracted boundary ways are missing or unexpected")
    require(not ways_check.relations, "HOLD: way closure unexpectedly included relations")
    subset_check = ObjectScanner()
    subset_check.apply_file(str(subset_pbf), locations=False, idx="flex_mem")
    require(subset_check.relations == [relation], "HOLD: merged closure relation metadata or members differ from source")
    require(header_timestamp(subset_pbf) == actual_header_timestamp,
            "HOLD: merged subset replication timestamp differs from the full source PBF")
    require(sorted(subset_check.ways) == sorted(way_ids), "HOLD: combined closure has extra or missing boundary ways")

    outputs = {}
    for path in (relation_ids, way_ids_file, relation_pbf, ways_pbf, subset_pbf):
        outputs[path.name] = {"bytes": path.stat().st_size, "sha256": sha256_file(path)}
    receipt = {
        "schemaVersion": 1,
        "status": "BOUNDARY_CLOSURE_EXTRACTED",
        "countryISO": country_iso,
        "source": {"pathLabel": source.name, "bytes": args.expected_bytes, "sha256": actual_sha,
                   "headerDate": actual_date, "headerTimestamp": actual_header_timestamp,
                   "expectedHeaderDate": args.dataset_date},
        "osmiumToolVersion": version,
        "commands": commands,
        "relation": {"id": relation["id"], "version": relation["version"], "timestamp": relation["timestamp"],
                     "tags": tags, "acceptedBoundaryWayCount": len(way_ids),
                     "acceptedBoundaryWays": members, "excludedMembers": excluded,
                     "highestPointNodeId": args.highest_point_node_id},
        "outputs": outputs,
        "limitations": [
            "This is a relation-member and node-reference closure only; it does not assemble or validate polygon geometry.",
            "No city fixtures, city extraction, browser review, visual review, or release acceptance was performed.",
            "The compact subset is not a replacement for retaining the verified full-source identity and member manifest."
        ],
    }
    receipt_path = output / "receipt.json"
    receipt_path.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
