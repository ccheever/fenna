/**
 * 2D affine transform matrix utilities.
 * Matrix is represented as [a, b, c, d, e, f] where:
 *   | a c e |
 *   | b d f |
 *   | 0 0 1 |
 */

export type Matrix = [number, number, number, number, number, number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** Multiply two affine matrices: result = m1 * m2 */
export function multiply(m1: Matrix, m2: Matrix): Matrix {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/** Apply matrix to a point */
export function transformPoint(
  m: Matrix,
  x: number,
  y: number
): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/** Parse an SVG transform attribute string into a matrix */
export function parseTransform(transform: string): Matrix {
  let result: Matrix = IDENTITY;

  const re =
    /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]+)\)/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(transform)) !== null) {
    const type = match[1].toLowerCase();
    const args = match[2]
      .split(/[\s,]+/)
      .map(Number);

    let m: Matrix;

    switch (type) {
      case "matrix":
        m = [args[0], args[1], args[2], args[3], args[4], args[5]];
        break;

      case "translate": {
        const tx = args[0];
        const ty = args.length > 1 ? args[1] : 0;
        m = [1, 0, 0, 1, tx, ty];
        break;
      }

      case "scale": {
        const sx = args[0];
        const sy = args.length > 1 ? args[1] : sx;
        m = [sx, 0, 0, sy, 0, 0];
        break;
      }

      case "rotate": {
        const angle = (args[0] * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        if (args.length === 3) {
          const cx = args[1];
          const cy = args[2];
          // rotate around point
          m = multiply(
            [1, 0, 0, 1, cx, cy],
            multiply([cos, sin, -sin, cos, 0, 0], [1, 0, 0, 1, -cx, -cy])
          );
        } else {
          m = [cos, sin, -sin, cos, 0, 0];
        }
        break;
      }

      case "skewx": {
        const angle = (args[0] * Math.PI) / 180;
        m = [1, 0, Math.tan(angle), 1, 0, 0];
        break;
      }

      case "skewy": {
        const angle = (args[0] * Math.PI) / 180;
        m = [1, Math.tan(angle), 0, 1, 0, 0];
        break;
      }

      default:
        m = IDENTITY;
    }

    result = multiply(result, m);
  }

  return result;
}
