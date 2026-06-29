import { StripeProvider } from "@stripe/stripe-react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <StripeProvider publishableKey="pk_live_51TikTEREN8MVDESwxkr0p5OWtfTy8OdY1aeE0tHUZwEojHmiyjyiM7rsK8FsPt8YGHHh0rNlh1G6Y78dP2yey0IW006aUiHBUx">
      <StatusBar style="light" />

      <Stack
        screenOptions={{
          headerShown: false,

          animation: "slide_from_right",

          contentStyle: {
            backgroundColor: "#040C18",
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

        {/* Payment */}
        <Stack.Screen name="pay-ride" />

        {/* Modal */}
        <Stack.Screen
          name="modal"
          options={{
            presentation: "modal",
          }}
        />
      </Stack>
    </StripeProvider>
  );
}

