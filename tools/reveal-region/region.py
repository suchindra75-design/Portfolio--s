# Reveal region = where the two supplied images differ because of the head (mask vs face/hair/neck).
# Computed from the files exactly as supplied; neither image is changed. Output: alpha mask PNG.
import numpy as np, cv2
from PIL import Image
from scipy.ndimage import maximum_filter1d
import os
# Run from anywhere: reads and writes public/portrait/ in this project.
P=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","..","public","portrait")+os.sep
A=np.asarray(Image.open(P+"spiderman_masked_portrait.png").convert("RGB")).astype(np.float32)
S=np.asarray(Image.open(P+"human_face_spiderman_portrait.png").convert("RGB")).astype(np.float32)
H,W=A.shape[:2]
d=np.abs(cv2.GaussianBlur(S,(0,0),2.5)-cv2.GaussianBlur(A,(0,0),2.5)).max(2)
big=(d>38).astype(np.uint8); big[700:]=0
# thin outline differences (the suits are offset ~2 px) are not the head: open them away
big=cv2.morphologyEx(big,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
n,lab,st,_=cv2.connectedComponentsWithStats(big,8)
keep=np.zeros_like(big)
for i in range(1,n):
    x,y,w,h,a=st[i]
    if a>150 and y<520: keep[lab==i]=1
keep=cv2.morphologyEx(keep,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(25,25)))
cols=np.where(keep.any(0))[0]
ybot=np.full(W,-1)
for x in cols: ybot[x]=np.where(keep[:,x])[0].max()
yb2=maximum_filter1d(ybot,31)
for x in range(cols.min(),cols.max()+1): keep[:max(ybot[x],yb2[x])+1,x]=1
keep=cv2.morphologyEx(keep,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
keep=cv2.dilate(keep,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(11,11)))
# extra room round the hair (black background in both files), never down onto the suit
wide=cv2.dilate(keep,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(41,41))); wide[455:]=0
keep=np.maximum(keep,wide)
m=cv2.GaussianBlur(keep.astype(np.float32),(0,0),4.0)
m=np.clip((m-0.02)/0.96,0,1)
rgba=np.zeros((H,W,4),np.uint8); rgba[...,:3]=255; rgba[...,3]=(m*255).round().astype(np.uint8)
Image.fromarray(rgba,"RGBA").save(P+"reveal-region.png",optimize=True)
ys,xs=np.where(m>0); print("region bbox x",xs.min(),xs.max(),"y",ys.min(),ys.max(),"area %.1f%%"%(100*(m>0).mean()))
# what the suit looks like if revealed outside the region (why the region exists)
out=(m==0); dd=np.abs(A-S).max(2)
print("outside the region: pixels where the two files differ by >30: %.2f%%"%(100*((dd>30)&out).sum()/out.sum()))
v=A.copy(); v=v*(1-0.5*m[...,None])+np.array([0,255,180])*0.5*m[...,None]
Image.fromarray(v.clip(0,255).astype(np.uint8)).save(os.path.join(os.path.dirname(os.path.abspath(__file__)),"region-view.jpg"),quality=88)
