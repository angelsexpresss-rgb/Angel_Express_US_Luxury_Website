import { router } from "expo-router";
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

import {
  Eye,
  EyeOff,
  LockKeyhole,
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

type PassengerRecord = Record<string, any>;

type LoginFieldErrors = {
  email?: string;
  password?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalizeEmail(value)
  );
}

function getReadableLoginError(error: unknown) {
  const fallback =
    "We could not sign you in. Please try again.";

  if (!error || typeof error !== "object") {
    return fallback;
  }

  const loginError = error as {
    message?: string;
    code?: string;
    status?: number;
  };

  const message =
    loginError.message?.toLowerCase() ?? "";

  const code =
    loginError.code?.toLowerCase() ?? "";

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials") ||
    message.includes("email or password") ||
    code.includes("invalid_credentials")
  ) {
    return "The email or password you entered is incorrect.";
  }

  if (
    message.includes("email not confirmed") ||
    message.includes("email_not_confirmed")
  ) {
    return "Your email has not been verified. Open the verification email from Angel Express before signing in.";
  }

  if (
    message.includes("too many requests") ||
    message.includes("rate limit") ||
    loginError.status === 429
  ) {
    return "Too many sign-in attempts were made. Wait a few minutes and try again.";
  }

  if (
    message.includes("network") ||
    message.includes("fetch")
  ) {
    return "A network problem prevented sign-in. Check your internet connection and try again.";
  }

  if (
    message.includes("user not found")
  ) {
    return "No Angel Express account was found for this email address.";
  }

  return loginError.message || fallback;
}

function isPassengerSuspended(
  passenger: PassengerRecord
) {
  const status = String(
    passenger.account_status ??
      passenger.status ??
      passenger.passenger_status ??
      ""
  )
    .trim()
    .toLowerCase();

  return (
    passenger.is_suspended === true ||
    passenger.suspended === true ||
    passenger.blacklisted === true ||
    passenger.is_blacklisted === true ||
    status === "suspended" ||
    status === "blocked" ||
    status === "blacklisted" ||
    status === "disabled"
  );
}

function isPassengerDeleted(
  passenger: PassengerRecord
) {
  const status = String(
    passenger.account_status ??
      passenger.status ??
      passenger.passenger_status ??
      ""
  )
    .trim()
    .toLowerCase();

  return (
    passenger.is_deleted === true ||
    Boolean(passenger.deleted_at) ||
    status === "deleted" ||
    status === "removed"
  );
}

function isProfileComplete(
  profile: PassengerRecord | null
) {
  if (!profile) {
    return false;
  }

  const completed =
    profile.profile_completed === true ||
    profile.is_profile_complete === true ||
    profile.completed === true;

  const acceptedTerms =
    profile.terms_accepted === true ||
    profile.accepted_terms === true ||
    Boolean(profile.terms_accepted_at);

  return completed && acceptedTerms;
}

