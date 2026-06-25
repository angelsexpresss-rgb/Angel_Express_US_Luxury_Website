import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

      const { data: signupData, error: signupError } = await supabase.auth.signUp({
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
            "This email is already registered. Please use the same password you use for your passenger account, or use another email."
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
        "Your chauffeur application has been submitted. After approval, Angel Express will send you a secure Stripe onboarding link for payouts."
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
    <ImageBackground
      source={require("../assets/images/driver-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Apply as a Chauffeur</Text>

          <Text style={styles.subtitle}>
            Submit your information for Angel Express approval.
          </Text>

          <Text style={styles.sectionTitle}>Personal Information</Text>

          <TextInput
            style={styles.input}
            placeholder="Full Name *"
            placeholderTextColor="#94a3b8"
            value={fullName}
            onChangeText={setFullName}
          />

          <TextInput
            style={styles.input}
            placeholder="Email *"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Phone *"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <TextInput
            style={styles.input}
            placeholder="Password *"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.sectionTitle}>Stripe Payout Setup</Text>

          <Text style={styles.helperText}>
            Angel Express uses Stripe Connect to process chauffeur payouts
            securely. After approval, you will receive a secure Stripe onboarding
            link to connect your payout account for 70% trip payouts.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Backup Zelle Email or Phone"
            placeholderTextColor="#94a3b8"
            value={zelle}
            onChangeText={setZelle}
          />

          <TextInput
            style={styles.input}
            placeholder="Backup Cash App Tag"
            placeholderTextColor="#94a3b8"
            value={cashApp}
            onChangeText={setCashApp}
          />

          <Text style={styles.sectionTitle}>Vehicle & Experience</Text>

          <TextInput
            style={styles.input}
            placeholder="Driver License Number"
            placeholderTextColor="#94a3b8"
            value={driverLicense}
            onChangeText={setDriverLicense}
          />

          <TextInput
            style={styles.input}
            placeholder="Vehicle Make"
            placeholderTextColor="#94a3b8"
            value={vehicleMake}
            onChangeText={setVehicleMake}
          />

          <TextInput
            style={styles.input}
            placeholder="Vehicle Model"
            placeholderTextColor="#94a3b8"
            value={vehicleModel}
            onChangeText={setVehicleModel}
          />

          <TextInput
            style={styles.input}
            placeholder="Vehicle Year"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            value={vehicleYear}
            onChangeText={setVehicleYear}
          />

          <TextInput
            style={styles.input}
            placeholder="Plate Number"
            placeholderTextColor="#94a3b8"
            value={plateNumber}
            onChangeText={setPlateNumber}
          />

          <TextInput
            style={styles.input}
            placeholder="Years of Driving Experience"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            value={yearsDriving}
            onChangeText={setYearsDriving}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Preferred Routes e.g. Dallas to Austin, Airport Trips, Event Transportation"
            placeholderTextColor="#94a3b8"
            multiline
            value={preferredRoutes}
            onChangeText={setPreferredRoutes}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#07111f" />
            ) : (
              <Text style={styles.primaryButtonText}>Submit Application</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/driver-login")}>
            <Text style={styles.link}>Already approved? Login</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </ScrollView>
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
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 65,
    paddingBottom: 45,
  },
  title: {
    color: "#d4af37",
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#e5e7eb",
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 25,
  },
  sectionTitle: {
    color: "#d4af37",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 18,
    marginBottom: 12,
  },
  helperText: {
    color: "#e5e7eb",
    fontSize: 14,
    lineHeight: 22,
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  input: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "#334155",
    color: "#ffffff",
    borderRadius: 14,
    padding: 15,
    marginBottom: 14,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  primaryButton: {
    backgroundColor: "#d4af37",
    paddingVertical: 17,
    borderRadius: 16,
    marginTop: 14,
  },
  primaryButtonText: {
    color: "#07111f",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 17,
    textTransform: "uppercase",
  },
  link: {
    color: "#d4af37",
    textAlign: "center",
    marginTop: 22,
    fontWeight: "800",
  },
  backButton: {
    borderWidth: 1,
    borderColor: "#64748b",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 30,
    backgroundColor: "rgba(15,23,42,0.75)",
  },
  backButtonText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },
});