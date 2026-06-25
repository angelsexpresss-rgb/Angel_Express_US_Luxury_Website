import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function ChauffeurLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Information", "Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;

      const user = data.user;

      if (!user) {
        Alert.alert("Login Error", "Unable to find chauffeur account.");
        return;
      }

      const { data: driver, error: driverError } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", user.id)
        .single();

      if (driverError || !driver) {
        Alert.alert(
          "Profile Missing",
          "Your login exists, but no chauffeur profile was found."
        );
        return;
      }

    if (driver.status === "approved") {
  router.replace("/driver-dashboard");
  return;
}

if (driver.status === "pending") {
  router.replace("/driver-pending");
  return;
}

if (driver.status === "rejected") {
  Alert.alert(
    "Application Not Approved",
    "Your chauffeur application was not approved. Please contact Angel Express support."
  );
  return;
}

if (driver.status === "suspended") {
  Alert.alert(
    "Account Suspended",
    "Your chauffeur account has been suspended. Please contact Angel Express."
  );
  return;
}

router.replace("/driver-pending");
    } catch (err: any) {
      Alert.alert("Login Failed", err.message || "Unable to login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImageBackground
      source={require("../assets/images/driver-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Chauffeur Login</Text>

          <Text style={styles.subtitle}>
            Access your Angel Express chauffeur account.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
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
            style={styles.primaryButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#07111f" />
            ) : (
              <Text style={styles.primaryButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/driver-signup")}>
            <Text style={styles.link}>Apply as a Chauffeur</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Back</Text>
          </TouchableOpacity>
        </ScrollView>
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
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#d4af37",
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    color: "#e5e7eb",
    textAlign: "center",
    fontSize: 15,
    marginBottom: 30,
  },
  input: {
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "#334155",
    color: "#ffffff",
    borderRadius: 14,
    padding: 15,
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: "#d4af37",
    paddingVertical: 17,
    borderRadius: 16,
    marginTop: 10,
  },
  primaryButtonText: {
    color: "#07111f",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 17,
    textTransform: "uppercase",
  },
  link: {
    color: "#d4af37",
    textAlign: "center",
    marginTop: 22,
    fontWeight: "800",
  },
  backLink: {
    color: "#ffffff",
    textAlign: "center",
    marginTop: 16,
  },
});