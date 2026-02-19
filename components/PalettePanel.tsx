import { View, Text, ScrollView } from "react-native";
import { AAP_64_HEX } from "../lib/castle/palettes";
import type { ColorMapping } from "../lib/converter/mapColors";

interface PalettePanelProps {
  colorMappings: Map<string, ColorMapping> | null;
}

export default function PalettePanel({ colorMappings }: PalettePanelProps) {
  return (
    <View className="bg-gray-800 border-t border-gray-700 px-4 py-3">
      {/* Palette grid */}
      <Text className="text-gray-400 text-xs font-semibold mb-2">AAP-64 Palette</Text>
      <View className="flex-row flex-wrap mb-3">
        {AAP_64_HEX.map((hex, i) => (
          <div
            key={i}
            style={{
              width: 20,
              height: 20,
              backgroundColor: hex,
              margin: 1,
              borderRadius: 2,
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            title={hex}
          />
        ))}
      </View>

      {/* Color mappings */}
      {colorMappings && colorMappings.size > 0 && (
        <>
          <Text className="text-gray-400 text-xs font-semibold mb-2">Color Mappings</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {Array.from(colorMappings.values()).map((mapping, i) => (
              <View key={i} className="flex-row items-center bg-gray-700 rounded px-2 py-1">
                <div
                  style={{
                    width: 16,
                    height: 16,
                    backgroundColor: mapping.original,
                    borderRadius: 2,
                    marginRight: 4,
                  }}
                />
                <Text className="text-gray-400 text-xs mx-1">→</Text>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    backgroundColor: mapping.paletteHex,
                    borderRadius: 2,
                    marginRight: 4,
                  }}
                />
                <Text className="text-gray-500 text-xs">
                  ΔE {mapping.deltaE.toFixed(1)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
}
