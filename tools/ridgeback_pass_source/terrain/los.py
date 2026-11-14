# sightline tests on the heightfield (eye height 1.7 m): True = blocked (good)
import numpy as np, json
from scipy import ndimage
h=np.load('height.npy'); m=json.load(open('meta.json')); C=200/(h.shape[0]-1)
H=lambda x,y: ndimage.map_coordinates(h,[np.atleast_1d((np.asarray(y)+100)/C),np.atleast_1d((np.asarray(x)+100)/C)],order=1)
def blocked(a,b,eye=1.7):
    a=np.array(a,float); b=np.array(b,float); n=int(np.linalg.norm(b-a)/0.25)
    t=np.linspace(0,1,n)[1:-1]; P=a+(b-a)*t[:,None]
    za=H(*a)[0]+eye; zb=H(*b)[0]+eye; zl=za+(zb-za)*t
    return bool((H(P[:,0],P[:,1])>zl-0.1).any())
T=m['spawns']['T']; CT=m['spawns']['CT']; A=m['bomb_sites']['A']['center']; B=m['bomb_sites']['B']['center']
tests={'T spawn -> CT spawn':(T,CT),'T spawn -> A site':(T,A),'T spawn -> B site':(T,B),'CT spawn -> bridge (south end)':(CT,m['lanes']['mid_T'][-1][:2]),
       'T spawn -> mid doors':(T,m['lanes']['mid_CT'][2][:2])}
for k,(a,b) in tests.items(): print(f'{k:32s} {"blocked" if blocked(a,b) else "VISIBLE"}')
