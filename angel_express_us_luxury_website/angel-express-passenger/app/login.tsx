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

  async function handleLogin() {
    if (loading) return;

    if (!email || !password) {
      Alert.alert("Missing Information", "Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    setLoading(false);

    if (error) {
      Alert.alert("Login Error", error.message);
      return;
    }

    if (!data.session) {
      Alert.alert("Login Error", "No login session was created.");
      return;
    }

    router.replace("/dashboard" as any);
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
    borderColor: "rgba(212, 175, 55, 0.12)",
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