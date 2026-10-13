"""Original deterministic analytic raster bakes. No photographs or acquired assets.
All color arrays are sRGB; normals and roughness are linear data. Seed: 7108.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageFilter
P=Path(__file__).resolve().parent/'textures'; P.mkdir(exist_ok=True)
N=512
rng=np.random.default_rng(7108)
y,x=np.mgrid[0:N,0:N]; u=(x+.5)/N; v=1-(y+.5)/N

def noise(grid, seed):
    r=np.random.default_rng(seed)
    a=Image.fromarray(np.uint8(r.random((grid,grid))*255))
    return np.asarray(a.resize((N,N),Image.Resampling.BICUBIC),dtype=float)/255-.5

def save(name,a):
    Image.fromarray(np.uint8(np.clip(a,0,1)*255+.5)).save(P/name,optimize=True)

# Overlapping, softly varying pigment fields; no baked illumination.
macro=noise(7,40); medium=noise(29,45); micro=noise(100,46)
height=.25*micro+.2*noise(190,33)
pores=np.zeros((N,N)); pigment=np.zeros((N,N))
# Locally jittered follicles, never a regular dotted grid.
for j in range(39):
    for i in range(39):
        cx=(i+rng.uniform(.05,.95))*N/39; cy=(j+rng.uniform(.05,.95))*N/39
        rad=rng.uniform(.6,1.5)
        xx=int(cx); yy=int(cy)
        xs=slice(max(0,xx-5),min(N,xx+6)); ys=slice(max(0,yy-5),min(N,yy+6))
        d=((x[ys,xs]-cx)/rad)**2+((y[ys,xs]-cy)/rad)**2
        pores[ys,xs]+=np.exp(-d*.9)*rng.uniform(.4,1)
for i in range(110):
    cx,cy=rng.uniform(0,N,2); rad=rng.uniform(.6,2.4)
    pigment+=np.exp(-((x-cx)**2+(y-cy)**2)/(rad*rad*2))*rng.uniform(.03,.13)
height-=pores*.48
# Tangent-space +Y is image-up, so invert the array-down derivative.
dy,dx=np.gradient(height); normal=np.stack([-dx*.6,dy*.6,np.ones_like(dx)],axis=-1)
normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
save('skin_normal.png',normal*.5+.5)
rough=np.clip(.49+macro*.07+micro*.08+pores*.06,.35,.65)
save('skin_roughness.png',rough)
appearances={'01_umber':([.36,.205,.14],.025),'02_copper':([.60,.37,.235],.032),'03_rose':([.77,.57,.45],.04)}
for name,(base,red) in appearances.items():
    a=np.ones((N,N,3))*base
    a+=(macro*.10+medium*.035+micro*.012-pores*.01)[...,None]
    a[...,0]+=medium*red; a[...,1]-=medium*red*.35
    a-=pigment[...,None]*np.array([.55,.7,.63])
    save('skin_'+name+'_basecolor.png',a)

# A radial iris: collarette, uneven crypts, fine radial fibres and limbal ring.
xx=(u-.5)*2; zz=(v-.5)*2; r=np.hypot(xx,zz); a=np.arctan2(zz,xx)
fibres=np.zeros_like(r)
for freq,amp,phase in [(71,.20,1.2),(137,.10,.4),(227,.065,1.7),(43,.16,2.2)]:
    fibres+=amp*np.sin(a*freq+np.sin(r*31+phase)*1.3+phase)
collar=np.exp(-((r-(.49+.018*np.sin(a*17)))/.048)**2)
limbal=np.clip((r-.86)/.12,0,1)
crypt=np.maximum(0,np.sin(a*41+r*16))*np.exp(-((r-.58)/.13)**2)
val=.60+fibres*.48-collar*.14-crypt*.23
iris=np.stack([val*.44+.05+collar*.08,val*.27+.047+collar*.055,val*.095+.026],-1)
iris*=1-limbal[...,None]*.74
iris[r<.38]=[.012,.007,.004]
save('iris_basecolor.png',iris)
hi=fibres*.1-crypt*.06; dy,dx=np.gradient(hi); normal=np.stack([-dx*.5,dy*.5,np.ones_like(dx)],-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
save('iris_normal.png',normal*.5+.5)
# Sclera UV: longitude u, polar angle pi*v from anterior (-Y).
base=np.ones((N,N,3))*[.76,.765,.72]
base+=(noise(22,67)*.025)[...,None]
veins=np.zeros((N,N))
for k in range(16):
    center=k/16+.011*np.sin(v*37+k)+.006*np.sin(v*83+k*4)
    dist=np.abs((u-center+.5)%1-.5)
    strength=np.clip((v-.12)*7,0,1)*np.clip((.55-v)*6,0,1)
    veins+=np.exp(-(dist/.0009)**2)*strength*rng.uniform(.15,.4)
base-=veins[...,None]*[.05,.26,.24]
save('sclera_basecolor.png',base)
manifest={p.name:{'dimensions':[N,N],'mode':Image.open(p).mode,'bytes':p.stat().st_size,'colorSpace':'sRGB' if 'basecolor' in p.name else 'Non-Color','alpha':'none'} for p in sorted(P.glob('*.png'))}
(P/'texture-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Generated',len(manifest),'original PNGs;',sum(z['bytes'] for z in manifest.values()),'bytes')
