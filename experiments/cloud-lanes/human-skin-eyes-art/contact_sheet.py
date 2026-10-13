"""Lay out own unaltered Blender render frames with proof labels."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
P=Path(__file__).resolve().parent;W=1200
sheet=Image.new('RGB',(W,1420),'#0e1b24');d=ImageDraw.Draw(sheet)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
f=ImageFont.truetype(font,16);title=ImageFont.truetype(font,28);small=ImageFont.truetype(font,13)
d.text((28,18),'ALLWORLD  /  SKIN + EYE MATERIAL STUDIES',font=title,fill='#eef0e7')
d.text((28,58),'CALIBRATION v1  ·  Original procedural maps  ·  No human mesh/UV fit claimed',font=f,fill='#9cc4c6')
for x,t in zip([38,335,637,940],['01  UMBER','02  COPPER','03  ROSE','04  IRIS / SCLERA / CORNEA']):d.text((x,88),t,font=small,fill='#c1c4bb')
for j,label in enumerate(['neutral','day','night']):
    y=115+j*335
    im=Image.open(P/'proof'/f'blender-{label}.png').convert('RGB');im.thumbnail((1200,302))
    sheet.paste(im,((1200-im.width)//2,y+27));d.text((28,y),label.upper()+'  /  Blender Cycles · core PBR skin',font=f,fill='#d9d9ca')
im=Image.open(P/'proof'/'eye-detail.png').convert('RGB');im.thumbnail((250,250));sheet.paste(im,(28,1140))
d.text((306,1150),'Authored eye detail  /  24 mm shell',font=title,fill='#eeeade')
for j,line in enumerate(['Analytic raster bakes: pigment, pores, roughness, radial iris fibres, scleral veins.', 'Editable packed .blend + uncompressed GLB; colour sRGB, normals +Y tangent.', 'Calibration swatches are material fixtures, not finished human character art.', 'Blender has no denoiser here: residual noise remains in corneal transmission.', 'Await exact human UV/material checkpoint from parent before any portrait fit.']):d.text((306,1200+j*31),line,font=f,fill='#aebec2')
sheet.save(P/'proof'/'contact-sheet.jpg',quality=88,optimize=True)
print('Contact sheet bytes', (P/'proof'/'contact-sheet.jpg').stat().st_size)
