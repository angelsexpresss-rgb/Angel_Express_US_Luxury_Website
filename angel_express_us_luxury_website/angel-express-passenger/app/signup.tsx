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

import { supabase } from "../lib/supabase";

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  privacy?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value.trim().replace(/[^\d+]/g, "");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  return digits.length >= 10 && digits.length <= 15;
}

function getPasswordRequirements(password: string) {
  return {
    hasMinimumLength: password.length >= 8,
    hasLetter: /[A-Za-z]/.test(password),
    hasNumber: /\d/.test(password),
  };
}

function isStrongPassword(password: string) {
  const requirements =
    getPasswordRequirements(password);

  return (
    requirements.hasMinimumLength &&
    requirements.hasLetter &&
    requirements.hasNumber
  );
}

function getReadableSignupError(error: unknown) {
  const fallbackMessage =
    "We could not create your account. Please try again.";

  if (!error || typeof error !== "object") {
    return fallbackMessage;
  }

  const authError = error as {
    message?: string;
    code?: string;
    status?: number;
  };

  const message =
    authError.message?.toLowerCase() ?? "";

  const code =
    authError.code?.toLowerCase() ?? "";

  if (
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("user already registered") ||
    message.includes("duplicate") ||
    code.includes("user_already_exists")
  ) {
    return "An account already exists with this email address. Please sign in or reset your password.";
  }

  if (
    message.includes("weak password") ||
    (
      message.includes("password") &&
      (
        message.includes("least") ||
        message.includes("short") ||
        message.includes("weak")
      )
    )
  ) {
    return "Your password is too weak. Use at least 8 characters with at least one letter and one number.";
  }

  if (
    message.includes("invalid email") ||
    message.includes(
      "email address is invalid"
    )
  ) {
    return "Enter a valid email address.";
  }

  if (
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    authError.status === 429
  ) {
    return "Too many registration attempts were made. Please wait a few minutes and try again.";
  }

  if (
    message.includes("network") ||
    message.includes("fetch")
  ) {
    return "A network problem prevented registration. Check your internet connection and try again.";
  }

  if (
    message.includes("database error") ||
    message.includes("saving new user")
  ) {
    return "Your authentication account could not be completed because the passenger profile was not created. Please contact Angel Express support.";
  }

  return authError.message || fallbackMessage;
}

