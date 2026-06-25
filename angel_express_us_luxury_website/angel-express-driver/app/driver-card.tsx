import { router } from "expo-router";
import { useEffect, useState } from "react";
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

export default function DriverCardScreen() {
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
        <ActivityIndicator size="large" color="#d4af37" />
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

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
                {driver?.license_plate || "Not added"}
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

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#07111f",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#e5e7eb",
    marginTop: 14,
  },
  container: {
    flexGrow: 1,
    padding: 22,
    paddingTop: 60,
    paddingBottom: 45,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    color: "#d4af37",
    fontSize: 16,
    fontWeight: "800",
  },
  title: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },
  card: {
    backgroundColor: "rgba(15,23,42,0.94)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.7)",
    borderRadius: 26,
    padding: 24,
    alignItems: "center",
    marginBottom: 18,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#d4af37",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: {
    color: "#07111f",
    fontSize: 30,
    fontWeight: "900",
  },
  name: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  role: {
    color: "#cbd5e1",
    fontSize: 14,
    marginTop: 5,
    marginBottom: 12,
  },
  ratingBadge: {
    backgroundColor: "rgba(212,175,55,0.15)",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  ratingText: {
    color: "#d4af37",
    fontSize: 14,
    fontWeight: "900",
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#334155",
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
    color: "#94a3b8",
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
    textAlign: "right",
  },
  previewCard: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  previewTitle: {
    color: "#d4af37",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 10,
  },
  previewText: {
    color: "#e5e7eb",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  noteCard: {
    backgroundColor: "rgba(30,41,59,0.85)",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#475569",
  },
  noteTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  noteText: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 22,
  },
});