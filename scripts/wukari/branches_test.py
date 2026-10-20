"""Safety tests use mocked GitHub/Git. Never contact or delete remote refs."""
import importlib.util, json, pathlib, tempfile, unittest, sys
sys.dont_write_bytecode = True
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('branches',pathlib.Path(__file__).with_name('branches.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
SHA='a'*40
class Safety(unittest.TestCase):
 def exercise(self,change=None,execute=False,approved=False,proof=True):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d); inv=p/'inventory.json';result=p/'result.json'
   inv.write_text(json.dumps(dict(repository=m.REPO,approved=approved,branches=[dict(name='codex/redundant',sha=SHA)])))
   branch=dict(name='codex/redundant',commit=dict(sha=SHA),protected=False);prs=[];rules=[]
   if change=='sha':branch['commit']['sha']='b'*40
   if change=='protected':branch['protected']=True
   if change=='pr':prs=[dict(headRefName=branch['name'],baseRefName='main')]
   if change=='rules':rules=[dict(name='future-rule')]
   calls=[]
   def run(*args):
    calls.append(args)
    if args[:3]==('git','remote','get-url'):return 'https://github.com/'+m.REPO+'.git'
    if args[:2]==('git','ls-remote'):return SHA+'\trefs/heads/main'
    return ''
   with patch.object(m,'live',return_value=([branch],prs,'main',rules)),patch.object(m,'ancestor',return_value=proof),patch.object(m,'run',side_effect=run):
    m.cleanup(inv,execute,result)
   return calls,json.loads(result.read_text())
 def test_default_dry_run(self):
  calls,result=self.exercise();self.assertFalse(any('push' in c for c in calls));self.assertEqual(result['events'][0]['result'],'dry-run-would-delete')
 def test_blocks_state_changes(self):
  for state in ('sha','protected','pr','rules'):
   with self.subTest(state=state),self.assertRaises(ValueError):self.exercise(change=state)
 def test_requires_preservation(self):
  with self.assertRaises(ValueError):self.exercise(proof=False)
 def test_requires_owner_inventory(self):
  with self.assertRaises(ValueError):self.exercise(execute=True)
 def test_explicit_execution_uses_atomic_sha_lease(self):
  calls,_=self.exercise(execute=True,approved=True)
  self.assertIn(('git','push','--force-with-lease=refs/heads/codex/redundant:'+SHA,'origin',':refs/heads/codex/redundant'),calls)
if __name__=='__main__':unittest.main()
