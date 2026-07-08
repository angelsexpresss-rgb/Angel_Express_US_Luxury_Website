import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

export default function DriverCardScreen() {
  const { colors, themeMode, toggleTheme } = useDriverTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<any>(null);

  useEffect(() => {
    loadDriverCard();
  }, []);

  async function loadDriverCard() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/driver-login");
        return;
      }

      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setDriver(data);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to load driver card.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Loading driver card...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/driver-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Driver Card</Text>
          <Text style={styles.subtitle}>
            This is the chauffeur profile passengers will see after assignment.
          </Text>

          <View style={styles.card}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(driver?.first_name?.[0] || "A").toUpperCase()}
                {(driver?.last_name?.[0] || "E").toUpperCase()}
              </Text>
            </View>

            <Text style={styles.name}>
              {driver?.first_name || "Angel"} {driver?.last_name || "Chauffeur"}
            </Text>

            <Text style={styles.role}>Angel Express Chauffeur</Text>

            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>⭐ {driver?.rating || "5.0"} Rating</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vehicle</Text>
              <Text style={styles.infoValue}>
                {driver?.vehicle_make || "Vehicle"} {driver?.vehicle_model || ""}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>License Plate</Text>
              <Text style={styles.infoValue}>
                {driver?.license_plate || driver?.plate_number || "Not added"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Completed Trips</Text>
              <Text style={styles.infoValue}>{driver?.total_trips || 0}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Driver Level</Text>
              <Text style={styles.infoValue}>
                {driver?.driver_level || "Bronze"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Safety Score</Text>
              <Text style={styles.infoValue}>
                {driver?.safety_score || "Excellent"}
              </Text>
            </View>
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Passenger View Message</Text>
            <Text style={styles.previewText}>
              Your chauffeur is on the way. Angel Express has assigned{" "}
              {driver?.first_name || "your chauffeur"} for your ride.
            </Text>
            <Text style={styles.previewText}>
              Please verify the driver name, vehicle, and license plate before
              entering the vehicle.
            </Text>
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>Safety Reminder</Text>
            <Text style={styles.noteText}>
              Keep your profile accurate. Passengers will use this card to
              confirm they are entering the correct Angel Express vehicle.
            </Text>
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
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      color: colors.text2,
      marginTop: 14,
      fontWeight: "800",
    },
    container: {
      flexGrow: 1,
      padding: 22,
      paddingTop: 60,
      paddingBottom: 45,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    backButton: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    backText: {
      color: colors.gold,
      fontSize: 16,
      fontWeight: "900",
    },
    themePill: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    themeText: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
    },
    title: {
      color: colors.text,
      fontSize: 34,
      fontWeight: "900",
      marginBottom: 8,
    },
    subtitle: {
      color: colors.text2,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 22,
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 26,
      padding: 24,
      alignItems: "center",
      marginBottom: 18,
      ...v5Shadow(colors),
    },
    avatarCircle: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: colors.gold,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    avatarText: {
      color: colors.navy,
      fontSize: 30,
      fontWeight: "900",
    },
    name: {
      color: colors.text,
      fontSize: 26,
      fontWeight: "900",
      textAlign: "center",
    },
    role: {
      color: colors.text2,
      fontSize: 14,
      marginTop: 5,
      marginBottom: 12,
      fontWeight: "700",
    },
    ratingBadge: {
      backgroundColor: colors.mode === "dark" ? "rgba(212,175,55,0.15)" : "#FFF8E8",
      borderWidth: 1,
      borderColor: colors.gold,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    ratingText: {
      color: colors.gold,
      fontSize: 14,
      fontWeight: "900",
    },
    divider: {
      width: "100%",
      height: 1,
      backgroundColor: colors.borderSoft,
      marginVertical: 22,
    },
    infoRow: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 14,
      gap: 14,
    },
    infoLabel: {
      color: colors.muted2,
      fontSize: 14,
      flex: 1,
      fontWeight: "700",
    },
    infoValue: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "900",
      flex: 1,
      textAlign: "right",
    },
    previewCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
    },
    previewTitle: {
      color: colors.gold,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 10,
    },
    previewText: {
      color: colors.text2,
      fontSize: 14,
      lineHeight: 22,
      marginBottom: 8,
      fontWeight: "700",
    },
    noteCard: {
      backgroundColor: colors.card2,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    noteTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 8,
    },
    noteText: {
      color: colors.text2,
      fontSize: 14,
      lineHeight: 22,
      fontWeight: "700",
    },
  });
}