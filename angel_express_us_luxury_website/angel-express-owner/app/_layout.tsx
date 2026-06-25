import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="owner-login" />
      <Stack.Screen name="owner-dashboard" />
    </Stack>
  );
}
