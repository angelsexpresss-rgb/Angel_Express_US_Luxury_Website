import { StripeProvider } from "@stripe/stripe-react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";

import {
  AngelThemeProvider,
  useAngelTheme,
} from "../lib/angelTheme";

const stripeKey =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripeKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in the .env file."
  );
}

const STRIPE_PUBLISHABLE_KEY: string = stripeKey;

export default function RootLayout() {
  return (
    <AngelThemeProvider>
      <PassengerAppNavigator />
    </AngelThemeProvider>
  );
}

function PassengerAppNavigator() {
  const {
    colors,
    themeMode,
    isReady,
  } = useAngelTheme();

  if (!isReady) {
    return (
      <View
        style={[
          styles.loadingScreen,
          { backgroundColor: colors.bg },
        ]}
      >
        <StatusBar
          style={
            themeMode === "dark" ? "light" : "dark"
          }
          backgroundColor={colors.bg}
        />

        <ActivityIndicator
          size="large"
          color={colors.gold}
        />
      </View>
    );
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
    >
      <View
        style={[
          styles.root,
          { backgroundColor: colors.bg },
        ]}
      >
        <StatusBar
          style={
            themeMode === "dark" ? "light" : "dark"
          }
          backgroundColor={colors.bg}
        />

        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
            contentStyle: {
              backgroundColor: colors.bg,
            },
            gestureEnabled: true,
          }}
        >
          {/* Authentication */}
          <Stack.Screen name="index" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="signin" />
          <Stack.Screen name="login" />

          {/* Passenger Dashboard */}
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="dashboard" />

          {/* Booking and Trip Management */}
          <Stack.Screen name="book-ride" />
          <Stack.Screen name="fare-estimate" />
          <Stack.Screen name="confirm-booking" />
          <Stack.Screen name="success" />
          <Stack.Screen name="my-trips" />
          <Stack.Screen name="trip-details" />
          <Stack.Screen name="live-trip" />
          <Stack.Screen name="manage-booking" />
          <Stack.Screen name="rate-driver" />
          <Stack.Screen name="pay-ride" />

          {/* Passenger Account */}
          <Stack.Screen name="profile" />
          <Stack.Screen name="passenger-card" />
          <Stack.Screen name="privacy-account" />
          <Stack.Screen name="notification-preferences" />
          <Stack.Screen name="passenger-notifications" />

          {/* Rewards and Student Services */}
          <Stack.Screen name="rewards" />
          <Stack.Screen name="student-verification" />
          <Stack.Screen name="student-travel" />

          {/* Travel Services */}
          <Stack.Screen name="luxury-ride-prep" />
          <Stack.Screen name="travel-concierge" />
          <Stack.Screen name="ai-assistant" />
          <Stack.Screen name="language-assistant" />

          {/* Entertainment */}
          <Stack.Screen name="entertainment-hub" />
          <Stack.Screen name="angel-game" />

          {/* Safety and Support */}
          <Stack.Screen name="safety-share" />
          <Stack.Screen name="family-checkin" />
          <Stack.Screen name="support" />

          {/* Informational */}
          <Stack.Screen name="about" />

          {/* Modal */}
          <Stack.Screen
            name="modal"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
        </Stack>
      </View>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});