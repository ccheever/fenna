# Fenna

A web-based tool for generating 2D vector art using [Recraft's AI](https://www.recraft.ai/) and converting it into [Castle](https://castle.xyz)'s proprietary vector format for use in Castle games.

## What It Does

Fenna lets you describe art with a text prompt, generates vector art via Recraft's API, then converts it to Castle's format so you can import it into Castle's editor and keep tweaking it by hand.

## How It Works

```
[Text Prompt] → [Recraft V4 API] → [SVG] → [Convert] → [Castle JSON]
```

1. **Prompt**: User types a description of the art they want
2. **Generate**: Recraft V4 generates a true SVG (not raster-traced) from the prompt. We pass the active Castle palette colors as Recraft color hints so the generated art already leans toward palette-compatible colors.
3. **Preview**: Side-by-side view shows the raw SVG and a Castle-accurate preview
4. **Iterate**: User can re-prompt or adjust until happy
5. **Export**: Download Castle-format JSON to import into the app

### Why Side-by-Side Preview?

Castle has constraints that will change how the art looks compared to the raw Recraft output:

- **64-color palette limit** -- Colors get snapped to the nearest palette color using perceptual color distance (CIE Delta E*). Subtle gradients or specific hues may shift.
- **Path simplification** -- SVG cubic/quadratic bezier curves must be converted to Castle's simpler primitives (line segments, arcs, and bend points). Fine detail may be lost.
- **Coordinate space** -- SVG viewBox coordinates get mapped to Castle's +/-10.0 unit grid.

Showing the Castle preview at every step prevents the user from falling in love with something that will look noticeably different once imported. If the palette snapping kills a color choice, they can see it immediately and re-prompt.

## Architecture

### Web App

Built with React via Expo Web. No login required -- user provides their own Recraft API key (stored in localStorage). Using Expo Web means we could eventually ship this as a mobile app too.

```
src/
  app/              # Main app shell, routing
  components/
    PromptInput/    # Text prompt + generate button
    SvgPreview/     # Raw Recraft SVG display
    CastlePreview/  # Castle-format rendering preview
    PalettePanel/   # Shows active Castle palette, color mapping
    ExportPanel/    # Castle JSON export + copy/download
  lib/
    recraft/        # Recraft API client
    converter/      # SVG → Castle format conversion
      parseSvg.ts       # Parse SVG paths, shapes, colors
      mapColors.ts      # Snap colors to Castle palette (CIE Delta E*)
      convertPaths.ts   # Bezier curves → Castle line/arc/bend primitives
      buildCastle.ts    # Assemble final Castle JSON structure
      renderFills.ts    # Pre-render raster fill layer from SVG fills
    castle/         # Castle format types + palette definitions
      format.ts         # TypeScript types for Castle's DrawData JSON
      palettes.ts       # AAP-64-Castle and other palette definitions
      render.ts         # Canvas-based Castle format renderer for preview
```

### SVG-to-Castle Conversion Pipeline

This is the hard part. The conversion needs to handle:

1. **SVG parsing** -- Extract paths, basic shapes (rect, circle, ellipse, line, polygon), fill/stroke colors from the SVG DOM.

2. **Color mapping** -- For each color found in the SVG:
   - Convert to Lab color space
   - Find nearest color in the active Castle palette using CIE Delta E*
   - Build a color mapping table for the palette panel UI

3. **Path conversion** -- For each SVG path:
   - Parse SVG path `d` attribute into segments (M, L, C, Q, A, Z, etc.)
   - Convert cubic beziers (C) to sequences of Castle line segments with bend points, or approximate with arcs where appropriate
   - Convert quadratic beziers (Q) similarly
   - Convert SVG arcs (A) to Castle arc subpaths (center, radius, startAngle, endAngle)
   - Straight lines (L) map directly to Castle line-style path data

4. **Coordinate transform** -- Map SVG viewBox coordinates to Castle's +/-10.0 unit grid, preserving aspect ratio.

5. **Fill handling** -- Hybrid approach (see details below).

6. **Assembly** -- Build the Castle DrawData JSON:
   ```json
   {
     "version": 3,
     "scale": 10,
     "gridSize": 0.71428571428571,
     "fillPixelsPerUnit": 25.6,
     "colors": [ /* 64-color palette as {r,g,b,a} */ ],
     "layers": [{
       "title": "Imported",
       "id": "...",
       "isVisible": true,
       "isBitmap": false,
       "frames": [{
         "isLinked": false,
         "pathDataList": [
           {
             "p": [x1, y1, x2, y2, ...],
             "s": 1,
             "bp": {"x": ..., "y": ...},
             "f": false,
             "c": [r, g, b, a],
             "isTransparent": false
           }
         ],
         "fillImageBounds": { "minX": ..., "maxX": ..., "minY": ..., "maxY": ... },
         "fillPng": "base64..."
       }]
     }]
   }
   ```

### Fill Handling Strategy

Castle separates vector outlines (editable paths) from color fills (a raster `fillPng` layer). SVGs have fills as attributes on shapes. We use a hybrid approach:

- **Closed vector paths** for every filled SVG shape, so they remain fully editable in Castle's editor. The user can move, reshape, and delete individual paths.
- **Pre-rendered raster fill layer** so the art looks complete on import. We render the palette-snapped fill colors into a `fillPng` bitmap at Castle's fill resolution (`fillPixelsPerUnit: 25.6`).

This means imported art looks correct immediately. If the user later edits a path in Castle, they'll need to re-fill that region (standard Castle workflow). The alternative -- import paths without fills and make the user manually flood-fill every region -- is too tedious to be practical for complex generated art.

### Palette Handling

The user picks a Castle palette before generating. The default is AAP-64-Castle (64 colors). The active palette colors are passed to Recraft as color preference hints, so the AI generates art that's already biased toward palette-compatible colors. This reduces the gap between the raw SVG and the Castle preview.

The palette panel shows each SVG color and its nearest Castle palette match, so the user can see exactly where color fidelity is lost.

## Tech Stack

- **Framework**: React via Expo Web (path to native mobile later)
- **Recraft API**: V4 -- generates true SVG vectors, supports color preference hints
- **SVG Parsing**: Browser DOMParser + svg-pathdata library for path `d` attribute parsing
- **Color Math**: CIE Delta E* (CIEDE2000) for perceptual color matching
- **Castle Preview**: HTML Canvas renderer that draws Castle-format paths
- **Styling**: Tailwind CSS (via NativeWind for Expo compatibility)

## Getting Started

```bash
# Install dependencies
bun install

# Set up your Recraft API key
cp .env.example .env
# Edit .env and add your RECRAFT_API_TOKEN

# Start dev server
bunx expo start --web
```

Get a Recraft API key at [app.recraft.ai/profile/api](https://app.recraft.ai/profile/api).

## Design Notes and Open Questions

### Bezier Fidelity

Castle paths use line segments, arcs, and bend points -- not arbitrary cubic/quadratic bezier curves. Converting SVG beziers to Castle primitives will lose some fidelity.

**Approach:** Use adaptive subdivision -- recursively split bezier segments until the approximation error (max distance from the true curve) is below a threshold. This gives fewer segments for gentle curves and more for tight ones. A good starting threshold is probably ~0.5% of the overall drawing size (so ~0.1 Castle units). We'll need to experiment and possibly expose a "detail level" slider.

Castle's bend points help here. A single Castle path segment with a bend point can approximate a quadratic bezier exactly (the bend point IS a quadratic control point). For cubics, we can degree-reduce to quadratic where the error is small, and subdivide where it's not.

### Grouped Shapes and Transforms

Recraft SVGs will likely use `<g>` groups with `transform` attributes, plus nested elements. Before converting paths, we need to flatten the SVG:

- Resolve all `transform` attributes (translate, rotate, scale, matrix) down to each leaf element
- Ungroup all `<g>` elements
- Convert basic shapes (`<rect>`, `<circle>`, `<ellipse>`, `<polygon>`) to equivalent `<path>` elements

Libraries like svg-flatten or a custom tree walk with matrix accumulation can handle this. This should happen as the first step before any path conversion.

### Stroke Width

Castle paths have a fixed visual stroke weight -- there's no per-path stroke-width property. SVGs from Recraft may use varying stroke widths.

**Options:**
1. **Ignore stroke width** -- just convert centerlines. Simplest, works well if Recraft SVGs are primarily filled shapes (likely).
2. **Convert thick strokes to filled outlines** -- offset the path on both sides by half the stroke width, creating a filled shape. More accurate but significantly more complex (requires path offsetting, which is a hard computational geometry problem).
3. **Warn the user** -- if varying stroke widths are detected, show a note that they'll render at Castle's fixed weight.

Recommendation: Start with option 1 (ignore stroke width, convert centerlines). Recraft's vector output for game art is likely dominated by filled shapes, not varied-weight strokes. Add option 3 as a warning if we detect varying stroke-widths. Revisit option 2 only if it proves to be a real problem in practice.

### Animation Potential

Castle supports multi-frame animation with configurable FPS and play modes. We could potentially:
- Generate multiple Recraft variations of the same prompt and arrange them as animation frames
- Use Recraft style variations to create sprite sheets
- Let the user prompt each frame individually

This is a future feature but worth keeping the data model ready for it. The Castle format already supports multiple frames per layer.

### Direct Castle Integration

Right now the workflow is: generate in Fenna, export JSON, somehow get it into Castle. Future integration options:
- **Clipboard**: Copy Castle JSON to clipboard, paste in Castle (requires Castle-side support)
- **Deep link**: Open a `castle://` URL with the drawing data
- **Castle API**: If Castle exposes an import API, post directly to it
- **Shared storage**: Write to a location Castle can read from

For v1, we'll just give the user a download/copy button for the JSON and document how to import it.

## License

MIT
