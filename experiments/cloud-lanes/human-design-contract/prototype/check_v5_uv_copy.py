"""Run the byte-identical v5 checker on a private path-compatible UV copy.
The frozen v5 assets, checker and failed evidence are never overwritten.
"""
import hashlib,json,runpy,shutil,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parent
DOC=ROOT.parents[3]/'docs/agent-plans/cloud-lanes/human-design-contract/prototype'
OUT=DOC/'anatomy-candidate-v5-uv1'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
checker=ROOT/'check_anatomy_v5.py'
expected='2fb91dccf2488049b3ca2a19d911dd79b21f6dd21d48089131bbcc88240db6ef'
assert sha(checker)==expected
(ROOT/'frames').mkdir(exist_ok=True)
scratch=Path(tempfile.mkdtemp(prefix='v5-uv-check-',dir=ROOT/'frames'))
try:
    code=scratch/'experiments/cloud-lanes/human-design-contract/prototype'
    evidence=scratch/'docs/agent-plans/cloud-lanes/human-design-contract/prototype/anatomy-candidate-v5'
    (code/'anatomy-candidate-v5').mkdir(parents=True);evidence.mkdir(parents=True)
    copies={}
    for name in ['check_anatomy_v5.py','build_character.py','check_lid_candidate_v3.py','fit-frame.json']:
        shutil.copyfile(ROOT/name,code/name)
        copies[name]=sha(code/name);assert copies[name]==sha(ROOT/name)
    asset=ROOT/'anatomy-candidate-v5-uv1/anatomy-candidate-v5-uv1.blend'
    shutil.copyfile(asset,code/'anatomy-candidate-v5/anatomy-candidate-v5.blend')
    receipt=json.loads((OUT/'correction-receipt.json').read_text())
    assert sha(asset)==receipt['blendSha256']
    build=json.loads((DOC/'anatomy-candidate-v5/build-receipt.json').read_text())
    build.update(blendSha256=receipt['blendSha256'],glbSha256=receipt['glbSha256'])
    (evidence/'build-receipt.json').write_text(json.dumps(build,indent=2)+'\n')
    # No AST/logic edits, monkeypatches, gate exclusions or changed tolerances.
    runpy.run_path(str(code/'check_anatomy_v5.py'),run_name='__main__')
    for name in ['checks.json','uv-diagnostic.json']:shutil.copyfile(evidence/name,OUT/name)
    assert sha(checker)==expected and copies['check_anatomy_v5.py']==expected
    result=json.loads((OUT/'checks.json').read_text());assert result['status']=='PASS' and not result['failures']
    report={'status':'PASS','checkerSha256':expected,'checkerByteIdentical':True,'copiedDependenciesSha256':copies,
        'inputBlendSha256':sha(asset),'cases':result['cases'],'failures':result['failures'],
        'method':'Unmodified checker and dependencies copied into an isolated path-compatible tree with the corrected BLEND at its expected path. Only asset SHA fields in the copied build receipt change.',
        'frozenV5AssetsAndEvidenceOverwritten':False,'rendered':False}
    (OUT/'unchanged-checker-receipt.json').write_text(json.dumps(report,indent=2)+'\n')
    print('UNCHANGED_V5_CHECKER_PASS',json.dumps(report))
finally:
    shutil.rmtree(scratch)
