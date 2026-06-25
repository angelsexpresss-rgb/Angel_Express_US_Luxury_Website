import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function StudentTravelScreen() {
  const [loading, setLoading] = useState(true);
  const [studentVerified, setStudentVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("Not Submitted");

  useFocusEffect(
    useCallback(() => {
      loadStudentStatus();
    }, [])
  );

  async function loadStudentStatus() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      const { data, error } = await supabase
        .from("passenger_profiles")
        .select("student_verified, student_verification_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      setStudentVerified(Boolean(data?.student_verified));
      setVerificationStatus(data?.student_verification_status || "Not Submitted");
    } catch (error: any) {
      Alert.alert("Student Mode Error", error.message || "Could not load student status.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#D4AF37" size="large" />
        <Text style={styles.loadingText}>Loading Student Travel Mode...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Student Travel Mode+</Text>
      <Text style={styles.subtitle}>
        Campus rides, student discounts, ride pooling, and verified student benefits.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Campus Hub</Text>
        {["UTD", "UT Arlington", "SMU", "UNT", "Texas A&M", "UT Austin"].map(
          (school) => (
            <Text key={school} style={styles.listItem}>• {school}</Text>
          )
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Student Ride Pool</Text>
        <Text style={styles.route}>Dallas → Austin</Text>
        <Text style={styles.detail}>3 seats remaining</Text>
        <Text style={styles.fare}>Student fare: $29</Text>
      </View>

      <View style={styles.badgeCard}>
        {studentVerified ? (
          <Text style={styles.badge}>Verified Student</Text>
        ) : (
          <Text style={styles.pendingBadge}>{verificationStatus}</Text>
        )}

        <Text style={styles.cardTitle}>Student Verification Badge</Text>
        <Text style={styles.detail}>Unlocks:</Text>
        <Text style={styles.listItem}>• Student discounts</Text>
        <Text style={styles.listItem}>• Priority campus pickups</Text>
        <Text style={styles.listItem}>• Referral bonuses</Text>

        {!studentVerified && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/student-verification" as any)}
          >
            <Text style={styles.buttonText}>Verify Student Status</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push("/book-ride" as any)}
      >
        <Text style={styles.secondaryButtonText}>Book Student Ride</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#040C18" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 50 },
  center: {
    flex: 1,
    backgroundColor: "#040C18",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: { color: "#FFFFFF", marginTop: 12, fontSize: 16 },
  title: {
    color: "#D4AF37",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 10,
  },
  subtitle: {
    color: "#C9D0D8",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#071426",
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },
  badgeCard: {
    backgroundColor: "#071426",
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
  },
  cardTitle: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
  },
  listItem: { color: "#FFFFFF", fontSize: 16, marginBottom: 8 },
  route: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  detail: { color: "#C9D0D8", fontSize: 16, marginBottom: 8 },
  fare: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#D4AF37",
    color: "#071426",
    fontSize: 13,
    fontWeight: "900",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  pendingBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#1A2740",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
  },
  button: {
    backgroundColor: "#D4AF37",
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 14,
  },
  buttonText: {
    color: "#071426",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#D4AF37",
    paddingVertical: 17,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 4,
  },
  secondaryButtonText: {
    color: "#D4AF37",
    fontSize: 17,
    fontWeight: "900",
  },
});