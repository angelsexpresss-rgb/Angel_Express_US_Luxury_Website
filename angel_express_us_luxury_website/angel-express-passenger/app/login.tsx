import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function syncWebsiteBookings(userId: string, userEmail: string) {
    const cleanEmail = userEmail.trim().toLowerCase();

    const { data: websiteBookings, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .ilike("email", cleanEmail);

    if (fetchError) throw fetchError;

    if (!websiteBookings || websiteBookings.length === 0) return;

    for (const booking of websiteBookings) {
      const updatedBooking = {
        user_id: userId,

        passenger_name: booking.passenger_name || booking.name || "",

        pickup_address: booking.pickup_address || booking.pickup || "",

        dropoff_address: booking.dropoff_address || booking.dropoff || "",

        ride_date: booking.ride_date || booking.date || "",

        ride_time: booking.ride_time || booking.time || "",

        trip_type: booking.trip_type || booking.tripType || "One Way",

        ride_category: booking.ride_category || "Website Booking",

        estimated_miles: Number(
          booking.estimated_miles || booking.miles || 0
        ),

        base_fare: Number(booking.base_fare || booking.base || 0),

        total_fare: Number(booking.total_fare || booking.total || 0),

        balance_due: Number(
          booking.balance_due || booking.total_fare || booking.total || 0
        ),

        source: booking.source || "website",
      };

      const { error: updateError } = await supabase
        .from("bookings")
        .update(updatedBooking)
        .eq("id", booking.id);

      if (updateError) throw updateError;
    }
  }

  async function handleLogin() {
    if (loading) return;

    if (!email || !password) {
      Alert.alert("Missing Information", "Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      const userId = data.user?.id;
      const userEmail = data.user?.email;

      if (!userId || !userEmail) {
        Alert.alert("Login Error", "Unable to find user account.");
        return;
      }

      await syncWebsiteBookings(userId, userEmail);

      const { data: profile, error: profileError } = await supabase
        .from("passenger_profiles")
        .select("profile_completed, terms_accepted")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile || !profile.profile_completed || !profile.terms_accepted) {
        router.replace("/profile" as any);
      } else {
        router.replace("/dashboard" as any);
      }
    } catch (error: any) {
      Alert.alert("Login Error", error.message || "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Sign In</Text>

      <Text style={styles.subtitle}>
        Welcome back to Angel Express Mobility.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Signing In..." : "Sign In"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace("/signup" as any)}>
        <Text style={styles.signupText}>
          Don&apos;t have an account? Create Account
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#040C18",
  },
  content: {
    padding: 24,
    paddingTop: 100,
  },
  title: {
    color: "#D4AF37",
    fontSize: 38,
    fontWeight: "800",
    marginBottom: 10,
  },
  subtitle: {
    color: "#FFFFFF",
    fontSize: 17,
    marginBottom: 35,
  },
  input: {
    backgroundColor: "#071426",
    color: "#FFFFFF",
    padding: 18,
    borderRadius: 14,
    fontSize: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.12)",
  },
  button: {
    backgroundColor: "#D4AF37",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#071426",
    fontSize: 20,
    fontWeight: "800",
  },
  signupText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});