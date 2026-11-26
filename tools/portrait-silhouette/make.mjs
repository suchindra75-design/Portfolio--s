// The figure's silhouette, so the hero's 3D web can sit BEHIND him instead of behind the black
// rectangle of the portrait files. Neither portrait is edited: this reads both, in the 771 x 1018
// portrait box exactly as the site shows them ("fill" for the mask file, "cover" for the
// professional portrait), and writes a separate alpha mask that the CSS applies to the reveal box.
//
// Method: flood-fill the black background inward from the top and side edges (above the shoulder
// line, so the dark suits are never reached), separately in each file; the background is where
// BOTH files are background, so the mask covers whichever layer the reveal is showing. Small dark
// gaps between hair strands are closed (dilate, then erode), and the edge is feathered.
//
//   node tools/portrait-silhouette/make.mjs      (needs ffmpeg; plain Node, deterministic)
//
// Writes public/portrait/silhouette.png.
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const W = 771, H = 1018, N = W * H;
const T = 0.045, EDGE_Y = Math.round(0.55 * H), CLOSE = 7, GROW = 3, FEATHER = 3;

/** Decode a file to raw RGBA in the portrait box, the way the site fits it. */
const rgba = (file, fit) =>
  execFileSync("ffmpeg", ["-loglevel", "error", "-i", join(root, file), "-vf", fit === "cover" ? `scale=${W}:${H}:force_original_aspect_ratio=increase:flags=bicubic,crop=${W}:${H}` : `scale=${W}:${H}`, "-frames:v", "1", "-pix_fmt", "rgba", "-f", "rawvideo", "-"], { maxBuffer: N * 4 + 1024 });

function dilate(m, r) {
  const t = new Uint8Array(N), o = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = -r; k <= r && !v; k++) { const xx = x + k; if (xx >= 0 && xx < W && m[y * W + xx]) v = 1; } t[y * W + x] = v; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = -r; k <= r && !v; k++) { const yy = y + k; if (yy >= 0 && yy < H && t[yy * W + x]) v = 1; } o[y * W + x] = v; }
  return o;
}
const invert = (m) => m.map((v) => (v ? 0 : 1));
const erode = (m, r) => invert(dilate(invert(m), r));

const bgBoth = new Uint8Array(N).fill(1);
for (const [file, fit] of [["public/portrait/spiderman_masked_portrait.png", "fill"], ["public/portrait/suit-portrait.webp", "cover"]]) {
  const d = rgba(file, fit);
  if (d.length !== N * 4) throw new Error(`unexpected decode size for ${file}`);
  const L = new Float32Array(N);
  for (let i = 0; i < N; i++) L[i] = Math.max(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) / 255;
  // 3x3 blur so sensor noise in the black doesn't stop the fill
  const B = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; s += L[yy * W + xx]; n++; } B[y * W + x] = s / n; }
  const bg = new Uint8Array(N), q = new Int32Array(N);
  let h = 0, t = 0;
  const seed = (x, y) => { const i = y * W + x; if (!bg[i] && B[i] < T) { bg[i] = 1; q[t++] = i; } };
  for (let x = 0; x < W; x++) seed(x, 0);
  for (let y = 0; y < EDGE_Y; y++) { seed(0, y); seed(W - 1, y); }
  while (h < t) { const i = q[h++], x = i % W, y = (i - x) / W; if (x > 0) seed(x - 1, y); if (x < W - 1) seed(x + 1, y); if (y > 0) seed(x, y - 1); if (y < H - 1) seed(x, y + 1); }
  for (let i = 0; i < N; i++) if (!bg[i]) bgBoth[i] = 0;
}
let fg = invert(bgBoth);
fg = erode(dilate(fg, CLOSE), CLOSE); // close gaps between strands of hair
fg = dilate(fg, GROW); // a little room so no black fringe of the files shows
// feather (box blur, clamped at the box edges: the suits run off them)
const out = Buffer.alloc(N);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  let s = 0, n = 0;
  for (let dy = -FEATHER; dy <= FEATHER; dy++) for (let dx = -FEATHER; dx <= FEATHER; dx++) { const xx = Math.min(W - 1, Math.max(0, x + dx)), yy = Math.min(H - 1, Math.max(0, y + dy)); s += fg[yy * W + xx]; n++; }
  out[y * W + x] = Math.round((s / n) * 255);
}
// grey levels become the alpha of a white image
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", `${W}x${H}`, "-i", "-", "-f", "lavfi", "-i", `color=white:s=${W}x${H}`, "-filter_complex", "[1]format=rgba[w];[w][0]alphamerge", "-frames:v", "1", join(root, "public/portrait/silhouette.png")], { input: out });
let solid = 0;
for (const v of out) if (v > 127) solid++;
console.log(`wrote public/portrait/silhouette.png (figure covers ${((100 * solid) / N).toFixed(1)}% of the box)`);
