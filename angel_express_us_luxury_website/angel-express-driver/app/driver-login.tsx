import { router } from "expo-router";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Fingerprint,
  LockKeyhole,
  ScanFace,
  ShieldCheck,
} from "lucide-react-native";

import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

import {
  useDriverTheme,
  v5Shadow,
} from "../lib/driverTheme";

import { supabase } from "../lib/supabase";

type DriverStatus =
  | "approved"
  | "pending"
  | "rejected"
  | "suspended"
  | "offline"
  | "online"
  | "on_trip"
  | string
  | null;

type DriverProfile = {
  id: string;
  status: DriverStatus;
};

type DriverDestination =
  | "/driver-dashboard"
  | "/driver-pending";

type LoginFieldErrors = {
  email?: string;
  password?: string;
};

type StoredBiometricCredentials = {
  email: string;
  password: string;
};

const DRIVER_BIOMETRIC_CREDENTIALS_KEY =
  "angel-express.driver.biometric-credentials";

const DRIVER_BIOMETRIC_ENABLED_KEY =
  "angel-express.driver.biometric-enabled";

const DRIVER_BIOMETRIC_PROMPT_KEY =
  "angel-express.driver.biometric-prompt-completed";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalizeEmail(value)
  );
}

function normalizeDriverStatus(
  status: DriverStatus
) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function getReadableLoginError(
  error: unknown
) {
  const fallback =
    "We could not sign you in. Please try again.";

  if (
    !error ||
    typeof error !== "object"
  ) {
    return fallback;
  }

  const loginError = error as {
    message?: string;
    code?: string;
    status?: number;
  };

  const message =
    loginError.message?.toLowerCase() ||
    "";

  const code =
    loginError.code?.toLowerCase() ||
    "";

  if (
    message.includes(
      "invalid login credentials"
    ) ||
    message.includes(
      "invalid credentials"
    ) ||
    message.includes(
      "email or password"
    ) ||
    code.includes(
      "invalid_credentials"
    )
  ) {
    return "The email or password you entered is incorrect.";
  }

  if (
    message.includes(
      "email not confirmed"
    ) ||
    message.includes(
      "email_not_confirmed"
    )
  ) {
    return "Your email has not been verified. Open the verification email from Angel Express before signing in.";
  }

  if (
    message.includes(
      "too many requests"
    ) ||
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

  return (
    loginError.message ||
    fallback
  );
}

export default function ChauffeurLoginScreen() {
  const {
    colors,
    themeMode,
    toggleTheme,
  } = useDriverTheme();

  const styles = useMemo(
    () =>
      createStyles(
        colors,
        themeMode
      ),
    [colors, themeMode]
  );

  const passwordInputRef =
    useRef<TextInput>(null);

  const logoFade =
    useRef(
      new Animated.Value(0)
    ).current;

  const titleFade =
    useRef(
      new Animated.Value(0)
    ).current;

  const cardFade =
    useRef(
      new Animated.Value(0)
    ).current;

  const linkFade =
    useRef(
      new Animated.Value(0)
    ).current;

  const bgScale =
    useRef(
      new Animated.Value(1)
    ).current;

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showExpectations,
    setShowExpectations,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(true);

  const [
    fieldErrors,
    setFieldErrors,
  ] =
    useState<LoginFieldErrors>({});

  const [
    biometricAvailable,
    setBiometricAvailable,
  ] = useState(false);

  const [
    biometricEnabled,
    setBiometricEnabled,
  ] = useState(false);

  const [
    biometricChecking,
    setBiometricChecking,
  ] = useState(true);

  const [
    biometricLoading,
    setBiometricLoading,
  ] = useState(false);

  const [
    biometricLabel,
    setBiometricLabel,
  ] = useState("Biometrics");

  useEffect(() => {
    const backgroundAnimation =
      Animated.loop(
        Animated.sequence([
          Animated.timing(bgScale, {
            toValue: 1.04,
            duration: 6000,
            useNativeDriver: true,
          }),

          Animated.timing(bgScale, {
            toValue: 1,
            duration: 6000,
            useNativeDriver: true,
          }),
        ])
      );

    const entranceAnimation =
      Animated.stagger(90, [
        Animated.timing(
          logoFade,
          {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }
        ),

        Animated.timing(
          titleFade,
          {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }
        ),

        Animated.timing(
          cardFade,
          {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }
        ),

        Animated.timing(
          linkFade,
          {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }
        ),
      ]);

    backgroundAnimation.start();
    entranceAnimation.start();

    void initializeBiometrics();

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

  useEffect(() => {
    let mounted = true;

    async function checkExistingSession() {
      try {
        const {
          data: { session },
          error,
        } =
          await supabase.auth.getSession();

        if (error) {
          console.warn(
            "Driver session check failed:",
            error.message
          );

          return;
        }

        if (
          !session?.user ||
          !mounted
        ) {
          return;
        }

        const destination =
          await validateDriverAccess(
            session.user.id
          );

        if (
          !mounted ||
          !destination
        ) {
          return;
        }

        router.replace(
          destination
        );
      } catch (error) {
        console.warn(
          "Unable to restore chauffeur session:",
          error
        );
      } finally {
        if (mounted) {
          setCheckingSession(
            false
          );
        }
      }
    }

    void checkExistingSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function initializeBiometrics() {
    try {
      setBiometricChecking(true);

      const secureStoreAvailable =
        await SecureStore.isAvailableAsync();

      const hasHardware =
        await LocalAuthentication.hasHardwareAsync();

      const enrolled =
        await LocalAuthentication.isEnrolledAsync();

      const supportedTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();

      const hasFace =
        supportedTypes.includes(
          LocalAuthentication
            .AuthenticationType
            .FACIAL_RECOGNITION
        );

      const hasFingerprint =
        supportedTypes.includes(
          LocalAuthentication
            .AuthenticationType
            .FINGERPRINT
        );

      const hasIris =
        supportedTypes.includes(
          LocalAuthentication
            .AuthenticationType
            .IRIS
        );

      if (hasFace) {
        setBiometricLabel(
          "Face ID"
        );
      } else if (
        hasFingerprint
      ) {
        setBiometricLabel(
          Platform.OS === "ios"
            ? "Touch ID"
            : "Fingerprint"
        );
      } else if (hasIris) {
        setBiometricLabel(
          "Iris Recognition"
        );
      } else {
        setBiometricLabel(
          "Biometrics"
        );
      }

      const storedEnabled =
        await SecureStore.getItemAsync(
          DRIVER_BIOMETRIC_ENABLED_KEY
        );

      const storedCredentials =
        await SecureStore.getItemAsync(
          DRIVER_BIOMETRIC_CREDENTIALS_KEY
        );

      const deviceSupportsBiometrics =
        secureStoreAvailable &&
        hasHardware &&
        enrolled;

      setBiometricAvailable(
        deviceSupportsBiometrics
      );

      setBiometricEnabled(
        deviceSupportsBiometrics &&
          storedEnabled === "true" &&
          Boolean(
            storedCredentials
          )
      );
    } catch (error) {
      console.warn(
        "Driver biometric initialization failed:",
        error
      );

      setBiometricAvailable(
        false
      );

      setBiometricEnabled(
        false
      );
    } finally {
      setBiometricChecking(
        false
      );
    }
  }

  async function getDriverProfile(
    userId: string
  ): Promise<DriverProfile | null> {
    const {
      data,
      error,
    } = await supabase
      .from("drivers")
      .select("id, status")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: String(data.id),
      status:
        data.status ?? "pending",
    };
  }

  async function securelySignOut() {
    try {
      await supabase.auth.signOut({
        scope: "local",
      });
    } catch (error) {
      console.warn(
        "Driver local sign-out failed:",
        error
      );
    }
  }

  async function clearBiometricCredentials() {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(
          DRIVER_BIOMETRIC_CREDENTIALS_KEY
        ),

        SecureStore.deleteItemAsync(
          DRIVER_BIOMETRIC_ENABLED_KEY
        ),
      ]);
    } catch (error) {
      console.warn(
        "Driver biometric cleanup failed:",
        error
      );
    } finally {
      setBiometricEnabled(
        false
      );
    }
  }

  async function saveBiometricCredentials(
    userEmail: string,
    userPassword: string
  ) {
    const credentials: StoredBiometricCredentials =
      {
        email:
          normalizeEmail(
            userEmail
          ),

        password:
          userPassword,
      };

    await SecureStore.setItemAsync(
      DRIVER_BIOMETRIC_CREDENTIALS_KEY,
      JSON.stringify(
        credentials
      ),
      {
        keychainAccessible:
          SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }
    );

    await SecureStore.setItemAsync(
      DRIVER_BIOMETRIC_ENABLED_KEY,
      "true",
      {
        keychainAccessible:
          SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }
    );

    setBiometricEnabled(true);
  }

  async function validateDriverAccess(
    userId: string
  ): Promise<DriverDestination | null> {
    const driver =
      await getDriverProfile(
        userId
      );

    if (!driver) {
      await securelySignOut();
      await clearBiometricCredentials();

      Alert.alert(
        "Chauffeur Profile Missing",
        "Your login exists, but no chauffeur profile was found. Please apply as a chauffeur or contact Angel Express support."
      );

      return null;
    }

    const normalizedStatus =
      normalizeDriverStatus(
        driver.status
      );

    switch (normalizedStatus) {
      case "approved":
      case "offline":
      case "online":
      case "on_trip":
        return "/driver-dashboard";

      case "pending":
        return "/driver-pending";

      case "rejected":
        await securelySignOut();
        await clearBiometricCredentials();

        Alert.alert(
          "Application Not Approved",
          "Your chauffeur application was not approved. Please contact Angel Express support if you need additional information."
        );

        return null;

      case "suspended":
        await securelySignOut();
        await clearBiometricCredentials();

        Alert.alert(
          "Account Suspended",
          "Your chauffeur account has been suspended. Please contact Angel Express Operations for assistance."
        );

        return null;

      default:
        return "/driver-pending";
    }
  }

  function clearFieldError(
    field: keyof LoginFieldErrors
  ) {
    setFieldErrors(
      (current) => {
        if (!current[field]) {
          return current;
        }

        return {
          ...current,
          [field]:
            undefined,
        };
      }
    );
  }

  function validateLogin() {
    const cleanEmail =
      normalizeEmail(email);

    const errors: LoginFieldErrors =
      {};

    if (!cleanEmail) {
      errors.email =
        "Email address is required.";
    } else if (
      !isValidEmail(
        cleanEmail
      )
    ) {
      errors.email =
        "Enter a valid email address.";
    }

    if (!password) {
      errors.password =
        "Password is required.";
    }

    setFieldErrors(errors);

    if (
      Object.keys(errors)
        .length > 0
    ) {
      return null;
    }

    return {
      cleanEmail,
      cleanPassword:
        password,
    };
  }

  function askToEnableBiometrics() {
    return new Promise<boolean>(
      (resolve) => {
        Alert.alert(
          `Enable ${biometricLabel}?`,
          `Use ${biometricLabel} to sign in to the Angel Express Driver App securely on this device.`,
          [
            {
              text: "Not Now",
              style: "cancel",
              onPress: () =>
                resolve(false),
            },
            {
              text: `Enable ${biometricLabel}`,
              onPress: () =>
                resolve(true),
            },
          ],
          {
            cancelable: false,
          }
        );
      }
    );
  }

  async function synchronizeBiometricLogin(
    loginEmail: string,
    loginPassword: string,
    usedBiometrics: boolean
  ) {
    if (
      !biometricAvailable ||
      usedBiometrics
    ) {
      return;
    }

    const alreadyEnabled =
      await SecureStore.getItemAsync(
        DRIVER_BIOMETRIC_ENABLED_KEY
      );

    if (
      alreadyEnabled === "true"
    ) {
      await saveBiometricCredentials(
        loginEmail,
        loginPassword
      );

      return;
    }

    const promptCompleted =
      await SecureStore.getItemAsync(
        DRIVER_BIOMETRIC_PROMPT_KEY
      );

    if (
      promptCompleted === "true"
    ) {
      return;
    }

    const shouldEnable =
      await askToEnableBiometrics();

    await SecureStore.setItemAsync(
      DRIVER_BIOMETRIC_PROMPT_KEY,
      "true",
      {
        keychainAccessible:
          SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }
    );

    if (!shouldEnable) {
      return;
    }

    try {
      const result =
        await LocalAuthentication.authenticateAsync(
          {
            promptMessage: `Enable ${biometricLabel} for Angel Express`,
            cancelLabel:
              "Cancel",
            fallbackLabel:
              "Use Device Passcode",
            disableDeviceFallback:
              false,
            requireConfirmation:
              true,
          }
        );

      if (!result.success) {
        Alert.alert(
          `${biometricLabel} Not Enabled`,
          `You can continue signing in with your password. ${biometricLabel} can be enabled later from Driver Account settings.`
        );

        return;
      }

      await saveBiometricCredentials(
        loginEmail,
        loginPassword
      );

      Alert.alert(
        `${biometricLabel} Enabled`,
        `You can now use ${biometricLabel} to sign in to the Angel Express Driver App on this device.`
      );
    } catch (error) {
      console.warn(
        "Driver biometric setup failed:",
        error
      );

      Alert.alert(
        `${biometricLabel} Setup Failed`,
        `Your chauffeur login was successful, but ${biometricLabel} could not be enabled.`
      );
    }
  }

  async function performLogin(
    loginEmail: string,
    loginPassword: string,
    usedBiometrics = false
  ) {
    if (loading) {
      return;
    }

    try {
      setLoading(true);

      const cleanEmail =
        normalizeEmail(
          loginEmail
        );

      const {
        data,
        error,
      } =
        await supabase.auth
          .signInWithPassword({
            email:
              cleanEmail,

            password:
              loginPassword,
          });

      if (error) {
        throw error;
      }

      const user = data.user;

      if (!user?.id) {
        await securelySignOut();

        throw new Error(
          "Your chauffeur account could not be loaded."
        );
      }

      if (
        !user.email_confirmed_at
      ) {
        await securelySignOut();

        Alert.alert(
          "Email Verification Required",
          "Verify your chauffeur email address before signing in."
        );

        return;
      }

      const destination =
        await validateDriverAccess(
          user.id
        );

      if (!destination) {
        return;
      }

      await synchronizeBiometricLogin(
        cleanEmail,
        loginPassword,
        usedBiometrics
      );

      router.replace(
        destination
      );
    } catch (error) {
      await securelySignOut();

      if (usedBiometrics) {
        await clearBiometricCredentials();
      }

      Alert.alert(
        usedBiometrics
          ? "Biometric Login Failed"
          : "Secure Login Failed",
        getReadableLoginError(
          error
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (
      loading ||
      biometricLoading ||
      checkingSession
    ) {
      return;
    }

    Keyboard.dismiss();

    const validated =
      validateLogin();

    if (!validated) {
      Alert.alert(
        "Check Your Information",
        "Enter a valid chauffeur email address and password."
      );

      return;
    }

    await performLogin(
      validated.cleanEmail,
      validated.cleanPassword,
      false
    );
  }

  async function handleBiometricLogin() {
    if (
      loading ||
      biometricLoading ||
      !biometricEnabled
    ) {
      return;
    }

    try {
      setBiometricLoading(
        true
      );

      const result =
        await LocalAuthentication.authenticateAsync(
          {
            promptMessage: `Sign in to Angel Express with ${biometricLabel}`,
            cancelLabel:
              "Cancel",
            fallbackLabel:
              "Use Device Passcode",
            disableDeviceFallback:
              false,
            requireConfirmation:
              true,
          }
        );

      if (!result.success) {
        const biometricError =
          "error" in result
            ? result.error
            : "";

        if (
          biometricError !==
            "user_cancel" &&
          biometricError !==
            "system_cancel" &&
          biometricError !==
            "app_cancel"
        ) {
          Alert.alert(
            `${biometricLabel} Unavailable`,
            "Authentication was not completed. Use your chauffeur email and password instead."
          );
        }

        return;
      }

      const storedValue =
        await SecureStore.getItemAsync(
          DRIVER_BIOMETRIC_CREDENTIALS_KEY
        );

      if (!storedValue) {
        await clearBiometricCredentials();

        Alert.alert(
          "Biometric Login Reset",
          "Your saved chauffeur login is no longer available. Sign in with your email and password to enable biometrics again."
        );

        return;
      }

      const credentials =
        JSON.parse(
          storedValue
        ) as StoredBiometricCredentials;

      if (
        !credentials.email ||
        !credentials.password
      ) {
        await clearBiometricCredentials();

        throw new Error(
          "Saved biometric credentials are incomplete."
        );
      }

      setEmail(
        credentials.email
      );

      await performLogin(
        credentials.email,
        credentials.password,
        true
      );
    } catch (error) {
      await securelySignOut();
      await clearBiometricCredentials();

      Alert.alert(
        "Biometric Login Failed",
        getReadableLoginError(
          error
        )
      );
    } finally {
      setBiometricLoading(
        false
      );
    }
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
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

  const isBusy =
    loading ||
    biometricLoading ||
    checkingSession;

  const placeholderColor =
    colors.placeholder ||
    (themeMode === "dark"
      ? "rgba(255,255,255,0.45)"
      : "rgba(7,20,38,0.45)");

  return (
    <SafeAreaView style={styles.root}>
      <Pressable
        style={styles.root}
        onPress={Keyboard.dismiss}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.bgWrap,
            {
              transform: [
                {
                  scale:
                    bgScale,
                },
              ],
            },
          ]}
        >
          <ImageBackground
            source={require(
              "../assets/images/driver-bg.png"
            )}
            style={
              styles.background
            }
            resizeMode="cover"
          />
        </Animated.View>

        <View style={styles.overlay}>
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
                styles.container
              }
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios"
                  ? "interactive"
                  : "on-drag"
              }
              contentInsetAdjustmentBehavior="automatic"
            >
              <View
                style={
                  styles.content
                }
              >
                <View
                  style={
                    styles.topRow
                  }
                >
                  <TouchableOpacity
                    style={
                      styles.topAction
                    }
                    onPress={
                      handleBack
                    }
                    activeOpacity={0.8}
                    disabled={isBusy}
                  >
                    <Text
                      style={
                        styles.backTop
                      }
                    >
                      ‹ Back
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={
                      styles.themePill
                    }
                    onPress={() => {
                      void toggleTheme();
                    }}
                    activeOpacity={0.8}
                    disabled={isBusy}
                  >
                    <Text
                      style={
                        styles.themeText
                      }
                    >
                      {themeMode ===
                      "dark"
                        ? "☀️ Light"
                        : "🌙 Dark"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Animated.View
                  style={{
                    opacity:
                      logoFade,

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
                    style={
                      styles.logo
                    }
                    resizeMode="contain"
                  />
                </Animated.View>

                <Animated.View
                  style={{
                    opacity:
                      titleFade,

                    transform: [
                      {
                        translateY:
                          titleTranslate,
                      },
                    ],
                  }}
                >
                  <View
                    style={
                      styles.kickerBox
                    }
                  >
                    <Text
                      style={
                        styles.kicker
                      }
                    >
                      ANGEL EXPRESS DRIVER APP
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.heading
                    }
                  >
                    Welcome{"\n"}
                    <Text
                      style={
                        styles.goldText
                      }
                    >
                      Back.
                    </Text>
                  </Text>

                  <Text
                    style={
                      styles.subtitle
                    }
                  >
                    Sign in to manage approved
                    trips, chauffeur operations,
                    live ride assignments, and
                    earnings.
                  </Text>
                </Animated.View>

                <Animated.View
                  style={{
                    opacity:
                      cardFade,

                    transform: [
                      {
                        translateY:
                          cardTranslate,
                      },
                    ],
                  }}
                >
                  <View
                    style={
                      styles.loginCard
                    }
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
                            colors.gold
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.securityTextWrap
                        }
                      >
                        <Text
                          style={
                            styles.securityTitle
                          }
                        >
                          Secure Chauffeur Login
                        </Text>

                        <Text
                          style={
                            styles.securitySubtitle
                          }
                        >
                          Your account, trip
                          details, and earnings are
                          protected.
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={
                        styles.formLabel
                      }
                    >
                      Email Address
                    </Text>

                    <TextInput
                      style={[
                        styles.input,
                        fieldErrors.email &&
                          styles.inputError,
                      ]}
                      placeholder="Enter chauffeur email"
                      placeholderTextColor={
                        placeholderColor
                      }
                      value={email}
                      onChangeText={(value) => {
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
                      editable={!isBusy}
                      returnKeyType="next"
                      onSubmitEditing={() =>
                        passwordInputRef.current?.focus()
                      }
                      maxLength={254}
                    />

                    {fieldErrors.email ? (
                      <Text
                        style={
                          styles.errorText
                        }
                      >
                        {
                          fieldErrors.email
                        }
                      </Text>
                    ) : null}

                    <Text
                      style={
                        styles.formLabel
                      }
                    >
                      Password
                    </Text>

                    <View
                      style={[
                        styles.passwordContainer,
                        fieldErrors.password &&
                          styles.passwordContainerError,
                      ]}
                    >
                      <TextInput
                        ref={
                          passwordInputRef
                        }
                        style={
                          styles.passwordInput
                        }
                        placeholder="Enter password"
                        placeholderTextColor={
                          placeholderColor
                        }
                        value={password}
                        onChangeText={(value) => {
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
                        editable={!isBusy}
                        returnKeyType="done"
                        onSubmitEditing={() => {
                          void handleLogin();
                        }}
                        maxLength={72}
                      />

                      <TouchableOpacity
                        style={
                          styles.passwordToggle
                        }
                        onPress={() =>
                          setShowPassword(
                            (current) =>
                              !current
                          )
                        }
                        disabled={isBusy}
                      >
                        {showPassword ? (
                          <EyeOff
                            size={22}
                            color={
                              colors.gold
                            }
                          />
                        ) : (
                          <Eye
                            size={22}
                            color={
                              colors.gold
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

                    {!biometricChecking &&
                    biometricEnabled ? (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.biometricButton,
                            isBusy &&
                              styles.disabledButton,
                          ]}
                          onPress={() => {
                            void handleBiometricLogin();
                          }}
                          disabled={isBusy}
                          activeOpacity={0.86}
                        >
                          {biometricLabel ===
                          "Face ID" ? (
                            <ScanFace
                              size={23}
                              color={
                                colors.gold
                              }
                            />
                          ) : (
                            <Fingerprint
                              size={23}
                              color={
                                colors.gold
                              }
                            />
                          )}

                          <Text
                            style={
                              styles.biometricButtonText
                            }
                          >
                            {biometricLoading
                              ? `Checking ${biometricLabel}...`
                              : `Continue with ${biometricLabel}`}
                          </Text>
                        </TouchableOpacity>

                        <View
                          style={
                            styles.orRow
                          }
                        >
                          <View
                            style={
                              styles.orLine
                            }
                          />

                          <Text
                            style={
                              styles.orText
                            }
                          >
                            OR
                          </Text>

                          <View
                            style={
                              styles.orLine
                            }
                          />
                        </View>
                      </>
                    ) : null}

                    {!biometricChecking &&
                    biometricAvailable &&
                    !biometricEnabled ? (
                      <View
                        style={
                          styles.biometricHint
                        }
                      >
                        <ShieldCheck
                          size={19}
                          color={
                            colors.gold
                          }
                        />

                        <Text
                          style={
                            styles.biometricHintText
                          }
                        >
                          Sign in with your password
                          once to activate secure{" "}
                          {biometricLabel} login on
                          this device.
                        </Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      style={[
                        styles.primaryButton,
                        isBusy &&
                          styles.disabledButton,
                      ]}
                      onPress={() => {
                        void handleLogin();
                      }}
                      disabled={isBusy}
                      activeOpacity={0.85}
                    >
                      <View
                        style={
                          styles.buttonIconBox
                        }
                      >
                        <Text
                          style={
                            styles.buttonIcon
                          }
                        >
                          A
                        </Text>
                      </View>

                      {isBusy ? (
                        <View
                          style={
                            styles.loadingContent
                          }
                        >
                          <ActivityIndicator
                            size="small"
                            color={
                              colors.navy
                            }
                          />

                          <Text
                            style={
                              styles.loadingText
                            }
                          >
                            {checkingSession
                              ? "Checking Account"
                              : biometricLoading
                                ? `Checking ${biometricLabel}`
                                : "Signing In"}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={
                            styles.primaryButtonText
                          }
                        >
                          Sign In
                        </Text>
                      )}

                      <Text
                        style={
                          styles.buttonArrow
                        }
                      >
                        ›
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>

                <Animated.View
                  style={{
                    opacity:
                      linkFade,

                    transform: [
                      {
                        translateY:
                          linkTranslate,
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    style={
                      styles.secondaryButton
                    }
                    onPress={() =>
                      router.push(
                        "/driver-signup"
                      )
                    }
                    disabled={isBusy}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={
                        styles.secondaryButtonText
                      }
                    >
                      Don&apos;t have a chauffeur
                      account?{" "}
                      <Text
                        style={
                          styles.secondaryGoldText
                        }
                      >
                        Apply Now
                      </Text>
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={
                      styles.expectationsHeader
                    }
                    onPress={() =>
                      setShowExpectations(
                        (current) =>
                          !current
                      )
                    }
                    activeOpacity={0.85}
                    disabled={isBusy}
                  >
                    <View
                      style={
                        styles.expectationsHeaderText
                      }
                    >
                      <Text
                        style={
                          styles.expectationsEyebrow
                        }
                      >
                        OUR STANDARDS & COMMITMENT
                      </Text>

                      <Text
                        style={
                          styles.expectationsTitle
                        }
                      >
                        Chauffeur Expectations
                      </Text>
                    </View>

                    {showExpectations ? (
                      <ChevronUp
                        size={26}
                        color={
                          colors.gold
                        }
                      />
                    ) : (
                      <ChevronDown
                        size={26}
                        color={
                          colors.gold
                        }
                      />
                    )}
                  </TouchableOpacity>

                  {showExpectations ? (
                    <View
                      style={
                        styles.expectationsBody
                      }
                    >
                      <Text
                        style={
                          styles.expectationsIntro
                        }
                      >
                        Angel Express chauffeurs
                        represent a premium mobility
                        brand. Every ride should
                        reflect professionalism,
                        safety, care, and respect.
                      </Text>

                      <ExpectationRow
                        text="Arrive on time and communicate clearly with passengers."
                        styles={styles}
                        colors={colors}
                      />

                      <ExpectationRow
                        text="Keep your vehicle clean, fresh, safe, and ride-ready."
                        styles={styles}
                        colors={colors}
                      />

                      <ExpectationRow
                        text="Drive calmly and follow all traffic and safety requirements."
                        styles={styles}
                        colors={colors}
                      />

                      <ExpectationRow
                        text="Respect passenger privacy, comfort, music, and conversation preferences."
                        styles={styles}
                        colors={colors}
                      />

                      <ExpectationRow
                        text="Use the Driver App for trip status updates and approved GPS tracking."
                        styles={styles}
                        colors={colors}
                      />

                      <ExpectationRow
                        text="Report emergencies, delays, route issues, and passenger concerns promptly."
                        styles={styles}
                        colors={colors}
                      />

                      <View
                        style={
                          styles.commitmentBox
                        }
                      >
                        <Text
                          style={
                            styles.commitmentTitle
                          }
                        >
                          Angel Express Commitment
                        </Text>

                        <Text
                          style={
                            styles.commitmentText
                          }
                        >
                          Comfort • Reliability •
                          Security • Cleanliness
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  <Text
                    style={
                      styles.footer
                    }
                  >
                    Angel Express • Excellence In
                    Every Ride
                  </Text>
                </Animated.View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

function ExpectationRow({
  text,
  styles,
  colors,
}: {
  text: string;
  styles: ReturnType<
    typeof createStyles
  >;
  colors: any;
}) {
  return (
    <View
      style={
        styles.expectationRow
      }
    >
      <View
        style={
          styles.expectationCheck
        }
      >
        <Check
          size={14}
          strokeWidth={3}
          color={colors.gold}
        />
      </View>

      <Text
        style={
          styles.expectationText
        }
      >
        {text}
      </Text>
    </View>
  );
}

function createStyles(
  colors: any,
  themeMode: string
) {
  const isDarkMode =
    themeMode === "dark";

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor:
        colors.bg,
      overflow: "hidden",
    },

    keyboardView: {
      flex: 1,
    },

    bgWrap: {
      ...StyleSheet.absoluteFillObject,
    },

    background: {
      flex: 1,
      width: "100%",
      height: "100%",
    },

    overlay: {
      flex: 1,
      backgroundColor:
        colors.overlay,
    },

    container: {
      flexGrow: 1,
      justifyContent:
        "center",
      paddingHorizontal: 22,
      paddingTop: 24,
      paddingBottom: 46,
    },

    content: {
      width: "100%",
      maxWidth: 620,
      alignSelf: "center",
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 10,
    },

    topAction: {
      minHeight: 44,
      justifyContent:
        "center",
      paddingRight: 14,
    },

    backTop: {
      color: colors.gold,
      fontSize: 18,
      fontWeight: "900",
    },

    themePill: {
      minHeight: 42,
      justifyContent:
        "center",
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.card,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },

    themeText: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    logo: {
      width: "100%",
      height: 132,
      marginBottom: 6,
    },

    kickerBox: {
      alignSelf:
        "flex-start",
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.soft ||
        colors.card,
      borderRadius: 999,
      paddingVertical: 9,
      paddingHorizontal: 15,
      marginBottom: 18,
    },

    kicker: {
      color: colors.gold,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.5,
    },

    heading: {
      color: colors.text,
      fontSize: 46,
      fontWeight: "900",
      letterSpacing: -1.3,
      lineHeight: 49,
      marginBottom: 14,
    },

    goldText: {
      color: colors.gold,
    },

    subtitle: {
      color: colors.text2,
      fontSize: 15.5,
      lineHeight: 24,
      marginBottom: 24,
      fontWeight:
        isDarkMode
          ? "500"
          : "800",
    },

    loginCard: {
      backgroundColor:
        colors.card,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 30,
      padding: 20,
      marginBottom: 20,
      ...v5Shadow(colors),
    },

    securityHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 22,
      paddingBottom: 18,
      borderBottomWidth: 1,
      borderBottomColor:
        colors.border,
    },

    securityIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        colors.soft ||
        colors.input,
      borderWidth: 1,
      borderColor:
        colors.border,
      marginRight: 12,
    },

    securityTextWrap: {
      flex: 1,
    },

    securityTitle: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "900",
    },

    securitySubtitle: {
      color: colors.text2,
      fontSize: 12.5,
      lineHeight: 18,
      marginTop: 2,
      fontWeight: "700",
    },

    formLabel: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.2,
      textTransform:
        "uppercase",
      marginBottom: 8,
    },

    input: {
      minHeight: 56,
      backgroundColor:
        colors.input,
      borderWidth: 1,
      borderColor:
        colors.border,
      color:
        colors.inputText,
      borderRadius: 17,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 16,
      fontSize: 16,
      fontWeight: "700",
    },

    inputError: {
      borderColor:
        colors.danger ||
        "#E35D6A",
      borderWidth: 1.5,
      marginBottom: 6,
    },

    passwordContainer: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        colors.input,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 17,
      marginBottom: 16,
      overflow: "hidden",
    },

    passwordContainerError: {
      borderColor:
        colors.danger ||
        "#E35D6A",
      borderWidth: 1.5,
      marginBottom: 6,
    },

    passwordInput: {
      flex: 1,
      minHeight: 54,
      color:
        colors.inputText,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      fontWeight: "700",
    },

    passwordToggle: {
      width: 54,
      minHeight: 54,
      alignItems: "center",
      justifyContent:
        "center",
    },

    errorText: {
      color:
        colors.danger ||
        "#E35D6A",
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "800",
      marginBottom: 14,
    },

    biometricButton: {
      minHeight: 56,
      borderRadius: 17,
      borderWidth: 1,
      borderColor:
        colors.gold,
      backgroundColor:
        isDarkMode
          ? "rgba(212,175,55,0.10)"
          : "rgba(212,175,55,0.12)",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 16,
      paddingHorizontal: 14,
    },

    biometricButtonText: {
      color: colors.gold,
      fontSize: 15,
      fontWeight: "900",
      marginLeft: 9,
    },

    orRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },

    orLine: {
      flex: 1,
      height: 1,
      backgroundColor:
        colors.border,
    },

    orText: {
      color: colors.text2,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.2,
      marginHorizontal: 10,
    },

    biometricHint: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.soft ||
        colors.input,
      borderRadius: 14,
      padding: 12,
      marginBottom: 16,
    },

    biometricHintText: {
      flex: 1,
      color: colors.text2,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "700",
      marginLeft: 9,
    },

    primaryButton: {
      minHeight: 66,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      backgroundColor:
        colors.gold,
      borderRadius: 22,
      paddingHorizontal: 14,
      marginTop: 2,
    },

    disabledButton: {
      opacity: 0.65,
    },

    buttonIconBox: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor:
        colors.navy,
      alignItems: "center",
      justifyContent:
        "center",
    },

    buttonIcon: {
      color: colors.gold,
      fontSize: 25,
      fontWeight: "900",
    },

    primaryButtonText: {
      flex: 1,
      color: colors.navy,
      fontWeight: "900",
      fontSize: 17,
      textTransform:
        "uppercase",
      letterSpacing: 0.4,
      marginLeft: 14,
    },

    loadingContent: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 14,
    },

    loadingText: {
      color: colors.navy,
      fontSize: 12.5,
      fontWeight: "900",
      textTransform:
        "uppercase",
      letterSpacing: 0.3,
      marginLeft: 10,
    },

    buttonArrow: {
      color: colors.navy,
      fontSize: 38,
      fontWeight: "700",
    },

    secondaryButton: {
      paddingVertical: 8,
      marginBottom: 18,
    },

    secondaryButtonText: {
      color: colors.text,
      textAlign: "center",
      fontSize: 15.5,
      lineHeight: 24,
      fontWeight:
        isDarkMode
          ? "500"
          : "800",
    },

    secondaryGoldText: {
      color: colors.gold,
      fontWeight: "900",
      textDecorationLine:
        "underline",
    },

    expectationsHeader: {
      minHeight: 86,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      backgroundColor:
        colors.card,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 22,
      padding: 17,
      marginBottom: 12,
    },

    expectationsHeaderText: {
      flex: 1,
      paddingRight: 12,
    },

    expectationsEyebrow: {
      color: colors.gold,
      fontSize: 10.5,
      fontWeight: "900",
      letterSpacing: 1.4,
      marginBottom: 6,
    },

    expectationsTitle: {
      color: colors.text,
      fontSize: 18,
      lineHeight: 23,
      fontWeight: "900",
    },

    expectationsBody: {
      backgroundColor:
        colors.card2,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 22,
      padding: 17,
      marginTop: -4,
      marginBottom: 20,
    },

    expectationsIntro: {
      color: colors.text2,
      fontSize: 14,
      lineHeight: 22,
      fontWeight: "700",
      marginBottom: 16,
    },

    expectationRow: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      marginBottom: 12,
    },

    expectationCheck: {
      width: 23,
      height: 23,
      borderRadius: 12,
      alignItems: "center",
      justifyContent:
        "center",
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        isDarkMode
          ? "rgba(212,175,55,0.12)"
          : "#FFF8E8",
      marginRight: 10,
      marginTop: 1,
    },

    expectationText: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "700",
    },

    commitmentBox: {
      backgroundColor:
        isDarkMode
          ? "rgba(212,175,55,0.09)"
          : "#FFF8E8",
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 16,
      padding: 14,
      marginTop: 4,
    },

    commitmentTitle: {
      color: colors.gold,
      fontSize: 16,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 7,
    },

    commitmentText: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: "900",
      textAlign: "center",
    },

    footer: {
      color: colors.text,
      textAlign: "center",
      fontSize: 13,
      fontWeight: "700",
      opacity: 0.9,
      marginTop: 4,
    },
  });
}