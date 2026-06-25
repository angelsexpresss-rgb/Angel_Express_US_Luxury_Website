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

export default function ChauffeurDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);

  const [rating, setRating] = useState(5);
  const [completedTrips, setCompletedTrips] = useState(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [driverLevel, setDriverLevel] = useState("Bronze");

  const [showTrips, setShowTrips] = useState(false);
  const [showMoneyProfile, setShowMoneyProfile] = useState(false);
  const [showSafetySupport, setShowSafetySupport] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  function getWeekStartDate() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart.toISOString();
  }

  function calculateDriverLevel(
    trips: number,
    avgRating: number,
    safetyCheckins: number,
    feedbackScore: number
  ) {
    if (
      trips >= 50 &&
      avgRating >= 4.9 &&
      safetyCheckins >= 40 &&
      feedbackScore >= 4.8
    ) {
      return "Angel Elite";
    }

    if (
      trips >= 25 &&
      avgRating >= 4.7 &&
      safetyCheckins >= 20 &&
      feedbackScore >= 4.6
    ) {
      return "Gold";
    }

    if (trips >= 10 && avgRating >= 4.5) {
      return "Silver";
    }

    return "Bronze";
  }

  async function loadDashboard() {
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

      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", user.id)
        .single();

      if (driverError) throw driverError;

      if (driverData.status !== "approved") {
        router.replace("/driver-pending");
        return;
      }

      setDriver(driverData);
      setIsOnline(driverData.is_online || false);

      const { data: allCompletedTrips, error: completedError } = await supabase
        .from("bookings")
        .select("*")
        .eq("driver_id", user.id)
        .eq("status", "Completed");

      if (completedError) throw completedError;

      const completed = allCompletedTrips || [];
      const totalCompletedTrips = completed.length;

      const ratings = completed
        .map((trip) => Number(trip.driver_rating || 0))
        .filter((value) => value > 0);

      const avgRating =
        ratings.length > 0
          ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
          : Number(driverData.rating || 5);

      const weekStart = getWeekStartDate();

      const weeklyTrips = completed.filter((trip) => {
        const completedDate = new Date(
          trip.completed_at || trip.updated_at || trip.created_at
        );
        return completedDate >= new Date(weekStart);
      });

      const weeklyRevenue = weeklyTrips.reduce((sum, trip) => {
        return sum + Number(trip.total || trip.total_price || trip.price || 0);
      }, 0);

      const weeklyDriverPayout = weeklyRevenue * 0.7;

      const safetyCheckins = completed.filter(
        (trip) =>
          trip.driver_arrived_at_pickup &&
          trip.driver_picked_up_passenger &&
          trip.driver_dropped_off_passenger
      ).length;

      const passengerFeedbackRatings = completed
        .map((trip) => Number(trip.driver_rating || 0))
        .filter((value) => value > 0);

      const passengerFeedbackScore =
        passengerFeedbackRatings.length > 0
          ? passengerFeedbackRatings.reduce((sum, value) => sum + value, 0) /
            passengerFeedbackRatings.length
          : 5;

      const level = calculateDriverLevel(
        totalCompletedTrips,
        avgRating,
        safetyCheckins,
        passengerFeedbackScore
      );

      setRating(Number(avgRating.toFixed(1)));
      setCompletedTrips(totalCompletedTrips);
      setWeeklyEarnings(weeklyDriverPayout);
      setDriverLevel(level);

      await supabase
        .from("drivers")
        .update({
          rating: Number(avgRating.toFixed(1)),
          total_trips: totalCompletedTrips,
          weekly_earnings: weeklyDriverPayout,
          driver_level: level,
          safety_checkins: safetyCheckins,
          passenger_feedback_score: Number(passengerFeedbackScore.toFixed(1)),
        })
        .eq("id", user.id);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleOnlineStatus() {
    if (!driver) return;

    const newStatus = !isOnline;
    setIsOnline(newStatus);

    const { error } = await supabase
      .from("drivers")
      .update({ is_online: newStatus })
      .eq("id", driver.id);

    if (error) {
      setIsOnline(!newStatus);
      Alert.alert("Error", "Unable to update online status.");
      return;
    }

    Alert.alert(
      newStatus ? "You are Online" : "You are Offline",
      newStatus
        ? "You can now find and accept Angel Express trips."
        : "You cannot find or start trips while offline."
    );
  }

  function requireOnline(route: string) {
    if (!isOnline) {
      Alert.alert(
        "Go Online First",
        "You must go online before finding, accepting, or starting trips.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go Online", onPress: toggleOnlineStatus },
        ]
      );
      return;
    }

    router.push(route as any);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Loading chauffeur dashboard...</Text>
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
          <Text style={styles.welcome}>
            Welcome, {driver?.first_name || "Chauffeur"}
          </Text>

          <Text style={styles.subtitle}>Angel Express Chauffeur Dashboard</Text>

          <TouchableOpacity
            style={[
              styles.onlineToggle,
              isOnline ? styles.onlineActive : styles.offlineActive,
            ]}
            onPress={toggleOnlineStatus}
          >
            <Text style={styles.onlineText}>
              {isOnline
                ? "🟢 Online — Available for Trips"
                : "⚪ Offline — Go Online to Find Trips"}
            </Text>
          </TouchableOpacity>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>⭐</Text>
              <Text style={styles.statValue}>{rating}</Text>
              <Text style={styles.statLabel}>Driver Rating</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🚗</Text>
              <Text style={styles.statValue}>{completedTrips}</Text>
              <Text style={styles.statLabel}>Completed Trips</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statIcon}>💰</Text>
              <Text style={styles.statValue}>
                ${weeklyEarnings.toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🏆</Text>
              <Text style={styles.statValue}>{driverLevel}</Text>
              <Text style={styles.statLabel}>Driver Level</Text>
            </View>
          </View>

          <View style={styles.levelCard}>
            <Text style={styles.levelTitle}>Angel Driver Level System</Text>
            <Text style={styles.levelText}>
              Bronze → Silver → Gold → Angel Elite
            </Text>
            <Text style={styles.levelSubtext}>
              Based on completed trips, ratings, on-time pickup, safety
              check-ins, and passenger feedback.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.dropdownHeader}
            onPress={() => setShowTrips(!showTrips)}
          >
            <Text style={styles.dropdownTitle}>Trips</Text>
            <Text style={styles.dropdownIcon}>{showTrips ? "▲" : "▼"}</Text>
          </TouchableOpacity>

          {showTrips && (
            <View style={styles.dropdownContent}>
              <TouchableOpacity
                style={[styles.actionButton, !isOnline && styles.disabledButton]}
                onPress={() => requireOnline("/find-trips")}
              >
                <Text style={styles.actionButtonTitle}>Find Trips</Text>
                <Text style={styles.actionButtonText}>
                  You must be online to view and claim available rides.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, !isOnline && styles.disabledButton]}
                onPress={() => requireOnline("/active-trip")}
              >
                <Text style={styles.actionButtonTitle}>My Active Trip</Text>
                <Text style={styles.actionButtonText}>
                  Start and manage your assigned trip while online.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push("/upcoming-trips")}
              >
                <Text style={styles.actionButtonTitle}>Upcoming Trips</Text>
                <Text style={styles.actionButtonText}>
                  See future trips you have accepted.
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
              style={[styles.actionButton, !isOnline && styles.disabledButton]}
              onPress={() => requireOnline("/smart-trip-queue")}
              >
              <Text style={styles.actionButtonTitle}>Smart Trip Queue</Text>
              <Text style={styles.actionButtonText}>
               Future trips available to claim.
              </Text>
              </TouchableOpacity>
            </View>
            
          )}

          <TouchableOpacity
            style={styles.dropdownHeader}
            onPress={() => setShowMoneyProfile(!showMoneyProfile)}
          >
            <Text style={styles.dropdownTitle}>Money & Profile</Text>
            <Text style={styles.dropdownIcon}>
              {showMoneyProfile ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {showMoneyProfile && (
            <View style={styles.dropdownContent}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push("/earnings")}
              >
                <Text style={styles.actionButtonTitle}>Earnings</Text>
                <Text style={styles.actionButtonText}>
                  Track weekly payout, completed trip revenue, Stripe status,
                  and payout history.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push("/driver-card")}
              >
                <Text style={styles.actionButtonTitle}>Driver Card</Text>
                <Text style={styles.actionButtonText}>
                  Preview the chauffeur card passengers will see after
                  assignment.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push("/passenger-ratings")}
              >
                <Text style={styles.actionButtonTitle}>Passenger Ratings</Text>
                <Text style={styles.actionButtonText}>
                  Rate passengers and review completed trip feedback.
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.dropdownHeader}
            onPress={() => setShowSafetySupport(!showSafetySupport)}
          >
            <Text style={styles.dropdownTitle}>Safety & Support</Text>
            <Text style={styles.dropdownIcon}>
              {showSafetySupport ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {showSafetySupport && (
            <View style={styles.dropdownContent}>
              <TouchableOpacity
                style={styles.emergencyButton}
                onPress={() => router.push("/safety-support")}
              >
                <Text style={styles.emergencyTitle}>Emergency Button</Text>
                <Text style={styles.emergencyText}>
                  Safety check-ins, panic contact, emergency alert, and location
                  sharing.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push("/support")}
              >
                <Text style={styles.actionButtonTitle}>Support</Text>
                <Text style={styles.actionButtonText}>
                  Contact Angel Express for trip, payment, vehicle, or account
                  support.
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
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
    paddingTop: 65,
    paddingBottom: 45,
  },
  welcome: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 6,
  },
  subtitle: {
    color: "#d4af37",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 20,
  },
  onlineToggle: {
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 22,
    borderWidth: 1,
  },
  onlineActive: {
    backgroundColor: "rgba(34,197,94,0.18)",
    borderColor: "#22c55e",
  },
  offlineActive: {
    backgroundColor: "rgba(15,23,42,0.85)",
    borderColor: "#64748b",
  },
  onlineText: {
    color: "#ffffff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.55)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    color: "#d4af37",
    fontSize: 22,
    fontWeight: "900",
  },
  statLabel: {
    color: "#e5e7eb",
    fontSize: 13,
    marginTop: 4,
  },
  levelCard: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.55)",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },
  levelTitle: {
    color: "#d4af37",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  levelText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  levelSubtext: {
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 20,
  },
  dropdownHeader: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownTitle: {
    color: "#d4af37",
    fontSize: 20,
    fontWeight: "900",
  },
  dropdownIcon: {
    color: "#d4af37",
    fontSize: 18,
    fontWeight: "900",
  },
  dropdownContent: {
    marginBottom: 18,
  },
  actionButton: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 18,
    padding: 18,
    marginBottom: 13,
  },
  disabledButton: {
    opacity: 0.55,
    borderColor: "#64748b",
  },
  actionButtonTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  actionButtonText: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 21,
  },
  emergencyButton: {
    backgroundColor: "rgba(127,29,29,0.8)",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 18,
    padding: 18,
    marginBottom: 13,
  },
  emergencyTitle: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 6,
  },
  emergencyText: {
    color: "#fee2e2",
    fontSize: 14,
    lineHeight: 21,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: "#64748b",
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.75)",
    marginTop: 6,
  },
  logoutText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "800",
    fontSize: 16,
  },
});