export default function SignupScreen() {
  const {
    colors,
    themeMode,
    toggleTheme,
  } = useAngelTheme();

  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    acceptedPrivacy,
    setAcceptedPrivacy,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState<FieldErrors>({});

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

  const passwordRequirements =
    useMemo(
      () =>
        getPasswordRequirements(
          password
        ),
      [password]
    );

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
    field: keyof FieldErrors
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

  function validateForm() {
    const errors: FieldErrors = {};

    const cleanFirstName =
      firstName.trim();

    const cleanLastName =
      lastName.trim();

    const cleanEmail =
      normalizeEmail(email);

    const cleanPhone =
      normalizePhone(phone);

    if (!cleanFirstName) {
      errors.firstName =
        "First name is required.";
    }

    if (!cleanLastName) {
      errors.lastName =
        "Last name is required.";
    }

    if (!cleanEmail) {
      errors.email =
        "Email address is required.";
    } else if (
      !isValidEmail(cleanEmail)
    ) {
      errors.email =
        "Enter a valid email address.";
    }

    if (!cleanPhone) {
      errors.phone =
        "Phone number is required.";
    } else if (
      !isValidPhone(cleanPhone)
    ) {
      errors.phone =
        "Enter a valid phone number.";
    }

    if (!password) {
      errors.password =
        "Password is required.";
    } else if (
      !isStrongPassword(password)
    ) {
      errors.password =
        "Use at least 8 characters with at least one letter and one number.";
    }

    if (!acceptedPrivacy) {
      errors.privacy =
        "You must accept the Privacy Policy and Terms.";
    }

    setFieldErrors(errors);

    if (
      Object.keys(errors).length > 0
    ) {
      Alert.alert(
        "Check Your Information",
        "Correct the highlighted fields before creating your account."
      );

      return null;
    }

    return {
      cleanFirstName,
      cleanLastName,
      cleanEmail,
      cleanPhone,
    };
  }

  async function confirmPassengerProfile(
    userId: string
  ) {
    /*
     * The Supabase database trigger should create the
     * passenger row after the authentication user is created.
     *
     * This retry gives the trigger a short period to complete.
     */
    for (
      let attempt = 0;
      attempt < 4;
      attempt += 1
    ) {
      const {
        data: passenger,
        error,
      } = await supabase
        .from("passengers")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (
        !error &&
        passenger?.id === userId
      ) {
        return true;
      }

      await new Promise<void>(
        (resolve) => {
          setTimeout(resolve, 400);
        }
      );
    }

    return false;
  }

  async function sendWelcomeEmail(
    passengerFirstName: string,
    passengerEmail: string
  ) {
    try {
      const response = await fetch(
        "https://angel-welcome-email.angelsexpresss.workers.dev",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            firstName:
              passengerFirstName,
            email: passengerEmail,
            accountType: "passenger",
          }),
        }
      );

      if (!response.ok) {
        console.warn(
          "Welcome email returned status:",
          response.status
        );
      }
    } catch (error) {
      /*
       * Welcome-email failure must not cancel an otherwise
       * successful passenger registration.
       */
      console.warn(
        "Welcome email failed:",
        error
      );
    }
  }

  async function handleSignup() {
    /*
     * Prevent repeated button taps from sending duplicate
     * registration requests.
     */
    if (loading) {
      return;
    }

    const validatedForm =
      validateForm();

    if (!validatedForm) {
      return;
    }

    setLoading(true);

    try {
      const {
        cleanFirstName,
        cleanLastName,
        cleanEmail,
        cleanPhone,
      } = validatedForm;

      /*
       * This creates one Supabase authentication identity
       * and a passenger profile through the database trigger.
       *
       * It does not create a driver record.
       * Driver registration remains a separate application.
       */
      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              first_name:
                cleanFirstName,

              last_name:
                cleanLastName,

              phone:
                cleanPhone,

              registration_source:
                "angel_express_passenger_app",
            },
          },
        });

      if (error) {
        throw error;
      }

      if (!data.user?.id) {
        throw new Error(
          "Registration completed without a valid user account. Please try again."
        );
      }

      /*
       * Supabase may return an obfuscated user for an email
       * that already exists, depending on project settings.
       *
       * An empty identities collection normally indicates that
       * the email is already registered.
       */
      if (
        Array.isArray(
          data.user.identities
        ) &&
        data.user.identities.length === 0
      ) {
        throw new Error(
          "An account already exists with this email address. Please sign in or reset your password."
        );
      }

      /*
       * When email confirmation is disabled, Supabase returns
       * an active session immediately. Verify that the passenger
       * trigger created the required passenger row.
       *
       * When confirmation is enabled, session is normally null
       * and RLS may prevent the unverified user from reading the
       * passenger record.
       */
      if (data.session) {
        const profileExists =
          await confirmPassengerProfile(
            data.user.id
          );

        if (!profileExists) {
          throw new Error(
            "Your login was created, but the required passenger profile could not be verified."
          );
        }
      }

      /*
       * The welcome email is non-blocking.
       */
      void sendWelcomeEmail(
        cleanFirstName,
        cleanEmail
      );

      /*
       * Email confirmation is enabled.
       *
       * Flow:
       * signup
       * → verification email
       * → sign in
       * → login checks incomplete profile
       * → /profile
       */
      if (!data.session) {
        Alert.alert(
          "Verify Your Email",
          `A verification link has been sent to ${cleanEmail}. Verify your email, then sign in to complete your Angel Express passenger profile.`,
          [
            {
              text: "Go to Sign In",
              onPress: () => {
                router.replace(
                  "/login" as any
                );
              },
            },
          ]
        );

        return;
      }

      /*
       * Email confirmation is disabled and Supabase returned
       * an authenticated session immediately.
       *
       * Do not send the passenger to the dashboard yet.
       * The passenger must first complete the profile.
       */
      Alert.alert(
        "Account Created",
        "Your Angel Express account was created successfully. Complete your passenger profile to continue.",
        [
          {
            text: "Complete Profile",
            onPress: () => {
              router.replace(
                "/profile" as any
              );
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Registration Unsuccessful",
        getReadableSignupError(
          error
        )
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
                  Create{"\n"}
                  <Text
                    style={styles.gold}
                  >
                    Account.
                  </Text>
                </Text>

                <Text
                  style={
                    styles.subtitle
                  }
                >
                  Join Angel Express and
                  manage your private rides
                  from one connected
                  passenger app.
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
                  <Text
                    style={styles.label}
                  >
                    First Name
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      fieldErrors.firstName
                        ? styles.inputError
                        : null,
                    ]}
                    placeholder="Enter your first name"
                    placeholderTextColor={
                      placeholderColor
                    }
                    value={firstName}
                    onChangeText={(
                      value
                    ) => {
                      setFirstName(value);

                      clearFieldError(
                        "firstName"
                      );
                    }}
                    editable={!loading}
                    autoCapitalize="words"
                    autoCorrect={false}
                    textContentType="givenName"
                    autoComplete="name-given"
                    returnKeyType="next"
                    maxLength={60}
                  />

                  {fieldErrors.firstName ? (
                    <Text
                      style={
                        styles.errorText
                      }
                    >
                      {
                        fieldErrors.firstName
                      }
                    </Text>
                  ) : null}

                  <Text
                    style={styles.label}
                  >
                    Last Name
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      fieldErrors.lastName
                        ? styles.inputError
                        : null,
                    ]}
                    placeholder="Enter your last name"
                    placeholderTextColor={
                      placeholderColor
                    }
                    value={lastName}
                    onChangeText={(
                      value
                    ) => {
                      setLastName(value);

                      clearFieldError(
                        "lastName"
                      );
                    }}
                    editable={!loading}
                    autoCapitalize="words"
                    autoCorrect={false}
                    textContentType="familyName"
                    autoComplete="name-family"
                    returnKeyType="next"
                    maxLength={60}
                  />

                  {fieldErrors.lastName ? (
                    <Text
                      style={
                        styles.errorText
                      }
                    >
                      {
                        fieldErrors.lastName
                      }
                    </Text>
                  ) : null}

                  <Text
                    style={styles.label}
                  >
                    Email Address
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      fieldErrors.email
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

                      clearFieldError(
                        "email"
                      );
                    }}
                    editable={!loading}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="emailAddress"
                    autoComplete="email"
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
                    Phone Number
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      fieldErrors.phone
                        ? styles.inputError
                        : null,
                    ]}
                    placeholder="Enter your phone number"
                    placeholderTextColor={
                      placeholderColor
                    }
                    value={phone}
                    onChangeText={(
                      value
                    ) => {
                      setPhone(value);

                      clearFieldError(
                        "phone"
                      );
                    }}
                    editable={!loading}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    returnKeyType="next"
                    maxLength={22}
                  />

                  {fieldErrors.phone ? (
                    <Text
                      style={
                        styles.errorText
                      }
                    >
                      {fieldErrors.phone}
                    </Text>
                  ) : null}

                  <Text
                    style={styles.label}
                  >
                    Password
                  </Text>

                  <View
                    style={[
                      styles.passwordInputWrapper,
                      fieldErrors.password
                        ? styles.passwordInputWrapperError
                        : null,
                    ]}
                  >
                    <TextInput
                      style={
                        styles.passwordInput
                      }
                      placeholder="Create a password"
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
                      editable={!loading}
                      secureTextEntry={
                        !showPassword
                      }
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="newPassword"
                      autoComplete="new-password"
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        void handleSignup();
                      }}
                      maxLength={72}
                    />

                    <TouchableOpacity
                      style={
                        styles.passwordToggle
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
                      <Text
                        style={
                          styles.passwordToggleText
                        }
                      >
                        {showPassword
                          ? "Hide"
                          : "Show"}
                      </Text>
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

                  <View
                    style={
                      styles.passwordRules
                    }
                  >
                    <PasswordRule
                      passed={
                        passwordRequirements
                          .hasMinimumLength
                      }
                      label="At least 8 characters"
                      styles={styles}
                    />

                    <PasswordRule
                      passed={
                        passwordRequirements
                          .hasLetter
                      }
                      label="At least one letter"
                      styles={styles}
                    />

                    <PasswordRule
                      passed={
                        passwordRequirements
                          .hasNumber
                      }
                      label="At least one number"
                      styles={styles}
                    />
                  </View>

                  <TouchableOpacity
                    style={
                      styles.privacyAgreement
                    }
                    onPress={() => {
                      if (loading) {
                        return;
                      }

                      setAcceptedPrivacy(
                        (current) =>
                          !current
                      );

                      clearFieldError(
                        "privacy"
                      );
                    }}
                    activeOpacity={0.8}
                    disabled={loading}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        acceptedPrivacy
                          ? styles.checkboxActive
                          : null,
                        fieldErrors.privacy
                          ? styles.checkboxError
                          : null,
                      ]}
                    >
                      {acceptedPrivacy ? (
                        <Text
                          style={
                            styles.checkboxMark
                          }
                        >
                          ✓
                        </Text>
                      ) : null}
                    </View>

                    <Text
                      style={
                        styles.privacyText
                      }
                    >
                      I agree to the{" "}
                      <Text
                        style={
                          styles.privacyLink
                        }
                        onPress={() => {
                          if (!loading) {
                            router.push(
                              "/privacy" as any
                            );
                          }
                        }}
                      >
                        Angel Express Privacy
                        Policy
                      </Text>{" "}
                      and{" "}
                      <Text
                        style={
                          styles.privacyLink
                        }
                        onPress={() => {
                          if (!loading) {
                            router.push(
                              "/terms" as any
                            );
                          }
                        }}
                      >
                        Terms of Service
                      </Text>
                      .
                    </Text>
                  </TouchableOpacity>

                  {fieldErrors.privacy ? (
                    <Text
                      style={[
                        styles.errorText,
                        styles.privacyErrorText,
                      ]}
                    >
                      {
                        fieldErrors.privacy
                      }
                    </Text>
                  ) : null}

                  <View
                    pointerEvents={
                      loading
                        ? "none"
                        : "auto"
                    }
                  >
                    <AngelHeroButton
                      title={
                        loading
                          ? "Creating Account..."
                          : "Create Account"
                      }
                      onPress={() => {
                        void handleSignup();
                      }}
                      variant="gold"
                      style={
                        loading
                          ? styles.buttonDisabled
                          : undefined
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.roleNotice
                    }
                  >
                    This registration creates
                    your Angel Express
                    passenger profile only.
                    Becoming a driver requires
                    a separate application,
                    document review, and
                    approval by Angel Express.
                    
                  </Text>
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
                        "/login" as any
                      );
                    }
                  }}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  <Text
                    style={
                      styles.loginText
                    }
                  >
                    Already have an
                    account?{" "}
                    <Text
                      style={
                        styles.loginGold
                      }
                    >
                      Sign In
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

