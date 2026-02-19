import { Matrix, IDENTITY, multiply, parseTransform } from "./matrix";
import { normalizeColor } from "./mapColors";

/** A parsed SVG element with its computed properties */
export interface ParsedElement {
  /** SVG path d string */
  d: string;
  /** Fill color as normalized hex, or null for no fill */
  fill: string | null;
  /** Stroke color as normalized hex, or null for no stroke */
  stroke: string | null;
  /** Stroke width */
  strokeWidth: number;
  /** Accumulated transform matrix */
  transform: Matrix;
}

/** Result of parsing an SVG string */
export interface ParsedSvg {
  /** ViewBox [x, y, width, height] */
  viewBox: [number, number, number, number];
  /** All leaf elements as path data */
  elements: ParsedElement[];
  /** Deduplicated list of all colors found */
  colors: string[];
  /** Warnings generated during parsing */
  warnings: string[];
}

/**
 * Convert basic SVG shapes to path d strings.
 */
function rectToPath(el: Element): string | null {
  const x = parseFloat(el.getAttribute("x") || "0");
  const y = parseFloat(el.getAttribute("y") || "0");
  const w = parseFloat(el.getAttribute("width") || "0");
  const h = parseFloat(el.getAttribute("height") || "0");
  const rx = parseFloat(el.getAttribute("rx") || "0");
  const ry = parseFloat(el.getAttribute("ry") || rx.toString());
  if (w <= 0 || h <= 0) return null;

  if (rx > 0 || ry > 0) {
    const r = Math.min(rx, w / 2);
    const rv = Math.min(ry, h / 2);
    return (
      `M${x + r},${y}` +
      `L${x + w - r},${y}` +
      `A${r},${rv} 0 0 1 ${x + w},${y + rv}` +
      `L${x + w},${y + h - rv}` +
      `A${r},${rv} 0 0 1 ${x + w - r},${y + h}` +
      `L${x + r},${y + h}` +
      `A${r},${rv} 0 0 1 ${x},${y + h - rv}` +
      `L${x},${y + rv}` +
      `A${r},${rv} 0 0 1 ${x + r},${y}Z`
    );
  }

  return `M${x},${y}L${x + w},${y}L${x + w},${y + h}L${x},${y + h}Z`;
}

function circleToPath(el: Element): string | null {
  const cx = parseFloat(el.getAttribute("cx") || "0");
  const cy = parseFloat(el.getAttribute("cy") || "0");
  const r = parseFloat(el.getAttribute("r") || "0");
  if (r <= 0) return null;

  return (
    `M${cx - r},${cy}` +
    `A${r},${r} 0 1 0 ${cx + r},${cy}` +
    `A${r},${r} 0 1 0 ${cx - r},${cy}Z`
  );
}

function ellipseToPath(el: Element): string | null {
  const cx = parseFloat(el.getAttribute("cx") || "0");
  const cy = parseFloat(el.getAttribute("cy") || "0");
  const rx = parseFloat(el.getAttribute("rx") || "0");
  const ry = parseFloat(el.getAttribute("ry") || "0");
  if (rx <= 0 || ry <= 0) return null;

  return (
    `M${cx - rx},${cy}` +
    `A${rx},${ry} 0 1 0 ${cx + rx},${cy}` +
    `A${rx},${ry} 0 1 0 ${cx - rx},${cy}Z`
  );
}

function lineToPath(el: Element): string | null {
  const x1 = parseFloat(el.getAttribute("x1") || "0");
  const y1 = parseFloat(el.getAttribute("y1") || "0");
  const x2 = parseFloat(el.getAttribute("x2") || "0");
  const y2 = parseFloat(el.getAttribute("y2") || "0");
  return `M${x1},${y1}L${x2},${y2}`;
}

function polygonToPath(el: Element): string | null {
  const points = el.getAttribute("points");
  if (!points) return null;
  const coords = points.trim().split(/[\s,]+/).map(Number);
  if (coords.length < 4) return null;
  let d = `M${coords[0]},${coords[1]}`;
  for (let i = 2; i < coords.length; i += 2) {
    d += `L${coords[i]},${coords[i + 1]}`;
  }
  return d + "Z";
}

function polylineToPath(el: Element): string | null {
  const points = el.getAttribute("points");
  if (!points) return null;
  const coords = points.trim().split(/[\s,]+/).map(Number);
  if (coords.length < 4) return null;
  let d = `M${coords[0]},${coords[1]}`;
  for (let i = 2; i < coords.length; i += 2) {
    d += `L${coords[i]},${coords[i + 1]}`;
  }
  return d;
}

