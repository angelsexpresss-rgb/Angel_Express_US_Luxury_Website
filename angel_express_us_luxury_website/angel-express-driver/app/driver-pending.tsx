import { router } from "expo-router";
import { useMemo, useState } from "react";
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
import { useDriverTheme, v5Shadow } from "../lib/driverTheme";

export default function DriverPendingScreen() {
  const { colors, themeMode, toggleTheme } = useDriverTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
          <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
            <Text style={styles.themeText}>
              {themeMode === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
            </Text>
          </TouchableOpacity>

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
              style={[styles.primaryButton, checking && styles.disabledButton]}
              onPress={checkApprovalStatus}
              disabled={checking}
            >
              {checking ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Refresh Approval Status
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.logoutButton, loggingOut && styles.disabledButton]}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator color={colors.text} />
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

function createStyles(colors: any) {
  return StyleSheet.create({
    background: {
      flex: 1,
    },

    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
    },

    container: {
      flexGrow: 1,
      padding: 24,
      justifyContent: "center",
    },

    themePill: {
      alignSelf: "flex-end",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 9,
      paddingHorizontal: 14,
      marginBottom: 18,
    },

    themeText: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.gold,
      borderRadius: 24,
      padding: 22,
      ...v5Shadow(colors),
    },

    icon: {
      fontSize: 54,
      textAlign: "center",
      marginBottom: 14,
    },

    title: {
      color: colors.gold,
      fontSize: 28,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 12,
    },

    statusBadge: {
      color: colors.navy,
      backgroundColor: colors.gold,
      fontSize: 14,
      fontWeight: "900",
      textAlign: "center",
      paddingVertical: 10,
      borderRadius: 999,
      marginBottom: 18,
      textTransform: "uppercase",
    },

    message: {
      color: colors.text2,
      fontSize: 15,
      lineHeight: 24,
      textAlign: "center",
      marginBottom: 18,
      fontWeight: "700",
    },

    infoBox: {
      backgroundColor: colors.mode === "dark" ? "rgba(0,0,0,0.35)" : "rgba(7,17,31,0.04)",
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },

    infoTitle: {
      color: colors.gold,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 10,
    },

    infoText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 22,
      marginBottom: 8,
      fontWeight: "700",
    },

    stripeBox: {
      backgroundColor: colors.mode === "dark" ? "rgba(212,175,55,0.12)" : "#FFF8E8",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
    },

    stripeTitle: {
      color: colors.gold,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 8,
    },

    stripeText: {
      color: colors.text2,
      fontSize: 14,
      lineHeight: 22,
      fontWeight: "700",
    },

    primaryButton: {
      backgroundColor: colors.gold,
      paddingVertical: 17,
      borderRadius: 16,
      marginBottom: 14,
    },

    primaryButtonText: {
      color: colors.navy,
      textAlign: "center",
      fontWeight: "900",
      fontSize: 15,
      textTransform: "uppercase",
    },

    logoutButton: {
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingVertical: 16,
      borderRadius: 16,
      backgroundColor: colors.card2,
    },

    logoutButtonText: {
      color: colors.text,
      textAlign: "center",
      fontWeight: "800",
      fontSize: 16,
    },

    disabledButton: {
      opacity: 0.7,
    },
  });
}