import { View, Text, Pressable } from "react-native";
import type { CastleDrawData } from "../lib/castle/format";

interface ExportPanelProps {
  drawData: CastleDrawData | null;
}

export default function ExportPanel({ drawData }: ExportPanelProps) {
  if (!drawData) return null;

  const jsonString = JSON.stringify(drawData, null, 2);

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "castle-drawing.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      alert("Copied to clipboard!");
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = jsonString;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      alert("Copied to clipboard!");
    }
  };

  return (
    <View className="flex-row gap-2 px-4 py-3 bg-gray-800 border-t border-gray-700">
      <Pressable
        className="bg-green-600 active:bg-green-700 px-4 py-2 rounded-lg"
        onPress={handleDownload}
      >
        <Text className="text-white font-semibold text-sm">Download JSON</Text>
      </Pressable>
      <Pressable
        className="bg-gray-600 active:bg-gray-700 px-4 py-2 rounded-lg"
        onPress={handleCopy}
      >
        <Text className="text-white font-semibold text-sm">Copy to Clipboard</Text>
      </Pressable>
      <View className="flex-1 justify-center">
        <Text className="text-gray-500 text-xs text-right">
          {drawData.layers[0]?.frames[0]?.pathDataList.length || 0} paths
        </Text>
      </View>
    </View>
  );
}
