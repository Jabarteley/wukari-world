"""Measure actual atlas competition, without changing inherited UVs or appearances.
At the shipped texture sizes, compare expected copper colour for competing
surface points at the same pixel. A zero sampled value is not a clean-atlas proof.
"""
import bpy,ast,json,math
import numpy as np
from PIL import Image
from pathlib import Path
P=Path(__file__).resolve().parent;CAL=P.parent
SOURCE={n:np.asarray(Image.open(CAL/'textures'/n).convert('RGB'),dtype=float)/255 for n in ['skin_02_copper_basecolor.png']}
tree=ast.parse((P/'build_fitted.py').read_text())
for name in ['sample','projected_sample']:
    fn=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name==name)
    exec(compile(ast.Module(body=[fn],type_ignores=[]),'build_fitted.py','exec'))
def color(pos,norm):
    norm=norm/np.maximum(np.linalg.norm(norm,axis=-1,keepdims=True),1e-9)
    c=np.array([.60,.37,.235])+(projected_sample('skin_02_copper_basecolor.png',pos,norm)-np.array([.60,.37,.235]))*.45
    x,y,z=pos[...,0],pos[...,1],pos[...,2];warmth=np.exp(-((np.abs(x)-.040)/.022)**2-((z-1.596)/.026)**2)*(y<-.02)
    return c+warmth[...,None]*np.array([.018,-.006,-.009])
bpy.ops.wm.open_mainfile(filepath=str(P/'inputs/anatomy-candidate-v4.blend'))
rows=[]
for name in ['Head_continuous_anatomy','Ear_Left','Ear_Right','Forearm_hand_-1','Forearm_hand_1']:
    ob=bpy.data.objects[name];me=ob.data;me.calc_loop_triangles();n=256 if name.startswith('Head') else 64
    pos=np.zeros((n,n,3));norm=np.zeros_like(pos);hits=np.zeros((n,n),np.uint16);uv=me.uv_layers.active
    p=np.array([tuple(v.co) for v in me.vertices]);nr=np.array([tuple(v.normal) for v in me.vertices]);diffs=[];locations=[];distances=[]
    for tri in me.loop_triangles:
        t=np.array([tuple(uv.data[i].uv) for i in tri.loops]);ind=list(tri.vertices)
        for shift in [-1,0,1]:
            q=t.copy();q[:,0]+=shift;q[:,0]*=n;q[:,1]=(1-q[:,1])*n
            lo=np.maximum(np.floor(q.min(0)).astype(int),0);hi=np.minimum(np.ceil(q.max(0)).astype(int),n)
            if (hi<=lo).any():continue
            xx,yy=np.meshgrid(np.arange(lo[0],hi[0])+.5,np.arange(lo[1],hi[1])+.5)
            den=(q[1,1]-q[2,1])*(q[0,0]-q[2,0])+(q[2,0]-q[1,0])*(q[0,1]-q[2,1])
            if abs(den)<1e-8:continue
            a=((q[1,1]-q[2,1])*(xx-q[2,0])+(q[2,0]-q[1,0])*(yy-q[2,1]))/den
            b=((q[2,1]-q[0,1])*(xx-q[2,0])+(q[0,0]-q[2,0])*(yy-q[2,1]))/den;c=1-a-b;mask=(a>=-1e-8)&(b>=-1e-8)&(c>=-1e-8)
            sub=(slice(lo[1],hi[1]),slice(lo[0],hi[0]));weights=np.stack([a,b,c],axis=-1);v=weights@p[ind];vn=weights@nr[ind]
            conflict=mask&(hits[sub]>0)
            if conflict.any():
                previous=pos[sub][conflict];current=v[conflict];previousnormal=norm[sub][conflict]
                diffs.extend(np.max(np.abs(color(previous,previousnormal)-color(current,vn[conflict])),axis=-1).tolist())
                distances.extend(np.linalg.norm(current-previous,axis=-1).tolist());locations.extend(previous.tolist());locations.extend(current.tolist())
            pos[sub][mask]=v[mask];norm[sub][mask]=vn[mask];hits[sub][mask]+=1
    loc=np.array(locations);eye=[]
    if len(loc):eye=(np.abs(np.abs(loc[:,0])-.032)<.014)&(np.abs(loc[:,2]-1.635)<.012)&(loc[:,1]<-.02)
    rows.append({'object':name,'size':n,'uvLayer':uv.name,'coveredPixels':int((hits>0).sum()),'multiplyCoveredPixels':int((hits>1).sum()),'fractionCoveredPixelsWithCompetition':float((hits>1).sum()/max((hits>0).sum(),1)),'competingSamplePairs':len(diffs),'maximumCompetingCopperSrgbDifference8bit':max(diffs,default=0)*255,'p95CompetingCopperSrgbDifference8bit':float(np.percentile(diffs,95))*255 if diffs else 0,'maximumCompetingSurfaceDistanceM':max(distances,default=0),'competingSurfaceBoundsBlenderM':[loc.min(0).tolist(),loc.max(0).tolist()] if len(loc) else None,'competingSamplesInFrontEyeRegion':int(np.sum(eye))})
owner=json.loads((P/'inputs/uv-diagnostic.json').read_text())
r={'candidateCommit':'2921534bdc8959a8489713f9b1652381702808a5','method':'Exact shipped pixel-centre coverage and same procedural copper colour evaluation for competing triangle contributions; last triangle wins as in bake. No UV changes.','caveats':'Sampled at texture resolution; thin overlaps and zero-area cap UVs may miss pixels. Pore normals, filtering and mip seams can differ further. Front-eye box is a diagnostic region, not visibility classification.','surfaces':rows,'ownerPublishedUvDiagnostic':owner}
(P/'receipts/uv-impact.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(rows,indent=2))
