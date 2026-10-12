#!/usr/bin/env python3
"""Extract destination-detail source elements from a country OSM PBF.

This is an offline prototype. It writes PBF-derived artifacts under extract/<city>/
and never writes the Overpass-compatible geo-cache.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import tempfile
from typing import Any, Iterable

try:
    import osmium
except ImportError as error:
    raise SystemExit("pyosmium is required; run this with the provisioned pbf-venv Python") from error


PLACE_AMENITIES = {"university", "college", "hospital", "marketplace", "townhall", "courthouse", "restaurant", "cafe"}
PLACE_TOURISM = {"museum", "attraction", "zoo", "theme_park", "viewpoint"}
PLACE_DISTRICTS = {"suburb", "neighbourhood", "quarter"}
EXTRA_RAIL = {"station", "halt"}
EXTRA_WORSHIP_BUILDINGS = {"cathedral", "mosque", "basilica", "temple", "synagogue"}
EXTRA_AMENITIES = {"parliament", "conference_centre", "library", "theatre"}
LANDUSE_WAYS = {"residential", "commercial", "industrial", "retail", "institutional", "education", "military", "cemetery", "religious"}
LANDUSE_RELATIONS = {"residential", "commercial", "industrial", "retail"}
INLAND_WATER = {"lake", "reservoir", "river", "lagoon", "basin"}
MAJOR_ROADS = {"motorway", "trunk", "primary"}
TYPE_NAME = {"n": "node", "w": "way", "r": "relation"}
MAX_RELATION_DEPTH = 32


class ExtractionError(RuntimeError):
    pass


class IncompleteRelation(ExtractionError):
    """A candidate relation whose members are nested or lie outside the pinned extract (invalid multipolygon, or a
    cross-border route/region cut by the Geofabrik clip). Only that candidate is skipped, and the skip is recorded."""


def progress(stage: str, **counts: int | str | None) -> None:
    print(json.dumps({"stage": stage, **counts}, separators=(",", ":")), file=sys.stderr, flush=True)


def tags_of(obj: Any) -> dict[str, str]:
    return {tag.k: tag.v for tag in obj.tags}


def has(tags: dict[str, str], key: str) -> bool:
    return key in tags


def matches_places(tags: dict[str, str]) -> bool:
    if not has(tags, "name"):
        return False
    if tags.get("amenity") in PLACE_AMENITIES:
        return True
    if tags.get("leisure") == "stadium" or tags.get("railway") == "station" or tags.get("shop") == "mall":
        return True
    if tags.get("tourism") == "museum" or tags.get("place") in PLACE_DISTRICTS:
        return True
    if tags.get("amenity") == "place_of_worship" and has(tags, "wikidata"):
        return True
    if has(tags, "historic") and has(tags, "wikidata"):
        return True
    if tags.get("tourism") in PLACE_TOURISM:
        return True
    if tags.get("leisure") == "park" and has(tags, "wikidata"):
        return True
    return tags.get("man_made") == "tower" and has(tags, "wikidata")


def matches_extras(tags: dict[str, str]) -> bool:
    if not has(tags, "name"):
        return False
    if tags.get("amenity") == "bus_station" or tags.get("public_transport") == "station":
        return True
    if tags.get("railway") in EXTRA_RAIL or tags.get("place") == "square" or tags.get("leisure") == "park":
        return True
    if tags.get("amenity") == "place_of_worship":
        return tags.get("building") in EXTRA_WORSHIP_BUILDINGS or has(tags, "wikipedia")
    if tags.get("office") == "government" or tags.get("building") == "government":
        return True
    return tags.get("amenity") in EXTRA_AMENITIES


def matches_water(tags: dict[str, str], obj_type: str, coast: bool) -> bool:
    if coast and obj_type == "way" and tags.get("natural") == "coastline":
        return True
    return (tags.get("natural") == "water" and tags.get("water") in INLAND_WATER) or tags.get("waterway") == "riverbank"


def relation_categories(tags: dict[str, str], coast: bool) -> set[str]:
    categories: set[str] = set()
    if matches_places(tags):
        categories.add("places")
    if matches_extras(tags):
        categories.add("extras")
    if matches_water(tags, "relation", coast):
        categories.add("water")
    if tags.get("type") == "multipolygon" and tags.get("landuse") in LANDUSE_RELATIONS:
        categories.add("landuse")
    return categories


def way_categories(tags: dict[str, str], coast: bool) -> set[str]:
    categories: set[str] = set()
    if matches_places(tags):
        categories.add("places")
    if matches_extras(tags):
        categories.add("extras")
    if matches_water(tags, "way", coast):
        categories.add("water")
    if tags.get("landuse") in LANDUSE_WAYS:
        categories.add("landuse")
    if tags.get("highway") in MAJOR_ROADS or (tags.get("highway") == "secondary" and has(tags, "name")):
        categories.add("roads")
    return categories


def inside(point: tuple[float, float], box: list[float]) -> bool:
    lon, lat = point
    return box[1] <= lon <= box[3] and box[0] <= lat <= box[2]


def point_in_ring(point: tuple[float, float], geometry: list[dict[str, float]]) -> bool:
    x, y = point
    result = False
    j = len(geometry) - 1
    for i, current in enumerate(geometry):
        prior = geometry[j]
        ax, ay, bx, by = current["lon"], current["lat"], prior["lon"], prior["lat"]
        if (ay > y) != (by > y) and x < ((bx - ax) * (y - ay)) / (by - ay) + ax:
            result = not result
        j = i
    return result


def segment_intersects_box(a: dict[str, float], b: dict[str, float], box: list[float]) -> bool:
    # Liang-Barsky clipping against west/east/south/north.
    dx, dy = b["lon"] - a["lon"], b["lat"] - a["lat"]
    low, high = 0.0, 1.0
    for p, q in ((-dx, a["lon"] - box[1]), (dx, box[3] - a["lon"]), (-dy, a["lat"] - box[0]), (dy, box[2] - a["lat"])):
        if p == 0:
            if q < 0:
                return False
            continue
        ratio = q / p
        if p < 0:
            low = max(low, ratio)
        else:
            high = min(high, ratio)
        if low > high:
            return False
    return True


def geometry_intersects_box(geometry: list[dict[str, float]], box: list[float]) -> bool:
    if any(inside((point["lon"], point["lat"]), box) for point in geometry):
        return True
    if any(segment_intersects_box(geometry[index - 1], geometry[index], box) for index in range(1, len(geometry))):
        return True
    if len(geometry) >= 4 and geometry[0] == geometry[-1]:
        return point_in_ring(((box[1] + box[3]) / 2, (box[0] + box[2]) / 2), geometry)
    return False


def geometry_center(parts: Iterable[list[dict[str, float]]]) -> dict[str, float] | None:
    points = [point for part in parts for point in part]
    if not points:
        return None
    return {
        "lat": (min(point["lat"] for point in points) + max(point["lat"] for point in points)) / 2,
        "lon": (min(point["lon"] for point in points) + max(point["lon"] for point in points)) / 2,
    }


def node_element(node: Any, tags: dict[str, str]) -> dict[str, Any]:
    return {"type": "node", "id": node.id, "lat": node.location.lat, "lon": node.location.lon, "tags": tags}


def way_element(way_id: int, tags: dict[str, str], geometry: list[dict[str, float]], *, center_only: bool) -> dict[str, Any]:
    result: dict[str, Any] = {"type": "way", "id": way_id, "tags": tags}
    if center_only:
        result["center"] = geometry_center([geometry])
    else:
        result["geometry"] = geometry
    return result


class RelationPass(osmium.SimpleHandler):
    def __init__(self, coast: bool) -> None:
        super().__init__()
        self.coast = coast
        self.candidates: dict[int, dict[str, Any]] = {}
        self.dependencies: dict[int, dict[str, Any]] = {}
        self.needed_ways: set[int] = set()
        self.needed_nodes: set[int] = set()

    def relation(self, relation: Any) -> None:
        tags = tags_of(relation)
        categories = relation_categories(tags, self.coast)
        if not categories:
            return
        members = [{"type": member.type, "ref": member.ref, "role": member.role} for member in relation.members]
        self.candidates[relation.id] = {"id": relation.id, "tags": tags, "categories": categories, "members": members}
        self.needed_ways.update(member["ref"] for member in members if member["type"] == "w")
        self.needed_nodes.update(member["ref"] for member in members if member["type"] == "n")

    def collect_center_dependencies(self, pbf: Path) -> None:
        pending = {member["ref"] for candidate in self.candidates.values()
                   if candidate["categories"] & {"places", "extras"}
                   for member in candidate["members"] if member["type"] == "r"}
        visited: set[int] = set()
        for depth in range(MAX_RELATION_DEPTH):
            pending -= visited
            if not pending:
                return
            visited.update(pending)
            found = {ref: self.candidates[ref] for ref in pending if ref in self.candidates}
            missing = pending - found.keys()
            if missing:
                handler = RelationDependencyPass(missing)
                with osmium.io.Reader(str(pbf), osmium.osm.RELATION) as reader:
                    osmium.apply(reader, handler)
                found.update(handler.records)
                self.dependencies.update(handler.records)
            pending = set()
            for record in found.values():
                for member in record["members"]:
                    if member["type"] == "w":
                        self.needed_ways.add(member["ref"])
                    elif member["type"] == "n":
                        self.needed_nodes.add(member["ref"])
                    elif member["type"] == "r":
                        pending.add(member["ref"])
            progress("center-relation-dependencies", depth=depth + 1, relations=len(self.dependencies))
        if pending - visited:
            raise ExtractionError(f"place/extra relation nesting exceeds {MAX_RELATION_DEPTH}; refusing incomplete geometry")


class RelationDependencyPass(osmium.SimpleHandler):
    def __init__(self, needed: set[int]) -> None:
        super().__init__()
        self.needed = needed
        self.records: dict[int, dict[str, Any]] = {}

    def relation(self, relation: Any) -> None:
        if relation.id in self.needed:
            self.records[relation.id] = {
                "id": relation.id,
                "tags": tags_of(relation),
                "members": [{"type": member.type, "ref": member.ref, "role": member.role} for member in relation.members],
            }


class GeometryPass(osmium.SimpleHandler):
    def __init__(self, relations: RelationPass, boxes: dict[str, list[float]], coast: bool) -> None:
        super().__init__()
        self.relations = relations
        self.boxes = boxes
        self.coast = coast
        self.member_ways: dict[int, list[dict[str, float]]] = {}
        self.member_nodes: dict[int, dict[str, float]] = {}
        self.output: dict[str, list[dict[str, Any]]] = {label: [] for label in ("places", "extras", "water", "landuse", "roads")}
        self.skipped_relations: list[dict[str, Any]] = []

    def node(self, node: Any) -> None:
        if node.id in self.relations.needed_nodes:
            self.member_nodes[node.id] = {"lat": node.location.lat, "lon": node.location.lon}
        tags = tags_of(node)
        if not inside((node.location.lon, node.location.lat), self.boxes["play"]):
            return
        element = None
        if matches_places(tags):
            element = node_element(node, tags)
            self.output["places"].append(element)
        if matches_extras(tags):
            self.output["extras"].append(element if element is not None else node_element(node, tags))

    def way(self, way: Any) -> None:
        tags = tags_of(way)
        categories = way_categories(tags, self.coast)
        needed = way.id in self.relations.needed_ways
        if not categories and not needed:
            return
        geometry: list[dict[str, float]] = []
        for node in way.nodes:
            if not node.location.valid():
                raise ExtractionError(f"way/{way.id} has a node without a PBF location; refusing truncated geometry")
            geometry.append({"lat": node.location.lat, "lon": node.location.lon})
        if needed:
            self.member_ways[way.id] = geometry
        for category in categories:
            if category in {"places", "extras"}:
                if geometry_intersects_box(geometry, self.boxes["play"]):
                    self.output[category].append(way_element(way.id, tags, geometry, center_only=True))
            elif category == "roads":
                road_box = self.boxes["core"] if tags.get("highway") == "secondary" else self.boxes["play"]
                if geometry_intersects_box(geometry, road_box):
                    self.output[category].append(way_element(way.id, tags, geometry, center_only=False))
            elif geometry_intersects_box(geometry, self.boxes["water"] if category == "water" else self.boxes["outline"]):
                self.output[category].append(way_element(way.id, tags, geometry, center_only=False))


def relation_parts(candidate: dict[str, Any], geometry: GeometryPass, *, allow_nested: bool = False) -> list[list[dict[str, float]]]:
    parts: list[list[dict[str, float]]] = []
    pending = [candidate]
    visited: set[int] = set()
    while pending:
        record = pending.pop()
        if record["id"] in visited:
            continue
        visited.add(record["id"])
        for member in record["members"]:
            if member["type"] == "w" and member["ref"] in geometry.member_ways:
                parts.append(geometry.member_ways[member["ref"]])
            elif member["type"] == "n" and member["ref"] in geometry.member_nodes:
                parts.append([geometry.member_nodes[member["ref"]]])
            elif member["type"] == "r" and allow_nested:
                child = geometry.relations.candidates.get(member["ref"]) or geometry.relations.dependencies.get(member["ref"])
                if child is not None:
                    pending.append(child)
    return parts


def complete_relation_parts(candidate: dict[str, Any], geometry: GeometryPass, *, allow_nested: bool = False, ancestry: tuple[int, ...] = (), validated: set[int] | None = None) -> list[list[dict[str, float]]]:
    parts: list[list[dict[str, float]]] = []
    has_geometry = False
    if candidate["id"] in ancestry:
        chain = " -> ".join(f"relation/{ref}" for ref in (*ancestry, candidate["id"]))
        raise ExtractionError(f"relation member cycle: {chain}; refusing incomplete geometry")
    if len(ancestry) >= MAX_RELATION_DEPTH:
        raise ExtractionError(f"relation/{candidate['id']} nesting exceeds {MAX_RELATION_DEPTH}; refusing incomplete geometry")
    if validated is None:
        validated = set()
    if candidate["id"] in validated:
        return parts
    ancestry = (*ancestry, candidate["id"])
    for member in candidate["members"]:
        kind, ref = member["type"], member["ref"]
        if kind == "r":
            if not allow_nested:
                raise IncompleteRelation(f"relation/{candidate['id']} has a nested relation member; polygon geometry is unsupported")
            child = geometry.relations.candidates.get(ref) or geometry.relations.dependencies.get(ref)
            if child is None:
                raise IncompleteRelation(f"relation/{candidate['id']} member r/{ref} is absent from the PBF; refusing truncated geometry")
            child_parts = complete_relation_parts(child, geometry, allow_nested=True, ancestry=ancestry, validated=validated)
            has_geometry = True
            parts.extend(child_parts)
            continue
        if kind == "w":
            member_geometry = geometry.member_ways.get(ref)
        elif kind == "n":
            point = geometry.member_nodes.get(ref)
            member_geometry = [point] if point is not None else None
        else:
            raise ExtractionError(f"relation/{candidate['id']} has unsupported member type {kind!r}")
        if member_geometry is None:
            raise IncompleteRelation(f"relation/{candidate['id']} member {kind}/{ref} is absent from the PBF; refusing truncated geometry")
        parts.append(member_geometry)
        has_geometry = has_geometry or bool(member_geometry)
    if allow_nested and not has_geometry:
        raise ExtractionError(f"relation/{candidate['id']} has no geometry; refusing a fabricated centre")
    validated.add(candidate["id"])
    return parts


def raw_relation(candidate: dict[str, Any], geometry: GeometryPass) -> dict[str, Any]:
    complete_relation_parts(candidate, geometry)
    members = []
    for member in candidate["members"]:
        kind, ref = member["type"], member["ref"]
        if kind == "r":
            raise IncompleteRelation(f"relation/{candidate['id']} has a nested relation member; polygon geometry is unsupported")
        if kind == "w":
            member_geometry = geometry.member_ways.get(ref)
        elif kind == "n":
            point = geometry.member_nodes.get(ref)
            member_geometry = [point] if point is not None else None
        else:
            raise ExtractionError(f"relation/{candidate['id']} has unsupported member type {kind!r}")
        if member_geometry is None:
            raise IncompleteRelation(f"relation/{candidate['id']} member {kind}/{ref} is absent from the PBF; refusing truncated geometry")
        members.append({"type": TYPE_NAME[kind], "ref": ref, "role": member["role"], "geometry": member_geometry})
    return {"type": "relation", "id": candidate["id"], "tags": candidate["tags"], "members": members}


def add_relation_category(candidate: dict[str, Any], category: str, geometry: GeometryPass, boxes: dict[str, list[float]]) -> None:
    if category in {"places", "extras"}:
        parts = relation_parts(candidate, geometry, allow_nested=True)
        if any(geometry_intersects_box(part, boxes["play"]) for part in parts):
            complete = complete_relation_parts(candidate, geometry, allow_nested=True)
            complete_center = geometry_center(complete)
            if complete_center is None:
                raise ExtractionError(f"relation/{candidate['id']} has no geometry; refusing a fabricated centre")
            geometry.output[category].append({"type": "relation", "id": candidate["id"], "tags": candidate["tags"], "center": complete_center})
        return
    parts = relation_parts(candidate, geometry)
    target = boxes["water"] if category == "water" else boxes["outline"]
    if any(geometry_intersects_box(part, target) for part in parts):
        geometry.output[category].append(raw_relation(candidate, geometry))


def add_relations(relations: RelationPass, geometry: GeometryPass, boxes: dict[str, list[float]]) -> None:
    for candidate in relations.candidates.values():
        for category in sorted(candidate["categories"]):
            try:
                add_relation_category(candidate, category, geometry, boxes)
            except IncompleteRelation as error:
                geometry.skipped_relations.append({"id": candidate["id"], "category": category, "reason": str(error),
                                                   "tags": {key: candidate["tags"][key] for key in ("type", "name", "landuse", "boundary", "route") if key in candidate["tags"]}})


def validate_box(value: Any, label: str) -> list[float]:
    if not isinstance(value, list) or len(value) != 4 or not all(isinstance(item, (int, float)) and math.isfinite(item) for item in value):
        raise ExtractionError(f"{label} must be [south, west, north, east]")
    box = [float(item) for item in value]
    if box[0] >= box[2] or box[1] >= box[3]:
        raise ExtractionError(f"{label} is inverted")
    return box


def load_city(path: Path) -> tuple[dict[str, Any], dict[str, list[float]], dict[str, Any]]:
    metadata = json.loads(path.read_text())
    city = metadata.get("city")
    if not isinstance(city, dict) or not isinstance(city.get("id"), str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", city["id"]):
        raise ExtractionError("city metadata needs a lowercase kebab-case city id")
    recipe = metadata.get("waterRecipe")
    if not isinstance(recipe, dict) or recipe.get("kind") not in {"inland", "coast"} or not isinstance(recipe.get("wideWater"), bool) or recipe.get("reviewRequired") is not False:
        raise ExtractionError("waterRecipe must explicitly select inland or coast, wideWater, and reviewRequired=false")
    if recipe["kind"] == "inland" and recipe.get("sea") is not None:
        raise ExtractionError("inland waterRecipe cannot carry a sea configuration")
    if recipe["kind"] == "coast":
        sea = recipe.get("sea")
        if not isinstance(sea, dict) or sea.get("kind") != "coast" or not isinstance(sea.get("bandMetres"), (int, float)) or isinstance(sea.get("bandMetres"), bool) or not math.isfinite(sea["bandMetres"]) or sea["bandMetres"] <= 0:
            raise ExtractionError("coast waterRecipe needs an explicit positive coast bandMetres")
    raw_boxes = metadata.get("boxes")
    if not isinstance(raw_boxes, dict):
        raise ExtractionError("city metadata has no boxes")
    boxes = {label: validate_box(raw_boxes.get(label), f"boxes.{label}") for label in ("play", "core", "outline", "wide")}
    boxes["water"] = boxes["wide"] if recipe["kind"] == "coast" or recipe["wideWater"] else boxes["play"]
    return metadata, boxes, recipe


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def md5_file(path: Path) -> str:
    digest = hashlib.md5()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def pbf_header_timestamp(path: Path) -> str | None:
    with osmium.io.Reader(str(path), osmium.osm.NOTHING) as reader:
        value = reader.header().get("osmosis_replication_timestamp", "")
    return value or None


def atomic_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w") as output:
            json.dump(value, output, ensure_ascii=False, separators=(",", ":"))
            output.write("\n")
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary_name, path)
    except BaseException:
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass
        raise


def source_record(
    args: argparse.Namespace,
    metadata_path: Path,
    city_id: str,
    label: str,
    boxes: dict[str, list[float]],
    pbf_timestamp: str | None,
    adapter_sha256: str,
    recipe: dict[str, Any],
    relations: RelationPass,
    elements: list[dict[str, Any]],
    skipped: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    water_kind = recipe["kind"]
    filters = {
        "places": "queries.ts placesQuery tag predicates; nodes inside play; way geometry intersecting play; relation available descendant geometry intersecting play followed by complete member validation with cycle checks and bounded nesting; way/relation output uses all validated geometry's bbox centre",
        "extras": "queries.ts extrasQuery tag predicates; nodes inside play; way geometry intersecting play; relation available descendant geometry intersecting play followed by complete member validation with cycle checks and bounded nesting; way/relation output uses all validated geometry's bbox centre",
        "water": f"queries.ts {'coastWaterQuery' if water_kind == 'coast' else 'inlandWaterQuery'} tag predicates; way geometry intersecting {'wide' if water_kind == 'coast' or recipe['wideWater'] else 'play'}; relation available-member geometry intersecting the same bounds followed by complete non-nested member validation; no lake inference; PBF selection is not claimed byte-equivalent to Overpass bbox selection",
        "landuse": "queries.ts landuseQuery tag predicates; way geometry intersecting outline; relation available-member geometry intersecting outline followed by complete non-nested member validation; PBF selection is not claimed byte-equivalent to Overpass bbox selection",
        "roads": "queries.ts roadsQuery tag predicates; major-road geometry intersecting play plus named-secondary geometry intersecting core; PBF geometry intersection is not claimed byte-equivalent to Overpass bbox selection",
    }
    source: dict[str, Any] = {
        "kind": "geofabrik-pbf",
        "datasetUrl": args.dataset_url,
        "datasetSha256": args.dataset_sha256,
        "pbfHeaderTimestamp": pbf_timestamp,
        "cityId": city_id,
        "filter": filters[label],
        "boxes": boxes,
        "selectionBounds": boxes["water"] if label == "water" else boxes["play"] if label in {"places", "extras"} else boxes["outline"] if label == "landuse" else {"major": boxes["play"], "namedSecondary": boxes["core"]},
        "waterRecipe": {"kind": water_kind, "wideWater": recipe["wideWater"], **({"sea": recipe["sea"]} if water_kind == "coast" else {})},
        "adapter": "offline-extract.py/v3-nested-centres",
        "adapterSha256": adapter_sha256,
    }
    if label in {"places", "extras"}:
        nested_sources = []
        for element in elements:
            if element["type"] != "relation":
                continue
            candidate = relations.candidates[element["id"]]
            if not any(member["type"] == "r" for member in candidate["members"]):
                continue
            records: dict[int, dict[str, Any]] = {}
            pending = [candidate]
            while pending:
                record = pending.pop()
                if record["id"] in records:
                    continue
                records[record["id"]] = {key: record[key] for key in ("id", "tags", "members")}
                for member in record["members"]:
                    if member["type"] == "r":
                        pending.append(relations.candidates.get(member["ref"]) or relations.dependencies[member["ref"]])
            nested_sources.append({"id": element["id"], "method": "complete-descendant-bbox-centre", "relations": [records[ref] for ref in sorted(records)]})
        if nested_sources:
            source["nestedCenterRelations"] = nested_sources
    skipped_here = [record for record in (skipped or []) if record["category"] == label]
    if skipped_here:
        source["skippedRelations"] = skipped_here
    return source


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pbf", help="country .osm.pbf path")
    parser.add_argument("city_metadata", help="results/<id>.source.json")
    parser.add_argument("--dataset-url", required=True, help="exact source URL for the supplied PBF")
    parser.add_argument("--dataset-bytes", required=True, type=int, help="published byte count for the supplied PBF")
    parser.add_argument("--dataset-md5", required=True, type=str.lower, help="published MD5 for the supplied PBF")
    parser.add_argument("--dataset-sha256", required=True, type=str.lower, help="expected 64-character SHA-256")
    parser.add_argument("--output-root", default=str(Path(__file__).parent / "extract"), help="private extract root")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    pbf, metadata_path = Path(args.pbf), Path(args.city_metadata)
    if not pbf.is_file() or not metadata_path.is_file():
        raise ExtractionError("PBF and city metadata must both be existing files")
    if not re.fullmatch(r"https://download\.geofabrik\.de/[A-Za-z0-9._/-]+\.osm\.pbf", args.dataset_url):
        raise ExtractionError("dataset URL must be a comment-safe official Geofabrik .osm.pbf URL")
    if pbf.stat().st_size != args.dataset_bytes:
        raise ExtractionError(f"PBF byte count mismatch: expected {args.dataset_bytes}, got {pbf.stat().st_size}")
    if len(args.dataset_md5) != 32 or any(character not in "0123456789abcdef" for character in args.dataset_md5):
        raise ExtractionError("dataset MD5 must be 32 lowercase hexadecimal characters")
    if md5_file(pbf) != args.dataset_md5:
        raise ExtractionError("PBF MD5 mismatch")
    if len(args.dataset_sha256) != 64 or any(character not in "0123456789abcdef" for character in args.dataset_sha256):
        raise ExtractionError("dataset SHA-256 must be 64 lowercase hexadecimal characters")
    metadata, boxes, recipe = load_city(metadata_path)
    progress("verify-source", city=metadata["city"]["id"], bytes=pbf.stat().st_size)
    actual_sha = sha256_file(pbf)
    if actual_sha != args.dataset_sha256:
        raise ExtractionError(f"PBF SHA-256 mismatch: expected {args.dataset_sha256}, got {actual_sha}")
    pbf_timestamp = pbf_header_timestamp(pbf)
    adapter_sha256 = sha256_file(Path(__file__))
    progress("source-ready", timestamp=pbf_timestamp, adapterSha256=adapter_sha256)

    relations = RelationPass(recipe["kind"] == "coast")
    progress("relation-scan")
    relations.apply_file(str(pbf))
    relations.collect_center_dependencies(pbf)
    progress("relation-candidates", relations=len(relations.candidates), memberWays=len(relations.needed_ways), memberNodes=len(relations.needed_nodes))
    geometry = GeometryPass(relations, boxes, recipe["kind"] == "coast")
    progress("geometry-scan")
    geometry.apply_file(str(pbf), locations=True, idx="flex_mem")
    progress("geometry-ready", memberWays=len(geometry.member_ways), memberNodes=len(geometry.member_nodes), directElements=sum(len(items) for items in geometry.output.values()))
    add_relations(relations, geometry, boxes)
    progress("relations-resolved", elements=sum(len(items) for items in geometry.output.values()))

    city_id = metadata["city"]["id"]
    destination = Path(args.output_root) / city_id
    for label, elements in geometry.output.items():
        elements.sort(key=lambda element: ({"node": 0, "way": 1, "relation": 2}[element["type"]], element["id"]))
        atomic_json(destination / f"{label}.json", {
            "version": 1,
            "generator": "Allworld offline PBF adapter prototype",
            "source": source_record(args, metadata_path, city_id, label, boxes, pbf_timestamp, adapter_sha256, recipe, relations, elements, geometry.skipped_relations),
            "elements": elements,
        })
    counts = {label: len(elements) for label, elements in geometry.output.items()}
    progress("write-complete", city=city_id, elements=sum(counts.values()))
    print(json.dumps({"status": "complete", "cityId": city_id, "output": str(destination.resolve()), "counts": counts}))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ExtractionError, json.JSONDecodeError) as error:
        print(f"pbf-extract: {error}", file=sys.stderr)
        raise SystemExit(2)
