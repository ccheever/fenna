import { View, Text, TextInput, Pressable } from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { getApiKey, setApiKey, clearApiKey } from "../lib/recraft/apiKey";

export default function SettingsScreen() {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const hasEnvKey = !!process.env.EXPO_PUBLIC_RECRAFT_API_TOKEN;

  useEffect(() => {
    const existing = getApiKey();
    if (existing) {
      setKey(hasEnvKey ? "" : existing);
      setHasExisting(true);
    }
  }, []);

  const handleSave = () => {
    if (!key.trim()) return;
    setApiKey(key.trim());
    setSaved(true);
    setHasExisting(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    clearApiKey();
    setKey("");
    setHasExisting(false);
  };

  return (
    <View className="flex-1 bg-gray-900 p-6">
      <Text className="text-white text-xl font-bold mb-6">Settings</Text>

      <Text className="text-gray-300 font-semibold mb-2">Recraft API Key</Text>
      <Text className="text-gray-500 text-sm mb-3">
        Get your API key at app.recraft.ai/profile/api
      </Text>

      {hasEnvKey ? (
        <View className="bg-gray-700 px-4 py-3 rounded-lg mb-3">
          <Text className="text-green-400 text-sm font-semibold">Configured via .env</Text>
          <Text className="text-gray-500 text-xs mt-1">
            Set EXPO_PUBLIC_RECRAFT_API_TOKEN in your .env file
          </Text>
        </View>
      ) : (
        <>
          <TextInput
            className="bg-gray-700 text-white px-4 py-3 rounded-lg text-base mb-3"
            placeholder="Enter your Recraft API key..."
            placeholderTextColor="#6b7280"
            value={key}
            onChangeText={(text) => {
              setKey(text);
              setSaved(false);
            }}
            secureTextEntry={false}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View className="flex-row gap-2 mb-6">
            <Pressable
              className={`px-5 py-2 rounded-lg ${
                key.trim() ? "bg-blue-600 active:bg-blue-700" : "bg-gray-700 opacity-50"
              }`}
              onPress={handleSave}
              disabled={!key.trim()}
            >
              <Text className="text-white font-semibold">
                {saved ? "Saved!" : "Save Key"}
              </Text>
            </Pressable>

            {hasExisting && (
              <Pressable
                className="bg-red-700 active:bg-red-800 px-5 py-2 rounded-lg"
                onPress={handleClear}
              >
                <Text className="text-white font-semibold">Clear</Text>
              </Pressable>
            )}
          </View>
        </>
      )}

      <Pressable
        className="bg-gray-700 active:bg-gray-600 px-5 py-3 rounded-lg items-center"
        onPress={() => router.back()}
      >
        <Text className="text-white font-semibold">Back to Generator</Text>
      </Pressable>
    </View>
  );
}
