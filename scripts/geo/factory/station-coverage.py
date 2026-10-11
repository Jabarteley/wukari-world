import json, math, importlib.util, sys, hashlib
from pathlib import Path
root=Path(sys.argv[1])
seeds_file=Path(sys.argv[2])
adapter=Path(sys.argv[3])
spec=importlib.util.spec_from_file_location("baseline",adapter)
baseline=importlib.util.module_from_spec(spec); spec.loader.exec_module(baseline)
inventory=json.loads((root/"inventory.json").read_text())
seeds=json.loads(seeds_file.read_text())
def distance(a,b):
    lon1,lat1,lon2,lat2=map(math.radians,[*a,*b])
    h=math.sin((lat2-lat1)/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    return 6371.0088*2*math.asin(min(1,math.sqrt(h)))
summary=[]
for seed in seeds:
    near=[{**obj,"distanceKm":round(distance(seed["point"],obj["point"]),3)} for obj in inventory["objects"] if obj["point"] and distance(seed["point"],obj["point"])<=20]
    eligible=[obj for obj in near if baseline.matches_places(obj["tags"]) or baseline.matches_extras(obj["tags"])]
    summary.append({**seed,"radiusKm":20,"namedOrResearchOrAirfieldObjects":len(near),"baselineEligibleObjects":len(eligible),"eligibleNames":sorted(set(obj["tags"].get("name:en",obj["tags"].get("name","")) for obj in eligible)),"nearbyObjects":near})
result={"source":inventory["source"],"adapterSha256":hashlib.sha256(adapter.read_bytes()).hexdigest(),"seedTableSha256":hashlib.sha256(seeds_file.read_bytes()).hexdigest(),"baselineAdapterGitSHA":"0786c00510f2827d6495a53fc3299f3112d0d6b4","limitation":"Inventory feasibility only. 20km circles are not approved play boxes. Way first-node distance is approximate. Source named objects are not validated venue anchors. Geographic pole query is not station location.","stations":summary,"AQBoundaries":[b for b in inventory["boundaries"] if "AQ" in [b["tags"].get("ISO3166-1"),b["tags"].get("ISO3166-1:alpha2")]]}
(root/"station-coverage.json").write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n")
print(json.dumps([{ "id":s["id"], "nearby":s["namedOrResearchOrAirfieldObjects"],"baselineEligible":s["baselineEligibleObjects"],"uniqueEligibleNames":len(s["eligibleNames"])} for s in summary]))
print("AQ boundaries:",len(result["AQBoundaries"]))
