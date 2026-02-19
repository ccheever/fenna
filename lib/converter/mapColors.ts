import type { CastleColor } from "../castle/format";

/** Lab color space representation */
interface Lab {
  L: number;
  a: number;
  b: number;
}

/** Result of mapping an SVG color to the nearest palette color */
export interface ColorMapping {
  /** Original SVG color as hex */
  original: string;
  /** Index in the palette */
  paletteIndex: number;
  /** Palette color as hex */
  paletteHex: string;
  /** Palette color as CastleColor */
  castleColor: CastleColor;
  /** CIE94 Delta E distance */
  deltaE: number;
}

/**
 * Convert sRGB (0-255 per channel) to CIE Lab color space.
 * Uses D65 illuminant reference white.
 */
export function rgb2lab(r: number, g: number, b: number): Lab {
  // sRGB to linear RGB
  let rl = r / 255;
  let gl = g / 255;
  let bl = b / 255;

  rl = rl > 0.04045 ? Math.pow((rl + 0.055) / 1.055, 2.4) : rl / 12.92;
  gl = gl > 0.04045 ? Math.pow((gl + 0.055) / 1.055, 2.4) : gl / 12.92;
  bl = bl > 0.04045 ? Math.pow((bl + 0.055) / 1.055, 2.4) : bl / 12.92;

  // Linear RGB to XYZ (D65)
  let x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  let y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750);
  let z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883;

  // XYZ to Lab
  const epsilon = 0.008856;
  const kappa = 903.3;

  x = x > epsilon ? Math.cbrt(x) : (kappa * x + 16) / 116;
  y = y > epsilon ? Math.cbrt(y) : (kappa * y + 16) / 116;
  z = z > epsilon ? Math.cbrt(z) : (kappa * z + 16) / 116;

  return {
    L: 116 * y - 16,
    a: 500 * (x - y),
    b: 200 * (y - z),
  };
}

/**
 * CIE94 color difference — matches Castle's Palettes.js implementation.
 * Uses graphic arts weighting (kL=1, K1=0.045, K2=0.015).
 */
export function deltaE(lab1: Lab, lab2: Lab): number {
  const dL = lab1.L - lab2.L;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;

  const c1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
  const c2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
  const dC = c1 - c2;

  let dH2 = da * da + db * db - dC * dC;
  if (dH2 < 0) dH2 = 0;

  const sL = 1;
  const sC = 1 + 0.045 * c1;
  const sH = 1 + 0.015 * c1;

  const result =
    (dL / sL) * (dL / sL) +
    (dC / sC) * (dC / sC) +
    dH2 / (sH * sH);

  return Math.sqrt(Math.max(0, result));
}

/** Parse a hex color to RGB values (0-255) */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/** Normalize any CSS color string to 6-digit hex */
export function normalizeColor(color: string): string | null {
  const c = color.trim().toLowerCase();

  // Already hex
  if (c.startsWith("#")) {
    const h = c.slice(1);
    if (h.length === 3) {
      return "#" + h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    if (h.length === 6) return "#" + h;
    if (h.length === 8) return "#" + h.substring(0, 6); // strip alpha
    return null;
  }

  // rgb() / rgba()
  const rgbMatch = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    return (
      "#" +
      r.toString(16).padStart(2, "0") +
      g.toString(16).padStart(2, "0") +
      b.toString(16).padStart(2, "0")
    );
  }

  // Named CSS colors (common subset)
  const named: Record<string, string | null> = {
    black: "#000000", white: "#ffffff", red: "#ff0000",
    green: "#008000", blue: "#0000ff", yellow: "#ffff00",
    cyan: "#00ffff", magenta: "#ff00ff", orange: "#ffa500",
    purple: "#800080", pink: "#ffc0cb", gray: "#808080",
    grey: "#808080", silver: "#c0c0c0", maroon: "#800000",
    olive: "#808000", lime: "#00ff00", aqua: "#00ffff",
    teal: "#008080", navy: "#000080", fuchsia: "#ff00ff",
    transparent: null,
    none: null,
  };

  if (c in named) return named[c];

  return null;
}

/**
 * Find the nearest palette color for a given hex color.
 * Returns the palette index and delta E distance.
 */
export function mapColorToPalette(
  hex: string,
  paletteHexColors: string[]
): { index: number; deltaE: number } {
  const [r, g, b] = hexToRgb(hex);
  const lab = rgb2lab(r, g, b);

  let bestIndex = 0;
  let bestDist = Infinity;

  for (let i = 0; i < paletteHexColors.length; i++) {
    const [pr, pg, pb] = hexToRgb(paletteHexColors[i]);
    const pLab = rgb2lab(pr, pg, pb);
    const dist = deltaE(lab, pLab);

    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }

  return { index: bestIndex, deltaE: bestDist };
}

/**
 * Build a complete color mapping from SVG colors to palette colors.
 * Returns a Map keyed by normalized hex color.
 */
export function buildColorMap(
  svgColors: string[],
  paletteHex: string[],
  paletteCastle: CastleColor[]
): Map<string, ColorMapping> {
  const map = new Map<string, ColorMapping>();

  for (const color of svgColors) {
    const normalized = normalizeColor(color);
    if (!normalized || map.has(normalized)) continue;

    const { index, deltaE: dist } = mapColorToPalette(normalized, paletteHex);
    map.set(normalized, {
      original: normalized,
      paletteIndex: index,
      paletteHex: paletteHex[index],
      castleColor: paletteCastle[index],
      deltaE: dist,
    });
  }

  return map;
}
