import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function DriverPendingScreen() {
  const [checking, setChecking] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function checkApprovalStatus() {
    try {
      setChecking(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/driver-login");
        return;
      }

      const { data: driver, error: driverError } = await supabase
        .from("drivers")
        .select("status, stripe_onboarding_complete, payout_status")
        .eq("id", user.id)
        .single();

      if (driverError || !driver) {
        Alert.alert(
          "Profile Not Found",
          "We could not find your chauffeur profile. Please contact Angel Express support."
        );
        return;
      }

      if (driver.status === "approved") {
        Alert.alert(
          "Approved",
          "Your chauffeur profile has been approved. Welcome to Angel Express."
        );
        router.replace("/driver-dashboard");
        return;
      }

      if (driver.status === "rejected") {
        Alert.alert(
          "Application Update",
          "Your application was not approved at this time. Please contact Angel Express for more details."
        );
        return;
      }

      if (driver.status === "suspended") {
        Alert.alert(
          "Account Suspended",
          "Your chauffeur account is currently suspended. Please contact Angel Express support."
        );
        return;
      }

      Alert.alert(
        "Still Under Review",
        "Your chauffeur application is still pending approval."
      );
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.message || "Unable to check your approval status."
      );
    } finally {
      setChecking(false);
    }
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      router.replace("/");
    } catch (err: any) {
      Alert.alert("Logout Failed", err.message || "Unable to logout.");
    } finally {
      setLoggingOut(false);
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
          <View style={styles.card}>
            <Text style={styles.icon}>⏳</Text>

            <Text style={styles.title}>Application Submitted</Text>

            <Text style={styles.statusBadge}>Review Status: Pending</Text>

            <Text style={styles.message}>
              Thank you for applying to become an Angel Express chauffeur. Your
              profile has been received and is currently under review.
            </Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>What happens next?</Text>

              <Text style={styles.infoText}>
                1. Angel Express reviews your chauffeur and vehicle details.
              </Text>

              <Text style={styles.infoText}>
                2. Once approved, you will gain access to the chauffeur dashboard.
              </Text>

              <Text style={styles.infoText}>
                3. A secure Stripe Connect onboarding link will be provided so
                you can connect your payout account for 70% trip payouts.
              </Text>
            </View>

            <View style={styles.stripeBox}>
              <Text style={styles.stripeTitle}>Stripe Payout Setup</Text>

              <Text style={styles.stripeText}>
                Angel Express uses Stripe Connect for secure chauffeur payouts.
                Do not enter bank details in the app. Stripe onboarding will be
                handled through a secure link after approval.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={checkApprovalStatus}
              disabled={checking}
            >
              {checking ? (
                <ActivityIndicator color="#07111f" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Refresh Approval Status
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.logoutButtonText}>Logout</Text>
              )}
            </TouchableOpacity>
          </View>
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
    justifyContent: "center",
  },
  card: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 22,
    padding: 22,
  },
  icon: {
    fontSize: 54,
    textAlign: "center",
    marginBottom: 14,
  },
  title: {
    color: "#d4af37",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 12,
  },
  statusBadge: {
    color: "#07111f",
    backgroundColor: "#d4af37",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 18,
    textTransform: "uppercase",
  },
  message: {
    color: "#e5e7eb",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 18,
  },
  infoBox: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    color: "#d4af37",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },
  infoText: {
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  stripeBox: {
    backgroundColor: "rgba(212,175,55,0.12)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.6)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  stripeTitle: {
    color: "#d4af37",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
  },
  stripeText: {
    color: "#f8fafc",
    fontSize: 14,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: "#d4af37",
    paddingVertical: 17,
    borderRadius: 16,
    marginBottom: 14,
  },
  primaryButtonText: {
    color: "#07111f",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 15,
    textTransform: "uppercase",
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: "#64748b",
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.75)",
  },
  logoutButtonText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "800",
    fontSize: 16,
  },
});