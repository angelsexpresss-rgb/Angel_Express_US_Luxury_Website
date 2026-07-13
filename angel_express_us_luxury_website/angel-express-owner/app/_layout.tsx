import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";

import {
  OwnerThemeProvider,
  useOwnerTheme,
} from "../lib/ownerTheme";

function OwnerNavigator() {
  const { theme, isDark } = useOwnerTheme();

  return (
    <>
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor={theme.colors.background}
      />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
          animation: "slide_from_right",
          gestureEnabled: true,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            animation: "fade",
          }}
        />

        <Stack.Screen
          name="owner-login"
          options={{
            animation: "fade",
            gestureEnabled: false,
          }}
        />

        <Stack.Screen
          name="owner-dashboard"
          options={{
            animation: "fade_from_bottom",
            gestureEnabled: false,
          }}
        />

        <Stack.Screen name="booking-management" />

        <Stack.Screen name="driver-management" />

        <Stack.Screen name="passenger-management" />

        <Stack.Screen name="payment-management" />

        <Stack.Screen name="live-map" />

        <Stack.Screen name="live-trips" />

        <Stack.Screen
          name="emergency-center"
          options={{
            animation: "slide_from_bottom",
          }}
        />

        <Stack.Screen name="contact-center" />

        <Stack.Screen name="owner-chat" />

        <Stack.Screen name="student-verification" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <OwnerThemeProvider>
      <OwnerNavigator />
    </OwnerThemeProvider>
  );
}