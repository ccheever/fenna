import { v4 as uuidv4 } from "uuid";
import type { CastleDrawData, CastleColor } from "../castle/format";
import { AAP_64_HEX, AAP_64_CASTLE } from "../castle/palettes";
import { buildColorMap, type ColorMapping } from "./mapColors";
import { parseSvg } from "./parseSvg";
import { convertAllPaths } from "./convertPaths";
import { renderFillPng, computeBounds } from "./renderFills";

export interface BuildResult {
  drawData: CastleDrawData;
  colorMappings: Map<string, ColorMapping>;
  warnings: string[];
}

/**
 * Full pipeline: SVG string → Castle DrawData JSON.
 *
 * @param svgString - Raw SVG string from Recraft
 * @param paletteHex - Palette hex colors (defaults to AAP-64)
 * @param paletteCastle - Palette as CastleColor[] (defaults to AAP-64)
 * @param tolerance - Cubic→quadratic approximation tolerance
 */
export async function buildCastleDrawData(
  svgString: string,
  paletteHex: string[] = AAP_64_HEX,
  paletteCastle: CastleColor[] = AAP_64_CASTLE,
  tolerance: number = 0.05
): Promise<BuildResult> {
  const warnings: string[] = [];

  // Step 1: Parse SVG
  const parsed = parseSvg(svgString);
  warnings.push(...parsed.warnings);

  // Step 2: Build color mapping
  const colorMap = buildColorMap(parsed.colors, paletteHex, paletteCastle);

  // Check for high-deltaE mappings
  for (const [, mapping] of colorMap) {
    if (mapping.deltaE > 15) {
      warnings.push(
        `Color ${mapping.original} mapped to ${mapping.paletteHex} with high ΔE of ${mapping.deltaE.toFixed(1)}`
      );
    }
  }

  // Step 3: Convert paths
  const pathDataList = convertAllPaths(
    parsed.elements,
    parsed.viewBox,
    colorMap,
    tolerance
  );

  // Check for varying stroke widths
  const strokeWidths = new Set(
    parsed.elements
      .filter((e) => e.stroke)
      .map((e) => e.strokeWidth)
  );
  if (strokeWidths.size > 1) {
    warnings.push(
      `Varying stroke widths detected (${Array.from(strokeWidths).join(", ")}). Castle uses a fixed stroke weight.`
    );
  }

  // Step 4: Compute bounds and render fill PNG
  const bounds = computeBounds(pathDataList);

  let fillPng = "";
  try {
    fillPng = await renderFillPng(svgString, colorMap, bounds);
  } catch {
    warnings.push("Failed to render fill PNG; fill layer will be empty.");
  }

  // Step 5: Assemble Castle DrawData
  const drawData: CastleDrawData = {
    version: 3,
    scale: 10,
    gridSize: 0.71428571428571,
    fillPixelsPerUnit: 25.6,
    colors: paletteCastle,
    layers: [
      {
        title: "Imported",
        id: uuidv4(),
        isVisible: true,
        isBitmap: false,
        frames: [
          {
            isLinked: false,
            pathDataList,
            fillImageBounds: bounds,
            fillPng,
          },
        ],
      },
    ],
  };

  return { drawData, colorMappings: colorMap, warnings };
}
