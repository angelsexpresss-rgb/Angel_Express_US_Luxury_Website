import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  Image,
  ImageBackground,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function SignupScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (loading) return;

    if (!firstName || !lastName || !email || !phone || !password) {
      Alert.alert("Missing Information", "Please complete all fields.");
      return;
    }

    try {
      setLoading(true);

      const cleanFirstName = firstName.trim();
      const cleanLastName = lastName.trim();
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone.trim();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) throw error;

      const userId = data.user?.id;

      if (userId) {
        const { error: profileError } = await supabase.from("passengers").insert({
          id: userId,
          first_name: cleanFirstName,
          last_name: cleanLastName,
          email: cleanEmail,
          phone: cleanPhone,
        });

        if (profileError) throw profileError;

        try {
          await fetch("https://angel-welcome-email.angelsexpresss.workers.dev", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              firstName: cleanFirstName,
              email: cleanEmail,
            }),
          });
        } catch (emailError) {
          console.log("Welcome email failed:", emailError);
        }
      }

      Alert.alert("Account Created", "Welcome to Angel Express Mobility.", [
        {
          text: "Continue",
          onPress: () => router.replace("/login" as any),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Signup Error", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImageBackground
      source={require("../assets/images/gmc-background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>

            <Image
              source={require("../assets/images/angel-logo-transparent.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.title}>
              Create{"\n"}
              <Text style={styles.gold}>Account.</Text>
            </Text>

            <Text style={styles.subtitle}>
              Join Angel Express and manage your private rides from one connected app.
            </Text>

            <View style={styles.card}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your first name"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={firstName}
                onChangeText={setFirstName}
              />

              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your last name"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={lastName}
                onChangeText={setLastName}
              />

              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Create a password"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.85}
              >
                <View style={styles.buttonIconBox}>
                  <Text style={styles.buttonIcon}>A</Text>
                </View>

                <Text style={styles.buttonText}>
                  {loading ? "Creating..." : "Create Account"}
                </Text>

                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => router.replace("/login" as any)}>
              <Text style={styles.loginText}>
                Already have an account?{" "}
                <Text style={styles.loginGold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#050b16",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(5,11,22,0.88)",
  },

  safeArea: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
  },

  backButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
  },

  backText: {
    color: "#D4AF37",
    fontSize: 18,
    fontWeight: "900",
  },

  logo: {
    width: "100%",
    height: 125,
    marginBottom: 4,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 46,
    fontWeight: "900",
    lineHeight: 48,
    letterSpacing: -1.2,
    marginBottom: 12,
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 6,
  },

  gold: {
    color: "#D4AF37",
  },

  subtitle: {
    color: "#dce5ee",
    fontSize: 16,
    lineHeight: 25,
    marginBottom: 22,
  },

  card: {
    backgroundColor: "rgba(13,20,34,0.84)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.28)",
    borderRadius: 28,
    padding: 22,
    marginBottom: 24,
  },

  label: {
    color: "#D4AF37",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    color: "#FFFFFF",
    padding: 17,
    borderRadius: 16,
    fontSize: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  button: {
    width: "100%",
    minHeight: 64,
    backgroundColor: "#D4AF37",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    paddingHorizontal: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#F5D76E",
    shadowColor: "#D4AF37",
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 5,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#06111f",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonIcon: {
    color: "#D4AF37",
    fontSize: 26,
    fontWeight: "900",
    fontStyle: "italic",
  },

  buttonText: {
    color: "#06111f",
    fontSize: 17,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  arrow: {
    color: "#06111f",
    fontSize: 42,
    fontWeight: "300",
    marginTop: -4,
  },

  loginText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 15.5,
    lineHeight: 24,
  },

  loginGold: {
    color: "#D4AF37",
    fontWeight: "900",
    textDecorationLine: "underline",
  },
});