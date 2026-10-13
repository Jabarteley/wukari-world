"""Compose actual Blender renders without repainting or synthetic detail."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
HERE=Path(__file__).resolve().parent;OUT=HERE/'artifacts'
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def f(s):return ImageFont.truetype(font,s)
canvas=Image.new('RGB',(1320,800),(22,30,34));d=ImageDraw.Draw(canvas)
d.text((30,22),'ALLWORLD / EVERYDAY 01',font=f(27),fill=(233,226,205))
d.text((30,62),'Original sage overshirt + sand twill trousers',font=f(18),fill=(190,200,193))
for i,name in enumerate(['front','profile','back']):
 im=Image.open(OUT/(name+'.png')).convert('RGB');im.save(OUT/(name+'.jpg'),quality=91,optimize=True)
 canvas.paste(im,(i*440,100));d.text((i*440+24,108),name.upper(),font=f(15),fill=(233,226,205))
d.rectangle((0,719,1320,800),fill=(22,30,34))
d.text((30,735),'ORIGINAL TAILORING FORM / STATIC, UNBOUND / NOT TESTED WEARABLE FIT',font=f(17),fill=(231,193,139))
d.text((30,765),'Editable cloth panels, 1.6–2.8 mm shells and seam geometry. Producer mesh + rig pending.',font=f(16),fill=(185,196,194))
canvas.save(OUT/'contact-sheet.jpg',quality=92,optimize=True)
print(OUT/'contact-sheet.jpg')
