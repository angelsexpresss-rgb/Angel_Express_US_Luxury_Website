import { router } from "expo-router";
import { useEffect, useState } from "react";
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

export default function SmartTripQueueScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driver, setDriver] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    loadQueue();
  }, []);

  function getBookingDateTime(trip: any) {
    const dateValue = trip.date || trip.trip_date || trip.pickup_date;
    const timeValue = trip.time || trip.trip_time || trip.pickup_time || "00:00";

    if (!dateValue) return null;

    const combined = `${dateValue}T${timeValue}`;
    const parsed = new Date(combined);

    if (isNaN(parsed.getTime())) {
      return new Date(dateValue);
    }

    return parsed;
  }

  async function loadQueue() {
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

      setDriver(driverData);

      if (!driverData.is_online) {
        Alert.alert(
          "Go Online First",
          "You must be online before viewing and claiming future trips.",
          [
            {
              text: "Back to Dashboard",
              onPress: () => router.replace("/driver-dashboard"),
            },
          ]
        );
        setTrips([]);
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .is("driver_id", null)
        .in("status", ["Pending", "pending", "Unassigned", "unassigned"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const now = new Date();

      const futureTrips = (data || []).filter((trip) => {
        const bookingDateTime = getBookingDateTime(trip);

        if (!bookingDateTime) {
          return true;
        }

        return bookingDateTime >= now;
      });

      setTrips(futureTrips);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to load trip queue.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function refreshQueue() {
    setRefreshing(true);
    await loadQueue();
  }

  async function claimTrip(trip: any) {
    if (!driver?.is_online) {
      Alert.alert(
        "Go Online First",
        "You must be online before claiming a trip."
      );
      return;
    }

    Alert.alert(
      "Claim Trip",
      "Do you want to claim this Angel Express trip?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Claim",
          onPress: async () => {
            try {
              const driverName = `${driver?.first_name || ""} ${
                driver?.last_name || ""
              }`.trim();

              const { error } = await supabase
                .from("bookings")
                .update({
                  driver_id: driver.id,
                  status: "Confirmed",
                  assigned_driver_name: driverName || "Angel Express Chauffeur",
                  assigned_driver_phone: driver?.phone || null,
                  assigned_driver_rating: driver?.rating || 5,
                  assigned_driver_level: driver?.driver_level || "Bronze",
                  claimed_at: new Date().toISOString(),
                })
                .eq("id", trip.id)
                .is("driver_id", null);

              if (error) throw error;

              Alert.alert(
                "Trip Claimed",
                "This trip has been added to your upcoming trips."
              );

              await loadQueue();
            } catch (err: any) {
              Alert.alert(
                "Claim Failed",
                err.message ||
                  "Unable to claim this trip. It may have already been assigned."
              );
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Loading Smart Trip Queue...</Text>
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
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshQueue} />
          }
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Smart Trip Queue</Text>

          <Text style={styles.subtitle}>
            Future Angel Express trips available for approved online chauffeurs
            to claim.
          </Text>

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>
              {driver?.is_online ? "🟢 You are Online" : "⚪ You are Offline"}
            </Text>
            <Text style={styles.statusText}>
              {driver?.is_online
                ? "You can claim available future trips."
                : "Go online from your dashboard before claiming trips."}
            </Text>
          </View>

          {trips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No future trips available</Text>
              <Text style={styles.emptyText}>
                When new unassigned bookings are available, they will appear in
                this queue.
              </Text>
            </View>
          ) : (
            trips.map((trip) => {
              const tripTotal = Number(
                trip.total || trip.total_price || trip.price || 0
              );
              const driverPayout = tripTotal * 0.7;
              const miles = Number(
                trip.miles || trip.distance_miles || trip.trip_miles || 0
              );

              return (
                <View key={trip.id} style={styles.tripCard}>
                  <View style={styles.tripHeader}>
                    <Text style={styles.tripRoute}>
                      {trip.pickup || "Pickup"} → {trip.dropoff || "Dropoff"}
                    </Text>
                    <Text style={styles.tripBadge}>Available</Text>
                  </View>

                  <Text style={styles.tripText}>
                    Passenger: {trip.name || trip.passenger_name || "Passenger"}
                  </Text>

                  <Text style={styles.tripText}>
                    Date: {trip.date || trip.trip_date || "Not provided"}
                  </Text>

                  <Text style={styles.tripText}>
                    Time: {trip.time || trip.trip_time || "Not provided"}
                  </Text>

                  <Text style={styles.tripText}>
                    Miles: {miles.toFixed(1)}
                  </Text>

                  <View style={styles.payoutBox}>
                    <Text style={styles.payoutLabel}>Estimated 70% Payout</Text>
                    <Text style={styles.payoutAmount}>
                      ${driverPayout.toFixed(2)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.claimButton}
                    onPress={() => claimTrip(trip)}
                  >
                    <Text style={styles.claimText}>Claim Trip</Text>
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
    fontSize: 33,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  statusCard: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.55)",
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  statusTitle: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 6,
  },
  statusText: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 21,
  },
  emptyCard: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 20,
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
    padding: 18,
    marginBottom: 16,
  },
  tripHeader: {
    marginBottom: 12,
  },
  tripRoute: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
    marginBottom: 8,
  },
  tripBadge: {
    color: "#07111f",
    backgroundColor: "#d4af37",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "900",
  },
  tripText: {
    color: "#cbd5e1",
    fontSize: 14,
    marginBottom: 6,
  },
  payoutBox: {
    backgroundColor: "rgba(212,175,55,0.13)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.55)",
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    marginBottom: 14,
  },
  payoutLabel: {
    color: "#cbd5e1",
    fontSize: 13,
    marginBottom: 5,
  },
  payoutAmount: {
    color: "#d4af37",
    fontSize: 24,
    fontWeight: "900",
  },
  claimButton: {
    backgroundColor: "#d4af37",
    borderRadius: 16,
    padding: 15,
  },
  claimText: {
    color: "#07111f",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
});