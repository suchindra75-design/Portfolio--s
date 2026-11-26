// Re-inks the owner's two portrait files for the Verse dimension: flat posterised colour,
// halftone dots in the mid-tones, ink lines on edges and a slight plate misregistration.
// It is a per-pixel filter (nothing generated), and it runs on both files identically. Each file
// is drawn into the 771 x 1018 portrait box the way the site shows it: "fill" for the mask file
// (already that size), "cover" for the professional portrait (fitted without stretching, as
// object-cover does), so the Verse layers line up exactly like the Prime ones.
//
//   node tools/verse-portrait/make.mjs
//
// Writes public/portrait/verse/base.jpg. The portrait layer is never re-inked: the Verse shows
// his professional portrait exactly as supplied. Needs Google Chrome and ffmpeg.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const jobs = [
  ["public/portrait/spiderman_masked_portrait.png", "public/portrait/verse/base.jpg", "fill"],
];
const W = 771, H = 1018;
const tmp = mkdtempSync(join(tmpdir(), "verse-"));
mkdirSync(join(root, "public/portrait/verse"), { recursive: true });

const page = (src, fit) => `<!doctype html><html><body style="margin:0;background:#000">
<canvas id="c" width="${W}" height="${H}" style="display:block"></canvas>
<script>
const img = new Image();
img.onload = () => {
  const W=${W},H=${H},c=document.getElementById('c'),g=c.getContext('2d');
  if (${JSON.stringify(fit)} === "cover") {
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  } else g.drawImage(img,0,0,W,H);
  const src=g.getImageData(0,0,W,H).data;
  const L=new Float32Array(W*H);
  for(let i=0;i<W*H;i++){L[i]=Math.max(src[i*4],src[i*4+1],src[i*4+2])/255;}
  // small box blur of luminance for stable edges and dot sizes
  const B=new Float32Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){let s=0,n=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;s+=L[yy*W+xx];n++;}B[y*W+x]=s/n;}
  const out=g.createImageData(W,H),o=out.data;
  const lv=(v)=>{ // contrast curve then 5 flat levels
    v=Math.pow(Math.min(1,Math.max(0,(v-0.03)*1.12)),0.82);
    return Math.round(v*4)/4;
  };
  const cell=6.5, ang=0.38, ca=Math.cos(ang), sa=Math.sin(ang);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=y*W+x,p=i*4;
    let r=src[p]/255,gg=src[p+1]/255,b=src[p+2]/255;
    // saturate a little, then flatten
    const m=(r+gg+b)/3; r=m+(r-m)*1.35; gg=m+(gg-m)*1.35; b=m+(b-m)*1.35;
    r=lv(r); gg=lv(gg); b=lv(b);
    // halftone in the mid-tones: rotated grid, dot radius from local darkness
    const l=B[i];
    if(l>0.08&&l<0.78){
      const u=x*ca+y*sa, v=-x*sa+y*ca;
      const cu=(Math.floor(u/cell)+0.5)*cell, cv=(Math.floor(v/cell)+0.5)*cell;
      const d=Math.hypot(u-cu,v-cv);
      const dark=Math.min(1,Math.max(0,(0.78-l)/0.7));
      const rad=cell*0.62*Math.sqrt(dark);
      if(d<rad){ r*=0.38; gg*=0.38; b*=0.45; }
    }
    // ink: Sobel on the blurred luminance
    if(x>0&&y>0&&x<W-1&&y<H-1){
      const a=(xx,yy)=>B[yy*W+xx];
      const gx=-a(x-1,y-1)-2*a(x-1,y)-a(x-1,y+1)+a(x+1,y-1)+2*a(x+1,y)+a(x+1,y+1);
      const gy=-a(x-1,y-1)-2*a(x,y-1)-a(x+1,y-1)+a(x-1,y+1)+2*a(x,y+1)+a(x+1,y+1);
      const e=Math.hypot(gx,gy);
      if(e>0.42){const k=Math.min(1,(e-0.42)/0.25)*0.92; r*=1-k; gg*=1-k; b*=1-k;}
    }
    o[p]=Math.min(255,r*255); o[p+1]=Math.min(255,gg*255); o[p+2]=Math.min(255,b*255); o[p+3]=255;
  }
  // plate misregistration: red plate 2px left, blue plate 2px right
  const f=new Uint8ClampedArray(o);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=(y*W+x)*4;
    const xr=Math.min(W-1,x+2), xb=Math.max(0,x-2);
    f[p]=o[(y*W+xr)*4]; f[p+2]=o[(y*W+xb)*4+2];}
  g.putImageData(new ImageData(f,W,H),0,0);
  document.title='done';
};
img.src=${JSON.stringify(src)};
</script></body></html>`;

for (const [from, to, fit] of jobs) {
  const b64 = readFileSync(join(root, from)).toString("base64");
  const mime = from.endsWith(".webp") ? "image/webp" : "image/png";
  const html = join(tmp, "p.html");
  writeFileSync(html, page(`data:${mime};base64,${b64}`, fit));
  const png = join(tmp, "out.png");
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", "--virtual-time-budget=20000", `--window-size=${W},${H}`, `--screenshot=${png}`, `file://${html}`], { stdio: "ignore" });
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", png, "-q:v", "2", join(root, to)]);
  console.log("wrote", to);
}
