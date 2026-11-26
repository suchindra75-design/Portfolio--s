import { Effect } from "postprocessing";
import { Uniform } from "three";

/**
 * THE VERSE, AS A GPU PASS. One fragment shader re-inks the 3D skyline like the rest of the Verse:
 * misregistered plates (red and blue printed a couple of pixels off), ink lines where the tone
 * jumps (Sobel on luminance), flat posterised colour, and a 45° halftone screen whose dots grow with
 * the light. Bright things (lit windows) print solid. Drawn for this site; no reference art used.
 */
const fragment = /* glsl */ `
uniform float uDot;
uniform float uShift;

// the composer works in linear light; the comic maths (tone, dots, posterising) is done in display
// (sRGB-like) space so "ink" prints black and mid-tones get mid-sized dots
vec3 toDisplay(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float L(vec2 uv) { return lum(toDisplay(texture2D(inputBuffer, uv).rgb)); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 t = texelSize;
  vec3 c = toDisplay(vec3(
    texture2D(inputBuffer, uv + vec2(uShift, 0.5 * uShift) * t).r,
    inputColor.g,
    texture2D(inputBuffer, uv - vec2(uShift, 0.5 * uShift) * t).b
  ));

  float tl = L(uv + t * vec2(-1.0, 1.0)), tc = L(uv + t * vec2(0.0, 1.0)), tr = L(uv + t * vec2(1.0, 1.0));
  float ml = L(uv + t * vec2(-1.0, 0.0)),                                   mr = L(uv + t * vec2(1.0, 0.0));
  float bl = L(uv + t * vec2(-1.0, -1.0)), bc = L(uv + t * vec2(0.0, -1.0)), br = L(uv + t * vec2(1.0, -1.0));
  float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
  float gy = tl + 2.0 * tc + tr - bl - 2.0 * bc - br;
  float edge = length(vec2(gx, gy));

  vec2 p = uv / t;
  const float s = 0.70710678;
  vec2 q = mat2(s, -s, s, s) * p / uDot;
  float d = length(fract(q) - 0.5);
  float lm = lum(c);
  float rad = clamp(lm * 0.95, 0.0, 0.72);
  float aa = 1.0 / uDot;
  float dots = 1.0 - smoothstep(rad - aa, rad + aa, d);

  vec3 flatc = floor(c * 5.0 + 0.5) / 5.0;
  vec3 ink = vec3(0.0);
  vec3 col = lm > 0.62 ? flatc : mix(ink, flatc * 1.4, dots);
  // ink lines where the tone jumps, but never across something lit (windows, the strand)
  col = mix(col, ink, smoothstep(0.22, 0.5, edge) * (1.0 - step(0.62, lm)));
  outputColor = vec4(pow(col, vec3(2.2)), inputColor.a);
}
`;

export class ComicEffect extends Effect {
  constructor({ dot = 5, shift = 2 } = {}) {
    super("ComicEffect", fragment, {
      uniforms: new Map<string, Uniform>([
        ["uDot", new Uniform(dot)],
        ["uShift", new Uniform(shift)],
      ]),
    });
  }
}
