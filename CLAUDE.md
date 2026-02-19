# Fenna — Claude Code Guidelines

## Package Manager

Use **bun** instead of npm/yarn for all package operations:

- `bun install` (not `npm install`)
- `bun add <pkg>` (not `npm install <pkg>`)
- `bun add -d <pkg>` (not `npm install -D <pkg>`)
- `bun run <script>` (not `npm run <script>`)
- `bunx <cmd>` (not `npx <cmd>`)

## Dev Server

```bash
bunx expo start --web
```

## Project Structure

- `app/` — Expo Router pages (_layout.tsx, index.tsx, settings.tsx)
- `components/` — React components (PromptInput, SvgPreview, CastlePreview, PalettePanel, ExportPanel)
- `lib/castle/` — Castle format types, palette definitions, canvas renderer
- `lib/converter/` — SVG → Castle conversion pipeline (parsing, color mapping, path conversion, fill rendering)
- `lib/recraft/` — Recraft V4 API client and key management

## Tech Stack

- Expo SDK 54 (web target)
- NativeWind v4 + Tailwind CSS for styling
- TypeScript (strict mode)
- svg-pathdata for SVG path parsing
- react-native-svg for SVG rendering
