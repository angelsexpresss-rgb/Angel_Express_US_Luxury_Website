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

export default function PassengerManagementScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadPassengerData();
    }, [])
  );

  async function loadPassengerData() {
    try {
      setLoading(true);

      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (bookingsError) throw bookingsError;

      const { data: ratingsData } = await supabase
        .from("passenger_ratings")
        .select("*");

      setBookings(bookingsData || []);
      setRatings(ratingsData || []);
    } catch (err: any) {
      Alert.alert("Passenger Management Error", err.message || "Unable to load passengers.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function cleanPhone(phone?: string) {
    return String(phone || "").replace(/[^\d+]/g, "");
  }

  function callNumber(phone?: string) {
    const cleaned = cleanPhone(phone);
    if (!cleaned) return Alert.alert("No phone number", "Passenger phone number not available.");
    Linking.openURL(`tel:${cleaned}`);
  }

  function smsNumber(phone?: string, message?: string) {
    const cleaned = cleanPhone(phone);
    if (!cleaned) return Alert.alert("No phone number", "Passenger phone number not available.");
    Linking.openURL(`sms:${cleaned}?body=${encodeURIComponent(message || "")}`);
  }

  function whatsappNumber(phone?: string, message?: string) {
    const cleaned = cleanPhone(phone);
    if (!cleaned) return Alert.alert("No phone number", "Passenger WhatsApp not available.");
    Linking.openURL(`https://wa.me/${cleaned}?text=${encodeURIComponent(message || "")}`);
  }

  function getPassengerName(item: any) {
    return item.name || item.passenger_name || item.full_name || "Passenger";
  }

  function getPassengerPhone(item: any) {
    return item.phone || item.passenger_phone || "";
  }

  function getPassengerEmail(item: any) {
    return item.email || item.passenger_email || "";
  }

  function getPassengerKey(item: any) {
    return item.user_id || getPassengerEmail(item) || getPassengerPhone(item) || getPassengerName(item);
  }

  function getPassengerBookings(passenger: any) {
    const key = getPassengerKey(passenger);
    return bookings.filter((booking) => getPassengerKey(booking) === key);
  }

  function getCompletedTrips(passenger: any) {
    return getPassengerBookings(passenger).filter((trip) =>
      ["completed", "Completed"].includes(trip.status)
    );
  }

  function getLifetimeRevenue(passenger: any) {
    return getCompletedTrips(passenger).reduce((sum, trip) => {
      return sum + Number(trip.total || trip.total_price || trip.price || 0);
    }, 0);
  }

  function getPassengerRatings(passenger: any) {
    const email = getPassengerEmail(passenger);
    const userId = passenger.user_id;

    return ratings.filter((rating) => {
      return (
        (userId && rating.passenger_user_id === userId) ||
        (email && rating.passenger_email === email)
      );
    });
  }

  function getAverageRating(passenger: any) {
    const passengerRatings = getPassengerRatings(passenger);

    if (passengerRatings.length === 0) return "5.0";

    const average =
      passengerRatings.reduce(
        (sum, item) => sum + Number(item.overall_rating || 5),
        0
      ) / passengerRatings.length;

    return average.toFixed(1);
  }

  function getFrequentRoute(passenger: any) {
    const passengerBookings = getPassengerBookings(passenger);
    const routeCount: any = {};

    passengerBookings.forEach((trip) => {
      const pickup = trip.pickup || trip.pickup_location || "Pickup";
      const dropoff = trip.dropoff || trip.dropoff_location || "Dropoff";
      const route = `${pickup} → ${dropoff}`;
      routeCount[route] = (routeCount[route] || 0) + 1;
    });

    const sortedRoutes = Object.entries(routeCount).sort(
      (a: any, b: any) => b[1] - a[1]
    );

    return sortedRoutes[0]?.[0] || "No frequent route yet";
  }

  function blacklistPassenger(passenger: any) {
    Alert.alert(
      "Blacklist Passenger",
      `Flag ${getPassengerName(passenger)} as blacklisted?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Blacklist",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              "Passenger Flagged",
              "Next upgrade will save blacklist status into passenger profile table."
            ),
        },
      ]
    );
  }

  function openPassengerChat(passenger: any) {
    const passengerBookings = getPassengerBookings(passenger);
    const latestTrip = passengerBookings[0];

    if (!latestTrip) {
      Alert.alert("No trip", "Passenger has no trip history for chat.");
      return;
    }

    router.push({
      pathname: "/owner-chat",
      params: {
        bookingId: String(latestTrip.id),
        receiverRole: "passenger",
        passengerName: getPassengerName(passenger),
      },
    } as any);
  }

  const passengerMap: any = {};

  bookings.forEach((booking) => {
    const key = getPassengerKey(booking);
    if (!passengerMap[key]) passengerMap[key] = booking;
  });

  const passengers = Object.values(passengerMap);

  const totalPassengers = passengers.length;
  const completedTrips = bookings.filter((trip) =>
    ["completed", "Completed"].includes(trip.status)
  );
  const lifetimeRevenue = completedTrips.reduce(
    (sum, trip) => sum + Number(trip.total || trip.total_price || trip.price || 0),
    0
  );
  const passengersWithEmergency = passengers.filter(
    (p: any) => p.emergency_contact_name || p.emergency_contact_phone
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Loading Passenger Management...</Text>
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
            loadPassengerData();
          }}
        />
      }
    >
      <Text style={styles.title}>👤 Passenger Management</Text>

      <Text style={styles.subtitle}>
        View passenger profiles, emergency contacts, ratings, trip history,
        payment records, frequent routes, notes, and lifetime revenue.
      </Text>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back to Dashboard</Text>
      </TouchableOpacity>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalPassengers}</Text>
          <Text style={styles.statLabel}>Passengers</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{completedTrips.length}</Text>
          <Text style={styles.statLabel}>Completed Trips</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{passengersWithEmergency.length}</Text>
          <Text style={styles.statLabel}>Emergency Contacts</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>${lifetimeRevenue.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Lifetime Revenue</Text>
        </View>
      </View>

      {passengers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No passengers found yet.</Text>
        </View>
      ) : (
        passengers.map((passenger: any) => {
          const passengerName = getPassengerName(passenger);
          const passengerPhone = getPassengerPhone(passenger);
          const passengerTrips = getPassengerBookings(passenger);
          const passengerCompleted = getCompletedTrips(passenger);
          const revenue = getLifetimeRevenue(passenger);
          const averageRating = getAverageRating(passenger);
          const frequentRoute = getFrequentRoute(passenger);

          return (
            <View key={getPassengerKey(passenger)} style={styles.passengerCard}>
              <Text style={styles.passengerName}>{passengerName}</Text>

              <Text style={styles.infoText}>Email: {getPassengerEmail(passenger) || "Not available"}</Text>
              <Text style={styles.infoText}>Phone: {passengerPhone || "Not available"}</Text>
              <Text style={styles.infoText}>Rating: ⭐ {averageRating}</Text>
              <Text style={styles.infoText}>Total Trips: {passengerTrips.length}</Text>
              <Text style={styles.infoText}>Completed Trips: {passengerCompleted.length}</Text>
              <Text style={styles.moneyText}>Lifetime Revenue: ${revenue.toFixed(2)}</Text>

              <Text style={styles.sectionMiniTitle}>Emergency Contact</Text>
              <Text style={styles.infoText}>
                Name: {passenger.emergency_contact_name || "Not provided"}
              </Text>
              <Text style={styles.infoText}>
                Phone: {passenger.emergency_contact_phone || "Not provided"}
              </Text>

              <Text style={styles.sectionMiniTitle}>Frequent Route</Text>
              <Text style={styles.infoText}>{frequentRoute}</Text>

              <Text style={styles.sectionMiniTitle}>Notes / Preferences</Text>
              <Text style={styles.infoText}>
                Notes: {passenger.notes || passenger.special_notes || "No notes"}
              </Text>
              <Text style={styles.infoText}>
                Preferences: {passenger.preferences || passenger.ride_preferences || "No preferences"}
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.callButton} onPress={() => callNumber(passengerPhone)}>
                  <Text style={styles.darkButtonText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.smsButton}
                  onPress={() =>
                    smsNumber(
                      passengerPhone,
                      `Hello ${passengerName}, this is Angel Express support.`
                    )
                  }
                >
                  <Text style={styles.whiteButtonText}>SMS</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.whatsappButton}
                  onPress={() =>
                    whatsappNumber(
                      passengerPhone,
                      `Hello ${passengerName}, this is Angel Express support.`
                    )
                  }
                >
                  <Text style={styles.whiteButtonText}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.chatButton} onPress={() => openPassengerChat(passenger)}>
                  <Text style={styles.whiteButtonText}>In-App Chat</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.blacklistButton}
                onPress={() => blacklistPassenger(passenger)}
              >
                <Text style={styles.whiteButtonText}>Blacklist Passenger</Text>
              </TouchableOpacity>

              <Text style={styles.sectionMiniTitle}>Recent Trip History</Text>

              {passengerTrips.slice(0, 3).map((trip: any) => (
                <View key={trip.id} style={styles.tripMiniCard}>
                  <Text style={styles.tripMiniText}>Trip #{trip.id}</Text>
                  <Text style={styles.tripMiniText}>Status: {trip.status || "Unknown"}</Text>
                  <Text style={styles.tripMiniText}>
                    {trip.pickup || "Pickup"} → {trip.dropoff || "Dropoff"}
                  </Text>
                  <Text style={styles.tripMiniText}>
                    Total: ${Number(trip.total || trip.total_price || trip.price || 0).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          );
        })
      )}

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07111f", padding: 20 },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#07111f",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: "#fff", marginTop: 10 },
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
    marginBottom: 18,
  },
  backButtonText: {
    color: "#d4af37",
    fontWeight: "900",
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#d4af37",
    marginBottom: 12,
  },
  statNumber: {
    color: "#d4af37",
    fontSize: 28,
    fontWeight: "900",
  },
  statLabel: { color: "#fff", marginTop: 4 },
  emptyCard: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  emptyText: { color: "#cbd5e1" },
  passengerCard: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 16,
  },
  passengerName: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 10,
  },
  sectionMiniTitle: {
    color: "#d4af37",
    fontWeight: "900",
    fontSize: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    color: "#cbd5e1",
    marginBottom: 5,
    lineHeight: 20,
  },
  moneyText: {
    color: "#22c55e",
    fontWeight: "900",
    marginTop: 5,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  callButton: {
    flex: 1,
    backgroundColor: "#d4af37",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  smsButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  whatsappButton: {
    flex: 1,
    backgroundColor: "#22c55e",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  chatButton: {
    flex: 1,
    backgroundColor: "#7c3aed",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  blacklistButton: {
    backgroundColor: "#dc2626",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  darkButtonText: {
    color: "#07111f",
    fontWeight: "900",
    fontSize: 12,
  },
  whiteButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  tripMiniCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  tripMiniText: {
    color: "#cbd5e1",
    marginBottom: 4,
  },
  bottomSpace: { height: 50 },
});