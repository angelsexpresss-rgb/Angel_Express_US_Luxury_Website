import { Stack } from "expo-router";
import { StatusBar } from "react-native";

import {
  DriverThemeProvider,
  useDriverTheme,
} from "../lib/driverTheme";

function DriverAppStack() {
  const { themeMode, colors } = useDriverTheme();

  const isDarkMode = themeMode === "dark";

  return (
    <>
      <StatusBar
        animated
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.bg}
      />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
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
      <DriverAppStack />
    </DriverThemeProvider>
  );
}