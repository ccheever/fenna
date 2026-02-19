import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#111827" },
          headerTintColor: "#f9fafb",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: "Fenna" }}
        />
        <Stack.Screen
          name="settings"
          options={{ title: "Settings" }}
        />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
