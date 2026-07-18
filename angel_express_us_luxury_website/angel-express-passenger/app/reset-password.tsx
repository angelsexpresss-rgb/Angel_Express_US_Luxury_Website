import { router } from "expo-router";
import {
  useCallback,
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
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
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

type RecoveryState =
  | "checking"
  | "ready"
  | "invalid"
  | "success";

type PasswordErrors = {
  password?: string;
  confirmPassword?: string;
};

type ParsedRecoveryParameters = {
  code?: string;
  accessToken?: string;
  refreshToken?: string;
  type?: string;
  error?: string;
  errorDescription?: string;
};

const PASSWORD_MINIMUM_LENGTH = 8;

function parseParameterString(
  parameterString: string
): Record<string, string> {
  const result: Record<string, string> = {};

  if (!parameterString) {
    return result;
  }

  const cleanValue = parameterString.replace(
    /^[?#]/,
    ""
  );

  const searchParams =
    new URLSearchParams(cleanValue);

  searchParams.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

function parseRecoveryUrl(
  incomingUrl: string
): ParsedRecoveryParameters {
  const questionMarkIndex =
    incomingUrl.indexOf("?");

  const hashIndex =
    incomingUrl.indexOf("#");

  let queryString = "";
  let hashString = "";

  if (questionMarkIndex >= 0) {
    const queryEnd =
      hashIndex >= 0
        ? hashIndex
        : incomingUrl.length;

    queryString = incomingUrl.slice(
      questionMarkIndex + 1,
      queryEnd
    );
  }

  if (hashIndex >= 0) {
    hashString = incomingUrl.slice(
      hashIndex + 1
    );
  }

  const queryParameters =
    parseParameterString(queryString);

  const hashParameters =
    parseParameterString(hashString);

  const combined = {
    ...queryParameters,
    ...hashParameters,
  };

  return {
    code: combined.code,

    accessToken:
      combined.access_token,

    refreshToken:
      combined.refresh_token,

    type: combined.type,

    error: combined.error,

    errorDescription:
      combined.error_description,
  };
}

function getPasswordStrength(
  password: string
) {
  let score = 0;

  if (
    password.length >=
    PASSWORD_MINIMUM_LENGTH
  ) {
    score += 1;
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

  if (score <= 2) {
    return {
      label: "Weak",
      score,
    };
  }

  if (score <= 4) {
    return {
      label: "Good",
      score,
    };
  }

  return {
    label: "Strong",
    score,
  };
}

function getReadableRecoveryError(
  error: unknown
) {
  if (
    !error ||
    typeof error !== "object"
  ) {
    return "The password-recovery link could not be verified.";
  }

  const recoveryError = error as {
    message?: string;
    status?: number;
    code?: string;
  };

  const message =
    recoveryError.message?.toLowerCase() ??
    "";

  if (
    message.includes("expired") ||
    message.includes("otp expired")
  ) {
    return "This password-reset link has expired. Request a new reset email.";
  }

  if (
    message.includes("invalid") ||
    message.includes("token")
  ) {
    return "This password-reset link is invalid or has already been used.";
  }

  if (
    message.includes("network") ||
    message.includes("fetch")
  ) {
    return "A network problem prevented verification. Check your connection and try again.";
  }

  if (
    recoveryError.status === 429 ||
    message.includes("rate limit")
  ) {
    return "Too many attempts were made. Wait a few minutes and try again.";
  }

  return (
    recoveryError.message ||
    "The password-recovery link could not be verified."
  );
}

function getReadablePasswordError(
  error: unknown
) {
  if (
    !error ||
    typeof error !== "object"
  ) {
    return "Your password could not be updated.";
  }

  const passwordError = error as {
    message?: string;
    status?: number;
  };

  const message =
    passwordError.message?.toLowerCase() ??
    "";

  if (
    message.includes(
      "new password should be different"
    ) ||
    message.includes(
      "different from the old password"
    )
  ) {
    return "Your new password must be different from your previous password.";
  }

  if (
    message.includes("weak password") ||
    message.includes(
      "password should be at least"
    )
  ) {
    return "Choose a stronger password that meets all requirements.";
  }

  if (
    message.includes("session") ||
    message.includes("jwt") ||
    message.includes("expired")
  ) {
    return "Your recovery session has expired. Request a new password-reset email.";
  }

  if (
    message.includes("network") ||
    message.includes("fetch")
  ) {
    return "A network problem prevented the update. Check your connection and try again.";
  }

  return (
    passwordError.message ||
    "Your password could not be updated."
  );
}

export default function ResetPasswordScreen() {
  const {
    colors,
    themeMode,
    toggleTheme,
  } = useAngelTheme();

  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  const linkingUrl =
    Linking.useLinkingURL();

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [
    recoveryState,
    setRecoveryState,
  ] =
    useState<RecoveryState>("checking");

  const [
    recoveryMessage,
    setRecoveryMessage,
  ] = useState(
    "Verifying your secure recovery link..."
  );

  const [
    fieldErrors,
    setFieldErrors,
  ] =
    useState<PasswordErrors>({});

  const hasProcessedUrl =
    useRef(false);

  const logoFade =
    useRef(new Animated.Value(0)).current;

  const titleFade =
    useRef(new Animated.Value(0)).current;

  const cardFade =
    useRef(new Animated.Value(0)).current;

  const bgScale =
    useRef(new Animated.Value(1)).current;

  const passwordStrength =
    useMemo(
      () =>
        getPasswordStrength(password),
      [password]
    );

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

  const establishRecoverySession =
    useCallback(
      async (
        incomingUrl:
          | string
          | null
          | undefined
      ) => {
        if (
          hasProcessedUrl.current
        ) {
          return;
        }

        hasProcessedUrl.current =
          true;

        setRecoveryState("checking");
        setRecoveryMessage(
          "Verifying your secure recovery link..."
        );

        try {
          /*
           * A session might already exist when Supabase
           * or Expo Router handled the recovery redirect.
           */
          const {
            data: existingSessionData,
            error:
              existingSessionError,
          } =
            await supabase.auth.getSession();

          if (existingSessionError) {
            console.warn(
              "Existing session check failed:",
              existingSessionError
            );
          }

          if (
            existingSessionData.session
          ) {
            setRecoveryState("ready");
            setRecoveryMessage("");
            return;
          }

          if (!incomingUrl) {
            throw new Error(
              "No password-recovery information was found. Open this screen from the reset link in your email."
            );
          }

          const parameters =
            parseRecoveryUrl(
              incomingUrl
            );

          if (
            parameters.error ||
            parameters.errorDescription
          ) {
            throw new Error(
              parameters.errorDescription ||
                parameters.error ||
                "The recovery link was rejected."
            );
          }

          /*
           * Current PKCE-style Supabase links normally
           * include a one-time authorization code.
           */
          if (parameters.code) {
            const {
              data,
              error,
            } =
              await supabase.auth.exchangeCodeForSession(
                parameters.code
              );

            if (error) {
              throw error;
            }

            if (!data.session) {
              throw new Error(
                "The recovery session could not be created."
              );
            }

            setRecoveryState("ready");
            setRecoveryMessage("");
            return;
          }

          /*
           * Implicit/mobile recovery links may return
           * access_token and refresh_token in the URL hash.
           */
          if (
            parameters.accessToken &&
            parameters.refreshToken
          ) {
            const {
              data,
              error,
            } =
              await supabase.auth.setSession(
                {
                  access_token:
                    parameters.accessToken,

                  refresh_token:
                    parameters.refreshToken,
                }
              );

            if (error) {
              throw error;
            }

            if (!data.session) {
              throw new Error(
                "The recovery session could not be created."
              );
            }

            setRecoveryState("ready");
            setRecoveryMessage("");
            return;
          }

          throw new Error(
            "This link does not contain valid password-recovery information."
          );
        } catch (error) {
          console.error(
            "Recovery verification error:",
            error
          );

          setRecoveryState("invalid");
          setRecoveryMessage(
            getReadableRecoveryError(
              error
            )
          );
        }
      },
      []
    );

  useEffect(() => {
    async function initializeRecovery() {
      let incomingUrl =
        linkingUrl;

      if (!incomingUrl) {
        incomingUrl =
          await Linking.getInitialURL();
      }

      await establishRecoverySession(
        incomingUrl
      );
    }

    void initializeRecovery();
  }, [
    establishRecoverySession,
    linkingUrl,
  ]);

  function clearFieldError(
    field: keyof PasswordErrors
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

  function validatePasswordForm() {
    const errors: PasswordErrors =
      {};

    if (!password) {
      errors.password =
        "New password is required.";
    } else if (
      password.length <
      PASSWORD_MINIMUM_LENGTH
    ) {
      errors.password =
        "Password must contain at least 8 characters.";
    } else if (
      !/[A-Z]/.test(password)
    ) {
      errors.password =
        "Add at least one uppercase letter.";
    } else if (
      !/[a-z]/.test(password)
    ) {
      errors.password =
        "Add at least one lowercase letter.";
    } else if (
      !/[0-9]/.test(password)
    ) {
      errors.password =
        "Add at least one number.";
    } else if (
      !/[^A-Za-z0-9]/.test(password)
    ) {
      errors.password =
        "Add at least one special character.";
    }

    if (!confirmPassword) {
      errors.confirmPassword =
        "Confirm your new password.";
    } else if (
      confirmPassword !== password
    ) {
      errors.confirmPassword =
        "The passwords do not match.";
    }

    setFieldErrors(errors);

    return (
      Object.keys(errors).length ===
      0
    );
  }

  async function handleUpdatePassword() {
    if (
      loading ||
      recoveryState !== "ready"
    ) {
      return;
    }

    if (!validatePasswordForm()) {
      Alert.alert(
        "Check Your Password",
        "Make sure your new password meets every requirement."
      );

      return;
    }

    setLoading(true);

    try {
      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!sessionData.session) {
        throw new Error(
          "Your recovery session is no longer active. Request a new password-reset email."
        );
      }

      const {
        error: updateError,
      } =
        await supabase.auth.updateUser(
          {
            password,
          }
        );

      if (updateError) {
        throw updateError;
      }

      /*
       * End the temporary recovery session so the passenger
       * signs in normally with the new password.
       */
      const {
        error: signOutError,
      } =
        await supabase.auth.signOut({
          scope: "local",
        });

      if (signOutError) {
        console.warn(
          "Recovery session logout failed:",
          signOutError
        );
      }

      setPassword("");
      setConfirmPassword("");
      setRecoveryState("success");
      setRecoveryMessage("");
    } catch (error) {
      const message =
        getReadablePasswordError(
          error
        );

      if (
        message
          .toLowerCase()
          .includes(
            "recovery session"
          ) ||
        message
          .toLowerCase()
          .includes("expired")
      ) {
        setRecoveryState("invalid");
        setRecoveryMessage(message);
      }

      Alert.alert(
        "Password Update Failed",
        message
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestNewLink() {
    try {
      await supabase.auth.signOut({
        scope: "local",
      });
    } catch (error) {
      console.warn(
        "Session cleanup failed:",
        error
      );
    }

    router.replace(
      "/forgot-password" as any
    );
  }

  async function handleReturnToLogin() {
    try {
      await supabase.auth.signOut({
        scope: "local",
      });
    } catch (error) {
      console.warn(
        "Session cleanup failed:",
        error
      );
    }

    router.replace(
      "/login" as any
    );
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
            disabled={loading}
            activeOpacity={0.85}
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
                  New{"\n"}
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
                  Secure your Angel
                  Express passenger account
                  with a new password.
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
                  {recoveryState ===
                  "checking" ? (
                    <View
                      style={
                        styles.stateContainer
                      }
                    >
                      <View
                        style={
                          styles.stateIcon
                        }
                      >
                        <ShieldCheck
                          size={34}
                          color={
                            colors.gold ||
                            AE_COLORS.gold
                          }
                        />
                      </View>

                      <Text
                        style={
                          styles.stateTitle
                        }
                      >
                        Verifying Link
                      </Text>

                      <Text
                        style={
                          styles.stateText
                        }
                      >
                        {recoveryMessage}
                      </Text>
                    </View>
                  ) : null}

                  {recoveryState ===
                  "invalid" ? (
                    <View
                      style={
                        styles.stateContainer
                      }
                    >
                      <View
                        style={
                          styles.errorStateIcon
                        }
                      >
                        <KeyRound
                          size={34}
                          color={
                            colors.danger
                          }
                        />
                      </View>

                      <Text
                        style={
                          styles.stateTitle
                        }
                      >
                        Link Unavailable
                      </Text>

                      <Text
                        style={
                          styles.stateText
                        }
                      >
                        {recoveryMessage}
                      </Text>

                      <AngelHeroButton
                        title="Request New Reset Link"
                        onPress={() => {
                          void handleRequestNewLink();
                        }}
                        variant="gold"
                      />

                      <TouchableOpacity
                        style={
                          styles.secondaryButton
                        }
                        onPress={() => {
                          void handleReturnToLogin();
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={
                            styles.secondaryText
                          }
                        >
                          Return to Sign In
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {recoveryState ===
                  "ready" ? (
                    <>
                      <View
                        style={
                          styles.formHeader
                        }
                      >
                        <View
                          style={
                            styles.formIcon
                          }
                        >
                          <KeyRound
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
                              styles.formTitle
                            }
                          >
                            Create New
                            Password
                          </Text>

                          <Text
                            style={
                              styles.formSubtitle
                            }
                          >
                            Your recovery link
                            has been verified.
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={
                          styles.label
                        }
                      >
                        New Password
                      </Text>

                      <View
                        style={[
                          styles.passwordWrap,
                          fieldErrors.password
                            ? styles.passwordWrapError
                            : null,
                        ]}
                      >
                        <TextInput
                          style={
                            styles.passwordInput
                          }
                          placeholder="Enter new password"
                          placeholderTextColor={
                            placeholderColor
                          }
                          value={password}
                          onChangeText={(
                            value
                          ) => {
                            setPassword(
                              value
                            );

                            clearFieldError(
                              "password"
                            );

                            if (
                              fieldErrors.confirmPassword
                            ) {
                              clearFieldError(
                                "confirmPassword"
                              );
                            }
                          }}
                          secureTextEntry={
                            !showPassword
                          }
                          textContentType="newPassword"
                          autoComplete="new-password"
                          autoCapitalize="none"
                          autoCorrect={false}
                          editable={!loading}
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

                      {password.length >
                      0 ? (
                        <View
                          style={
                            styles.strengthRow
                          }
                        >
                          <Text
                            style={
                              styles.strengthLabel
                            }
                          >
                            Password strength:
                          </Text>

                          <Text
                            style={
                              passwordStrength.label ===
                              "Strong"
                                ? styles.strengthStrong
                                : passwordStrength.label ===
                                    "Good"
                                  ? styles.strengthGood
                                  : styles.strengthWeak
                            }
                          >
                            {
                              passwordStrength.label
                            }
                          </Text>
                        </View>
                      ) : null}

                      <View
                        style={
                          styles.requirementsBox
                        }
                      >
                        <Text
                          style={
                            styles.requirementsTitle
                          }
                        >
                          Password must
                          include:
                        </Text>

                        <Text
                          style={
                            styles.requirementText
                          }
                        >
                          • At least 8
                          characters
                        </Text>

                        <Text
                          style={
                            styles.requirementText
                          }
                        >
                          • One uppercase and
                          one lowercase letter
                        </Text>

                        <Text
                          style={
                            styles.requirementText
                          }
                        >
                          • One number
                        </Text>

                        <Text
                          style={
                            styles.requirementText
                          }
                        >
                          • One special
                          character
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.label
                        }
                      >
                        Confirm Password
                      </Text>

                      <View
                        style={[
                          styles.passwordWrap,
                          fieldErrors.confirmPassword
                            ? styles.passwordWrapError
                            : null,
                        ]}
                      >
                        <TextInput
                          style={
                            styles.passwordInput
                          }
                          placeholder="Re-enter new password"
                          placeholderTextColor={
                            placeholderColor
                          }
                          value={
                            confirmPassword
                          }
                          onChangeText={(
                            value
                          ) => {
                            setConfirmPassword(
                              value
                            );

                            clearFieldError(
                              "confirmPassword"
                            );
                          }}
                          secureTextEntry={
                            !showConfirmPassword
                          }
                          textContentType="newPassword"
                          autoComplete="new-password"
                          autoCapitalize="none"
                          autoCorrect={false}
                          editable={!loading}
                          returnKeyType="done"
                          onSubmitEditing={() => {
                            void handleUpdatePassword();
                          }}
                          maxLength={72}
                        />

                        <TouchableOpacity
                          style={
                            styles.eyeButton
                          }
                          onPress={() => {
                            setShowConfirmPassword(
                              (current) =>
                                !current
                            );
                          }}
                          disabled={loading}
                        >
                          {showConfirmPassword ? (
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

                      {fieldErrors.confirmPassword ? (
                        <Text
                          style={
                            styles.errorText
                          }
                        >
                          {
                            fieldErrors.confirmPassword
                          }
                        </Text>
                      ) : null}

                      <AngelHeroButton
                        title={
                          loading
                            ? "Updating Password..."
                            : "Update Password"
                        }
                        onPress={() => {
                          void handleUpdatePassword();
                        }}
                        variant="gold"
                        style={
                          loading
                            ? styles.buttonDisabled
                            : undefined
                        }
                      />
                    </>
                  ) : null}

                  {recoveryState ===
                  "success" ? (
                    <View
                      style={
                        styles.stateContainer
                      }
                    >
                      <View
                        style={
                          styles.successStateIcon
                        }
                      >
                        <CheckCircle2
                          size={36}
                          color={
                            colors.success
                          }
                        />
                      </View>

                      <Text
                        style={
                          styles.stateTitle
                        }
                      >
                        Password Updated
                      </Text>

                      <Text
                        style={
                          styles.stateText
                        }
                      >
                        Your Angel Express
                        password has been
                        changed successfully.
                        Sign in using your new
                        password.
                      </Text>

                      <AngelHeroButton
                        title="Continue to Sign In"
                        onPress={() => {
                          void handleReturnToLogin();
                        }}
                        variant="gold"
                      />
                    </View>
                  ) : null}
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
      color:
        c.gold ||
        AE_COLORS.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    content: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 32,
      paddingBottom: 42,
      justifyContent: "center",
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
      color:
        c.gold ||
        AE_COLORS.gold,
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

    formHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
    },

    formIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor:
        c.lightBorder,
      marginRight: 12,
    },

    formTitle: {
      color: c.text,
      fontSize: 16,
      fontWeight: "900",
    },

    formSubtitle: {
      color: c.muted,
      fontSize: 12.5,
      lineHeight: 18,
      marginTop: 3,
      fontWeight: "700",
    },

    label: {
      color:
        c.gold ||
        AE_COLORS.gold,
      fontSize: 13,
      fontWeight: "900",
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 8,
    },

    passwordWrap: {
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
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
    },

    passwordWrapError: {
      borderColor:
        c.danger,
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

    strengthRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
    },

    strengthLabel: {
      color: c.muted,
      fontSize: 12.5,
      fontWeight: "700",
      marginRight: 5,
    },

    strengthWeak: {
      color: c.danger,
      fontSize: 12.5,
      fontWeight: "900",
    },

    strengthGood: {
      color:
        c.gold ||
        AE_COLORS.gold,
      fontSize: 12.5,
      fontWeight: "900",
    },

    strengthStrong: {
      color: c.success,
      fontSize: 12.5,
      fontWeight: "900",
    },

    requirementsBox: {
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor:
        c.lightBorder,
      borderRadius: 14,
      padding: 14,
      marginBottom: 20,
    },

    requirementsTitle: {
      color: c.text,
      fontSize: 12.5,
      fontWeight: "900",
      marginBottom: 7,
    },

    requirementText: {
      color: c.muted,
      fontSize: 12,
      lineHeight: 19,
      fontWeight: "700",
    },

    buttonDisabled: {
      opacity: 0.65,
    },

    stateContainer: {
      alignItems: "center",
    },

    stateIcon: {
      width: 72,
      height: 72,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor:
        c.lightBorder,
      marginBottom: 18,
    },

    errorStateIcon: {
      width: 72,
      height: 72,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor:
        c.danger,
      marginBottom: 18,
    },

    successStateIcon: {
      width: 72,
      height: 72,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor:
        c.success,
      marginBottom: 18,
    },

    stateTitle: {
      color: c.text,
      fontSize: 24,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 10,
    },

    stateText: {
      color: c.muted,
      fontSize: 14,
      lineHeight: 22,
      textAlign: "center",
      fontWeight: "700",
      marginBottom: 22,
    },

    secondaryButton: {
      marginTop: 16,
      paddingVertical: 8,
    },

    secondaryText: {
      color:
        c.gold ||
        AE_COLORS.gold,
      fontSize: 13.5,
      fontWeight: "900",
      textDecorationLine:
        "underline",
    },
  });
}