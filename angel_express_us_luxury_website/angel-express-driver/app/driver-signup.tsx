import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { router } from "expo-router";

import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Platform,
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
} from "lucide-react-native";

import { supabase } from "../lib/supabase";

import {
  useDriverTheme,
  v5Shadow,
} from "../lib/driverTheme";

const DRIVER_TERMS_URL =
  "https://angelexpressus.com/terms.html";

type FormCardProps = {
  title: string;
  children: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
};

type InputProps = React.ComponentProps<
  typeof TextInput
> & {
  label: string;
  styles: ReturnType<typeof createStyles>;
  colors: any;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalizeEmail(value)
  );
}

function normalizeDriverStatus(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export default function ChauffeurSignupScreen() {
  const {
    colors,
    themeMode,
    toggleTheme,
  } = useDriverTheme();

  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  const confirmPasswordRef =
    useRef<TextInput>(null);

  const fadeAnim =
    useRef(new Animated.Value(0)).current;

  const slideAnim =
    useRef(new Animated.Value(28)).current;

  const scaleAnim =
    useRef(new Animated.Value(1)).current;

  const [showBenefits, setShowBenefits] =
    useState(false);

  const [showWhyJoin, setShowWhyJoin] =
    useState(false);

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

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

  const [zelle, setZelle] =
    useState("");

  const [cashApp, setCashApp] =
    useState("");

  const [
    driverLicense,
    setDriverLicense,
  ] = useState("");

  const [
    vehicleMake,
    setVehicleMake,
  ] = useState("");

  const [
    vehicleModel,
    setVehicleModel,
  ] = useState("");

  const [
    vehicleYear,
    setVehicleYear,
  ] = useState("");

  const [
    plateNumber,
    setPlateNumber,
  ] = useState("");

  const [
    yearsDriving,
    setYearsDriving,
  ] = useState("");

  const [
    preferredRoutes,
    setPreferredRoutes,
  ] = useState("");

  const [
    acceptedPolicies,
    setAcceptedPolicies,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    const entranceAnimation =
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),

        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]);

    const backgroundAnimation =
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.04,
            duration: 6000,
            useNativeDriver: true,
          }),

          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 6000,
            useNativeDriver: true,
          }),
        ])
      );

    entranceAnimation.start();
    backgroundAnimation.start();

    return () => {
      entranceAnimation.stop();
      backgroundAnimation.stop();
    };
  }, [
    fadeAnim,
    scaleAnim,
    slideAnim,
  ]);

  async function openDriverTerms() {
    try {
      const supported =
        await Linking.canOpenURL(
          DRIVER_TERMS_URL
        );

      if (!supported) {
        Alert.alert(
          "Unable to Open Terms",
          "The Angel Express Driver Terms could not be opened on this device."
        );

        return;
      }

      await Linking.openURL(
        DRIVER_TERMS_URL
      );
    } catch {
      Alert.alert(
        "Unable to Open Terms",
        "Please try again or visit the Angel Express website."
      );
    }
  }

  function openPrivacyPolicy() {
    router.push(
      "/privacy-policy"
    );
  }

  function validateForm() {
    const cleanName =
      fullName.trim();

    const cleanEmail =
      normalizeEmail(email);

    const cleanPhone =
      phone.trim();

    if (
      !cleanName ||
      !cleanEmail ||
      !cleanPhone ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert(
        "Missing Information",
        "Please complete your name, email, phone number, password, and password confirmation."
      );

      return null;
    }

    if (
      cleanName.split(/\s+/).length < 2
    ) {
      Alert.alert(
        "Full Name Required",
        "Please enter your first and last name."
      );

      return null;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert(
        "Invalid Email",
        "Please enter a valid email address."
      );

      return null;
    }

    if (cleanPhone.length < 7) {
      Alert.alert(
        "Invalid Phone Number",
        "Please enter a valid phone number."
      );

      return null;
    }

    if (password.length < 8) {
      Alert.alert(
        "Password Too Short",
        "Your password must contain at least 8 characters."
      );

      return null;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords Do Not Match",
        "The password and confirmation password must match."
      );

      return null;
    }

    if (!acceptedPolicies) {
      Alert.alert(
        "Agreement Required",
        "You must accept the Angel Express Driver Terms of Service and Privacy Policy before submitting your application."
      );

      return null;
    }

    return {
      cleanName,
      cleanEmail,
      cleanPhone,
    };
  }

  async function recordConsentMetadata(
    userId: string
  ) {
    const acceptedAt =
      new Date().toISOString();

    const {
      data: {
        user: currentUser,
      },
    } =
      await supabase.auth.getUser();

    if (
      !currentUser ||
      currentUser.id !== userId
    ) {
      return;
    }

    const existingDriverSettings =
      currentUser.user_metadata
        ?.driver_settings || {};

    const { error } =
      await supabase.auth.updateUser({
        data: {
          driver_settings: {
            ...existingDriverSettings,
            termsAccepted: true,
            privacyAccepted: true,
            termsAcceptedAt:
              acceptedAt,
            privacyAcceptedAt:
              acceptedAt,
            termsVersion:
              "angel-express-driver-v1",
            privacyVersion:
              "angel-express-privacy-v1",
          },
        },
      });

    if (error) {
      throw error;
    }
  }

  async function handleExistingDriver(
    userId: string
  ) {
    const {
      data: existingDriver,
      error,
    } = await supabase
      .from("drivers")
      .select("id, status")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!existingDriver) {
      return false;
    }

    const status =
      normalizeDriverStatus(
        existingDriver.status
      );

    if (
      status === "approved" ||
      status === "online" ||
      status === "offline" ||
      status === "on_trip"
    ) {
      router.replace(
        "/driver-dashboard"
      );

      return true;
    }

    if (status === "rejected") {
      Alert.alert(
        "Application Not Approved",
        "A chauffeur application already exists for this account and was not approved. Please contact Angel Express Operations."
      );

      return true;
    }

    if (status === "suspended") {
      Alert.alert(
        "Account Suspended",
        "This chauffeur account is currently suspended. Please contact Angel Express Operations."
      );

      return true;
    }

    router.replace(
      "/driver-pending"
    );

    return true;
  }

  async function handleSignup() {
    if (loading) {
      return;
    }

    const validated =
      validateForm();

    if (!validated) {
      return;
    }

    try {
      setLoading(true);

      const {
        cleanName,
        cleanEmail,
        cleanPhone,
      } = validated;

      const acceptedAt =
        new Date().toISOString();

      let userId = "";

      const {
        data: signupData,
        error: signupError,
      } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,

          options: {
            data: {
              role: "driver",
              full_name:
                cleanName,

              driver_settings: {
                termsAccepted: true,
                privacyAccepted: true,
                termsAcceptedAt:
                  acceptedAt,
                privacyAcceptedAt:
                  acceptedAt,
                termsVersion:
                  "angel-express-driver-v1",
                privacyVersion:
                  "angel-express-privacy-v1",
              },
            },
          },
        });

      if (
        signupError &&
        signupError.message
          .toLowerCase()
          .includes(
            "already registered"
          )
      ) {
        const {
          data: loginData,
          error: loginError,
        } =
          await supabase.auth
            .signInWithPassword({
              email: cleanEmail,
              password,
            });

        if (
          loginError ||
          !loginData.user
        ) {
          Alert.alert(
            "Account Already Exists",
            "This email is already registered. Sign in using the correct password, or use another email address."
          );

          return;
        }

        userId =
          loginData.user.id;

        await recordConsentMetadata(
          userId
        );
      } else if (signupError) {
        throw signupError;
      } else if (signupData.user) {
        userId =
          signupData.user.id;
      }

      if (!userId) {
        Alert.alert(
          "Account Creation Failed",
          "Angel Express could not create or access your chauffeur account."
        );

        return;
      }

      const driverAlreadyExists =
        await handleExistingDriver(
          userId
        );

      if (driverAlreadyExists) {
        return;
      }

      const nameParts =
        cleanName.split(/\s+/);

      const firstName =
        nameParts[0] || "";

      const lastName =
        nameParts
          .slice(1)
          .join(" ");

      const { error: insertError } =
        await supabase
          .from("drivers")
          .insert({
            id: userId,
            full_name:
              cleanName,
            first_name:
              firstName,
            last_name:
              lastName,
            email:
              cleanEmail,
            phone:
              cleanPhone,
            status:
              "pending",
            role:
              "driver",
            stripe_account_id:
              null,
            stripe_onboarding_complete:
              false,
            payout_status:
              "not_started",
            zelle:
              zelle.trim(),
            cash_app:
              cashApp.trim(),
            driver_license:
              driverLicense.trim(),
            vehicle_make:
              vehicleMake.trim(),
            vehicle_model:
              vehicleModel.trim(),
            vehicle_year:
              vehicleYear.trim(),
            plate_number:
              plateNumber.trim(),
            years_driving:
              yearsDriving.trim(),
            preferred_routes:
              preferredRoutes.trim(),
            rating:
              5,
            total_trips:
              0,
            driver_level:
              "Bronze",
            is_online:
              false,
          });

      if (insertError) {
        throw insertError;
      }

      Alert.alert(
        "Application Submitted",
        "Your chauffeur application has been submitted for Angel Express review.",
        [
          {
            text: "Continue",
            onPress: () => {
              router.replace(
                "/driver-pending"
              );
            },
          },
        ],
        {
          cancelable: false,
        }
      );
    } catch (error: any) {
      Alert.alert(
        "Signup Failed",
        error?.message ||
          "Unable to create your chauffeur profile."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bgWrap,
          {
            transform: [
              {
                scale: scaleAnim,
              },
            ],
          },
        ]}
      >
        <ImageBackground
          source={require(
            "../assets/images/driver-bg.png"
          )}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
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
          >
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [
                  {
                    translateY:
                      slideAnim,
                  },
                ],
              }}
            >
              <View style={styles.topRow}>
                <TouchableOpacity
                  onPress={() =>
                    router.back()
                  }
                  disabled={loading}
                >
                  <Text style={styles.backTop}>
                    ‹ Back
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.themePill}
                  onPress={() => {
                    void toggleTheme();
                  }}
                  disabled={loading}
                >
                  <Text style={styles.themeText}>
                    {themeMode === "dark"
                      ? "☀️ Light"
                      : "🌙 Dark"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.kickerBox}>
                <Text style={styles.kicker}>
                  ANGEL EXPRESS DRIVER APP
                </Text>
              </View>

              <Text style={styles.heading}>
                Apply As{" "}
                <Text style={styles.goldText}>
                  Chauffeur.
                </Text>
              </Text>

              <Text style={styles.subtitle}>
                Learn about the opportunity,
                then submit your chauffeur and
                vehicle details for review.
              </Text>

              <Dropdown
                eyebrow="CHAUFFEUR BENEFITS"
                title="Why Become an Angel Express Chauffeur?"
                open={showBenefits}
                onPress={() =>
                  setShowBenefits(
                    (current) => !current
                  )
                }
                styles={styles}
                colors={colors}
              />

              {showBenefits ? (
                <View style={styles.dropdownBody}>
                  <Benefit
                    text="Earn up to 70% of eligible trip revenue."
                    styles={styles}
                  />

                  <Benefit
                    text="Serve premium passengers and private bookings."
                    styles={styles}
                  />

                  <Benefit
                    text="Access airport, regional, student, event, and corporate trips."
                    styles={styles}
                  />

                  <Benefit
                    text="Receive route preference matching and flexible scheduling."
                    styles={styles}
                  />

                  <Benefit
                    text="Manage assigned rides, active trips, and earnings from one Driver App."
                    styles={styles}
                  />

                  <Benefit
                    text="Receive direct operational support from Angel Express."
                    styles={styles}
                  />
                </View>
              ) : null}

              <Dropdown
                eyebrow="WHY JOIN AEM"
                title="Why Join Angel Express Mobility?"
                open={showWhyJoin}
                onPress={() =>
                  setShowWhyJoin(
                    (current) => !current
                  )
                }
                styles={styles}
                colors={colors}
              />

              {showWhyJoin ? (
                <View style={styles.dropdownBody}>
                  <Benefit
                    text="A mobility platform built around professionalism, safety, comfort, and reliability."
                    styles={styles}
                  />

                  <Benefit
                    text="Owner-managed dispatch and support for chauffeur operations."
                    styles={styles}
                  />

                  <Benefit
                    text="Demand from airport travelers, students, families, events, and private groups."
                    styles={styles}
                  />

                  <Benefit
                    text="Clear trip workflows from acceptance through passenger drop-off."
                    styles={styles}
                  />

                  <Benefit
                    text="Secure Stripe Connect payout support after approval."
                    styles={styles}
                  />
                </View>
              ) : null}

              <FormCard
                title="Personal Information"
                styles={styles}
              >
                <Input
                  label="Full Name *"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  styles={styles}
                  colors={colors}
                  editable={!loading}
                />

                <Input
                  label="Email *"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  styles={styles}
                  colors={colors}
                  editable={!loading}
                />

                <Input
                  label="Phone *"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  styles={styles}
                  colors={colors}
                  editable={!loading}
                />

                <Text style={styles.formLabel}>
                  Password *
                </Text>

                <View style={styles.passwordWrap}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Create password"
                    placeholderTextColor={
                      colors.placeholder
                    }
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={
                      !showPassword
                    }
                    autoCapitalize="none"
                    editable={!loading}
                    returnKeyType="next"
                    onSubmitEditing={() =>
                      confirmPasswordRef.current?.focus()
                    }
                  />

                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() =>
                      setShowPassword(
                        (current) =>
                          !current
                      )
                    }
                  >
                    {showPassword ? (
                      <EyeOff
                        size={22}
                        color={colors.gold}
                      />
                    ) : (
                      <Eye
                        size={22}
                        color={colors.gold}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.formLabel}>
                  Confirm Password *
                </Text>

                <View style={styles.passwordWrap}>
                  <TextInput
                    ref={confirmPasswordRef}
                    style={styles.passwordInput}
                    placeholder="Confirm password"
                    placeholderTextColor={
                      colors.placeholder
                    }
                    value={confirmPassword}
                    onChangeText={
                      setConfirmPassword
                    }
                    secureTextEntry={
                      !showConfirmPassword
                    }
                    autoCapitalize="none"
                    editable={!loading}
                  />

                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() =>
                      setShowConfirmPassword(
                        (current) =>
                          !current
                      )
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff
                        size={22}
                        color={colors.gold}
                      />
                    ) : (
                      <Eye
                        size={22}
                        color={colors.gold}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.passwordRules}>
                  <Text style={styles.passwordRule}>
                    • At least 8 characters
                  </Text>

                  <Text style={styles.passwordRule}>
                    • Use a secure, unique password
                  </Text>
                </View>
              </FormCard>

              <FormCard
                title="Stripe Payout Setup"
                styles={styles}
              >
                <Text style={styles.helperText}>
                  Approved chauffeurs receive a
                  secure Stripe Connect onboarding
                  link for eligible 70% trip
                  payouts. Never enter bank details
                  directly into this application.
                </Text>

                <Input
                  label="Backup Zelle Email or Phone"
                  value={zelle}
                  onChangeText={setZelle}
                  styles={styles}
                  colors={colors}
                  editable={!loading}
                />

                <Input
                  label="Backup Cash App Tag"
                  value={cashApp}
                  onChangeText={setCashApp}
                  autoCapitalize="none"
                  styles={styles}
                  colors={colors}
                  editable={!loading}
                />
              </FormCard>

              <FormCard
                title="Vehicle & Experience"
                styles={styles}
              >
                <Input
                  label="Driver License Number"
                  value={driverLicense}
                  onChangeText={setDriverLicense}
                  autoCapitalize="characters"
                  styles={styles}
                  colors={colors}
                  editable={!loading}
                />

                <Input
                  label="Vehicle Make"
                  value={vehicleMake}
                  onChangeText={setVehicleMake}
                  autoCapitalize="words"
                  styles={styles}
                  colors={colors}
                  editable={!loading}
                />

                <Input
                  label="Vehicle Model"
                  value={vehicleModel}
                  onChangeText={setVehicleModel}
                  autoCapitalize="words"
                  styles={styles}
                  colors={colors}
                  editable={!loading}
                />

                <Input
                  label="Vehicle Year"
                  value={vehicleYear}
                  onChangeText={setVehicleYear}
                  keyboardType="number-pad"
                  maxLength={4}
                  styles={styles}
                  colors={colors}
                  editable={!loading}
                />

                <Input
                  label="Plate Number"
                  value={plateNumber}
                  onChangeText={setPlateNumber}
                  autoCapitalize="characters"
                  styles={styles}
                  colors={colors}
                  editable={!loading}
                />

                <Input
                  label="Years of Driving Experience"
                  value={yearsDriving}
                  onChangeText={setYearsDriving}
                  keyboardType="number-pad"
                  maxLength={2}
                  styles={styles}
                  colors={colors}
                  editable={!loading}
                />

                <Text style={styles.formLabel}>
                  Preferred Routes
                </Text>

                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                  ]}
                  placeholder="Dallas to Austin, airport trips, events..."
                  placeholderTextColor={
                    colors.placeholder
                  }
                  multiline
                  value={preferredRoutes}
                  onChangeText={
                    setPreferredRoutes
                  }
                  editable={!loading}
                />
              </FormCard>

              <View style={styles.consentSection}>
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    acceptedPolicies &&
                      styles.checkboxChecked,
                  ]}
                  onPress={() =>
                    setAcceptedPolicies(
                      (current) => !current
                    )
                  }
                  disabled={loading}
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked:
                      acceptedPolicies,
                  }}
                >
                  {acceptedPolicies ? (
                    <Check
                      size={16}
                      strokeWidth={3}
                      color={colors.navy}
                    />
                  ) : null}
                </TouchableOpacity>

                <Text style={styles.consentText}>
                  I agree to the{" "}
                  <Text
                    style={styles.legalLink}
                    onPress={() => {
                      void openDriverTerms();
                    }}
                  >
                    Angel Express Driver Terms
                    of Service
                  </Text>{" "}
                  and{" "}
                  <Text
                    style={styles.legalLink}
                    onPress={openPrivacyPolicy}
                  >
                    Privacy Policy
                  </Text>
                  .
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (loading ||
                    !acceptedPolicies) &&
                    styles.disabledButton,
                ]}
                onPress={() => {
                  void handleSignup();
                }}
                disabled={
                  loading ||
                  !acceptedPolicies
                }
                activeOpacity={0.85}
              >
                <View
                  style={styles.buttonIconBox}
                >
                  <Text style={styles.buttonIcon}>
                    A
                  </Text>
                </View>

                {loading ? (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator
                      color={colors.navy}
                    />

                    <Text style={styles.loadingText}>
                      Submitting
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Submit Application
                  </Text>
                )}

                <Text style={styles.buttonArrow}>
                  ›
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginLink}
                onPress={() =>
                  router.push(
                    "/driver-login"
                  )
                }
                disabled={loading}
              >
                <Text style={styles.loginLinkText}>
                  Already have a chauffeur
                  account?{" "}
                  <Text
                    style={
                      styles.loginLinkGold
                    }
                  >
                    Sign In
                  </Text>
                </Text>
              </TouchableOpacity>

              <View style={styles.noticeCard}>
                <Text style={styles.noticeTitle}>
                  Approval Required
                </Text>

                <Text style={styles.noticeText}>
                  New chauffeur applications are
                  reviewed and approved by Angel
                  Express Operations before ride
                  assignments become available.
                </Text>
              </View>

              <Text style={styles.footer}>
                Angel Express • Excellence In Every
                Ride
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

