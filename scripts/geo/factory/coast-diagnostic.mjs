/**
 * Offline coast classifier diagnostic; never regenerates or changes city/runtime source.
 * Node 22+: node --experimental-strip-types scripts/geo/factory/coast-diagnostic.mjs \
 *   --source /clean/baseline --extract-dir /extracts/apia \
 *   --recipe /delivery/scripts/geo/destination-detail/apia.ts --out /evidence/apia-coast.json
 * The recipe must retain resolvable imports (deliver its sibling config/queries modules).
 * Creates a disposable instrumented module beside --out, pins original source hashes,
 * executes the original raster/barrier/region code, and returns before expensive contours.
 * Limits: 40 million cells, 5,000 shore ways, 2,000 unmatched endpoints; no network/PBF.
 */
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const args = process.argv.slice(2);
const value = flag => { const at = args.indexOf(flag); if (at < 0 || !args[at + 1] || args[at + 1].startsWith('--')) throw Error(`Required ${flag}`); return resolve(args[at + 1]); };
const source = value('--source'), extractDir = value('--extract-dir'), recipe = value('--recipe'), out = value('--out');
const sha = value => createHash('sha256').update(value).digest('hex');
const geometryPath = join(source, 'scripts/geo/destination-detail/geometry-tools.ts');
const geometrySource = readFileSync(geometryPath, 'utf8');
const { CONFIG: config } = await import(pathToFileURL(recipe).href);
const original = await import(pathToFileURL(geometryPath).href);
const { loadPbfExtract } = await import(pathToFileURL(join(source, 'scripts/geo/destination-detail/pbf-extract.ts')).href);
if (!config.sea || !['coast', 'lake'].includes(config.sea.kind)) throw Error('Explicit coast/lake recipe required');
const [s, w, n, e] = config.box;
const reach = original.reachFor(config.box), margin = original.OUTLINE_MARGIN;
const boxes = { play: config.box, core: config.core, outline: [s-margin,w-margin,n+margin,e+margin], wide: [s-reach,w-reach,n+reach,e+reach] };
const raw = JSON.parse(readFileSync(join(extractDir, 'places.json'), 'utf8'));
const cityId = raw.source.cityId;
const bundle = loadPbfExtract(extractDir, cityId, boxes);
const cell = config.cell / config.split;
if (!Number.isFinite(cell) || cell < .0001 || cell > .01) throw Error('Diagnostic cell outside finite bounds');
const cells = Math.ceil((boxes.wide[3]-boxes.wide[1])/cell)*Math.ceil((boxes.wide[2]-boxes.wide[0])/cell);
if (!Number.isSafeInteger(cells) || cells > 40_000_000) throw Error(`Grid exceeds 40m cell limit: ${cells}`);
const ref = el => `${el.type}/${el.id}`;
const byRef = new Map(Object.keys(config.discovery(config.box.join(','))).flatMap(layer => {
  if (!['places','extras'].includes(layer)) throw Error(`Unexpected discovery layer ${layer}`);
  return bundle.answers[layer].elements;
}).map(el => [ref(el),el]));
const centre = el => { if (!el) throw Error('Missing selected discovery record'); return el.type === 'node' ? [el.lon,el.lat] : [el.center.lon,el.center.lat]; };
const name = el => (el.tags?.['name:en'] ?? el.tags?.['name:fr'] ?? el.tags?.name ?? '').replace(/\s+/g,' ').trim();
// Exactly generator order/precision: selected places rounded to six decimals, neighbourhoods unrounded.
const anchors = [...config.places.map(choice => { const el=byRef.get(choice.ref); return {ref:choice.ref,name:choice.label??name(el),kind:'place',point:centre(el).map(x=>original.round(x,6))}; }), ...config.names.filter(choice=>choice.kind==='neighbourhood').map(choice=>{const el=byRef.get(choice.ref);return {ref:choice.ref,name:choice.label??name(el),kind:'neighbourhood',point:centre(el)};})];
const shore = bundle.answers.water.elements.filter(el=>Boolean(el.geometry)&&el.type==='way'&&(el.tags?.natural==='coastline'||(config.sea.kind==='lake'&&!el.tags?.natural&&!el.tags?.waterway)));
if (shore.length > 5000) throw Error('More than 5,000 shore ways');
const closed = el => el.geometry[0].lon===el.geometry.at(-1).lon&&el.geometry[0].lat===el.geometry.at(-1).lat;
const ends = shore.filter(el=>!closed(el)).flatMap(el=>[el.geometry[0],el.geometry.at(-1)].map((p,i)=>({ref:ref(el),end:i,point:[p.lon,p.lat]})));
const key = p=>p.join(',');
const endpointCounts=new Map(); for(const end of ends) endpointCounts.set(key(end.point),(endpointCounts.get(key(end.point))??0)+1);
const unmatched=ends.filter(end=>endpointCounts.get(key(end.point))===1);
if(unmatched.length>2000) throw Error('More than 2,000 unmatched endpoints');
const gaps=unmatched.map(end=>{let nearest=null,distance=Infinity;for(const other of ends){if(other===end||other.ref===end.ref)continue;const d=Math.hypot((other.point[0]-end.point[0])*111320*Math.cos(end.point[1]*Math.PI/180),(other.point[1]-end.point[1])*110574);if(d<distance){distance=d;nearest=other;}}return {...end,insideWide:original.inBox(boxes.wide,end.point),nearest:nearest?{ref:nearest.ref,end:nearest.end,point:nearest.point,metres:distance}:null};});
const before = '  // A land point sitting on a barrier cell counts for the regions beside it.';
const stop = "  // The band: water within `reach` cells of the ground, inside the play box.";
if(geometrySource.split(before).length!==2||geometrySource.split(stop).length!==2) throw Error('Unrecognized shoreWater source: instrumentation refused');
const injected = `  const summaries = hasLand.map((directLand, id) => ({id,directLand,hasLand:hasLand[id],cells:0,edgeCells:0,minCol:cols,maxCol:-1,minRow:rows,maxRow:-1}));
  let barrierCells=0,waterCells=0;
  for(let at=0;at<region.length;at++){if(barrier[at])barrierCells++;if(water[at])waterCells++;const id=region[at];if(id<0)continue;const q=summaries[id],c=at%cols,r=(at-c)/cols;q.cells++;q.edgeCells+=Number(c===0||r===0||c===cols-1||r===rows-1);q.minCol=Math.min(q.minCol,c);q.maxCol=Math.max(q.maxCol,c);q.minRow=Math.min(q.minRow,r);q.maxRow=Math.max(q.maxRow,r);}
  const memberships=landPoints.map(([lon,lat],index)=>{const c=colOf(lon),r=rowOf(lat),inside=c>=0&&r>=0&&c<cols&&r<rows,at=r*cols+c;const adjacent=inside&&barrier[at]?[at-1,at+1,at-cols,at+cols].filter(next=>next>=0&&next<region.length&&region[next]>=0).map(next=>({region:region[next],rowWrap:Math.abs(next-at)===1&&Math.floor(next/cols)!==r})):[];return {index,col:c,row:r,inside,barrier:inside?Boolean(barrier[at]):false,directRegion:inside?region[at]:null,adjacentRegions:adjacent,markedExteriorRegions:[...new Set([...(inside&&region[at]>=0?[region[at]]:[]),...adjacent.map(q=>q.region)])].filter(id=>summaries[id].edgeCells>0)};});
  return {cols,rows,cell,barrierCells,waterCells,regions:summaries.map(q=>({...q,directLand:directBeforeAdjacency[q.id],adjacencyOnlyLand:!directBeforeAdjacency[q.id]&&hasLand[q.id],bounds:[wide[1]+q.minCol*cell,wide[0]+q.minRow*cell,wide[1]+(q.maxCol+1)*cell,wide[0]+(q.maxRow+1)*cell]})),memberships};
`;
let instrumented=geometrySource.replace(before,`  const directBeforeAdjacency = hasLand.slice();\n${before}`).replace(stop,injected+stop);
// Relocate copied module imports to original baseline, preserving actual dependencies.
instrumented=instrumented.replace(/(from\s+)(['"])(\.[^'"]+)\2/g,(_,prefix,quote,path)=>`${prefix}${quote}${pathToFileURL(resolve(dirname(geometryPath),path)).href}${quote}`);
mkdirSync(dirname(out),{recursive:true});
const disposable=mkdtempSync(join(dirname(out),'.coast-diagnostic-'));
try {
 const copied=join(disposable,'geometry-tools.ts');writeFileSync(copied,instrumented);
 const diagnostic=await import(pathToFileURL(copied).href);
 const result=diagnostic.shoreWater(shore.map(el=>el.geometry.map(p=>[p.lon,p.lat])),anchors.map(anchor=>anchor.point),boxes.outline,boxes.wide,config.sea.bandMetres,cell);
 const report={cityId,source,recipe,geometrySha256:sha(geometrySource),generatorSha256:sha(readFileSync(join(source,'scripts/geo/build-destination-detail.ts'))),recipeSha256:sha(readFileSync(recipe)),extractHashes:Object.fromEntries(Object.entries(bundle.answers).map(([k,a])=>[k,a.sha256])),algorithm:'Original shoreWater raster/classification; return before distance/contour',boxes,closedShoreExcluded:shore.filter(closed).map(el=>ref(el)),endpointGaps:gaps,...result,memberships:result.memberships.map(row=>({...anchors[row.index],...row})),limitation:'Exterior-touching does not alone prove ocean: inspect source coastline and anchors; no invented water seed.'};
 writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({cityId,out,gridCells:cells,shoreWays:shore.length,regions:result.regions.length,exteriorLandRegions:result.regions.filter(q=>q.edgeCells&&q.hasLand).map(q=>q.id)}));
} finally {rmSync(disposable,{recursive:true,force:true});}
