import { Color, SRGBColorSpace } from 'three/webgpu';

/**
 * Approximate sRGB colour of a blackbody at `kelvin` (Tanner Helland fit),
 * normalised so the brightest channel is 1. Good to ~1% between 1000–12000 K.
 */
export function kelvinToColor(kelvin, target = new Color()) {
  const t = Math.min(40000, Math.max(1000, kelvin)) / 100;
  let r, g, b;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  const c = [r, g, b].map((v) => Math.min(255, Math.max(0, v)) / 255);
  const max = Math.max(...c);
  return target.setRGB(c[0] / max, c[1] / max, c[2] / max, SRGBColorSpace);
}
