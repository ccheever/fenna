import { SVGPathData, SVGCommand } from "svg-pathdata";
import type { CastlePathData, CastleBendPoint } from "../castle/format";
import type { ParsedElement } from "./parseSvg";
import type { ColorMapping } from "./mapColors";
import { Matrix, transformPoint } from "./matrix";

/** Default tolerance in Castle units for cubic-to-quadratic approximation */
const DEFAULT_TOLERANCE = 0.05;

/** Castle coordinate space is ±10 units */
const CASTLE_HALF_SIZE = 10;

/**
 * Compute the transform from SVG viewBox coordinates to Castle's ±10 grid.
 * Preserves aspect ratio, centering the content.
 */
export function viewBoxToCastleTransform(
  viewBox: [number, number, number, number]
): { scale: number; offsetX: number; offsetY: number } {
  const [vx, vy, vw, vh] = viewBox;
  const scale = (CASTLE_HALF_SIZE * 2) / Math.max(vw, vh);
  const offsetX = -vx * scale - (vw * scale) / 2;
  const offsetY = -vy * scale - (vh * scale) / 2;
  return { scale, offsetX, offsetY };
}

/** Transform an SVG point through element matrix + viewBox→Castle mapping */
function tocastle(
  svgX: number,
  svgY: number,
  elementMatrix: Matrix,
  vbTransform: { scale: number; offsetX: number; offsetY: number }
): [number, number] {
  // Apply element transform
  const [tx, ty] = transformPoint(elementMatrix, svgX, svgY);
  // Apply viewBox → Castle transform
  return [
    tx * vbTransform.scale + vbTransform.offsetX,
    ty * vbTransform.scale + vbTransform.offsetY,
  ];
}

/** Make a Castle path segment (straight line) */
function straightSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number[] | undefined,
  isFill: boolean
): CastlePathData {
  const seg: CastlePathData = {
    p: [x1, y1, x2, y2],
    s: 1,
    f: isFill,
  };
  if (color) seg.c = color;
  return seg;
}

/** Make a Castle path segment with a bend point (quadratic curve) */
function quadSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bp: CastleBendPoint,
  color: number[] | undefined,
  isFill: boolean
): CastlePathData {
  const seg: CastlePathData = {
    p: [x1, y1, x2, y2],
    s: 1,
    bp,
    f: isFill,
  };
  if (color) seg.c = color;
  return seg;
}

/**
 * Approximate a cubic bezier with quadratic segments.
 * Uses adaptive subdivision with de Casteljau's algorithm.
 */
function cubicToQuadratic(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  tolerance: number,
  color: number[] | undefined,
  isFill: boolean,
  depth: number = 0
): CastlePathData[] {
  // Try degree reduction: best-fit quadratic control point
  const qx = (3 * x1 - x0 + 3 * x2 - x3) / 4;
  const qy = (3 * y1 - y0 + 3 * y2 - y3) / 4;

  // Measure error at t=0.5
  // Cubic midpoint
  const cx = 0.125 * x0 + 0.375 * x1 + 0.375 * x2 + 0.125 * x3;
  const cy = 0.125 * y0 + 0.375 * y1 + 0.375 * y2 + 0.125 * y3;
  // Quadratic midpoint with control point (qx, qy)
  const qmx = 0.25 * x0 + 0.5 * qx + 0.25 * x3;
  const qmy = 0.25 * y0 + 0.5 * qy + 0.25 * y3;

  const error = Math.sqrt((cx - qmx) ** 2 + (cy - qmy) ** 2);

  if (error <= tolerance || depth > 8) {
    return [quadSegment(x0, y0, x3, y3, { x: qx, y: qy }, color, isFill)];
  }

  // Subdivide at t=0.5 using de Casteljau
  const m01x = (x0 + x1) / 2,
    m01y = (y0 + y1) / 2;
  const m12x = (x1 + x2) / 2,
    m12y = (y1 + y2) / 2;
  const m23x = (x2 + x3) / 2,
    m23y = (y2 + y3) / 2;
  const m012x = (m01x + m12x) / 2,
    m012y = (m01y + m12y) / 2;
  const m123x = (m12x + m23x) / 2,
    m123y = (m12y + m23y) / 2;
  const mx = (m012x + m123x) / 2,
    my = (m012y + m123y) / 2;

  return [
    ...cubicToQuadratic(x0, y0, m01x, m01y, m012x, m012y, mx, my, tolerance, color, isFill, depth + 1),
    ...cubicToQuadratic(mx, my, m123x, m123y, m23x, m23y, x3, y3, tolerance, color, isFill, depth + 1),
  ];
}

