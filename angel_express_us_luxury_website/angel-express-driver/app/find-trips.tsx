import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function FindTripsScreen() {
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadAvailableTrips();
    }, [])
  );

  async function loadAvailableTrips() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .is("driver_id", null)
        .in("status", ["pending", "confirmed"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTrips(data || []);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to load available trips.");
    } finally {
      setLoading(false);
    }
  }

  async function acceptTrip(trip: any) {
    try {
      setAcceptingId(trip.id);

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
        .select("id, status, is_online")
        .eq("id", user.id)
        .single();

      if (driverError || !driver) {
        Alert.alert("Driver Profile Missing", "Please login again.");
        return;
      }

      if (driver.status !== "approved") {
        router.replace("/driver-pending");
        return;
      }

      if (!driver.is_online) {
        Alert.alert(
          "You Are Offline",
          "Please go online from your dashboard before accepting trips."
        );
        return;
      }

      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          driver_id: user.id,
          status: "assigned",
        })
        .eq("id", trip.id)
        .is("driver_id", null);

      if (updateError) throw updateError;

      Alert.alert(
        "Trip Accepted",
        "This trip has been assigned to you."
      );

      loadAvailableTrips();
    } catch (err: any) {
      Alert.alert("Accept Failed", err.message || "Unable to accept this trip.");
    } finally {
      setAcceptingId(null);
    }
  }

  function getTripTitle(trip: any) {
    return (
      trip.route ||
      `${trip.pickup || trip.pickup_address || "Pickup"} → ${
        trip.dropoff || trip.dropoff_address || "Drop-off"
      }`
    );
  }

  function getPickup(trip: any) {
    return trip.pickup || trip.pickup_address || trip.pickup_location || "Not provided";
  }

  function getDropoff(trip: any) {
    return trip.dropoff || trip.dropoff_address || trip.dropoff_location || "Not provided";
  }

  function getFare(trip: any) {
    const total =
      Number(trip.total) ||
      Number(trip.total_fare) ||
      Number(trip.amount) ||
      0;

    return total;
  }

  function getDriverPayout(trip: any) {
    const existingDriverShare = Number(trip.driver_share);

    if (existingDriverShare > 0) {
      return existingDriverShare;
    }

    return getFare(trip) * 0.7;
  }

  return (
    <ImageBackground
      source={require("../assets/images/driver-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadAvailableTrips}
              tintColor="#d4af37"
            />
          }
        >
          <Text style={styles.title}>Find Trips</Text>

          <Text style={styles.subtitle}>
            Available Angel Express bookings ready for approved chauffeurs.
          </Text>

          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#d4af37" size="large" />
              <Text style={styles.loadingText}>Loading available trips...</Text>
            </View>
          ) : trips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Available Trips</Text>
              <Text style={styles.emptyText}>
                There are no unassigned trips right now. Check again later or
                refresh this page.
              </Text>
            </View>
          ) : (
            trips.map((trip) => {
              const fare = getFare(trip);
              const payout = getDriverPayout(trip);

              return (
                <View key={trip.id} style={styles.tripCard}>
                  <Text style={styles.tripTitle}>{getTripTitle(trip)}</Text>

                  <View style={styles.row}>
                    <Text style={styles.label}>Pickup</Text>
                    <Text style={styles.value}>{getPickup(trip)}</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>Drop-off</Text>
                    <Text style={styles.value}>{getDropoff(trip)}</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>Date</Text>
                    <Text style={styles.value}>
                      {trip.date || trip.ride_date || trip.pickup_date || "Not set"}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>Time</Text>
                    <Text style={styles.value}>
                      {trip.time || trip.ride_time || trip.pickup_time || "Not set"}
                    </Text>
                  </View>

                  <View style={styles.moneyBox}>
                    <View>
                      <Text style={styles.moneyLabel}>Trip Total</Text>
                      <Text style={styles.moneyValue}>
                        ${fare.toFixed(2)}
                      </Text>
                    </View>

                    <View>
                      <Text style={styles.moneyLabel}>Your 70%</Text>
                      <Text style={styles.payoutValue}>
                        ${payout.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => acceptTrip(trip)}
                    disabled={acceptingId === trip.id}
                  >
                    {acceptingId === trip.id ? (
                      <ActivityIndicator color="#07111f" />
                    ) : (
                      <Text style={styles.acceptButtonText}>Accept Ride</Text>
                    )}
                  </TouchableOpacity>
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
  container: {
    flexGrow: 1,
    padding: 22,
    paddingTop: 65,
    paddingBottom: 45,
  },
  title: {
    color: "#d4af37",
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: "#e5e7eb",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  backButton: {
    borderWidth: 1,
    borderColor: "#64748b",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.75)",
    marginBottom: 20,
  },
  backButtonText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "800",
  },
  loadingBox: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
  },
  loadingText: {
    color: "#e5e7eb",
    marginTop: 12,
  },
  emptyCard: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 18,
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
    fontSize: 15,
    lineHeight: 22,
  },
  tripCard: {
    backgroundColor: "rgba(15,23,42,0.94)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.55)",
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  tripTitle: {
    color: "#d4af37",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 14,
  },
  row: {
    marginBottom: 12,
  },
  label: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  value: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 21,
  },
  moneyBox: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  moneyLabel: {
    color: "#cbd5e1",
    fontSize: 13,
    marginBottom: 5,
  },
  moneyValue: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  payoutValue: {
    color: "#d4af37",
    fontSize: 20,
    fontWeight: "900",
  },
  acceptButton: {
    backgroundColor: "#d4af37",
    paddingVertical: 16,
    borderRadius: 16,
  },
  acceptButtonText: {
    color: "#07111f",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase",
  },
});