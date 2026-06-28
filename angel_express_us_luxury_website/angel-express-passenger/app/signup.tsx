import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

import {
  AE_COLORS,
  AngelCard,
  AngelHeroButton,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

export default function SignupScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const logoFade = useRef(new Animated.Value(0)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const linkFade = useRef(new Animated.Value(0)).current;
  const bgScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();

    Animated.sequence([
      fadeUp(logoFade, 80),
      fadeUp(titleFade, 60),
      fadeUp(cardFade, 50),
      fadeUp(linkFade, 40),
    ]).start();
  }, []);

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

  const logoTranslate = logoFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const titleTranslate = titleFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const cardTranslate = cardFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const linkTranslate = linkFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.bgWrap,
          {
            transform: [{ scale: bgScale }],
          },
        ]}
      >
        <ImageBackground
          source={require("../assets/images/gmc-background.png")}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

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

            <Animated.View
              style={{
                opacity: logoFade,
                transform: [{ translateY: logoTranslate }],
              }}
            >
              <Image
                source={require("../assets/images/angel-logo-transparent.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>

            <Animated.View
              style={{
                opacity: titleFade,
                transform: [{ translateY: titleTranslate }],
              }}
            >
              <Text style={styles.title}>
                Create{"\n"}
                <Text style={styles.gold}>Account.</Text>
              </Text>

              <Text style={styles.subtitle}>
                Join Angel Express and manage your private rides from one connected app.
              </Text>
            </Animated.View>

            <Animated.View
              style={{
                opacity: cardFade,
                transform: [{ translateY: cardTranslate }],
              }}
            >
              <AngelCard style={styles.card}>
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

                <AngelHeroButton
                  title={loading ? "Creating..." : "Create Account"}
                  onPress={handleSignup}
                  variant="gold"
                  style={loading ? styles.buttonDisabled : undefined}
                />
              </AngelCard>
            </Animated.View>

            <Animated.View
              style={{
                opacity: linkFade,
                transform: [{ translateY: linkTranslate }],
              }}
            >
              <TouchableOpacity onPress={() => router.replace("/login" as any)}>
                <Text style={styles.loginText}>
                  Already have an account?{" "}
                  <Text style={styles.loginGold}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AE_COLORS.navy,
    overflow: "hidden",
  },

  bgWrap: {
    ...StyleSheet.absoluteFillObject,
  },

  background: {
    flex: 1,
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
    color: AE_COLORS.gold,
    fontSize: 18,
    fontWeight: "900",
  },

  logo: {
    width: "100%",
    height: 125,
    marginBottom: 4,
  },

  title: {
    color: AE_COLORS.white,
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
    color: AE_COLORS.gold,
  },

  subtitle: {
    color: "#dce5ee",
    fontSize: 16,
    lineHeight: 25,
    marginBottom: 22,
  },

  card: {
    padding: 22,
    marginBottom: 24,
  },

  label: {
    color: AE_COLORS.gold,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    color: AE_COLORS.white,
    padding: 17,
    borderRadius: 16,
    fontSize: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  loginText: {
    color: AE_COLORS.white,
    textAlign: "center",
    fontSize: 15.5,
    lineHeight: 24,
  },

  loginGold: {
    color: AE_COLORS.gold,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
});