/**
 * Convert an SVG arc to quadratic bezier approximations.
 * Uses endpoint-to-center parameterization, splits into ≤90° segments.
 */
function arcToQuadratic(
  x0: number,
  y0: number,
  rx: number,
  ry: number,
  xAxisRotation: number,
  largeArcFlag: boolean,
  sweepFlag: boolean,
  x: number,
  y: number,
  color: number[] | undefined,
  isFill: boolean
): CastlePathData[] {
  // Handle degenerate cases
  if (rx === 0 || ry === 0) {
    return [straightSegment(x0, y0, x, y, color, isFill)];
  }

  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const phi = (xAxisRotation * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  // Step 1: compute (x1', y1')
  const dx = (x0 - x) / 2;
  const dy = (y0 - y) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  // Correct out-of-range radii
  let lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const sqrtLambda = Math.sqrt(lambda);
    rx *= sqrtLambda;
    ry *= sqrtLambda;
  }

  // Step 2: compute (cx', cy')
  const rxSq = rx * rx;
  const rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;

  let num = rxSq * rySq - rxSq * y1pSq - rySq * x1pSq;
  let den = rxSq * y1pSq + rySq * x1pSq;
  if (num < 0) num = 0;

  let sq = Math.sqrt(num / den);
  if (largeArcFlag === sweepFlag) sq = -sq;

  const cxp = (sq * rx * y1p) / ry;
  const cyp = (-sq * ry * x1p) / rx;

  // Step 3: compute (cx, cy)
  const cx = cosPhi * cxp - sinPhi * cyp + (x0 + x) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y0 + y) / 2;

  // Step 4: compute theta1 and dTheta
  function angle(ux: number, uy: number, vx: number, vy: number): number {
    const dot = ux * vx + uy * vy;
    const cross = ux * vy - uy * vx;
    let a = Math.atan2(cross, dot);
    return a;
  }

  const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dTheta = angle(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry
  );

  if (!sweepFlag && dTheta > 0) dTheta -= 2 * Math.PI;
  if (sweepFlag && dTheta < 0) dTheta += 2 * Math.PI;

  // Split into segments of ≤90°
  const numSegments = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2)));
  const segAngle = dTheta / numSegments;

  const segments: CastlePathData[] = [];
  let curX = x0;
  let curY = y0;

  for (let i = 0; i < numSegments; i++) {
    const t1 = theta1 + i * segAngle;
    const t2 = theta1 + (i + 1) * segAngle;

    // Approximate arc segment with quadratic bezier
    const alpha = (4 / 3) * Math.tan((t2 - t1) / 4);

    // Points on the unit circle
    const cosT1 = Math.cos(t1);
    const sinT1 = Math.sin(t1);
    const cosT2 = Math.cos(t2);
    const sinT2 = Math.sin(t2);

    // End point on ellipse
    const ex = cosPhi * rx * cosT2 - sinPhi * ry * sinT2 + cx;
    const ey = sinPhi * rx * cosT2 + cosPhi * ry * sinT2 + cy;

    // Control points (cubic bezier for this arc segment)
    const cp1x = cx + cosPhi * rx * (cosT1 - alpha * sinT1) - sinPhi * ry * (sinT1 + alpha * cosT1) - cx;
    const cp1y = cy + sinPhi * rx * (cosT1 - alpha * sinT1) + cosPhi * ry * (sinT1 + alpha * cosT1) - cy;
    const cp2x = cx + cosPhi * rx * (cosT2 + alpha * sinT2) - sinPhi * ry * (sinT2 - alpha * cosT2) - cx;
    const cp2y = cy + sinPhi * rx * (cosT2 + alpha * sinT2) + cosPhi * ry * (sinT2 - alpha * cosT2) - cy;

    // Use cubic-to-quadratic conversion for each arc segment
    const cubicCp1x = curX + (2 / 3) * (cx + cp1x - curX);
    const cubicCp1y = curY + (2 / 3) * (cy + cp1y - curY);
    const cubicCp2x = ex + (2 / 3) * (cx + cp2x - ex);
    const cubicCp2y = ey + (2 / 3) * (cy + cp2y - ey);

    // Simpler approach: use a single quadratic with the midpoint control
    const midAngle = (t1 + t2) / 2;
    const tanHalf = Math.tan((t2 - t1) / 2);
    // Control point for quadratic approximation of arc
    const qcx = cosPhi * rx * (Math.cos(midAngle) / Math.cos((t2 - t1) / 2)) - sinPhi * ry * (Math.sin(midAngle) / Math.cos((t2 - t1) / 2)) + cx;
    const qcy = sinPhi * rx * (Math.cos(midAngle) / Math.cos((t2 - t1) / 2)) + cosPhi * ry * (Math.sin(midAngle) / Math.cos((t2 - t1) / 2)) + cy;

    segments.push(
      quadSegment(curX, curY, ex, ey, { x: qcx, y: qcy }, color, isFill)
    );

    curX = ex;
    curY = ey;
  }

  return segments;
}

