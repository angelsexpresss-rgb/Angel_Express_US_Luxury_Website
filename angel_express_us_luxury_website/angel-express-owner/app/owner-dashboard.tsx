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

export default function OwnerDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [bookings, setBookings] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [ownersName, setOwnersName] = useState("Owner");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/owner-login");
        return;
      }

      const { data: ownerData } = await supabase
        .from("owners")
        .select("*")
        .eq("id", user.id)
        .single();

      if (ownerData?.first_name) {
        setOwnersName(ownerData.first_name);
      }

      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (bookingsError) throw bookingsError;

      const { data: driversData, error: driversError } = await supabase
        .from("drivers")
        .select("*")
        .order("created_at", { ascending: false });

      if (driversError) throw driversError;

      setBookings(bookingsData || []);
      setDrivers(driversData || []);
    } catch (err: any) {
      Alert.alert("Dashboard Error", err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function refreshDashboard() {
    setRefreshing(true);
    await loadDashboard();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/owner-login");
  }

  const activeTrips = bookings.filter((b) =>
    ["In Progress", "Driver Assigned", "Picked Up", "Arrived at Pickup"].includes(
      b.status
    )
  );

  const upcomingTrips = bookings.filter((b) =>
    ["Pending", "Confirmed", "Scheduled"].includes(b.status)
  );

  const completedTrips = bookings.filter((b) => b.status === "Completed");
  const cancelledTrips = bookings.filter((b) => b.status === "Cancelled");

  const onlineDrivers = drivers.filter((d) => d.is_online);
  const approvedDrivers = drivers.filter((d) => d.status === "approved");

  const unpaidBookings = bookings.filter(
    (b) =>
      b.payment_status === "unpaid" ||
      b.payment_status === "Unpaid" ||
      b.paid === false
  );

  const todayRevenue = completedTrips.reduce((sum, trip) => {
    const today = new Date().toDateString();
    const tripDate = new Date(
      trip.completed_at || trip.updated_at || trip.created_at
    ).toDateString();

    if (tripDate !== today) return sum;

    return sum + Number(trip.total || trip.total_price || trip.price || 0);
  }, 0);

  const companyShareToday = todayRevenue * 0.3;
  const driverPayoutToday = todayRevenue * 0.7;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Loading Owner Dashboard...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/owner-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshDashboard} />
          }
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.welcome}>Welcome, {ownersName}</Text>
              <Text style={styles.subtitle}>Angel Express Control Center</Text>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>Live Operations Overview</Text>
            <Text style={styles.alertText}>
              Monitor passenger trips, drivers, payments, and safety alerts from
              one owner dashboard.
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🚘</Text>
              <Text style={styles.statValue}>{activeTrips.length}</Text>
              <Text style={styles.statLabel}>Active Trips</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statIcon}>📅</Text>
              <Text style={styles.statValue}>{upcomingTrips.length}</Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🟢</Text>
              <Text style={styles.statValue}>{onlineDrivers.length}</Text>
              <Text style={styles.statLabel}>Drivers Online</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statIcon}>💳</Text>
              <Text style={styles.statValue}>{unpaidBookings.length}</Text>
              <Text style={styles.statLabel}>Unpaid</Text>
            </View>
          </View>

          <View style={styles.revenueCard}>
            <Text style={styles.revenueTitle}>Today’s Revenue</Text>
            <Text style={styles.revenueAmount}>${todayRevenue.toFixed(2)}</Text>

            <View style={styles.revenueRow}>
              <Text style={styles.revenueText}>
                Driver 70%: ${driverPayoutToday.toFixed(2)}
              </Text>
              <Text style={styles.revenueText}>
                Company 30%: ${companyShareToday.toFixed(2)}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/live-trips")}
            >
              <Text style={styles.actionTitle}>Live Trips</Text>
              <Text style={styles.actionText}>
                Oversee all current active rides.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/live-map")}
            >
            <Text style={styles.actionTitle}>Live Trip Map</Text>
            <Text style={styles.actionText}>
             Track every live driver and route.
            </Text>
             </TouchableOpacity>

            <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/contact-center")}
            >
          <Text style={styles.actionTitle}>Contact Center</Text>
          <Text style={styles.actionText}>
          Call or message drivers and passengers.
         </Text>
         </TouchableOpacity>

         <TouchableOpacity
  style={styles.actionCard}
  onPress={() => router.push("/booking-management")}
>
  <Text style={styles.actionTitle}>Booking Management</Text>
  <Text style={styles.actionText}>
    Approve, assign, edit, or cancel bookings.
  </Text>
</TouchableOpacity>

          <TouchableOpacity
  style={styles.actionCard}
  onPress={() => router.push("/driver-management" as any)}
>
  <Text style={styles.actionTitle}>Driver Management</Text>
  <Text style={styles.actionText}>
    Verify drivers, payouts, ratings, and complaints.
  </Text>
</TouchableOpacity>

   <TouchableOpacity
  style={styles.actionCard}
  onPress={() => router.push("/passenger-management" as any)}
>
  <Text style={styles.actionTitle}>Passenger Management</Text>
  <Text style={styles.actionText}>
    View passenger history, emergency contacts, and notes.
  </Text>
</TouchableOpacity>

           <TouchableOpacity
  style={styles.actionCard}
  onPress={() => router.push("/payment-management" as any)}
>
  <Text style={styles.actionTitle}>Payment Management</Text>
  <Text style={styles.actionText}>
    Track paid/unpaid rides, driver 70%, and company 30%.
  </Text>