function Dropdown({
  eyebrow,
  title,
  open,
  onPress,
  styles,
  colors,
}: {
  eyebrow: string;
  title: string;
  open: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={styles.dropdownHeader}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.dropdownTextWrap}>
        <Text style={styles.dropdownEyebrow}>
          {eyebrow}
        </Text>

        <Text style={styles.dropdownTitle}>
          {title}
        </Text>
      </View>

      {open ? (
        <ChevronUp
          size={27}
          color={colors.gold}
        />
      ) : (
        <ChevronDown
          size={27}
          color={colors.gold}
        />
      )}
    </TouchableOpacity>
  );
}

function Benefit({
  text,
  styles,
}: {
  text: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.checkCircle}>
        <Text style={styles.checkText}>
          ✓
        </Text>
      </View>

      <Text style={styles.benefitText}>
        {text}
      </Text>
    </View>
  );
}

function FormCard({
  title,
  children,
  styles,
}: FormCardProps) {
  return (
    <View style={styles.formCard}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      {children}
    </View>
  );
}

function Input({
  label,
  styles,
  colors,
  ...rest
}: InputProps) {
  return (
    <>
      <Text style={styles.formLabel}>
        {label}
      </Text>

      <TextInput
        style={styles.input}
        placeholder={label}
        placeholderTextColor={
          colors.placeholder
        }
        {...rest}
      />
    </>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
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
      backgroundColor: colors.overlay,
    },

    container: {
      flexGrow: 1,
      paddingHorizontal: 22,
      paddingTop: 58,
      paddingBottom: 46,
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },

    backTop: {
      color: colors.gold,
      fontSize: 18,
      fontWeight: "900",
    },

    themePill: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 13,
    },

    themeText: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    kickerBox: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(255,255,255,0.07)"
          : colors.card,
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
      fontSize: 42,
      fontWeight: "900",
      letterSpacing: -1.3,
      lineHeight: 48,
      marginBottom: 14,
    },

    goldText: {
      color: colors.gold,
    },

    subtitle: {
      color: colors.text2,
      fontSize: 15.5,
      lineHeight: 24,
      fontWeight: "700",
      marginBottom: 20,
    },

    dropdownHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 17,
      marginBottom: 12,
    },

    dropdownTextWrap: {
      flex: 1,
      paddingRight: 12,
    },

    dropdownEyebrow: {
      color: colors.gold,
      fontSize: 10.5,
      fontWeight: "900",
      letterSpacing: 1.4,
      marginBottom: 6,
    },

    dropdownTitle: {
      color: colors.text,
      fontSize: 17,
      lineHeight: 23,
      fontWeight: "900",
    },

    dropdownBody: {
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 17,
      marginTop: -4,
      marginBottom: 16,
    },

    benefitRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 12,
    },

    checkCircle: {
      width: 23,
      height: 23,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(212,175,55,0.12)"
          : "#FFF8E8",
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 10,
      marginTop: 1,
    },

    checkText: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    benefitText: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "700",
    },

    formCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 28,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(colors),
    },

    sectionTitle: {
      color: colors.gold,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 16,
    },

    helperText: {
      color: colors.text2,
      fontSize: 14,
      lineHeight: 22,
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(212,175,55,0.08)"
          : "#FFF8E8",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      marginBottom: 16,
      fontWeight: "700",
    },

    formLabel: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 8,
    },

    input: {
      minHeight: 56,
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.inputText,
      borderRadius: 17,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 16,
      fontSize: 16,
      fontWeight: "700",
    },

    textArea: {
      height: 110,
      textAlignVertical: "top",
    },

    passwordWrap: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 17,
      marginBottom: 16,
      overflow: "hidden",
    },

    passwordInput: {
      flex: 1,
      minHeight: 56,
      color: colors.inputText,
      paddingHorizontal: 16,
      fontSize: 16,
      fontWeight: "700",
    },

    eyeButton: {
      width: 54,
      minHeight: 56,
      alignItems: "center",
      justifyContent: "center",
    },

    passwordRules: {
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 15,
      padding: 13,
    },

    passwordRule: {
      color: colors.text2,
      fontSize: 12.5,
      lineHeight: 20,
      fontWeight: "700",
    },

    consentSection: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: 3,
      marginTop: 1,
      marginBottom: 18,
    },

    checkbox: {
      width: 28,
      height: 28,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.gold,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
      marginTop: 1,
    },

    checkboxChecked: {
      backgroundColor: colors.gold,
    },

    consentText: {
      flex: 1,
      color: colors.text,
      fontSize: 13.5,
      lineHeight: 21,
      fontWeight: "700",
    },

    legalLink: {
      color: colors.gold,
      fontWeight: "900",
      textDecorationLine: "underline",
    },

    primaryButton: {
      minHeight: 66,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.gold,
      borderRadius: 22,
      paddingHorizontal: 14,
      marginBottom: 14,
    },

    disabledButton: {
      opacity: 0.48,
    },

    buttonIconBox: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: colors.navy,
      alignItems: "center",
      justifyContent: "center",
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
      fontSize: 16,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginLeft: 14,
    },

    loadingWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 14,
    },

    loadingText: {
      color: colors.navy,
      fontSize: 13,
      fontWeight: "900",
      textTransform: "uppercase",
      marginLeft: 10,
    },

    buttonArrow: {
      color: colors.navy,
      fontSize: 38,
      fontWeight: "700",
    },

    loginLink: {
      paddingVertical: 7,
      marginBottom: 18,
    },

    loginLinkText: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      fontWeight: "700",
    },

    loginLinkGold: {
      color: colors.gold,
      fontWeight: "900",
      textDecorationLine: "underline",
    },

    noticeCard: {
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(212,175,55,0.09)"
          : "#FFF8E8",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 18,
      marginBottom: 20,
    },

    noticeTitle: {
      color: colors.gold,
      fontSize: 18,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 8,
    },

    noticeText: {
      color: colors.text2,
      fontSize: 14,
      lineHeight: 22,
      textAlign: "center",
      fontWeight: "700",
    },

    footer: {
      color: colors.text,
      textAlign: "center",
      fontSize: 13,
      fontWeight: "700",
      opacity: 0.9,
    },
  });
}