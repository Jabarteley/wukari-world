from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
P=Path(__file__).resolve().parent
im=Image.new('RGB',(1200,825),'#101c25');d=ImageDraw.Draw(im);f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16);title=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',26)
d.text((24,18),'ALLWORLD / SKIN + EYES ON THE PINNED HUMAN PROTOTYPE',font=title,fill='#e9eadd')
d.text((24,58),'Master 3ee5882c · original geometry, UVs and morphs retained · material fit study',font=f,fill='#a3c5c9')
for i,v in enumerate(['01_umber','02_copper','03_rose']):
 d.text((24+i*400,105),v.replace('_',' ').upper(),font=f,fill='#dee1d5')
 p=Image.open(P/'proof'/('portrait-'+v+'.png')).convert('RGB');p.thumbnail((400,570));im.paste(p,(i*400+(400-p.width)//2,138))
for j,text in enumerate(['Three authored skin appearances; original procedural pigment, roughness and micro-normal maps.', 'Provisional eye fit: half-blink adds 34 cornea/lid triangle intersections; full blink/endpoints add none.', 'Existing master eye/lid contacts and UV overlaps remain. No skeleton or animation-ready claim.', 'Blender stills have residual transmission noise. Raw GLTFLoader proof is the next checkpoint.']):d.text((24,710+j*26),text,font=f,fill='#bac9cc')
im.save(P/'proof/fitted-portraits.jpg',quality=88,optimize=True)
