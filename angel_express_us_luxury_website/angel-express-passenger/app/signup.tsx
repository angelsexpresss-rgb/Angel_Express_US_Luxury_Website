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
      Alert.alert(
        "Missing Information",
        "Please complete all fields."
      );
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: "angel-express-passenger://login",
        },
      });

      if (error) {
        throw error;
      }

      const userId = data.user?.id;

      if (userId) {
        const { error: profileError } = await supabase
          .from("passengers")
          .insert({
            id: userId,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim(),
            phone: phone.trim(),
          });

        if (profileError) {
          throw profileError;
        }
      }

      Alert.alert(
        "Verify Your Email",
        "Your account has been created. Please check your email and confirm your account before signing in.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/login" as any),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Signup Error",
        error.message || "Something went wrong."
      );
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
      <Text style={styles.title}>Create Account</Text>

      <TextInput
        style={styles.input}
        placeholder="First Name"
        placeholderTextColor="#888"
        value={firstName}
        onChangeText={setFirstName}
      />

      <TextInput
        style={styles.input}
        placeholder="Last Name"
        placeholderTextColor="#888"
        value={lastName}
        onChangeText={setLastName}
      />

      <TextInput
        style={styles.input}
        placeholder="Email Address"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        placeholderTextColor="#888"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
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
        style={[
          styles.button,
          loading && styles.buttonDisabled,
        ]}
        onPress={handleSignup}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Creating Account..." : "Sign Up"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.replace("/login" as any)}
      >
        <Text style={styles.loginText}>
          Already have an account? Sign In
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
    paddingTop: 80,
  },

  title: {
    color: "#D4AF37",
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 30,
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

  loginText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});