import type { CastleBounds } from "../castle/format";
import type { ColorMapping } from "./mapColors";
import { normalizeColor } from "./mapColors";

const FILL_PIXELS_PER_UNIT = 25.6;

/**
 * Recolor an SVG string by replacing all colors with palette-snapped equivalents.
 */
function recolorSvg(
  svgString: string,
  colorMap: Map<string, ColorMapping>
): string {
  let result = svgString;

  for (const [original, mapping] of colorMap) {
    // Replace hex colors (case-insensitive)
    const escapedHex = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(
      new RegExp(escapedHex, "gi"),
      mapping.paletteHex
    );
  }

  return result;
}

/**
 * Render the fill PNG for a Castle drawing.
 * Uses an offscreen canvas to render the recolored SVG, then extracts as base64 PNG.
 *
 * @param svgString - Original SVG string
 * @param colorMap - Color mapping from buildColorMap
 * @param bounds - Castle-space bounds
 * @returns base64-encoded PNG string (without data:image/png;base64, prefix)
 */
export async function renderFillPng(
  svgString: string,
  colorMap: Map<string, ColorMapping>,
  bounds: CastleBounds
): Promise<string> {
  const width = Math.ceil((bounds.maxX - bounds.minX) * FILL_PIXELS_PER_UNIT);
  const height = Math.ceil((bounds.maxY - bounds.minY) * FILL_PIXELS_PER_UNIT);

  if (width <= 0 || height <= 0) return "";

  // Recolor the SVG
  const recolored = recolorSvg(svgString, colorMap);

  // Create offscreen canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to create canvas context");

  // Render SVG to canvas via Image + data URI
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/png");
      // Strip the data:image/png;base64, prefix
      const base64 = dataUrl.split(",")[1] || "";
      resolve(base64);
    };
    img.onerror = () => {
      // If SVG rendering fails, return empty string (no fill)
      resolve("");
    };

    const blob = new Blob([recolored], { type: "image/svg+xml;charset=utf-8" });
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Compute the bounding box of all Castle path segments.
 */
export function computeBounds(
  pathDataList: Array<{ p: number[] }>
): CastleBounds {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  for (const seg of pathDataList) {
    for (let i = 0; i < seg.p.length; i += 2) {
      const x = seg.p[i];
      const y = seg.p[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  // Fallback for empty paths
  if (minX === Infinity) {
    return { minX: -10, maxX: 10, minY: -10, maxY: 10 };
  }

  // Add a small margin
  const margin = 0.1;
  return {
    minX: minX - margin,
    maxX: maxX + margin,
    minY: minY - margin,
    maxY: maxY + margin,
  };
}
