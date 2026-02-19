import { View, Text } from "react-native";
import { Platform } from "react-native";

interface SvgPreviewProps {
  svgContent: string | null;
}

export default function SvgPreview({ svgContent }: SvgPreviewProps) {
  if (!svgContent) {
    return (
      <View className="flex-1 bg-gray-800 items-center justify-center rounded-lg m-2">
        <Text className="text-gray-500">SVG preview will appear here</Text>
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <View className="flex-1 bg-white rounded-lg m-2 overflow-hidden">
        <View className="px-2 py-1 bg-gray-700">
          <Text className="text-gray-300 text-xs font-semibold">Recraft SVG</Text>
        </View>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            minHeight: 0,
            padding: 8,
          }}
        >
          <div
            style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
            ref={(el) => {
              if (!el) return;
              el.innerHTML = svgContent;
              const svg = el.querySelector("svg");
              if (svg) {
                if (!svg.getAttribute("viewBox")) {
                  const w = svg.getAttribute("width") || "1024";
                  const h = svg.getAttribute("height") || "1024";
                  svg.setAttribute("viewBox", `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
                }
                svg.removeAttribute("width");
                svg.removeAttribute("height");
                svg.style.maxWidth = "100%";
                svg.style.maxHeight = "100%";
                svg.style.display = "block";
              }
            }}
          />
        </div>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-800 items-center justify-center rounded-lg m-2">
      <Text className="text-gray-400">SVG preview (web only)</Text>
    </View>
  );
}
