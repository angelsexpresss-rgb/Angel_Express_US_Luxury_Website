import { router, useLocalSearchParams } from "expo-router";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Alert,
  Animated,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import * as Linking from "expo-linking";
import {
  CheckCircle2,
  Mail,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";

import {
  AE_COLORS,
  AngelCard,
  AngelHeroButton,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

import {
  useAngelTheme,
  type AngelThemeColors,
} from "../lib/angelTheme";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalizeEmail(value)
  );
}

function getReadableResetError(error: unknown) {
  if (!error || typeof error !== "object") {
    return "We could not send the password-reset email. Please try again.";
  }

  const resetError = error as {
    message?: string;
    status?: number;
  };

  const message =
    resetError.message?.toLowerCase() ?? "";

  if (
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    resetError.status === 429
  ) {
    return "Too many password-reset requests were made. Wait a few minutes and try again.";
  }

  if (
    message.includes("invalid email") ||
    message.includes("email address is invalid")
  ) {
    return "Enter a valid email address.";
  }

  if (
    message.includes("network") ||
    message.includes("fetch")
  ) {
    return "A network problem prevented the request. Check your connection and try again.";
  }

  return (
    resetError.message ||
    "We could not send the password-reset email. Please try again."
  );
}

export default function ForgotPasswordScreen() {
  const params =
    useLocalSearchParams<{
      email?: string;
    }>();

  const {
    colors,
    themeMode,
    toggleTheme,
  } = useAngelTheme();

  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  const [email, setEmail] = useState(
    typeof params.email === "string"
      ? params.email
      : ""
  );

  const [loading, setLoading] =
    useState(false);

  const [emailSent, setEmailSent] =
    useState(false);

  const [emailError, setEmailError] =
    useState("");

  const logoFade =
    useRef(new Animated.Value(0)).current;

  const titleFade =
    useRef(new Animated.Value(0)).current;

  const cardFade =
    useRef(new Animated.Value(0)).current;

  const bgScale =
    useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const backgroundAnimation =
      slowBackgroundZoom(bgScale);

    const entranceAnimation =
      Animated.sequence([
        fadeUp(logoFade, 60),
        fadeUp(titleFade, 50),
        fadeUp(cardFade, 40),
      ]);

    backgroundAnimation.start();
    entranceAnimation.start();

    return () => {
      backgroundAnimation.stop();
      entranceAnimation.stop();
    };
  }, [
    bgScale,
    cardFade,
    logoFade,
    titleFade,
  ]);

  async function handleSendResetEmail() {
    if (loading) {
      return;
    }

    const cleanEmail =
      normalizeEmail(email);

    if (!cleanEmail) {
      setEmailError(
        "Email address is required."
      );

      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setEmailError(
        "Enter a valid email address."
      );

      return;
    }

    setEmailError("");
    setLoading(true);

    try {
      /*
       * This creates:
       * angelexpress://reset-password
       *
       * The same route can later be replaced by an HTTPS
       * universal link for App Store production.
       */
      const redirectTo = Linking.createURL(
        "reset-password"
      );

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo,
          }
        );

      if (error) {
        throw error;
      }

      /*
       * Do not reveal whether an account exists for the email.
       * This protects users from account-enumeration attempts.
       */
      setEmailSent(true);
    } catch (error) {
      Alert.alert(
        "Reset Email Unsuccessful",
        getReadableResetError(error)
      );
    } finally {
      setLoading(false);
    }
  }

  const logoTranslate =
    logoFade.interpolate({
      inputRange: [0, 1],
      outputRange: [24, 0],
    });

  const titleTranslate =
    titleFade.interpolate({
      inputRange: [0, 1],
      outputRange: [24, 0],
    });

  const cardTranslate =
    cardFade.interpolate({
      inputRange: [0, 1],
      outputRange: [24, 0],
    });

  const placeholderColor =
    colors.mode === "dark"
      ? "rgba(255,255,255,0.45)"
      : "rgba(7,20,38,0.45)";

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.bgWrap,
          {
            transform: [
              {
                scale: bgScale,
              },
            ],
          },
        ]}
      >
        <ImageBackground
          source={require(
            "../assets/images/gmc-background.png"
          )}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <SafeAreaView
          style={styles.safeArea}
        >
          <TouchableOpacity
            style={styles.themePill}
            onPress={() => {
              void toggleTheme();
            }}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text
              style={styles.themeText}
            >
              {themeMode === "dark"
                ? "☀️ Light"
                : "🌙 Dark"}
            </Text>
          </TouchableOpacity>

          <KeyboardAvoidingView
            style={
              styles.keyboardView
            }
            behavior={
              Platform.OS === "ios"
                ? "padding"
                : undefined
            }
          >
            <ScrollView
              contentContainerStyle={
                styles.content
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={
                false
              }
            >
              <TouchableOpacity
                style={
                  styles.backButton
                }
                onPress={() =>
                  router.back()
                }
                disabled={loading}
              >
                <Text
                  style={
                    styles.backText
                  }
                >
                  ‹ Back
                </Text>
              </TouchableOpacity>

              <Animated.View
                style={{
                  opacity: logoFade,
                  transform: [
                    {
                      translateY:
                        logoTranslate,
                    },
                  ],
                }}
              >
                <Image
                  source={require(
                    "../assets/images/angel-logo-transparent.png"
                  )}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </Animated.View>

              <Animated.View
                style={{
                  opacity: titleFade,
                  transform: [
                    {
                      translateY:
                        titleTranslate,
                    },
                  ],
                }}
              >
                <Text
                  style={styles.title}
                >
                  Reset{"\n"}
                  <Text
                    style={styles.gold}
                  >
                    Password.
                  </Text>
                </Text>

                <Text
                  style={
                    styles.subtitle
                  }
                >
                  Enter the email connected
                  to your Angel Express
                  passenger account.
                </Text>
              </Animated.View>

              <Animated.View
                style={{
                  opacity: cardFade,
                  transform: [
                    {
                      translateY:
                        cardTranslate,
                    },
                  ],
                }}
              >
                <AngelCard
                  style={styles.card}
                >
                  {emailSent ? (
                    <View
                      style={
                        styles.successWrap
                      }
                    >
                      <View
                        style={
                          styles.successIcon
                        }
                      >
                        <CheckCircle2
                          size={34}
                          color={
                            colors.success
                          }
                        />
                      </View>

                      <Text
                        style={
                          styles.successTitle
                        }
                      >
                        Check Your Email
                      </Text>

                      <Text
                        style={
                          styles.successText
                        }
                      >
                        If an Angel Express
                        account is connected
                        to{" "}
                        <Text
                          style={
                            styles.emailHighlight
                          }
                        >
                          {normalizeEmail(
                            email
                          )}
                        </Text>
                        , a password-reset
                        link has been sent.
                      </Text>

                      <Text
                        style={
                          styles.expiryNotice
                        }
                      >
                        Open the link on the
                        device where Angel
                        Express is installed.
                        Also check your spam
                        or junk folder.
                      </Text>

                      <AngelHeroButton
                        title="Return to Sign In"
                        onPress={() => {
                          router.replace(
                            "/login" as any
                          );
                        }}
                        variant="gold"
                      />

                      <TouchableOpacity
                        style={
                          styles.resendButton
                        }
                        onPress={() => {
                          setEmailSent(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={
                            styles.resendText
                          }
                        >
                          Use another email
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View
                        style={
                          styles.emailHeader
                        }
                      >
                        <View
                          style={
                            styles.emailIcon
                          }
                        >
                          <Mail
                            size={21}
                            color={
                              colors.gold ||
                              AE_COLORS.gold
                            }
                          />
                        </View>

                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <Text
                            style={
                              styles.cardTitle
                            }
                          >
                            Password Recovery
                          </Text>

                          <Text
                            style={
                              styles.cardSubtitle
                            }
                          >
                            We will send a
                            secure recovery
                            link to your email.
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={
                          styles.label
                        }
                      >
                        Email Address
                      </Text>

                      <TextInput
                        style={[
                          styles.input,
                          emailError
                            ? styles.inputError
                            : null,
                        ]}
                        placeholder="Enter your email"
                        placeholderTextColor={
                          placeholderColor
                        }
                        value={email}
                        onChangeText={(
                          value
                        ) => {
                          setEmail(value);

                          if (emailError) {
                            setEmailError("");
                          }
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        textContentType="emailAddress"
                        autoComplete="email"
                        editable={!loading}
                        returnKeyType="send"
                        onSubmitEditing={() => {
                          void handleSendResetEmail();
                        }}
                        maxLength={254}
                      />

                      {emailError ? (
                        <Text
                          style={
                            styles.errorText
                          }
                        >
                          {emailError}
                        </Text>
                      ) : null}

                      <Text
                        style={
                          styles.privacyNotice
                        }
                      >
                        For your security, the
                        confirmation message
                        will look the same
                        whether or not the
                        email is registered.
                      </Text>

                      <AngelHeroButton
                        title={
                          loading
                            ? "Sending Link..."
                            : "Send Reset Link"
                        }
                        onPress={() => {
                          void handleSendResetEmail();
                        }}
                        variant="gold"
                        style={
                          loading
                            ? styles.buttonDisabled
                            : undefined
                        }
                      />
                    </>
                  )}
                </AngelCard>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </View>
  );
}

function createStyles(
  c: AngelThemeColors
) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor:
        c.bg || AE_COLORS.navy,
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
      backgroundColor:
        c.mode === "dark"
          ? "rgba(5,11,22,0.88)"
          : "rgba(255,255,255,0.60)",
    },

    safeArea: {
      flex: 1,
    },

    keyboardView: {
      flex: 1,
    },

    themePill: {
      position: "absolute",
      top: 58,
      right: 22,
      zIndex: 10,
      borderWidth: 1,
      borderColor:
        c.mode === "dark"
          ? "rgba(212,175,55,0.35)"
          : "rgba(7,20,38,0.18)",
      backgroundColor:
        c.mode === "dark"
          ? "rgba(7,20,38,0.84)"
          : "rgba(255,255,255,0.86)",
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },

    themeText: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    content: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 40,
      justifyContent: "center",
    },

    backButton: {
      alignSelf: "flex-start",
      marginBottom: 16,
    },

    backText: {
      color: c.gold,
      fontSize: 18,
      fontWeight: "900",
    },

    logo: {
      width: "100%",
      height: 135,
      marginBottom: 6,
    },

    title: {
      color:
        c.mode === "dark"
          ? AE_COLORS.white
          : "#071426",
      fontSize: 46,
      fontWeight: "900",
      lineHeight: 48,
      letterSpacing: -1.2,
      marginBottom: 12,
    },

    gold: {
      color: c.gold,
    },

    subtitle: {
      color:
        c.mode === "dark"
          ? "#DCE5EE"
          : "#071426",
      fontSize: 16,
      lineHeight: 25,
      marginBottom: 24,
      fontWeight:
        c.mode === "dark"
          ? "400"
          : "800",
    },

    card: {
      padding: 22,
      backgroundColor:
        c.mode === "dark"
          ? "rgba(7,20,38,0.92)"
          : "rgba(255,255,255,0.90)",
      borderColor:
        c.mode === "dark"
          ? "rgba(212,175,55,0.20)"
          : "rgba(7,20,38,0.12)",
    },

    emailHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
    },

    emailIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.lightBorder,
      marginRight: 12,
    },

    cardTitle: {
      color: c.text,
      fontSize: 16,
      fontWeight: "900",
    },

    cardSubtitle: {
      color: c.muted,
      fontSize: 12.5,
      lineHeight: 18,
      marginTop: 3,
      fontWeight: "700",
    },

    label: {
      color: c.gold,
      fontSize: 13,
      fontWeight: "900",
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 8,
    },

    input: {
      backgroundColor:
        c.mode === "dark"
          ? "rgba(255,255,255,0.07)"
          : "rgba(255,255,255,0.94)",
      color:
        c.mode === "dark"
          ? AE_COLORS.white
          : "#071426",
      padding: 17,
      borderRadius: 16,
      fontSize: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor:
        c.mode === "dark"
          ? "rgba(255,255,255,0.12)"
          : "rgba(7,20,38,0.15)",
    },

    inputError: {
      borderColor: c.danger,
      borderWidth: 1.5,
      marginBottom: 6,
    },

    errorText: {
      color: c.danger,
      fontSize: 13,
      fontWeight: "800",
      marginBottom: 14,
    },

    privacyNotice: {
      color: c.muted,
      fontSize: 12.5,
      lineHeight: 19,
      marginBottom: 18,
      fontWeight: "700",
    },

    buttonDisabled: {
      opacity: 0.65,
    },

    successWrap: {
      alignItems: "center",
    },

    successIcon: {
      width: 70,
      height: 70,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.lightBorder,
      marginBottom: 18,
    },

    successTitle: {
      color: c.text,
      fontSize: 25,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 10,
    },

    successText: {
      color: c.muted,
      fontSize: 14,
      lineHeight: 22,
      textAlign: "center",
      fontWeight: "700",
      marginBottom: 12,
    },

    emailHighlight: {
      color: c.gold,
      fontWeight: "900",
    },

    expiryNotice: {
      color: c.muted,
      fontSize: 12.5,
      lineHeight: 19,
      textAlign: "center",
      marginBottom: 22,
    },

    resendButton: {
      marginTop: 16,
      paddingVertical: 8,
    },

    resendText: {
      color: c.gold,
      fontSize: 13.5,
      fontWeight: "900",
      textDecorationLine: "underline",
    },
  });
}