"""Render saved morph data, without rebuilding/changing the master asset."""
import argparse
import json
import math
import sys
from pathlib import Path
import bpy

ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT))
from build_character import camera_view,set_values,DOC

PRESETS={
    'neutral':{},'happy':{'expression.smileLeft':1,'expression.smileRight':1},
    'sad':{'expression.frownLeft':1,'expression.frownRight':1,'expression.browRaiseLeft':.8,'expression.browRaiseRight':.8},
    'blink':{'expression.blinkLeft':1,'expression.blinkRight':1},
}

def capture(path,kind,angle,values,width=480,height=600,samples=20):
    set_values(values);camera_view(kind,angle)
    scene=bpy.context.scene;scene.cycles.samples=samples;scene.cycles.use_denoising=False
    scene.render.resolution_x=width;scene.render.resolution_y=height
    scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)

parser=argparse.ArgumentParser()
parser.add_argument('--mode',choices=['stills','frames'],default='stills')
parser.add_argument('--start',type=int,default=0)
parser.add_argument('--end',type=int,default=60)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
if args.mode=='stills':
    shots=[(name,'portrait',0,values) for name,values in PRESETS.items()]
    shots += [
        ('nose-min','portrait',.55,{'nose.projection':-1,'nose.alarWidth':-1}),
        ('nose-max','portrait',.55,{'nose.projection':1,'nose.alarWidth':1}),
        ('ears-asymmetric','portrait',0,{'earLeft.protrusion':1,'earRight.protrusion':-1}),
        ('body-short-narrow','full',.1,{'body.height':-1,'body.shoulderWidth':-1}),
        ('body-tall-broad','full',.1,{'body.height':1,'body.shoulderWidth':1}),
        ('neutral-full-current','full',.1,{}),
    ]
    for name,kind,angle,values in shots:capture(DOC/(name+'.png'),kind,angle,values)
    (DOC/'capture-values.json').write_text(json.dumps({'stills':[{'file':name+'.png','view':kind,'angleRadians':angle,'values':values} for name,kind,angle,values in shots],'description':'Actual Blender source shape-key renders. No image-generated or composited facial features.'},indent=2)+'\n')
else:
    frames=ROOT/'frames';frames.mkdir(exist_ok=True)
    timeline=[]
    for frame in range(args.start,args.end):
        values={};kind='portrait';angle=0
        if frame<36:
            kind='full';angle=2*math.pi*frame/36
        elif frame<72:
            angle=.55;local=frame-36;t=(local%18)/17
            key='nose.projection' if local<18 else 'nose.alarWidth'
            values={key:math.sin(t*2*math.pi)}
        elif frame<108:
            local=frame-72;t=(local%18)/17
            key='earLeft.protrusion' if local<18 else 'earRight.protrusion'
            values={key:math.sin(t*2*math.pi)}
        elif frame<144:
            kind='full';angle=.1;local=frame-108;t=(local%18)/17
            key='body.height' if local<18 else 'body.shoulderWidth'
            values={key:math.sin(t*2*math.pi)}
        else:
            # Separate neutral / happy / sad / full blink, nine frames each.
            names=['neutral','happy','sad','blink'];values=PRESETS[names[min(3,(frame-144)//9)]]
        capture(frames/f'{frame:04d}.png',kind,angle,values,384,512,8)
        timeline.append({'frame':frame,'view':kind,'angleRadians':angle,'values':values})
    (DOC/f'timeline-{args.start:03d}-{args.end:03d}.json').write_text(json.dumps(timeline,indent=2)+'\n')
print('CAPTURE_COMPLETE',args.mode,args.start,args.end,flush=True)
