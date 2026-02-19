import type { CastleDrawData, CastlePathData, CastleBounds } from "./format";

/**
 * Render Castle DrawData to an HTML canvas.
 * This provides the Castle-accurate preview in the app.
 */
export function renderCastleToCanvas(
  canvas: HTMLCanvasElement,
  drawData: CastleDrawData
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Clear
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Castle coordinate transform: ±scale → canvas pixels
  const scale = drawData.scale;
  const pixelScale = Math.min(width, height) / (scale * 2);
  const offsetX = width / 2;
  const offsetY = height / 2;

  function toPixel(cx: number, cy: number): [number, number] {
    return [cx * pixelScale + offsetX, cy * pixelScale + offsetY];
  }

  for (const layer of drawData.layers) {
    if (!layer.isVisible) continue;

    for (const frame of layer.frames) {
      // Draw fill PNG background if available
      if (frame.fillPng && frame.fillImageBounds) {
        drawFillPng(ctx, frame.fillPng, frame.fillImageBounds, pixelScale, offsetX, offsetY);
      }

      // Draw path segments
      for (const seg of frame.pathDataList) {
        drawSegment(ctx, seg, pixelScale, offsetX, offsetY);
      }
    }
  }
}

function drawFillPng(
  ctx: CanvasRenderingContext2D,
  fillPng: string,
  bounds: CastleBounds,
  pixelScale: number,
  offsetX: number,
  offsetY: number
): void {
  if (!fillPng) return;

  const img = new Image();
  img.onload = () => {
    const x = bounds.minX * pixelScale + offsetX;
    const y = bounds.minY * pixelScale + offsetY;
    const w = (bounds.maxX - bounds.minX) * pixelScale;
    const h = (bounds.maxY - bounds.minY) * pixelScale;
    ctx.drawImage(img, x, y, w, h);
  };
  img.src = `data:image/png;base64,${fillPng}`;
}

function drawSegment(
  ctx: CanvasRenderingContext2D,
  seg: CastlePathData,
  pixelScale: number,
  offsetX: number,
  offsetY: number
): void {
  const [x1, y1, x2, y2] = seg.p;
  const [px1, py1] = [x1 * pixelScale + offsetX, y1 * pixelScale + offsetY];
  const [px2, py2] = [x2 * pixelScale + offsetX, y2 * pixelScale + offsetY];

  // Set color
  if (seg.c) {
    const [r, g, b, a] = seg.c;
    const color = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
  } else {
    ctx.strokeStyle = "#000000";
    ctx.fillStyle = "#000000";
  }

  if (seg.isTransparent) return;

  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(px1, py1);

  if (seg.bp) {
    // Quadratic curve through bend point
    const bpx = seg.bp.x * pixelScale + offsetX;
    const bpy = seg.bp.y * pixelScale + offsetY;
    ctx.quadraticCurveTo(bpx, bpy, px2, py2);
  } else {
    // Straight line
    ctx.lineTo(px2, py2);
  }

  ctx.stroke();
}

/**
 * Synchronous version that draws paths only (no fill PNG).
 * Useful for immediate rendering without async image loading.
 */
export function renderCastlePathsSync(
  canvas: HTMLCanvasElement,
  drawData: CastleDrawData
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const scale = drawData.scale;
  const pixelScale = Math.min(width, height) / (scale * 2);
  const offsetX = width / 2;
  const offsetY = height / 2;

  for (const layer of drawData.layers) {
    if (!layer.isVisible) continue;
    for (const frame of layer.frames) {
      for (const seg of frame.pathDataList) {
        drawSegment(ctx, seg, pixelScale, offsetX, offsetY);
      }
    }
  }
}
