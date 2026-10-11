"""Static review of the actual generated mesh, without a browser or gameplay claims."""
import json,sys
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
root=Path(sys.argv[1]);data=json.loads((root/'station-buildings.geometry.json').read_text())['data']['attributes']
points=np.array(data['position']['array']).reshape(-1,3)*100
# Game x-east/y-up/z-south becomes plot x-east/y-north/z-up, all metres.
world=points[:,[0,2,1]];world[:,1]*=-1
triangles=world.reshape(-1,3,3)
linear=np.array(data['color']['array']).reshape(-1,3)
colours=np.where(linear<=.0031308,linear*12.92,1.055*np.power(linear,1/2.4)-.055).reshape(-1,3,3).mean(axis=1)
assert np.isfinite(world).all() and len(triangles)>0
fig=plt.figure(figsize=(12,8));ax=fig.add_subplot(111,projection='3d')
collection=Poly3DCollection(triangles,facecolors=colours,edgecolors='#52606d',linewidths=.15);ax.add_collection3d(collection)
lo=world.min(axis=0);hi=world.max(axis=0);span=np.maximum(hi-lo,.1)
ax.set_xlim(lo[0]-10,hi[0]+10);ax.set_ylim(lo[1]-10,hi[1]+10);ax.set_zlim(0,max(hi[2]+2,8));ax.set_box_aspect([span[0]+20,span[1]+20,max(hi[2]+2,8)])
ax.view_init(elev=35,azim=-55);ax.set_xlabel('East (m)');ax.set_ylabel('North (m)');ax.set_zlabel('Height (m)')
ax.set_title('Rothera: seven screened source-footprint meshes\nHeights estimated; no vertical exaggeration')
fig.text(.05,.03,'OSM contributors, ODbL. Six disputed buildings withheld. Mesh diagnostic, not current-operation or gameplay acceptance.',fontsize=9)
fig.savefig(root/'station-buildings-review.png',dpi=140,bbox_inches='tight');plt.close(fig)
print(json.dumps({'triangles':len(triangles),'boundsMetres':{'min':lo.tolist(),'max':hi.tolist()},'verticalExaggeration':1}))
