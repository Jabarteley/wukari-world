"""Compatible CLI for the bounded market construction sample."""
import sys
import json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from shared import common
from construction import (SAMPLE_PROPS, COLOURS, Construction, painted_atlas,
                          make_sample_prop, finish_sample, market_hero)


if __name__ == '__main__':
    import argparse
    from kit import make_prop
    from shared import palette, finish_prop
    parser=argparse.ArgumentParser()
    parser.add_argument('--out',required=True)
    parser.add_argument('--kind',choices=('kit','hero'),required=True)
    parser.add_argument('--style',required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    style=json.loads(Path(args.style).read_text())
    common.reset();material=painted_atlas()
    if args.kind=='hero':
        objects=[finish_sample('accra',market_hero(material),material,4000)]
    else:
        names=('market-stall','canopy','crate-stack','produce-stand','cooking-stand','water-tank','generator','minibus','three-wheeler','bench','bollard','planter','broadleaf-tree','palm','acacia','wall','gate','kiosk','street-lamp','sign-frame')
        materials=palette(style['palette']);objects=[]
        for name in names:
            if name in SAMPLE_PROPS:objects.append(finish_sample(name,make_sample_prop(name,material),material,1500))
            else:objects.append(finish_prop(name,make_prop(name,materials,style['roof'],style.get('canopyHeight',2.1)),materials,material))
    Path(args.out).parent.mkdir(parents=True,exist_ok=True)
    common.export(args.out,objects)
