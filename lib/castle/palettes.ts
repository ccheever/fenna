import type { CastleColor } from "./format";

/** AAP-64 palette — 64 colors used in Castle's default palette */
export const AAP_64_HEX: string[] = [
  "#060608", "#141013", "#3b1725", "#73172d",
  "#b4202a", "#df3e23", "#fa6a0a", "#f9a31b",
  "#ffd541", "#fffc40", "#d6f264", "#9cdb43",
  "#59c135", "#14a02e", "#1a7a3e", "#24523b",
  "#122020", "#143464", "#285cc4", "#249fde",
  "#20d6c7", "#a6fcdb", "#ffffff", "#fef3c0",
  "#fad6b8", "#f5a097", "#e86a73", "#bc4a9b",
  "#793a80", "#403353", "#242234", "#221c1a",
  "#322b28", "#71413b", "#bb7547", "#dba463",
  "#f4d29c", "#d6b1b1", "#c7cfcc", "#92a7b0",
  "#657392", "#424c6e", "#2a2137", "#4d2b32",
  "#7a3045", "#ad4f4e", "#d47b6e", "#e7a78d",
  "#c28569", "#9a6348", "#704028", "#572318",
  "#371a0f", "#2e1108", "#462818", "#755038",
  "#a88460", "#cfb48d", "#f2dfba", "#ede4cd",
  "#d7cbac", "#baa58c", "#9f8b6b", "#735f44",
];

/** Convert a hex color string to CastleColor (floats 0-1) */
export function hexToCastleColor(hex: string): CastleColor {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
    a: 1,
  };
}

/** Pre-computed AAP-64 palette as CastleColor[] */
export const AAP_64_CASTLE: CastleColor[] = AAP_64_HEX.map(hexToCastleColor);
