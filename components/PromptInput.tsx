import { View, TextInput, Pressable, Text, ActivityIndicator } from "react-native";
import { useState } from "react";

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
}

export default function PromptInput({ onGenerate, isLoading }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleGenerate = () => {
    const trimmed = prompt.trim();
    if (!trimmed || isLoading) return;
    onGenerate(trimmed);
  };

  return (
    <View className="flex-row gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
      <TextInput
        className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg text-base"
        placeholder="Describe the art you want..."
        placeholderTextColor="#9ca3af"
        value={prompt}
        onChangeText={setPrompt}
        onSubmitEditing={handleGenerate}
        editable={!isLoading}
      />
      <Pressable
        className={`px-5 py-2 rounded-lg justify-center ${
          isLoading || !prompt.trim()
            ? "bg-blue-800 opacity-50"
            : "bg-blue-600 active:bg-blue-700"
        }`}
        onPress={handleGenerate}
        disabled={isLoading || !prompt.trim()}
      >
        {isLoading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text className="text-white font-semibold">Generate</Text>
        )}
      </Pressable>
    </View>
  );
}
