import { View, Text, ScrollView, Pressable, Platform } from "react-native";
import { useState, useCallback } from "react";
import { Link } from "expo-router";
import PromptInput from "../components/PromptInput";
import SvgPreview from "../components/SvgPreview";
import CastlePreview from "../components/CastlePreview";
import PalettePanel from "../components/PalettePanel";
import ExportPanel from "../components/ExportPanel";
import { generateSvg } from "../lib/recraft/client";
import { buildCastleDrawData, type BuildResult } from "../lib/converter/buildCastle";
import { hasApiKey } from "../lib/recraft/apiKey";
import { AAP_64_HEX } from "../lib/castle/palettes";
import type { CastleDrawData } from "../lib/castle/format";
import type { ColorMapping } from "../lib/converter/mapColors";

export default function HomeScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [drawData, setDrawData] = useState<CastleDrawData | null>(null);
  const [colorMappings, setColorMappings] = useState<Map<string, ColorMapping> | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async (prompt: string) => {
    if (!hasApiKey()) {
      setError("No API key configured. Go to Settings to add your Recraft API key.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setWarnings([]);

    try {
      // Step 1: Generate SVG via Recraft
      const { svgContent: svg } = await generateSvg(prompt, AAP_64_HEX.slice(0, 5));
      setSvgContent(svg);

      // Step 2: Convert to Castle format
      const result: BuildResult = await buildCastleDrawData(svg);
      setDrawData(result.drawData);
      setColorMappings(result.colorMappings);
      setWarnings(result.warnings);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      console.error("Generation error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <View className="flex-1 bg-gray-900">
      {/* Header bar with settings link */}
      <View className="flex-row items-center justify-end px-4 py-1 bg-gray-800">
        <Link href="/settings" asChild>
          <Pressable className="px-3 py-1">
            <Text className="text-gray-400 text-sm">Settings</Text>
          </Pressable>
        </Link>
      </View>

      {/* Prompt input */}
      <PromptInput onGenerate={handleGenerate} isLoading={isLoading} />

      {/* Error display */}
      {error && (
        <View className="mx-4 mt-2 p-3 bg-red-900 rounded-lg">
          <Text className="text-red-200 text-sm">{error}</Text>
        </View>
      )}

      {/* Preview panels side by side */}
      <View className="flex-1 flex-row min-h-0">
        <SvgPreview svgContent={svgContent} />
        <CastlePreview drawData={drawData} />
      </View>

      {/* Warnings */}
      {warnings.length > 0 && (
        <View className="mx-4 mb-1 p-2 bg-yellow-900 rounded-lg">
          {warnings.map((w, i) => (
            <Text key={i} className="text-yellow-200 text-xs">
              {w}
            </Text>
          ))}
        </View>
      )}

      {/* Palette panel */}
      <PalettePanel colorMappings={colorMappings} />

      {/* Export panel */}
      <ExportPanel drawData={drawData} />
    </View>
  );
}
