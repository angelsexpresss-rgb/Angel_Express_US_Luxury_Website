import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function LiveTripsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [])
  );

  async function loadTrips() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTrips(data || []);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Unable to load live trips.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function callNumber(phone: string) {
    if (!phone) {
      Alert.alert("No phone number available");
      return;
    }

    Linking.openURL(`tel:${phone}`);
  }

  function textNumber(phone: string, message?: string) {
    if (!phone) {
      Alert.alert("No phone number available");
      return;
    }

    Linking.openURL(`sms:${phone}?body=${encodeURIComponent(message || "")}`);
  }

  function getPassengerName(trip: any) {
    return (
      trip.name ||
      trip.passenger_name ||
      trip.full_name ||
      trip.email ||
      "Website Passenger"
    );
  }

  function getPassengerPhone(trip: any) {
    return trip.phone || trip.passenger_phone || "";
  }

  function getPickup(trip: any) {
    return trip.pickup || trip.pickup_address || trip.pickup_location || "Not Set";
  }

  function getDropoff(trip: any) {
    return (
      trip.dropoff ||
      trip.dropoff_address ||
      trip.dropoff_location ||
      trip.destination ||
      "Not Set"
    );
  }

  function getDriverName(trip: any) {
    return trip.driver_name || trip.assigned_driver_name || "Not Assigned";
  }

  function getDriverPhone(trip: any) {
    return trip.driver_phone || trip.assigned_driver_phone || "";
  }

  function getTripDate(trip: any) {
    return trip.date || trip.ride_date || trip.trip_date || "Not Set";
  }

  function getTripTime(trip: any) {
    return trip.time || trip.ride_time || trip.trip_time || "Not Set";
  }

  function getSourceLabel(trip: any) {
    const source = String(trip.source || "app").toLowerCase();
    return source === "website" ? "Website Booking" : "App Booking";
  }

  function getTripTotal(trip: any) {
    return Number(trip.total || trip.total_fare || 0).toFixed(2);
  }

  function openLiveMap(trip: any) {
    router.push({
      pathname: "/live-map" as any,
      params: {
        bookingId: String(trip.id),
      },
    });
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Loading Live Trips...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadTrips();
          }}
          tintColor="#d4af37"
        />
      }
    >
      <Text style={styles.title}>🚘 Live Trips Dashboard</Text>

      <Text style={styles.subtitle}>
        All website and app ride requests visible to Angel Express operations.
      </Text>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back to Dashboard</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.refreshButton} onPress={loadTrips}>
        <Text style={styles.refreshButtonText}>Refresh Trips</Text>
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{trips.length}</Text>
          <Text style={styles.statLabel}>Total Bookings Showing</Text>
        </View>
      </View>

      {trips.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No bookings showing</Text>
          <Text style={styles.emptyText}>
            Website and app bookings will appear here once they are saved in Supabase.
          </Text>
        </View>
      ) : (
        trips.map((trip) => {
          const passengerName = getPassengerName(trip);
          const passengerPhone = getPassengerPhone(trip);
          const pickup = getPickup(trip);
          const dropoff = getDropoff(trip);
          const driverName = getDriverName(trip);
          const driverPhone = getDriverPhone(trip);

          return (
            <View key={String(trip.id)} style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sourceBadge}>{getSourceLabel(trip)}</Text>
                  <Text style={styles.tripTitle}>Trip #{trip.id}</Text>
                  <Text style={styles.tripSubTitle}>{passengerName}</Text>
                </View>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>
                    {trip.status || "No Status"}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.tripText}>
                Passenger Email: {trip.email || "Not Available"}
              </Text>

              <Text style={styles.tripText}>
                Passenger Phone: {passengerPhone || "Not Available"}
              </Text>

              <Text style={styles.tripText}>Pickup: {pickup}</Text>
              <Text style={styles.tripText}>Drop-off: {dropoff}</Text>
              <Text style={styles.tripText}>Date: {getTripDate(trip)}</Text>
              <Text style={styles.tripText}>Time: {getTripTime(trip)}</Text>

              <Text style={styles.tripText}>
                Trip Type: {trip.trip_type || trip.tripType || "One Way"}
              </Text>

              <Text style={styles.tripText}>
                Ride Category: {trip.ride_category || "Standard Ride"}
              </Text>

              <Text style={styles.tripText}>
                Passengers: {trip.passengers || 1}
              </Text>

              <Text style={styles.tripText}>
                Luggage: {trip.luggage_count || 0}
              </Text>

              <Text style={styles.tripText}>
                Total Fare: ${getTripTotal(trip)}
              </Text>

              <Text style={styles.driver}>Driver: {driverName}</Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.callButton, !passengerPhone && styles.disabledButton]}
                  onPress={() => callNumber(passengerPhone)}
                >
                  <Text style={styles.buttonText}>Call Passenger</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smsButton, !passengerPhone && styles.disabledButton]}
                  onPress={() =>
                    textNumber(
                      passengerPhone,
                      `Hello ${passengerName}, this is Angel Express regarding your trip from ${pickup} to ${dropoff}.`
                    )
                  }
                >
                  <Text style={styles.buttonText}>Text Passenger</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.driverButton, !driverPhone && styles.disabledButton]}
                  onPress={() => callNumber(driverPhone)}
                >
                  <Text style={styles.buttonText}>Call Driver</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.driverButton, !driverPhone && styles.disabledButton]}
                  onPress={() =>
                    textNumber(
                      driverPhone,
                      `Angel Express dispatch update for Trip #${trip.id}: Passenger ${passengerName}, pickup ${pickup}, drop-off ${dropoff}.`
                    )
                  }
                >
                  <Text style={styles.buttonText}>Text Driver</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.mapButton}
                onPress={() => openLiveMap(trip)}
              >
                <Text style={styles.mapButtonText}>Open Live Map</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07111f",
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#07111f",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    marginTop: 50,
  },
  subtitle: {
    color: "#d4af37",
    marginBottom: 14,
    lineHeight: 21,
  },
  backButton: {
    backgroundColor: "rgba(212,175,55,0.15)",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  backButtonText: {
    color: "#d4af37",
    fontWeight: "900",
    textAlign: "center",
  },
  refreshButton: {
    backgroundColor: "#d4af37",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  refreshButtonText: {
    color: "#07111f",
    fontWeight: "900",
    textAlign: "center",
  },
  statsRow: {
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#d4af37",
  },
  statNumber: {
    fontSize: 36,
    fontWeight: "900",
    color: "#d4af37",
  },
  statLabel: {
    color: "#fff",
  },
  emptyCard: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  emptyTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 17,
    marginBottom: 6,
  },
  emptyText: {
    color: "#cbd5e1",
    lineHeight: 21,
  },
  tripCard: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  tripHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  sourceBadge: {
    alignSelf: "flex-start",
    color: "#d4af37",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
    backgroundColor: "rgba(212,175,55,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 8,
    overflow: "hidden",
  },
  tripTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
  },
  tripSubTitle: {
    color: "#cbd5e1",
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: "#d4af37",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 150,
  },
  statusBadgeText: {
    color: "#07111f",
    fontWeight: "900",
    fontSize: 11,
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#1e293b",
    marginVertical: 14,
  },
  tripText: {
    color: "#fff",
    marginBottom: 6,
    lineHeight: 20,
  },
  driver: {
    color: "#d4af37",
    marginTop: 8,
    marginBottom: 10,
    fontWeight: "800",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  callButton: {
    flex: 1,
    backgroundColor: "#22c55e",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  smsButton: {
    flex: 1,
    backgroundColor: "#3b82f6",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  driverButton: {
    flex: 1,
    backgroundColor: "#d4af37",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  mapButton: {
    marginTop: 14,
    backgroundColor: "#d4af37",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  mapButtonText: {
    color: "#07111f",
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.45,
  },
  buttonText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 12,
  },
  bottomSpace: {
    height: 50,
  },
});