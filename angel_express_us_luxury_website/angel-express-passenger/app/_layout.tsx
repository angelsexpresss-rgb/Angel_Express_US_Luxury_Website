import { StripeProvider } from "@stripe/stripe-react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PassengerThemeProvider } from "../lib/passengerTheme";

export default function RootLayout() {
  return (
    <PassengerThemeProvider>
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

          {/* Main Passenger Screens */}
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="book-ride" />
          <Stack.Screen name="fare-estimate" />
          <Stack.Screen name="confirm-booking" />
          <Stack.Screen name="my-trips" />
          <Stack.Screen name="live-trip" />
          <Stack.Screen name="manage-booking" />
          <Stack.Screen name="rate-driver" />
          <Stack.Screen name="pay-ride" />

          {/* Account */}
          <Stack.Screen name="profile" />
          <Stack.Screen name="passenger-card" />
          <Stack.Screen name="privacy-account" />
          <Stack.Screen name="notification-preferences" />

          {/* Rewards / Student / Entertainment */}
          <Stack.Screen name="rewards" />
          <Stack.Screen name="student-verification" />
          <Stack.Screen name="entertainment-hub" />
          <Stack.Screen name="angel-game" />

          {/* Informational */}
          <Stack.Screen name="about" />

          {/* Modal */}
          <Stack.Screen
            name="modal"
            options={{
              presentation: "modal",
            }}
          />
        </Stack>
      </StripeProvider>
    </PassengerThemeProvider>
  );
}