export default function LoginScreen() {
  const {
    colors,
    themeMode,
    toggleTheme,
  } = useAngelTheme();

  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [fieldErrors, setFieldErrors] =
    useState<LoginFieldErrors>({});

  const logoFade =
    useRef(new Animated.Value(0)).current;

  const titleFade =
    useRef(new Animated.Value(0)).current;

  const cardFade =
    useRef(new Animated.Value(0)).current;

  const linkFade =
    useRef(new Animated.Value(0)).current;

  const bgScale =
    useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const backgroundAnimation =
      slowBackgroundZoom(bgScale);

    const entranceAnimation =
      Animated.sequence([
        fadeUp(logoFade, 80),
        fadeUp(titleFade, 60),
        fadeUp(cardFade, 50),
        fadeUp(linkFade, 40),
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
    linkFade,
    logoFade,
    titleFade,
  ]);

  function clearFieldError(
    field: keyof LoginFieldErrors
  ) {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      return {
        ...current,
        [field]: undefined,
      };
    });
  }

  function validateLogin() {
    const cleanEmail = normalizeEmail(email);
    const errors: LoginFieldErrors = {};

    if (!cleanEmail) {
      errors.email =
        "Email address is required.";
    } else if (!isValidEmail(cleanEmail)) {
      errors.email =
        "Enter a valid email address.";
    }

    /*
     * Do not trim the password before authentication.
     * Spaces can legally be part of a user's password.
     */
    if (!password) {
      errors.password =
        "Password is required.";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return null;
    }

    return {
      cleanEmail,
      cleanPassword: password,
    };
  }

  async function securelySignOut() {
    try {
      await supabase.auth.signOut({
        scope: "local",
      });
    } catch (error) {
      console.warn(
        "Local session cleanup failed:",
        error
      );
    }
  }

  async function getPassengerRecord(
    userId: string
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("passengers")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as PassengerRecord | null;
  }

  async function getPassengerProfile(
    userId: string
  ) {
    /*
     * Your current project uses passenger_profiles.user_id.
     * Selecting "*" avoids breaking when more profile fields
     * are added during the production build.
     */
    const {
      data,
      error,
    } = await supabase
      .from("passenger_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as PassengerRecord | null;
  }

  async function syncWebsiteBookings(
    userId: string,
    userEmail: string
  ) {
    const cleanEmail =
      normalizeEmail(userEmail);

    const {
      data: websiteBookings,
      error: fetchError,
    } = await supabase
      .from("bookings")
      .select("*")
      .ilike("email", cleanEmail);

    if (fetchError) {
      throw fetchError;
    }

    if (
      !websiteBookings ||
      websiteBookings.length === 0
    ) {
      return;
    }

    /*
     * Update only bookings that do not already belong to
     * another authenticated passenger.
     */
    const claimableBookings =
      websiteBookings.filter((booking) => {
        return (
          !booking.user_id ||
          booking.user_id === userId
        );
      });

    for (
      const booking of claimableBookings
    ) {
      const updatedBooking = {
        user_id: userId,

        passenger_name:
          booking.passenger_name ||
          booking.name ||
          "",

        pickup_address:
          booking.pickup_address ||
          booking.pickup ||
          "",

        dropoff_address:
          booking.dropoff_address ||
          booking.dropoff ||
          "",

        ride_date:
          booking.ride_date ||
          booking.date ||
          "",

        ride_time:
          booking.ride_time ||
          booking.time ||
          "",

        trip_type:
          booking.trip_type ||
          booking.tripType ||
          "One Way",

        ride_category:
          booking.ride_category ||
          "Website Booking",

        estimated_miles: Number(
          booking.estimated_miles ||
            booking.miles ||
            0
        ),

        base_fare: Number(
          booking.base_fare ||
            booking.base ||
            0
        ),

        total_fare: Number(
          booking.total_fare ||
            booking.total ||
            0
        ),

        balance_due: Number(
          booking.balance_due ||
            booking.total_fare ||
            booking.total ||
            0
        ),

        source:
          booking.source ||
          "website",
      };

      const {
        error: updateError,
      } = await supabase
        .from("bookings")
        .update(updatedBooking)
        .eq("id", booking.id);

      if (updateError) {
        /*
         * Booking synchronization should not prevent the user
         * from reaching the app after a valid login.
         */
        console.warn(
          `Could not synchronize booking ${booking.id}:`,
          updateError
        );
      }
    }
  }

  async function handleLogin() {
    if (loading) {
      return;
    }

    const validated = validateLogin();

    if (!validated) {
      Alert.alert(
        "Check Your Information",
        "Enter a valid email address and password."
      );

      return;
    }

    setLoading(true);

    try {
      const {
        cleanEmail,
        cleanPassword,
      } = validated;

      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

      if (error) {
        throw error;
      }

      const user = data.user;

      if (
        !user?.id ||
        !user.email
      ) {
        await securelySignOut();

        throw new Error(
          "Your authenticated account could not be loaded."
        );
      }

      /*
       * Even though Supabase normally blocks an unverified
       * email, this additional check prevents a partially
       * verified session from entering protected screens.
       */
      if (!user.email_confirmed_at) {
        await securelySignOut();

        Alert.alert(
          "Email Verification Required",
          "Verify your email address before signing in.",
          [
            {
              text: "OK",
            },
          ]
        );

        return;
      }

      const passenger =
        await getPassengerRecord(user.id);

      /*
       * A valid authentication user without a passenger row is
       * treated as a missing/deleted passenger account.
       *
       * It is not recreated automatically because deletion may
       * have been intentional or administrative.
       */
      if (!passenger) {
        await securelySignOut();

        Alert.alert(
          "Passenger Profile Unavailable",
          "Your login exists, but an active passenger profile could not be found. Contact Angel Express support for assistance."
        );

        return;
      }

      if (isPassengerDeleted(passenger)) {
        await securelySignOut();

        Alert.alert(
          "Account Unavailable",
          "This passenger account has been deleted and cannot access the app. Contact Angel Express support if you believe this is an error."
        );

        return;
      }

      if (isPassengerSuspended(passenger)) {
        await securelySignOut();

        Alert.alert(
          "Account Suspended",
          "Your passenger access is currently suspended. Contact Angel Express support for assistance."
        );

        return;
      }

      let passengerProfile:
        | PassengerRecord
        | null = null;

      try {
        passengerProfile =
          await getPassengerProfile(
            user.id
          );
      } catch (profileError) {
        /*
         * Authentication succeeded, but profile verification
         * failed. End the session rather than granting
         * unverified access to protected screens.
         */
        await securelySignOut();
        throw profileError;
      }

      /*
       * Website bookings are synchronized only after confirming
       * the account is active.
       */
      await syncWebsiteBookings(
        user.id,
        user.email
      );

      if (
        !isProfileComplete(
          passengerProfile
        )
      ) {
        router.replace(
          "/profile" as any
        );

        return;
      }

      router.replace(
        "/dashboard" as any
      );
    } catch (error) {
      await securelySignOut();

      Alert.alert(
        "Secure Login Failed",
        getReadableLoginError(error)
      );
    } finally {
      setLoading(false);
    }
  }

  function handleForgotPassword() {
    if (loading) {
      return;
    }

    const cleanEmail =
      normalizeEmail(email);

    router.push({
      pathname:
        "/forgot-password" as any,
      params: cleanEmail
        ? {
            email: cleanEmail,
          }
        : undefined,
    });
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

  const linkTranslate =
    linkFade.interpolate({
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
              keyboardDismissMode="interactive"
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
                activeOpacity={0.8}
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
                  Welcome{"\n"}
                  <Text
                    style={styles.gold}
                  >
                    Back.
                  </Text>
                </Text>

                <Text
                  style={
                    styles.subtitle
                  }
                >
                  Sign in to continue
                  your Angel Express ride
                  experience.
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
                  <View
                    style={
                      styles.securityHeader
                    }
                  >
                    <View
                      style={
                        styles.securityIcon
                      }
                    >
                      <LockKeyhole
                        size={19}
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
                          styles.securityTitle
                        }
                      >
                        Secure Passenger
                        Login
                      </Text>

                      <Text
                        style={
                          styles.securitySubtitle
                        }
                      >
                        Your session and
                        private ride history
                        are protected.
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={styles.label}
                  >
                    Email Address
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      fieldErrors.email &&
                        styles.inputError,
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
                      clearFieldError(
                        "email"
                      );
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="emailAddress"
                    autoComplete="email"
                    editable={!loading}
                    returnKeyType="next"
                    maxLength={254}
                  />

                  {fieldErrors.email ? (
                    <Text
                      style={
                        styles.errorText
                      }
                    >
                      {fieldErrors.email}
                    </Text>
                  ) : null}

                  <Text
                    style={styles.label}
                  >
                    Password
                  </Text>

                  <View
                    style={[
                      styles.passwordWrap,
                      fieldErrors.password &&
                        styles.passwordWrapError,
                    ]}
                  >
                    <TextInput
                      style={
                        styles.passwordInput
                      }
                      placeholder="Enter your password"
                      placeholderTextColor={
                        placeholderColor
                      }
                      value={password}
                      onChangeText={(
                        value
                      ) => {
                        setPassword(value);
                        clearFieldError(
                          "password"
                        );
                      }}
                      secureTextEntry={
                        !showPassword
                      }
                      textContentType="password"
                      autoComplete="password"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        void handleLogin();
                      }}
                      maxLength={72}
                    />

                    <TouchableOpacity
                      style={
                        styles.eyeButton
                      }
                      onPress={() => {
                        setShowPassword(
                          (current) =>
                            !current
                        );
                      }}
                      activeOpacity={0.8}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff
                          size={21}
                          color={
                            colors.gold ||
                            AE_COLORS.gold
                          }
                        />
                      ) : (
                        <Eye
                          size={21}
                          color={
                            colors.gold ||
                            AE_COLORS.gold
                          }
                        />
                      )}
                    </TouchableOpacity>
                  </View>

                  {fieldErrors.password ? (
                    <Text
                      style={
                        styles.errorText
                      }
                    >
                      {
                        fieldErrors.password
                      }
                    </Text>
                  ) : null}

                  <TouchableOpacity
                    style={
                      styles.forgotButton
                    }
                    onPress={
                      handleForgotPassword
                    }
                    activeOpacity={0.8}
                    disabled={loading}
                  >
                    <Text
                      style={
                        styles.forgotText
                      }
                    >
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>

                  <AngelHeroButton
                    title={
                      loading
                        ? "Signing In..."
                        : "Sign In"
                    }
                    onPress={() => {
                      void handleLogin();
                    }}
                    variant="gold"
                    style={
                      loading
                        ? styles.buttonDisabled
                        : undefined
                    }
                  />
                </AngelCard>
              </Animated.View>

              <Animated.View
                style={{
                  opacity: linkFade,
                  transform: [
                    {
                      translateY:
                        linkTranslate,
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    if (!loading) {
                      router.replace(
                        "/signup" as any
                      );
                    }
                  }}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  <Text
                    style={
                      styles.signupText
                    }
                  >
                    Don&apos;t have an
                    account?{" "}
                    <Text
                      style={
                        styles.signupGold
                      }
                    >
                      Create Account
                    </Text>
                  </Text>
                </TouchableOpacity>
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
          : "rgba(255,255,255,0.58)",
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
          ? "rgba(7,20,38,0.82)"
          : "rgba(255,255,255,0.82)",
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },

    themeText: {
      color:
        c.gold || AE_COLORS.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    content: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 38,
      justifyContent: "center",
    },

    backButton: {
      alignSelf: "flex-start",
      marginBottom: 18,
    },

    backText: {
      color:
        c.gold || AE_COLORS.gold,
      fontSize: 18,
      fontWeight: "900",
    },

    logo: {
      width: "100%",
      height: 145,
      marginBottom: 8,
    },

    title: {
      color:
        c.mode === "dark"
          ? AE_COLORS.white
          : "#071426",
      fontSize: 48,
      fontWeight: "900",
      lineHeight: 50,
      letterSpacing: -1.3,
      marginBottom: 14,
      textShadowColor:
        c.mode === "dark"
          ? "rgba(0,0,0,0.85)"
          : "rgba(255,255,255,0.75)",
      textShadowOffset: {
        width: 1,
        height: 2,
      },
      textShadowRadius: 6,
    },

    gold: {
      color:
        c.gold || AE_COLORS.gold,
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
      marginBottom: 24,
      backgroundColor:
        c.mode === "dark"
          ? "rgba(7,20,38,0.92)"
          : "rgba(255,255,255,0.88)",
      borderColor:
        c.mode === "dark"
          ? "rgba(212,175,55,0.20)"
          : "rgba(7,20,38,0.12)",
    },

    securityHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 22,
      paddingBottom: 18,
      borderBottomWidth: 1,
      borderBottomColor:
        c.lightBorder,
    },

    securityIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor:
        c.lightBorder,
      marginRight: 12,
    },

    securityTitle: {
      color: c.text,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "900",
    },

    securitySubtitle: {
      color: c.muted,
      fontSize: 12.5,
      lineHeight: 18,
      marginTop: 2,
      fontWeight: "700",
    },

    label: {
      color:
        c.gold || AE_COLORS.gold,
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
          : "rgba(255,255,255,0.92)",
      color:
        c.mode === "dark"
          ? AE_COLORS.white
          : "#071426",
      padding: 17,
      borderRadius: 16,
      fontSize: 16,
      marginBottom: 18,
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

    passwordWrap: {
      backgroundColor:
        c.mode === "dark"
          ? "rgba(255,255,255,0.07)"
          : "rgba(255,255,255,0.92)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        c.mode === "dark"
          ? "rgba(255,255,255,0.12)"
          : "rgba(7,20,38,0.15)",
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
    },

    passwordWrapError: {
      borderColor: c.danger,
      borderWidth: 1.5,
      marginBottom: 6,
    },

    passwordInput: {
      flex: 1,
      color:
        c.mode === "dark"
          ? AE_COLORS.white
          : "#071426",
      padding: 17,
      fontSize: 16,
    },

    eyeButton: {
      width: 52,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
    },

    errorText: {
      color: c.danger,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "800",
      marginBottom: 14,
    },

    forgotButton: {
      alignSelf: "flex-end",
      marginBottom: 18,
      paddingVertical: 4,
    },

    forgotText: {
      color:
        c.gold || AE_COLORS.gold,
      fontSize: 13.5,
      fontWeight: "900",
      textDecorationLine:
        "underline",
    },

    buttonDisabled: {
      opacity: 0.65,
    },

    signupText: {
      color:
        c.mode === "dark"
          ? AE_COLORS.white
          : "#071426",
      textAlign: "center",
      fontSize: 15.5,
      lineHeight: 24,
      fontWeight:
        c.mode === "dark"
          ? "400"
          : "800",
    },

    signupGold: {
      color:
        c.gold || AE_COLORS.gold,
      fontWeight: "900",
      textDecorationLine:
        "underline",
    },
  });
}