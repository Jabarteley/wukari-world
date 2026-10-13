"""Arrange original matched render frames; no image retouching."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
P=Path(__file__).resolve().parent
im=Image.new('RGB',(840,525),'#101c25');d=ImageDraw.Draw(im);f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
for x,label,file in [(0,'GLTF CORE PBR / SSS weight 0','shader-pbr.png'),(420,'BLENDER SOURCE / SSS weight 0.11','shader-sss.png')]:
    d.text((x+18,17),label,font=f,fill='#dce5dc');im.paste(Image.open(P/'proof'/file).convert('RGB'),(x,48))
d.text((18,480),'Same geometry, texture, camera, lights and random seed. Open calibration patch.',font=f,fill='#a9c4c7')
d.text((18,503),'Subsurface scattering is omitted from core GLB. No fitted human claim.',font=f,fill='#a9c4c7')
im.save(P/'proof'/'shader-loss.jpg',quality=88,optimize=True)
