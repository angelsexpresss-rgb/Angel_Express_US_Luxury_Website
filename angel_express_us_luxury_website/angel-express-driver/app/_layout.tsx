import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { DriverThemeProvider, useDriverTheme } from "../lib/driverTheme";

function AppStack() {
  const { themeMode, colors } = useDriverTheme();

  return (
    <>
      <StatusBar
        barStyle={themeMode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.bg}
      />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.bg,
          },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <DriverThemeProvider>
      <AppStack />
    </DriverThemeProvider>
  );
}