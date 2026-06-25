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

export default function UpcomingTripsScreen() {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);

  const [showToday, setShowToday] = useState(true);
  const [showThisWeek, setShowThisWeek] = useState(false);
  const [showFuture, setShowFuture] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadUpcomingTrips();
    }, [])
  );

  async function loadUpcomingTrips() {
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
        .in("status", ["assigned", "confirmed"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTrips(data || []);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to load upcoming trips.");
    } finally {
      setLoading(false);
    }
  }

  function getTripDateValue(trip: any) {
    return (
      trip.date ||
      trip.ride_date ||
      trip.pickup_date ||
      trip.trip_date ||
      null
    );
  }

  function parseTripDate(trip: any) {
    const rawDate = getTripDateValue(trip);

    if (!rawDate) return null;

    const parsed = new Date(rawDate);

    if (isNaN(parsed.getTime())) return null;

    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  function isToday(trip: any) {
    const tripDate = parseTripDate(trip);
    if (!tripDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tripDate.getTime() === today.getTime();
  }

  function isThisWeek(trip: any) {
    const tripDate = parseTripDate(trip);
    if (!tripDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    return tripDate > today && tripDate <= sevenDaysFromNow;
  }

  function isFutureTrip(trip: any) {
    const tripDate = parseTripDate(trip);
    if (!tripDate) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    return tripDate > sevenDaysFromNow;
  }

  const todayTrips = trips.filter(isToday);
  const thisWeekTrips = trips.filter(isThisWeek);
  const futureTrips = trips.filter(isFutureTrip);

  function getPickup(trip: any) {
    return (
      trip.pickup ||
      trip.pickup_address ||
      trip.pickup_location ||
      "Not provided"
    );
  }

  function getDropoff(trip: any) {
    return (
      trip.dropoff ||
      trip.dropoff_address ||
      trip.dropoff_location ||
      "Not provided"
    );
  }

  function getTripTitle(trip: any) {
    return trip.route || `${getPickup(trip)} → ${getDropoff(trip)}`;
  }

  function getFare(trip: any) {
    return (
      Number(trip.total) ||
      Number(trip.total_fare) ||
      Number(trip.amount) ||
      0
    );
  }

  function getDriverPayout(trip: any) {
    const driverShare = Number(trip.driver_share);

    if (driverShare > 0) {
      return driverShare;
    }

    return getFare(trip) * 0.7;
  }

  function renderTripCard(trip: any) {
    return (
      <View key={trip.id} style={styles.tripCard}>
        <Text style={styles.tripTitle}>{getTripTitle(trip)}</Text>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            Status: {String(trip.status).replace("_", " ").toUpperCase()}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Passenger</Text>
          <Text style={styles.value}>
            {trip.name || trip.passenger_name || "Not provided"}
          </Text>
        </View>

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
            {getTripDateValue(trip) || "Not set"}
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
            <Text style={styles.moneyValue}>${getFare(trip).toFixed(2)}</Text>
          </View>

          <View>
            <Text style={styles.moneyLabel}>Your 70%</Text>
            <Text style={styles.payoutValue}>
              ${getDriverPayout(trip).toFixed(2)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/active-trip")}
        >
          <Text style={styles.primaryButtonText}>View Active Trip</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderDropdownSection(
    title: string,
    count: number,
    expanded: boolean,
    setExpanded: (value: boolean) => void,
    sectionTrips: any[]
  ) {
    return (
      <View style={styles.sectionWrapper}>
        <TouchableOpacity
          style={styles.dropdownHeader}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.dropdownTitle}>
            {title} ({count})
          </Text>

          <Text style={styles.dropdownIcon}>{expanded ? "▲" : "▼"}</Text>
        </TouchableOpacity>

        {expanded && (
          <View style={styles.dropdownContent}>
            {sectionTrips.length === 0 ? (
              <View style={styles.emptySmallCard}>
                <Text style={styles.emptySmallText}>
                  No trips in this section.
                </Text>
              </View>
            ) : (
              sectionTrips.map(renderTripCard)
            )}
          </View>
        )}
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
            <RefreshControl
              refreshing={loading}
              onRefresh={loadUpcomingTrips}
              tintColor="#d4af37"
            />
          }
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/driver-dashboard")}
          >
            <Text style={styles.backButtonText}>← Dashboard</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Upcoming Trips</Text>

          <Text style={styles.subtitle}>
            Accepted Angel Express trips organized by schedule.
          </Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#d4af37" size="large" />
              <Text style={styles.loadingText}>Loading upcoming trips...</Text>
            </View>
          ) : trips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Upcoming Trips</Text>

              <Text style={styles.emptyText}>
                You have not accepted any upcoming trips yet.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push("/find-trips")}
              >
                <Text style={styles.primaryButtonText}>Find Trips</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {renderDropdownSection(
                "Today",
                todayTrips.length,
                showToday,
                setShowToday,
                todayTrips
              )}

              {renderDropdownSection(
                "This Week",
                thisWeekTrips.length,
                showThisWeek,
                setShowThisWeek,
                thisWeekTrips
              )}

              {renderDropdownSection(
                "Future Trips",
                futureTrips.length,
                showFuture,
                setShowFuture,
                futureTrips
              )}
            </>
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

  backButton: {
    borderWidth: 1,
    borderColor: "#d4af37",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.88)",
    alignSelf: "flex-start",
    marginBottom: 20,
  },

  backButtonText: {
    color: "#d4af37",
    fontWeight: "900",
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
    marginBottom: 18,
  },

  sectionWrapper: {
    marginBottom: 14,
  },

  dropdownHeader: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 18,
    padding: 18,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dropdownTitle: {
    color: "#d4af37",
    fontSize: 19,
    fontWeight: "900",
  },

  dropdownIcon: {
    color: "#d4af37",
    fontSize: 18,
    fontWeight: "900",
  },

  dropdownContent: {
    marginBottom: 10,
  },

  emptySmallCard: {
    backgroundColor: "rgba(15,23,42,0.75)",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },

  emptySmallText: {
    color: "#cbd5e1",
    textAlign: "center",
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

  statusBadge: {
    backgroundColor: "rgba(212,175,55,0.18)",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },

  statusText: {
    color: "#d4af37",
    fontWeight: "900",
    textAlign: "center",
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
    marginBottom: 18,
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

  primaryButton: {
    backgroundColor: "#d4af37",
    paddingVertical: 16,
    borderRadius: 16,
  },

  primaryButtonText: {
    color: "#07111f",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase",
  },
});