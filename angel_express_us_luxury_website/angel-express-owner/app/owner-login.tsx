import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useOwnerTheme } from "../lib/ownerTheme";
import { supabase } from "../lib/supabase";

export default function OwnerLoginScreen() {
  const { theme, isDark, toggleTheme } = useOwnerTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const logoScale = useRef(new Animated.Value(0.86)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 55,
        useNativeDriver: true,
      }),

      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),

      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 650,
        delay: 150,
        useNativeDriver: true,
      }),

      Animated.spring(cardTranslateY, {
        toValue: 0,
        friction: 8,
        tension: 45,
        delay: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardOpacity, cardTranslateY, logoOpacity, logoScale]);

  async function handleLogin() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password.trim()) {
      Alert.alert(
        "Missing Information",
        "Enter your owner email and password."
      );
      return;
    }

    try {
      setLoading(true);

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (error) {
        throw error;
      }

      const user = data.user;

      if (!user) {
        throw new Error(
          "Login failed. Please check your credentials and try again."
        );
      }

      const { data: ownerProfile, error: ownerError } =
        await supabase
          .from("owners")
          .select("id, status, first_name, last_name, email, role")
          .eq("id", user.id)
          .maybeSingle();

      if (ownerError) {
        await supabase.auth.signOut();

        throw new Error(
          "Unable to verify owner access. Please try again."
        );
      }

      if (!ownerProfile) {
        await supabase.auth.signOut();

        Alert.alert(
          "Access Denied",
          "This account is not registered as an Angel Express owner."
        );
        return;
      }

      const ownerStatus = String(
        ownerProfile.status || ""
      ).toLowerCase();

      if (ownerStatus !== "active") {
        await supabase.auth.signOut();

        Alert.alert(
          "Owner Account Inactive",
          "This owner account is currently inactive. Contact the system administrator."
        );
        return;
      }

      router.replace("/owner-dashboard");
    } catch (error: any) {
      const message =
        error?.message ||
        "Unable to sign in to the Owner Command Center.";

      Alert.alert("Login Error", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImageBackground
      source={require("../assets/images/owner-bg.png")}
      style={[
        styles.background,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
      resizeMode="cover"
    >
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: isDark
              ? "rgba(3, 8, 17, 0.84)"
              : "rgba(245, 247, 250, 0.82)",
          },
        ]}
      >
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topBar}>
              <View
                style={[
                  styles.secureIndicator,
                  {
                    backgroundColor: theme.colors.successSoft,
                    borderColor: theme.colors.success,
                  },
                ]}
              >
                <View
                  style={[
                    styles.secureDot,
                    {
                      backgroundColor: theme.colors.success,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.secureText,
                    {
                      color: theme.colors.success,
                    },
                  ]}
                >
                  SECURE OWNER ACCESS
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.themeButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
                onPress={toggleTheme}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={
                  isDark
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
              >
                <Ionicons
                  name={isDark ? "sunny-outline" : "moon-outline"}
                  size={20}
                  color={theme.colors.gold}
                />
              </TouchableOpacity>
            </View>

            <Animated.View
              style={[
                styles.brandSection,
                {
                  opacity: logoOpacity,
                  transform: [{ scale: logoScale }],
                },
              ]}
            >
              <View
                style={[
                  styles.logoOuter,
                  {
                    backgroundColor: theme.colors.goldTransparent,
                    borderColor: theme.colors.cardBorderStrong,
                  },
                  theme.shadows.gold,
                ]}
              >
                <View
                  style={[
                    styles.logoInner,
                    {
                      backgroundColor: theme.colors.gold,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.logoLetter,
                      {
                        color: theme.colors.textInverse,
                      },
                    ]}
                  >
                    A
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.brandName,
                  {
                    color: theme.colors.text,
                  },
                ]}
              >
                ANGEL EXPRESS
              </Text>

              <Text
                style={[
                  styles.commandCenter,
                  {
                    color: theme.colors.gold,
                  },
                ]}
              >
                OPERATIONS COMMAND CENTER
              </Text>

              <Text
                style={[
                  styles.brandDescription,
                  {
                    color: theme.colors.textSecondary,
                  },
                ]}
              >
                Centralized oversight for bookings, drivers, passengers,
                payments, safety, and live fleet operations.
              </Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.cardBorderStrong,
                  opacity: cardOpacity,
                  transform: [
                    {
                      translateY: cardTranslateY,
                    },
                  ],
                },
                theme.shadows.premium,
              ]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.cardIcon,
                    {
                      backgroundColor: theme.colors.goldTransparent,
                    },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={25}
                    color={theme.colors.gold}
                  />
                </View>

                <View style={styles.cardHeading}>
                  <Text
                    style={[
                      styles.cardTitle,
                      {
                        color: theme.colors.text,
                      },
                    ]}
                  >
                    Welcome Back
                  </Text>

                  <Text
                    style={[
                      styles.cardSubtitle,
                      {
                        color: theme.colors.textMuted,
                      },
                    ]}
                  >
                    Sign in with your authorized owner account.
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.label,
                  {
                    color: theme.colors.textSecondary,
                  },
                ]}
              >
                OWNER EMAIL
              </Text>

              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.inputBorder,
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={theme.colors.textMuted}
                />

                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="owner@angelexpress.com"
                  placeholderTextColor={
                    theme.colors.inputPlaceholder
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  returnKeyType="next"
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                />
              </View>

              <Text
                style={[
                  styles.label,
                  {
                    color: theme.colors.textSecondary,
                  },
                ]}
              >
                PASSWORD
              </Text>

              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.inputBorder,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={theme.colors.textMuted}
                />

                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="Enter your password"
                  placeholderTextColor={
                    theme.colors.inputPlaceholder
                  }
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  returnKeyType="done"
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={handleLogin}
                  editable={!loading}
                />

                <Pressable
                  style={styles.passwordButton}
                  onPress={() =>
                    setShowPassword((current) => !current)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  <Ionicons
                    name={
                      showPassword
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={21}
                    color={theme.colors.textMuted}
                  />
                </Pressable>
              </View>

              <View style={styles.sessionRow}>
                <View style={styles.sessionInformation}>
                  <Ionicons
                    name="checkmark-circle"
                    size={17}
                    color={theme.colors.success}
                  />

                  <Text
                    style={[
                      styles.sessionText,
                      {
                        color: theme.colors.textMuted,
                      },
                    ]}
                  >
                    Secure session protection enabled
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.loginButton,
                  {
                    backgroundColor: theme.colors.gold,
                  },
                  theme.shadows.gold,
                  loading && styles.disabledButton,
                ]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.86}
              >
                {loading ? (
                  <View style={styles.loginContent}>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.textInverse}
                    />

                    <Text
                      style={[
                        styles.loginText,
                        {
                          color: theme.colors.textInverse,
                        },
                      ]}
                    >
                      Verifying owner access...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.loginContent}>
                    <Text
                      style={[
                        styles.loginText,
                        {
                          color: theme.colors.textInverse,
                        },
                      ]}
                    >
                      Enter Command Center
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={20}
                      color={theme.colors.textInverse}
                    />
                  </View>
                )}
              </TouchableOpacity>

              <View
                style={[
                  styles.securityNotice,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={19}
                  color={theme.colors.info}
                />

                <Text
                  style={[
                    styles.securityNoticeText,
                    {
                      color: theme.colors.textMuted,
                    },
                  ]}
                >
                  Access is restricted to authorized Angel Express ownership
                  and administrative personnel.
                </Text>
              </View>
            </Animated.View>

            <View style={styles.footer}>
              <Text
                style={[
                  styles.footerPrimary,
                  {
                    color: theme.colors.textSecondary,
                  },
                ]}
              >
                Oversight • Control • Excellence
              </Text>

              <Text
                style={[
                  styles.footerSecondary,
                  {
                    color: theme.colors.textMuted,
                  },
                ]}
              >
                Angel Express Mobility Owner App V5
              </Text>
            </View>
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
  },

  keyboardView: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "ios" ? 62 : 42,
    paddingBottom: 34,
  },

  topBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },

  secureIndicator: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },

  secureDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginRight: 8,
  },

  secureText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  themeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  brandSection: {
    alignItems: "center",
    marginBottom: 28,
  },

  logoOuter: {
    width: 92,
    height: 92,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  logoInner: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  logoLetter: {
    fontSize: 37,
    fontWeight: "900",
  },

  brandName: {
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: 2.5,
    textAlign: "center",
  },

  commandCenter: {
    marginTop: 7,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.8,
    textAlign: "center",
  },

  brandDescription: {
    maxWidth: 470,
    marginTop: 14,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 21,
    textAlign: "center",
  },

  card: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 28,
    padding: 22,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  cardHeading: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: "900",
  },

  cardSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
  },

  label: {
    marginBottom: 8,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  inputContainer: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 16,
    marginBottom: 17,
  },

  input: {
    flex: 1,
    height: 56,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: "600",
  },

  passwordButton: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  sessionRow: {
    marginTop: -1,
    marginBottom: 18,
  },

  sessionInformation: {
    flexDirection: "row",
    alignItems: "center",
  },

  sessionText: {
    marginLeft: 7,
    fontSize: 12,
    fontWeight: "600",
  },

  loginButton: {
    minHeight: 58,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.66,
  },

  loginContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  loginText: {
    fontSize: 15,
    fontWeight: "900",
  },

  securityNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 15,
    padding: 13,
    marginTop: 17,
  },

  securityNoticeText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
  },

  footer: {
    alignItems: "center",
    marginTop: 25,
  },

  footerPrimary: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  footerSecondary: {
    marginTop: 7,
    fontSize: 11,
    fontWeight: "600",
  },
});