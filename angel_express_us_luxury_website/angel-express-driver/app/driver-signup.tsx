import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function ChauffeurSignupScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [zelle, setZelle] = useState("");
  const [cashApp, setCashApp] = useState("");

  const [driverLicense, setDriverLicense] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [yearsDriving, setYearsDriving] = useState("");
  const [preferredRoutes, setPreferredRoutes] = useState("");

  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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
      ),
    ]).start();
  }, []);

  async function handleSignup() {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert("Missing Information", "Please complete all required fields.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Password Too Short", "Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      const cleanEmail = email.trim().toLowerCase();
      let userId = "";

      const { data: signupData, error: signupError } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

      if (signupError && signupError.message.includes("already registered")) {
        const { data: loginData, error: loginError } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

        if (loginError) {
          Alert.alert(
            "Account Already Exists",
            "This email is already registered. Please use the same password or use another email."
          );
          return;
        }

        userId = loginData.user.id;
      } else if (signupError) {
        throw signupError;
      } else if (signupData.user) {
        userId = signupData.user.id;
      }

      if (!userId) {
        Alert.alert("Error", "Unable to create or access your account.");
        return;
      }

      const { data: existingDriver } = await supabase
        .from("drivers")
        .select("id, status")
        .eq("id", userId)
        .maybeSingle();

      if (existingDriver) {
        if (existingDriver.status === "approved") {
          router.replace("/driver-dashboard");
          return;
        }

        router.replace("/driver-pending");
        return;
      }

      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const { error: insertError } = await supabase.from("drivers").insert({
        id: userId,
        full_name: fullName.trim(),
        first_name: firstName,
        last_name: lastName,
        email: cleanEmail,
        phone: phone.trim(),

        status: "pending",
        role: "driver",

        stripe_account_id: null,
        stripe_onboarding_complete: false,
        payout_status: "not_started",

        zelle: zelle.trim(),
        cash_app: cashApp.trim(),

        driver_license: driverLicense.trim(),
        vehicle_make: vehicleMake.trim(),
        vehicle_model: vehicleModel.trim(),
        vehicle_year: vehicleYear.trim(),
        plate_number: plateNumber.trim(),
        years_driving: yearsDriving.trim(),
        preferred_routes: preferredRoutes.trim(),

        rating: 5,
        total_trips: 0,
        driver_level: "Bronze",
        is_online: false,
      });

      if (insertError) throw insertError;

      Alert.alert(
        "Application Submitted",
        "Your chauffeur application has been submitted for Angel Express review."
      );

      router.replace("/driver-pending");
    } catch (err: any) {
      Alert.alert(
        "Signup Failed",
        err.message || "Unable to create chauffeur profile."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.bgWrap, { transform: [{ scale: scaleAnim }] }]}>
        <ImageBackground
          source={require("../assets/images/driver-bg.png")}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backTop}>‹ Back</Text>
            </TouchableOpacity>

            <View style={styles.kickerBox}>
              <Text style={styles.kicker}>ANGEL EXPRESS DRIVER APP</Text>
            </View>

            <Text style={styles.heading}>
              Apply As <Text style={styles.goldText}>Chauffeur.</Text>
            </Text>

            <Text style={styles.subtitle}>
              Submit your details for Angel Express review. Approval is required
              before receiving trip assignments.
            </Text>

            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Approval Required</Text>
              <Text style={styles.noticeText}>
                All chauffeurs are carefully screened and approved by Angel
                Express before receiving trip assignments.
              </Text>
            </View>

            <FormCard title="Personal Information">
              <Input label="Full Name *" value={fullName} onChangeText={setFullName} />
              <Input
                label="Email *"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label="Phone *"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <Input
                label="Password *"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </FormCard>

            <FormCard title="Stripe Payout Setup">
              <Text style={styles.helperText}>
                Angel Express uses Stripe Connect to process chauffeur payouts
                securely. After approval, you will receive a secure Stripe
                onboarding link for 70% trip payouts.
              </Text>

              <Input label="Backup Zelle Email or Phone" value={zelle} onChangeText={setZelle} />
              <Input label="Backup Cash App Tag" value={cashApp} onChangeText={setCashApp} />
            </FormCard>

            <FormCard title="Vehicle & Experience">
              <Input label="Driver License Number" value={driverLicense} onChangeText={setDriverLicense} />
              <Input label="Vehicle Make" value={vehicleMake} onChangeText={setVehicleMake} />
              <Input label="Vehicle Model" value={vehicleModel} onChangeText={setVehicleModel} />
              <Input
                label="Vehicle Year"
                value={vehicleYear}
                onChangeText={setVehicleYear}
                keyboardType="number-pad"
              />
              <Input label="Plate Number" value={plateNumber} onChangeText={setPlateNumber} />
              <Input
                label="Years of Driving Experience"
                value={yearsDriving}
                onChangeText={setYearsDriving}
                keyboardType="number-pad"
              />

              <Text style={styles.formLabel}>Preferred Routes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Dallas to Austin, airport trips, events..."
                placeholderTextColor="rgba(255,255,255,0.45)"
                multiline
                value={preferredRoutes}
                onChangeText={setPreferredRoutes}
              />
            </FormCard>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.85}
            >
              <View style={styles.buttonIconBox}>
                <Text style={styles.buttonIcon}>A</Text>
              </View>

              {loading ? (
                <ActivityIndicator color="#050b16" style={{ flex: 1 }} />
              ) : (
                <Text style={styles.primaryButtonText}>Submit Application</Text>
              )}

              <Text style={styles.buttonArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("/driver-login")}
              activeOpacity={0.85}
            >
              <View style={styles.outlineIconBox}>
                <Text style={styles.outlineIcon}>A</Text>
              </View>

              <Text style={styles.secondaryButtonText}>Already Approved? Login</Text>
              <Text style={styles.secondaryArrow}>›</Text>
            </TouchableOpacity>

            <Text style={styles.footer}>
              Angel Express • Excellence In Every Ride
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function FormCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.formCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Input(props: any) {
  const { label, ...rest } = props;

  return (
    <>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={label}
        placeholderTextColor="rgba(255,255,255,0.45)"
        {...rest}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050b16" },
  bgWrap: { ...StyleSheet.absoluteFillObject },
  background: { flex: 1, width: "100%", height: "100%" },
  overlay: { flex: 1, backgroundColor: "rgba(5,11,22,0.91)" },

  container: {
    flexGrow: 1,
    padding: 22,
    paddingTop: 58,
    paddingBottom: 46,
  },

  backTop: {
    color: "#D4AF37",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 18,
  },

  kickerBox: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 15,
    marginBottom: 18,
  },

  kicker: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  heading: {
    color: "#ffffff",
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: -1.3,
    lineHeight: 48,
    marginBottom: 14,
  },

  goldText: { color: "#D4AF37" },

  subtitle: {
    color: "#DDE3EA",
    fontSize: 15.5,
    lineHeight: 24,
    marginBottom: 18,
  },

  noticeCard: {
    backgroundColor: "rgba(212,175,55,0.09)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
  },

  noticeTitle: {
    color: "#D4AF37",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },

  noticeText: {
    color: "#DDE3EA",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
  },

  formCard: {
    backgroundColor: "rgba(13,20,34,0.9)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    borderRadius: 30,
    padding: 18,
    marginBottom: 18,
  },

  sectionTitle: {
    color: "#D4AF37",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 16,
  },

  helperText: {
    color: "#DDE3EA",
    fontSize: 14,
    lineHeight: 22,
    backgroundColor: "rgba(212,175,55,0.08)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    fontWeight: "700",
  },

  formLabel: {
    color: "#D4AF37",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "rgba(5,11,22,0.82)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    color: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    fontWeight: "700",
  },

  textArea: {
    height: 110,
    textAlignVertical: "top",
  },

  primaryButton: {
    backgroundColor: "#D4AF37",
    minHeight: 66,
    borderRadius: 22,
    paddingHorizontal: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  disabledButton: { opacity: 0.7 },

  buttonIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#050b16",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonIcon: {
    color: "#D4AF37",
    fontSize: 25,
    fontWeight: "900",
  },

  primaryButtonText: {
    flex: 1,
    color: "#050b16",
    fontWeight: "900",
    fontSize: 16,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginLeft: 14,
  },

  buttonArrow: {
    color: "#050b16",
    fontSize: 38,
    fontWeight: "700",
  },

  secondaryButton: {
    borderWidth: 1.5,
    borderColor: "#D4AF37",
    backgroundColor: "rgba(5,11,22,0.78)",
    minHeight: 66,
    borderRadius: 22,
    paddingHorizontal: 14,
    marginBottom: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  outlineIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
    backgroundColor: "rgba(212,175,55,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  outlineIcon: {
    color: "#D4AF37",
    fontSize: 25,
    fontWeight: "900",
  },

  secondaryButtonText: {
    flex: 1,
    color: "#D4AF37",
    fontWeight: "900",
    fontSize: 15,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginLeft: 14,
  },

  secondaryArrow: {
    color: "#D4AF37",
    fontSize: 38,
    fontWeight: "700",
  },

  footer: {
    color: "#ffffff",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.9,
  },
});