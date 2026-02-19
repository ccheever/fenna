/** Castle DrawData JSON format types — matches Castle's internal spec */

export interface CastleColor {
  r: number; // 0-1
  g: number; // 0-1
  b: number; // 0-1
  a: number; // 0-1
}

export interface CastleBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface CastleBendPoint {
  x: number;
  y: number;
}

export interface CastlePathData {
  /** Flat array of coordinates: [x1, y1, x2, y2] for a segment */
  p: number[];
  /** Style: 1 = line/quadratic, 2 = arc CW, 3 = arc CCW */
  s: number;
  /** Bend point (quadratic control point) — omit for straight lines */
  bp?: CastleBendPoint;
  /** Whether this is a fill-only path (no stroke) */
  f: boolean;
  /** Color as [r, g, b, a] floats 0-1 */
  c?: number[];
  /** Whether path is transparent */
  isTransparent?: boolean;
}

export interface CastleFrame {
  isLinked: boolean;
  pathDataList: CastlePathData[];
  fillImageBounds?: CastleBounds;
  fillPng?: string;
}

export interface CastleLayer {
  title: string;
  id: string;
  isVisible: boolean;
  isBitmap: boolean;
  frames: CastleFrame[];
}

export interface CastleDrawData {
  version: number;
  scale: number;
  gridSize: number;
  fillPixelsPerUnit: number;
  colors: CastleColor[];
  layers: CastleLayer[];
}
