import { View, Text, Platform } from "react-native";
import { useEffect, useRef } from "react";
import type { CastleDrawData } from "../lib/castle/format";
import { renderCastleToCanvas } from "../lib/castle/render";

interface CastlePreviewProps {
  drawData: CastleDrawData | null;
}

export default function CastlePreview({ drawData }: CastlePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!drawData || Platform.OS !== "web") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 512;
    canvas.height = 512;
    renderCastleToCanvas(canvas, drawData);
  }, [drawData]);

  if (!drawData) {
    return (
      <View className="flex-1 bg-gray-800 items-center justify-center rounded-lg m-2">
        <Text className="text-gray-500">Castle preview will appear here</Text>
      </View>
    );
  }

  if (Platform.OS !== "web") {
    return (
      <View className="flex-1 bg-gray-800 items-center justify-center rounded-lg m-2">
        <Text className="text-gray-400">Castle preview (web only)</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white rounded-lg m-2 overflow-hidden">
      <View className="px-2 py-1 bg-gray-700">
        <Text className="text-gray-300 text-xs font-semibold">Castle Preview</Text>
      </View>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 8,
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
    </View>
  );
}
