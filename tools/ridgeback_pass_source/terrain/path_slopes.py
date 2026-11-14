import numpy as np, json
from scipy import ndimage
h=np.load('height.npy'); m=json.load(open('meta.json')); C=200/(h.shape[0]-1)
def H(P): return ndimage.map_coordinates(h,[(P[:,1]+100)/C,(P[:,0]+100)/C],order=1)
worst={}
for n,pts in m['lanes'].items():
    p=np.array(pts)[:,:2]
    if len(p)<2: continue
    seg=np.linalg.norm(np.diff(p,axis=0),axis=1); cum=np.r_[0,np.cumsum(seg)]; d=np.arange(0,cum[-1],0.5)
    P=np.c_[np.interp(d,cum,p[:,0]),np.interp(d,cum,p[:,1])]; z=H(P)
    # slope over 2 m windows (what a player feels)
    s=np.degrees(np.arctan(np.abs(z[4:]-z[:-4])/2.0)) if len(z)>4 else np.array([0])
    worst[n]=round(float(s.max()),1)
print(worst)