/**
 * Convert a single parsed SVG element to Castle path segments.
 */
export function convertElement(
  element: ParsedElement,
  viewBox: [number, number, number, number],
  colorMap: Map<string, ColorMapping>,
  tolerance: number = DEFAULT_TOLERANCE
): CastlePathData[] {
  const vbTransform = viewBoxToCastleTransform(viewBox);
  const segments: CastlePathData[] = [];
  const { d, fill, stroke, transform } = element;

  // Determine Castle color
  const fillMapping = fill ? colorMap.get(fill) : undefined;
  const strokeMapping = stroke ? colorMap.get(stroke) : undefined;

  // We emit segments for fill (isFill=true) and stroke (isFill=false) separately
  const colorSets: Array<{
    color: number[] | undefined;
    isFill: boolean;
  }> = [];

  if (fillMapping) {
    const c = fillMapping.castleColor;
    colorSets.push({ color: [c.r, c.g, c.b, c.a], isFill: true });
  }
  if (strokeMapping) {
    const c = strokeMapping.castleColor;
    colorSets.push({ color: [c.r, c.g, c.b, c.a], isFill: false });
  }

  // If neither fill nor stroke, use default black fill
  if (colorSets.length === 0) {
    colorSets.push({ color: undefined, isFill: false });
  }

  // Parse path d string using svg-pathdata
  let commands: SVGCommand[];
  try {
    const pathData = new SVGPathData(d);
    // Normalize to absolute coordinates
    commands = pathData.toAbs().commands;
  } catch {
    return segments;
  }

  for (const { color, isFill } of colorSets) {
    let curX = 0,
      curY = 0;
    let startX = 0,
      startY = 0;

    for (const cmd of commands) {
      switch (cmd.type) {
        case SVGPathData.MOVE_TO: {
          const [cx, cy] = tocastle(cmd.x, cmd.y, transform, vbTransform);
          curX = cx;
          curY = cy;
          startX = cx;
          startY = cy;
          break;
        }

        case SVGPathData.LINE_TO: {
          const [nx, ny] = tocastle(cmd.x, cmd.y, transform, vbTransform);
          segments.push(straightSegment(curX, curY, nx, ny, color, isFill));
          curX = nx;
          curY = ny;
          break;
        }

        case SVGPathData.HORIZ_LINE_TO: {
          const [nx, ny] = tocastle(cmd.x, curY / vbTransform.scale - vbTransform.offsetY / vbTransform.scale, transform, vbTransform);
          // For H command, we need the y in SVG space. Since curY is already in Castle space,
          // just use the Castle-space y directly.
          segments.push(straightSegment(curX, curY, nx, curY, color, isFill));
          curX = nx;
          break;
        }

        case SVGPathData.VERT_LINE_TO: {
          const [nx, ny] = tocastle(curX / vbTransform.scale - vbTransform.offsetX / vbTransform.scale, cmd.y, transform, vbTransform);
          segments.push(straightSegment(curX, curY, curX, ny, color, isFill));
          curY = ny;
          break;
        }

        case SVGPathData.QUAD_TO: {
          const [nx, ny] = tocastle(cmd.x, cmd.y, transform, vbTransform);
          const [bx, by] = tocastle(cmd.x1, cmd.y1, transform, vbTransform);
          segments.push(
            quadSegment(curX, curY, nx, ny, { x: bx, y: by }, color, isFill)
          );
          curX = nx;
          curY = ny;
          break;
        }

        case SVGPathData.CURVE_TO: {
          // Cubic bezier → quadratic approximation
          const [cp1x, cp1y] = tocastle(cmd.x1, cmd.y1, transform, vbTransform);
          const [cp2x, cp2y] = tocastle(cmd.x2, cmd.y2, transform, vbTransform);
          const [nx, ny] = tocastle(cmd.x, cmd.y, transform, vbTransform);

          const cubicSegs = cubicToQuadratic(
            curX, curY, cp1x, cp1y, cp2x, cp2y, nx, ny,
            tolerance, color, isFill
          );
          segments.push(...cubicSegs);
          curX = nx;
          curY = ny;
          break;
        }

        case SVGPathData.ARC: {
          // Transform the endpoint
          const [nx, ny] = tocastle(cmd.x, cmd.y, transform, vbTransform);

          // Scale radii by viewBox transform
          const scaledRx = cmd.rX * vbTransform.scale;
          const scaledRy = cmd.rY * vbTransform.scale;

          const arcSegs = arcToQuadratic(
            curX, curY,
            scaledRx, scaledRy,
            cmd.xRot,
            cmd.lArcFlag === 1,
            cmd.sweepFlag === 1,
            nx, ny,
            color, isFill
          );
          segments.push(...arcSegs);
          curX = nx;
          curY = ny;
          break;
        }

        case SVGPathData.CLOSE_PATH: {
          if (Math.abs(curX - startX) > 0.001 || Math.abs(curY - startY) > 0.001) {
            segments.push(straightSegment(curX, curY, startX, startY, color, isFill));
          }
          curX = startX;
          curY = startY;
          break;
        }

        case SVGPathData.SMOOTH_CURVE_TO: {
          // S command: reflected control point from previous cubic
          const [cp2x, cp2y] = tocastle(cmd.x2, cmd.y2, transform, vbTransform);
          const [nx, ny] = tocastle(cmd.x, cmd.y, transform, vbTransform);
          // Reflection: use curX,curY as cp1 (no previous cubic info in absolute conversion)
          const cubicSegs = cubicToQuadratic(
            curX, curY, curX, curY, cp2x, cp2y, nx, ny,
            tolerance, color, isFill
          );
          segments.push(...cubicSegs);
          curX = nx;
          curY = ny;
          break;
        }

        case SVGPathData.SMOOTH_QUAD_TO: {
          // T command: reflected control point
          const [nx, ny] = tocastle(cmd.x, cmd.y, transform, vbTransform);
          // Without tracking previous Q control, just do straight line
          segments.push(straightSegment(curX, curY, nx, ny, color, isFill));
          curX = nx;
          curY = ny;
          break;
        }
      }
    }
  }

  return segments;
}

/**
 * Convert all parsed SVG elements to Castle path segments.
 */
export function convertAllPaths(
  elements: ParsedElement[],
  viewBox: [number, number, number, number],
  colorMap: Map<string, ColorMapping>,
  tolerance: number = DEFAULT_TOLERANCE
): CastlePathData[] {
  const allSegments: CastlePathData[] = [];

  for (const element of elements) {
    const segs = convertElement(element, viewBox, colorMap, tolerance);
    allSegments.push(...segs);
  }

  return allSegments;
}
