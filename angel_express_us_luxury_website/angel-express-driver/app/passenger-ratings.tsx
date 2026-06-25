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

export default function PassengerRatingsScreen() {
  const [loading, setLoading] = useState(true);
  const [completedTrips, setCompletedTrips] = useState<any[]>([]);

  useEffect(() => {
    loadCompletedTrips();
  }, []);

  async function loadCompletedTrips() {
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
        .from("bookings")
        .select("*")
        .eq("driver_id", user.id)
        .eq("status", "Completed")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCompletedTrips(data || []);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to load passenger ratings.");
    } finally {
      setLoading(false);
    }
  }

  async function ratePassenger(tripId: string, rating: number) {
    const { error } = await supabase
      .from("bookings")
      .update({
        passenger_rating_by_driver: rating,
      })
      .eq("id", tripId);

    if (error) {
      Alert.alert("Error", "Unable to save passenger rating.");
      return;
    }

    Alert.alert("Saved", `Passenger rated ${rating} stars.`);

    setCompletedTrips((prev) =>
      prev.map((trip) =>
        trip.id === tripId
          ? { ...trip, passenger_rating_by_driver: rating }
          : trip
      )
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Loading passenger ratings...</Text>
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

          <Text style={styles.title}>Passenger Ratings</Text>
          <Text style={styles.subtitle}>
            Rate completed Angel Express passengers and review trip history.
          </Text>

          {completedTrips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No completed trips yet</Text>
              <Text style={styles.emptyText}>
                After you complete a ride, you will be able to rate the passenger
                here.
              </Text>
            </View>
          ) : (
            completedTrips.map((trip) => {
              const currentRating = trip.passenger_rating_by_driver || 0;

              return (
                <View key={trip.id} style={styles.tripCard}>
                  <View style={styles.topRow}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>
                        {(trip.name?.[0] ||
                          trip.passenger_name?.[0] ||
                          "P").toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.passengerInfo}>
                      <Text style={styles.passengerName}>
                        {trip.name || trip.passenger_name || "Passenger"}
                      </Text>
                      <Text style={styles.tripDate}>
                        {trip.date || "Completed trip"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.routeBox}>
                    <Text style={styles.routeText}>
                      {trip.pickup || "Pickup"} → {trip.dropoff || "Dropoff"}
                    </Text>
                  </View>

                  <Text style={styles.label}>Driver Rating for Passenger</Text>

                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => ratePassenger(trip.id, star)}
                      >
                        <Text
                          style={[
                            styles.star,
                            star <= currentRating && styles.starActive,
                          ]}
                        >
                          ★
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.ratingStatus}>
                    {currentRating
                      ? `You rated this passenger ${currentRating} star${
                          currentRating > 1 ? "s" : ""
                        }.`
                      : "Tap a star to rate this passenger."}
                  </Text>

                  <View style={styles.notesBox}>
                    <Text style={styles.notesTitle}>Trip Notes</Text>
                    <Text style={styles.notesText}>
                      Passenger was assigned to your completed Angel Express
                      trip. Future notes and incident reports can be added here.
                    </Text>
                  </View>
                </View>
              );
            })
          )}
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
  emptyCard: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.55)",
    borderRadius: 22,
    padding: 22,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  emptyText: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 22,
  },
  tripCard: {
    backgroundColor: "rgba(15,23,42,0.94)",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#d4af37",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: {
    color: "#07111f",
    fontSize: 22,
    fontWeight: "900",
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900",
  },
  tripDate: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 3,
  },
  routeBox: {
    backgroundColor: "rgba(30,41,59,0.88)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  routeText: {
    color: "#e5e7eb",
    fontSize: 14,
    lineHeight: 21,
  },
  label: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  star: {
    color: "#475569",
    fontSize: 36,
    marginRight: 8,
  },
  starActive: {
    color: "#d4af37",
  },
  ratingStatus: {
    color: "#d4af37",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 16,
  },
  notesBox: {
    backgroundColor: "rgba(2,6,23,0.45)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  notesTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 6,
  },
  notesText: {
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 20,
  },
});