function PasswordRule({
  passed,
  label,
  styles,
}: {
  passed: boolean;
  label: string;
  styles: ReturnType<
    typeof createStyles
  >;
}) {
  return (
    <View
      style={
        styles.passwordRuleRow
      }
    >
      <Text
        style={[
          styles.passwordRuleIcon,
          passed
            ? styles.passwordRuleIconPassed
            : null,
        ]}
      >
        {passed ? "✓" : "•"}
      </Text>

      <Text
        style={[
          styles.passwordRuleText,
          passed
            ? styles.passwordRuleTextPassed
            : null,
        ]}
      >
        {label}
      </Text>
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
          : "rgba(255,255,255,0.62)",
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
          ? "rgba(7,20,38,0.86)"
          : "rgba(255,255,255,0.88)",
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
      paddingBottom: 42,
    },

    backButton: {
      alignSelf: "flex-start",
      marginBottom: 12,
    },

    backText: {
      color: c.gold,
      fontSize: 18,
      fontWeight: "900",
    },

    logo: {
      width: "100%",
      height: 125,
      marginBottom: 4,
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
      color: c.gold,
    },

    subtitle: {
      color:
        c.mode === "dark"
          ? "#DCE5EE"
          : "#071426",
      fontSize: 16,
      lineHeight: 25,
      marginBottom: 22,
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
          : "rgba(255,255,255,0.91)",
      borderColor:
        c.mode === "dark"
          ? "rgba(212,175,55,0.20)"
          : "rgba(7,20,38,0.12)",
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

    passwordInputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        c.mode === "dark"
          ? "rgba(255,255,255,0.07)"
          : "rgba(255,255,255,0.94)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        c.mode === "dark"
          ? "rgba(255,255,255,0.12)"
          : "rgba(7,20,38,0.15)",
      marginBottom: 18,
    },

    passwordInputWrapperError: {
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
      paddingVertical: 17,
      paddingLeft: 17,
      paddingRight: 8,
      fontSize: 16,
    },

    passwordToggle: {
      paddingHorizontal: 15,
      paddingVertical: 17,
    },

    passwordToggleText: {
      color: c.gold,
      fontSize: 13,
      fontWeight: "900",
    },

    errorText: {
      color: c.danger,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "800",
      marginBottom: 14,
    },

    passwordRules: {
      backgroundColor: c.soft,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.lightBorder,
      paddingHorizontal: 13,
      paddingVertical: 11,
      marginTop: -6,
      marginBottom: 18,
    },

    passwordRuleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 2,
    },

    passwordRuleIcon: {
      color: c.muted,
      width: 22,
      fontSize: 15,
      fontWeight: "900",
    },

    passwordRuleIconPassed: {
      color: c.success,
    },

    passwordRuleText: {
      color: c.muted,
      fontSize: 12.5,
      fontWeight: "700",
    },

    passwordRuleTextPassed: {
      color: c.success,
    },

    privacyAgreement: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 10,
    },

    checkbox: {
      width: 23,
      height: 23,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
      marginTop: 1,
    },

    checkboxActive: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },

    checkboxError: {
      borderColor: c.danger,
    },

    checkboxMark: {
      color:
        c.mode === "dark"
          ? "#07111F"
          : "#FFFFFF",
      fontSize: 15,
      fontWeight: "900",
    },

    privacyText: {
      flex: 1,
      color: c.muted,
      fontSize: 13.5,
      lineHeight: 20,
      fontWeight: "700",
    },

    privacyLink: {
      color: c.gold,
      fontWeight: "900",
      textDecorationLine: "underline",
    },

    privacyErrorText: {
      marginLeft: 34,
      marginBottom: 16,
    },

    buttonDisabled: {
      opacity: 0.62,
    },

    roleNotice: {
      color: c.muted,
      fontSize: 12.5,
      lineHeight: 19,
      fontWeight: "700",
      textAlign: "center",
      marginTop: 16,
    },

    loginText: {
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

    loginGold: {
      color: c.gold,
      fontWeight: "900",
      textDecorationLine:
        "underline",
    },
  });
}