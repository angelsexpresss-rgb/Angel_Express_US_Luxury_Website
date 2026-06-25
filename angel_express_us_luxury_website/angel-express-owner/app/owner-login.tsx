import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function OwnerLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    try {
      if (!email.trim() || !password.trim()) {
        Alert.alert("Missing Information", "Enter your owner email and password.");
        return;
      }

      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;

      const user = data.user;

      if (!user) {
        throw new Error("Login failed. Please try again.");
      }

      const { data: ownerProfile, error: ownerError } = await supabase
        .from("owners")
        .select("*")
        .eq("id", user.id)
        .single();

      if (ownerError || !ownerProfile) {
        await supabase.auth.signOut();
        Alert.alert(
          "Access Denied",
          "This account is not registered as an Angel Express owner."
        );
        return;
      }

      if (ownerProfile.status !== "active") {
        await supabase.auth.signOut();
        Alert.alert(
          "Owner Account Inactive",
          "This owner account is not active."
        );
        return;
      }

      router.replace("/owner-dashboard");
    } catch (err: any) {
      Alert.alert("Login Error", err.message || "Unable to login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImageBackground
      source={require("../assets/images/owner-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>OWNER CONTROL CENTER</Text>
            </View>

            <Text style={styles.title}>Angel Express</Text>
            <Text style={styles.subtitle}>Owner App Login</Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Secure Owner Access</Text>
              <Text style={styles.cardText}>
                Manage trips, drivers, passengers, payments, safety alerts, and
                live operations.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Owner Email"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.disabledButton]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#07111f" />
                ) : (
                  <Text style={styles.loginText}>Login to Owner Dashboard</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.footer}>
              Oversight • Control • Excellence
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.74)",
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 90,
    justifyContent: "center",
  },
  badge: {
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "rgba(15,23,42,0.85)",
    marginBottom: 18,
  },
  badgeText: {
    color: "#d4af37",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1,
  },
  title: {
    color: "#d4af37",
    fontSize: 40,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 28,
  },
  card: {
    backgroundColor: "rgba(15,23,42,0.94)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.65)",
    borderRadius: 26,
    padding: 22,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },
  cardText: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  input: {
    backgroundColor: "rgba(2,6,23,0.75)",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 16,
    padding: 16,
    color: "#ffffff",
    fontSize: 16,
    marginBottom: 14,
  },
  loginButton: {
    backgroundColor: "#d4af37",
    borderRadius: 16,
    padding: 17,
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.65,
  },
  loginText: {
    color: "#07111f",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
  },
  footer: {
    color: "#e5e7eb",
    textAlign: "center",
    marginTop: 24,
    fontWeight: "700",
  },
});