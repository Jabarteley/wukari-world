"""Original seeded aggregate/cement textures; no image, map or external asset inputs."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
OUT = HERE / 'textures'
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(13102026)

def field(n, small):
    a = Image.fromarray(rng.integers(0, 256, (small, small), dtype=np.uint8))
    return np.asarray(a.resize((n, n), Image.Resampling.BICUBIC)).astype(float) / 255 - .5

for name, n, color, contrast in [('asphalt', 512, [64, 65, 61], 39), ('cement', 256, [153, 147, 131], 25), ('silt', 256, [111, 91, 62], 35)]:
    fine = rng.normal(0, 1, (n, n))
    cloud = field(n, 12)
    height = fine * .3 + cloud * .6
    value = fine * contrast * .4 + cloud * contrast
    if name == 'asphalt':
        # Fine crushed aggregate and sparse exposed light stone, tiled at 2 metres.
        stones = rng.random((n, n)) > .966
        value += stones * rng.uniform(20, 60, (n,n))
        height += stones * .8
    if name == 'cement':
        pits = rng.random((n,n)) > .98
        value -= pits * 23
        height -= pits * .4
    rgb = np.clip(np.array(color)[None,None,:] + value[:,:,None],0,255).astype(np.uint8)
    Image.fromarray(rgb).save(OUT / f'{name}-color.jpg', quality=86, subsampling=0)
    # Tangent-space OpenGL +Y normal, authored from the scalar microheight field.
    dx = (np.roll(height,-1,1)-np.roll(height,1,1)) * .22
    dy = (np.roll(height,-1,0)-np.roll(height,1,0)) * .22
    normal = np.stack([-dx,dy,np.ones_like(dx)],2)
    normal /= np.linalg.norm(normal,axis=2)[:,:,None]
    Image.fromarray(np.uint8(np.clip((normal*.5+.5)*255,0,255))).save(OUT / f'{name}-normal.png', optimize=True)
print('Authored six texture maps; seed 13102026; no acquired image data')
