"""Source-byte witnesses and explicit v4 morph evaluation shared by bounded checks."""
import bpy,hashlib
import numpy as np

def geometry_snapshot():
    result={}
    def digest(a,d='<f8'):return hashlib.sha256(np.array(a,dtype=d).tobytes()).hexdigest()
    for ob in bpy.context.scene.objects:
        if ob.type!='MESH' or ob.name.startswith('STUDIO'):continue
        me=ob.data;me.calc_loop_triangles();sk=me.shape_keys
        drivers=[]
        if sk and sk.animation_data:
            for f in sk.animation_data.drivers:
                drivers.append({'path':f.data_path,'expression':f.driver.expression,'variables':[(v.name,v.type,[(t.id.name if t.id else None,t.data_path) for t in v.targets]) for v in f.driver.variables]})
        result[ob.name]={'positions':digest([tuple(v.co) for v in me.vertices]),'triangles':digest([tuple(t.vertices) for t in me.loop_triangles],'<u4'),'uv':{u.name:digest([tuple(v.uv) for v in u.data]) for u in me.uv_layers},'keys':{k.name:digest([tuple(v.co) for v in k.data]) for k in sk.key_blocks} if sk else {},'drivers':drivers,'transform':digest(ob.matrix_world),'vertices':len(me.vertices),'triangleCount':len(me.loop_triangles)}
    return result

def set_values(values):
    for ob in bpy.context.scene.objects:
        if ob.type=='MESH' and ob.data.shape_keys:
            for k in ob.data.shape_keys.key_blocks:
                if k.name!='Basis' and not k.name.startswith('corrective.'):k.value=values.get(k.name,0)
            ob.data.update_tag()
    bpy.context.scene.frame_set(bpy.context.scene.frame_current)
    bpy.context.view_layer.update()

def explicit_weight(name,values):
    if name.startswith('corrective.height.'):return values.get('body.height',0)*values.get('expression.'+name.split('.')[-1],0)
    if name.startswith('corrective.blinkArc'):
        b=values.get('expression.blink'+('Left' if name.endswith('Left') else 'Right'),0)
        return 4*b*(1-b)
    return values.get(name,0)
