"""Small labelled evidence sheet from the actual Blender renders; no generated illustration."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
p=Path(__file__).resolve().parent/'artifacts'
im=Image.new('RGB',(1200,825),'#192328');d=ImageDraw.Draw(im)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
f=ImageFont.truetype(font,15);title=ImageFont.truetype(font,24)
d.text((22,14),'ALLWORLD / YABA GROUND 01',font=title,fill='#f0e4ce')
d.text((22,48),'ORIGINAL SYNTHETIC STUDY  •  24m detailed segment / 200m planning boundary',font=f,fill='#bac9c9')
for name,xy,sz,label in [('eye',(20,82),(760,506),'Street eye / 1.65m above sidewalk'),('detail',(800,82),(380,253),'Recessed drain and iron grille'),('overview',(800,381),(380,253),'Whole detailed segment / 24 × 13.2m'),('plan',(20,636),(165,145),'')]:
    a=Image.open(p/(name+'.jpg'));a.thumbnail(sz);im.paste(a,xy)
    if label:d.text((xy[0],xy[1]+a.height+6),label,font=f,fill='#e7e3d9')
for i,line in enumerate(['200 × 200m planning boundary', 'Four frontage reservations for building lane E', 'Planning ribbons are NOT additional finished street art', 'Every width, alignment and elevation is authored-synthetic']):d.text((195,644+i*27),line,font=f,fill='#c7d2ce')
d.text((22,795),'No survey / no external imagery • routeAuthorized=false • no runtime admission',font=f,fill='#b8c8c6')
im.save(p/'contact-sheet.jpg',quality=89)