function getElementColor(el: Element, attr: string, parentStyle?: string): string | null {
  // Check inline style first
  const style = el.getAttribute("style");
  if (style) {
    const match = style.match(new RegExp(`${attr}\\s*:\\s*([^;]+)`));
    if (match) return normalizeColor(match[1].trim());
  }

  // Then attribute
  const val = el.getAttribute(attr);
  if (val) return normalizeColor(val);

  // Inherit from parent
  if (parentStyle) return normalizeColor(parentStyle);

  return attr === "fill" ? "#000000" : null; // SVG default fill is black
}

/**
 * Parse an SVG string into structured data.
 * Uses DOMParser for browser-compatible parsing.
 */
export function parseSvg(svgString: string): ParsedSvg {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svgEl = doc.querySelector("svg");

  if (!svgEl) {
    throw new Error("No SVG element found");
  }

  // Parse viewBox
  const vbAttr = svgEl.getAttribute("viewBox");
  let viewBox: [number, number, number, number];

  if (vbAttr) {
    const parts = vbAttr.split(/[\s,]+/).map(Number);
    viewBox = [parts[0], parts[1], parts[2], parts[3]];
  } else {
    const w = parseFloat(svgEl.getAttribute("width") || "100");
    const h = parseFloat(svgEl.getAttribute("height") || "100");
    viewBox = [0, 0, w, h];
  }

  const elements: ParsedElement[] = [];
  const colorSet = new Set<string>();
  const warnings: string[] = [];

  function walk(node: Element, parentMatrix: Matrix, parentFill?: string, parentStroke?: string) {
    // Accumulate transform
    const transformAttr = node.getAttribute("transform");
    const localMatrix = transformAttr ? parseTransform(transformAttr) : IDENTITY;
    const matrix = multiply(parentMatrix, localMatrix);

    // Get inherited colors
    const nodeFill = node.getAttribute("fill") || (node.getAttribute("style")?.match(/fill\s*:\s*([^;]+)/)?.[1]) || parentFill;
    const nodeStroke = node.getAttribute("stroke") || (node.getAttribute("style")?.match(/stroke\s*:\s*([^;]+)/)?.[1]) || parentStroke;

    const tag = node.tagName.toLowerCase();

    // Handle gradient references — sample first stop
    if (tag === "lineargradient" || tag === "radialgradient") return;
    if (tag === "defs" || tag === "clippath" || tag === "mask") return;

    // Detect gradients used as fills
    const fillRef = node.getAttribute("fill");
    if (fillRef && fillRef.startsWith("url(")) {
      warnings.push(`Gradient fill detected on <${tag}>; using first stop color as approximation`);
      const id = fillRef.match(/url\(#([^)]+)\)/)?.[1];
      if (id) {
        const gradEl = doc.getElementById(id);
        if (gradEl) {
          const firstStop = gradEl.querySelector("stop");
          if (firstStop) {
            const stopColor = firstStop.getAttribute("stop-color") || firstStop.getAttribute("style")?.match(/stop-color\s*:\s*([^;]+)/)?.[1];
            if (stopColor) {
              const normalized = normalizeColor(stopColor);
              if (normalized) {
                node.setAttribute("fill", normalized);
              }
            }
          }
        }
      }
    }

    // Recurse into groups
    if (tag === "g" || tag === "svg") {
      for (let i = 0; i < node.children.length; i++) {
        walk(node.children[i], matrix, nodeFill, nodeStroke);
      }
      return;
    }

    // Convert element to path d string
    let d: string | null = null;

    switch (tag) {
      case "path":
        d = node.getAttribute("d");
        break;
      case "rect":
        d = rectToPath(node);
        break;
      case "circle":
        d = circleToPath(node);
        break;
      case "ellipse":
        d = ellipseToPath(node);
        break;
      case "line":
        d = lineToPath(node);
        break;
      case "polygon":
        d = polygonToPath(node);
        break;
      case "polyline":
        d = polylineToPath(node);
        break;
    }

    if (!d) return;

    const fill = getElementColor(node, "fill", nodeFill);
    const stroke = getElementColor(node, "stroke", nodeStroke);
    const strokeWidth = parseFloat(
      node.getAttribute("stroke-width") || "1"
    );

    if (fill) colorSet.add(fill);
    if (stroke) colorSet.add(stroke);

    elements.push({ d, fill, stroke, strokeWidth, transform: matrix });
  }

  walk(svgEl, IDENTITY);

  return {
    viewBox,
    elements,
    colors: Array.from(colorSet),
    warnings,
  };
}