</TouchableOpacity>

            <TouchableOpacity
             style={styles.emergencyCard}
             onPress={() => router.push("/emergency-center")}
            >
            <Text style={styles.emergencyTitle}>Safety Alerts</Text>
            <Text style={styles.emergencyText}>
             Panic alerts, delayed trips, incident notes, and shared location.
            </Text>
           </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Current Active Trips</Text>

          {activeTrips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No active trips right now.</Text>
            </View>
          ) : (
            activeTrips.slice(0, 5).map((trip) => (
              <View key={trip.id} style={styles.tripCard}>
                <Text style={styles.tripRoute}>
                  {trip.pickup || "Pickup"} → {trip.dropoff || "Dropoff"}
                </Text>

                <Text style={styles.tripText}>
                  Passenger: {trip.name || trip.passenger_name || "Passenger"}
                </Text>

                <Text style={styles.tripText}>
                  Driver:{" "}
                  {trip.assigned_driver_name ||
                    trip.driver_name ||
                    "Not assigned"}
                </Text>

                <Text style={styles.tripStatus}>Status: {trip.status}</Text>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>Drivers Online</Text>

          {onlineDrivers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No drivers online right now.</Text>
            </View>
          ) : (
            onlineDrivers.slice(0, 5).map((driver) => (
              <View key={driver.id} style={styles.driverCard}>
                <Text style={styles.driverName}>
                  {driver.first_name || "Driver"} {driver.last_name || ""}
                </Text>

                <Text style={styles.driverText}>
                  Rating: {driver.rating || 5} • Level:{" "}
                  {driver.driver_level || "Bronze"}
                </Text>

                <Text style={styles.driverStatus}>🟢 Online</Text>
              </View>
            ))
          )}

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{completedTrips.length}</Text>
              <Text style={styles.summaryLabel}>Completed Trips</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{cancelledTrips.length}</Text>
              <Text style={styles.summaryLabel}>Cancelled Trips</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{approvedDrivers.length}</Text>
              <Text style={styles.summaryLabel}>Approved Drivers</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.76)" },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#07111f",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: "#e5e7eb", marginTop: 14, fontWeight: "700" },
  container: { flexGrow: 1, padding: 22, paddingTop: 60, paddingBottom: 50 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 18,
  },
  welcome: { color: "#ffffff", fontSize: 28, fontWeight: "900" },
  subtitle: { color: "#d4af37", fontSize: 14, fontWeight: "900", marginTop: 4 },
  logoutButton: {
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(15,23,42,0.85)",
  },
  logoutText: { color: "#d4af37", fontWeight: "900", fontSize: 12 },
  alertCard: {
    backgroundColor: "rgba(15,23,42,0.94)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.65)",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
  },
  alertTitle: { color: "#ffffff", fontSize: 22, fontWeight: "900", marginBottom: 8 },
  alertText: { color: "#cbd5e1", fontSize: 14, lineHeight: 21 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  statCard: {
    width: "48%",
    backgroundColor: "rgba(15,23,42,0.94)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.55)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  statIcon: { fontSize: 24, marginBottom: 8 },
  statValue: { color: "#d4af37", fontSize: 28, fontWeight: "900" },
  statLabel: { color: "#e5e7eb", fontSize: 13, marginTop: 4 },
  revenueCard: {
    backgroundColor: "rgba(2,6,23,0.86)",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 22,
    padding: 20,
    marginBottom: 24,
  },
  revenueTitle: { color: "#ffffff", fontSize: 19, fontWeight: "900" },
  revenueAmount: {
    color: "#d4af37",
    fontSize: 36,
    fontWeight: "900",
    marginVertical: 8,
  },
  revenueRow: { gap: 4 },
  revenueText: { color: "#cbd5e1", fontSize: 14 },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
    marginTop: 8,
  },
  actionGrid: { marginBottom: 16 },
  actionCard: {
    backgroundColor: "rgba(15,23,42,0.94)",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },
  actionTitle: { color: "#ffffff", fontSize: 18, fontWeight: "900", marginBottom: 5 },
  actionText: { color: "#cbd5e1", fontSize: 14, lineHeight: 21 },
  emergencyCard: {
    backgroundColor: "rgba(127,29,29,0.82)",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },
  emergencyTitle: { color: "#ffffff", fontSize: 18, fontWeight: "900", marginBottom: 5 },
  emergencyText: { color: "#fee2e2", fontSize: 14, lineHeight: 21 },
  emptyCard: {
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  emptyText: { color: "#cbd5e1", fontSize: 14 },
  tripCard: {
    backgroundColor: "rgba(15,23,42,0.94)",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },
  tripRoute: { color: "#ffffff", fontSize: 17, fontWeight: "900", marginBottom: 8 },
  tripText: { color: "#cbd5e1", fontSize: 14, marginBottom: 5 },
  tripStatus: { color: "#d4af37", fontSize: 14, fontWeight: "900", marginTop: 5 },
  driverCard: {
    backgroundColor: "rgba(15,23,42,0.94)",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },
  driverName: { color: "#ffffff", fontSize: 18, fontWeight: "900", marginBottom: 5 },
  driverText: { color: "#cbd5e1", fontSize: 14, marginBottom: 5 },
  driverStatus: { color: "#22c55e", fontSize: 14, fontWeight: "900" },
  summaryRow: { gap: 12, marginTop: 10 },
  summaryCard: {
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 18,
    padding: 18,
  },
  summaryValue: { color: "#d4af37", fontSize: 28, fontWeight: "900" },
  summaryLabel: { color: "#e5e7eb", fontSize: 14, marginTop: 4 },
});