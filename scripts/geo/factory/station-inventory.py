import osmium, json, hashlib, sys, os
from pathlib import Path
source, output = map(Path, sys.argv[1:3])
raw = source.read_bytes()
assert len(raw) == 33093408
assert hashlib.md5(raw).hexdigest() == "e610c04ac1849a65909c3d7ebe2b3404"
with osmium.io.Reader(str(source), osmium.osm.NOTHING) as reader:
    timestamp = reader.header().get("osmosis_replication_timestamp", "")
assert timestamp.startswith("2026-10-08")
class Inventory(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.objects = []
        self.boundaries = []
    def add(self, obj, kind, point):
        tags = {tag.k: tag.v for tag in obj.tags}
        if tags.get("name") or tags.get("name:en") or tags.get("aeroway") or tags.get("research"):
            self.objects.append({"ref": f"{kind}/{obj.id}", "version": obj.version, "tags": tags, "point": point})
    def node(self, node):
        if node.location.valid(): self.add(node, "node", [node.location.lon, node.location.lat])
    def way(self, way):
        tags = {tag.k: tag.v for tag in way.tags}
        if not any(tags.get(k) for k in ["name", "name:en", "aeroway", "research"]): return
        points = [[n.lon, n.lat] for n in way.nodes if n.location.valid()]
        point = points[0] if points else None
        self.add(way, "way", point)
    def relation(self, relation):
        tags = {tag.k: tag.v for tag in relation.tags}
        if tags.get("boundary") or tags.get("ISO3166-1") == "AQ" or tags.get("ISO3166-1:alpha2") == "AQ":
            self.boundaries.append({"ref": f"relation/{relation.id}", "tags": tags, "members": len(relation.members)})
        if tags.get("research") or tags.get("site") == "research_station": self.add(relation, "relation", None)
inventory = Inventory()
inventory.apply_file(str(source), locations=True, idx="flex_mem")
result = {"implementationSHA": os.environ.get("GITHUB_SHA"), "attribution": "OpenStreetMap contributors; ODbL-1.0", "source": {"url": "https://download.geofabrik.de/antarctica-261008.osm.pbf", "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest(), "md5": hashlib.md5(raw).hexdigest(), "headerTimestamp": timestamp}, "scriptSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "limitation": "Way point is first mapped node, not a centroid or venue anchor. Inventory only, no geometry acceptance.", "objects": inventory.objects, "boundaries": inventory.boundaries}
output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
print(json.dumps({"source": result["source"], "objects": len(inventory.objects), "boundaries": len(inventory.boundaries)}))
