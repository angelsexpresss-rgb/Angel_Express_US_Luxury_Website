import { StripeProvider } from "@stripe/stripe-react-native";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <StripeProvider publishableKey="pk_live_51TikTEREN8MVDESwxkr0p5OWtfTy8OdY1aeE0tHUZwEojHmiyjyiM7rsK8FsPt8YGHHh0rNlh1G6Y78dP2yey0IW006aUiHBUx">
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#06141B" },
          headerTintColor: "#D4AF37",
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: "#06141B" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ title: "Create Account" }} />
        <Stack.Screen name="signin" options={{ title: "Sign In" }} />
        <Stack.Screen name="login" options={{ title: "Login" }} />
        <Stack.Screen name="pay-ride" options={{ title: "Pay Ride" }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </StripeProvider>
  );
}

