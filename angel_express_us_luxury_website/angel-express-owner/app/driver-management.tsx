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

export default function DriverManagementScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [drivers, setDrivers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [liveLocations, setLiveLocations] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadDriverData();
    }, [])
  );

  async function loadDriverData() {
    try {
      setLoading(true);

      const { data: driversData, error: driversError } = await supabase
        .from("drivers")
        .select("*")
        .order("created_at", { ascending: false });

      if (driversError) throw driversError;

      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (bookingsError) throw bookingsError;

      const { data: locationsData, error: locationsError } = await supabase
        .from("driver_live_locations")
        .select("*")
        .order("last_updated", { ascending: false });

      if (locationsError) throw locationsError;

      const { data: alertsData, error: alertsError } = await supabase
        .from("emergency_alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (alertsError) throw alertsError;

      setDrivers(driversData || []);
      setBookings(bookingsData || []);
      setLiveLocations(locationsData || []);
      setAlerts(alertsData || []);
    } catch (err: any) {
      Alert.alert("Driver Management Error", err.message || "Unable to load drivers.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function getDriverName(driver: any) {
    return (
      `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
      driver.full_name ||
      driver.name ||
      "Driver"
    );
  }

  function getDriverPhone(driver: any) {
    return driver.phone || driver.driver_phone || "";
  }

  function cleanPhone(phone?: string) {
    return String(phone || "").replace(/[^\d+]/g, "");
  }

  function callDriver(phone?: string) {
    const cleaned = cleanPhone(phone);

    if (!cleaned) {
      Alert.alert("No phone number", "Driver phone number is not available.");
      return;
    }

    Linking.openURL(`tel:${cleaned}`);
  }

  function smsDriver(phone?: string, message?: string) {
    const cleaned = cleanPhone(phone);

    if (!cleaned) {
      Alert.alert("No phone number", "Driver phone number is not available.");
      return;
    }

    Linking.openURL(`sms:${cleaned}?body=${encodeURIComponent(message || "")}`);
  }

  function whatsappDriver(phone?: string, message?: string) {
    const cleaned = cleanPhone(phone);

    if (!cleaned) {
      Alert.alert("No phone number", "Driver WhatsApp number is not available.");
      return;
    }

    Linking.openURL(`https://wa.me/${cleaned}?text=${encodeURIComponent(message || "")}`);
  }

  async function updateDriverStatus(driver: any, status: string, successMessage: string) {
    const { error } = await supabase
      .from("drivers")
      .update({ status })
      .eq("id", driver.id);

    if (error) {
      Alert.alert("Update Failed", error.message);
      return;
    }

    Alert.alert("Success", successMessage);
    loadDriverData();
  }

  function approveDriver(driver: any) {
    updateDriverStatus(driver, "approved", `${getDriverName(driver)} approved.`);
  }

  function rejectDriver(driver: any) {
    Alert.alert("Reject Driver", `Reject ${getDriverName(driver)}?`, [
      { text: "No", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: () => updateDriverStatus(driver, "rejected", "Driver rejected."),
      },
    ]);
  }

  function suspendDriver(driver: any) {
    Alert.alert("Suspend Driver", `Suspend ${getDriverName(driver)}?`, [
      { text: "No", style: "cancel" },
      {
        text: "Suspend",
        style: "destructive",
        onPress: () => updateDriverStatus(driver, "suspended", "Driver suspended."),
      },
    ]);
  }

  function reactivateDriver(driver: any) {
    updateDriverStatus(driver, "approved", `${getDriverName(driver)} reactivated.`);
  }

  function openDriverChat(driver: any) {
    Alert.alert(
      "Driver Chat",
      "For now, driver in-app chat is connected through active trip chats. Direct driver-only chat will be added later."
    );
  }

  function getDriverBookings(driver: any) {
    return bookings.filter((booking) => booking.driver_id === driver.id);
  }

  function getCompletedTrips(driver: any) {
    return getDriverBookings(driver).filter((booking) =>
      ["completed", "Completed"].includes(booking.status)
    );
  }

  function getActiveTrip(driver: any) {
    return getDriverBookings(driver).find((booking) =>
      [
        "assigned",
        "driver_arrived",
        "in_progress",
        "Driver Assigned",
        "Arrived at Pickup",
        "Picked Up",
        "In Progress",
      ].includes(booking.status)
    );
  }

  function getDriverLiveLocation(driver: any) {
    return liveLocations.find((item) => item.driver_id === driver.id);
  }

  function getDriverAlerts(driver: any) {
    return alerts.filter((alert) => alert.driver_id === driver.id);
  }

  function getLifetimeEarnings(driver: any) {
    const completed = getCompletedTrips(driver);

    return completed.reduce((sum, trip) => {
      const fare = Number(trip.total || trip.total_price || trip.price || 0);
      return sum + fare * 0.7;
    }, 0);
  }

  function getWeeklyEarnings(driver: any) {
    const completed = getCompletedTrips(driver);
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    return completed.reduce((sum, trip) => {
      const completedAt = new Date(trip.completed_at || trip.updated_at || trip.created_at);

      if (completedAt < sevenDaysAgo) return sum;

      const fare = Number(trip.total || trip.total_price || trip.price || 0);
      return sum + fare * 0.7;
    }, 0);
  }

  function getPendingPayout(driver: any) {
    const completed = getCompletedTrips(driver);

    return completed.reduce((sum, trip) => {
      const payoutStatus =
        trip.driver_payout_status || trip.payout_status || trip.payment_status;

      if (payoutStatus === "paid" || payoutStatus === "driver_paid") return sum;

      const fare = Number(trip.total || trip.total_price || trip.price || 0);
      return sum + fare * 0.7;
    }, 0);
  }

  const totalDrivers = drivers.length;
  const onlineDrivers = drivers.filter((driver) => driver.is_online === true);
  const pendingDrivers = drivers.filter((driver) => driver.status === "pending");
  const approvedDrivers = drivers.filter((driver) => driver.status === "approved");
  const suspendedDrivers = drivers.filter((driver) => driver.status === "suspended");
  const activeDrivers = drivers.filter((driver) => getActiveTrip(driver));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Loading Driver Management...</Text>
      </View>
    );
  }

  function renderDriverCard(driver: any) {
    const driverName = getDriverName(driver);
    const driverPhone = getDriverPhone(driver);
    const completedTrips = getCompletedTrips(driver);
    const activeTrip = getActiveTrip(driver);
    const liveLocation = getDriverLiveLocation(driver);
    const driverAlerts = getDriverAlerts(driver);
    const weeklyEarnings = getWeeklyEarnings(driver);
    const lifetimeEarnings = getLifetimeEarnings(driver);
    const pendingPayout = getPendingPayout(driver);

    return (
      <View key={driver.id} style={styles.driverCard}>
        <View style={styles.driverHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>{driverName}</Text>
            <Text style={styles.driverSubText}>
              {driver.email || "No email"} • {driverPhone || "No phone"}
            </Text>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{driver.status || "unknown"}</Text>
          </View>
        </View>

        <Text style={styles.sectionMiniTitle}>Driver Monitoring</Text>

        <Text style={styles.infoText}>
          Online: {driver.is_online ? "🟢 Yes" : "⚪ No"}
        </Text>

        <Text style={styles.infoText}>
          Rating: ⭐ {driver.rating || "5.0"}
        </Text>

        <Text style={styles.infoText}>
          Completed Trips: {completedTrips.length}
        </Text>

        <Text style={styles.infoText}>
          Current Trip: {activeTrip ? `Trip #${activeTrip.id}` : "None"}
        </Text>

        <Text style={styles.infoText}>
          Live Location:{" "}
          {liveLocation
            ? `${Number(liveLocation.latitude).toFixed(4)}, ${Number(
                liveLocation.longitude
              ).toFixed(4)}`
            : "Not available"}
        </Text>

        <Text style={styles.sectionMiniTitle}>Payout Management</Text>

        <Text style={styles.moneyText}>
          Weekly Earnings 70%: ${weeklyEarnings.toFixed(2)}
        </Text>

        <Text style={styles.moneyText}>
          Lifetime Earnings 70%: ${lifetimeEarnings.toFixed(2)}
        </Text>

        <Text style={styles.warningText}>
          Pending Payout: ${pendingPayout.toFixed(2)}
        </Text>

        <Text style={styles.infoText}>
          Company 30% on completed rides is retained by Angel Express.
        </Text>

        <Text style={styles.sectionMiniTitle}>Driver Documents</Text>

        <Text style={styles.infoText}>
          Driver License: {driver.driver_license_url ? "Uploaded" : "Not uploaded"}
        </Text>

        <Text style={styles.infoText}>
          Insurance: {driver.insurance_url ? "Uploaded" : "Not uploaded"}
        </Text>

        <Text style={styles.infoText}>
          Vehicle Registration:{" "}
          {driver.vehicle_registration_url ? "Uploaded" : "Not uploaded"}
        </Text>

        <Text style={styles.infoText}>
          Profile Photo: {driver.profile_photo_url ? "Uploaded" : "Not uploaded"}
        </Text>

        <Text style={styles.sectionMiniTitle}>Driver Safety</Text>

        <Text style={styles.infoText}>
          Emergency Alerts Sent: {driverAlerts.length}
        </Text>

        <Text style={styles.infoText}>
          Safety Check-ins: {driver.safety_checkins || 0}
        </Text>

        <Text style={styles.infoText}>
          Complaints: {driver.complaints_count || 0}
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.goldButton} onPress={() => approveDriver(driver)}>
            <Text style={styles.darkButtonText}>Approve</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.redButton} onPress={() => rejectDriver(driver)}>
            <Text style={styles.whiteButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.orangeButton} onPress={() => suspendDriver(driver)}>
            <Text style={styles.whiteButtonText}>Suspend</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.greenButton} onPress={() => reactivateDriver(driver)}>
            <Text style={styles.darkButtonText}>Reactivate</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionMiniTitle}>Driver Contact</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.callButton} onPress={() => callDriver(driverPhone)}>
            <Text style={styles.darkButtonText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.smsButton}
            onPress={() =>
              smsDriver(driverPhone, `Hello ${driverName}, this is Angel Express dispatch.`)
            }
          >
            <Text style={styles.whiteButtonText}>SMS</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={() =>
              whatsappDriver(driverPhone, `Hello ${driverName}, this is Angel Express dispatch.`)
            }
          >
            <Text style={styles.whiteButtonText}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.chatButton} onPress={() => openDriverChat(driver)}>
            <Text style={styles.whiteButtonText}>In-App Chat</Text>
          </TouchableOpacity>
        </View>
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
            loadDriverData();
          }}
        />
      }
    >
      <Text style={styles.title}>🚘 Driver Management</Text>

      <Text style={styles.subtitle}>
        Add, verify, suspend, monitor, contact, and manage payouts for Angel Express drivers.
      </Text>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back to Dashboard</Text>
      </TouchableOpacity>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalDrivers}</Text>
          <Text style={styles.statLabel}>Total Drivers</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{onlineDrivers.length}</Text>
          <Text style={styles.statLabel}>Online</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeDrivers.length}</Text>
          <Text style={styles.statLabel}>Active Trip</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pendingDrivers.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{approvedDrivers.length}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{suspendedDrivers.length}</Text>
          <Text style={styles.statLabel}>Suspended</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.addDriverCard}
        onPress={() =>
          Alert.alert(
            "Add Driver",
            "Best practice: drivers should sign up through the Driver App. Owner can then approve them here."
          )
        }
      >
        <Text style={styles.addDriverTitle}>＋ Add Driver</Text>
        <Text style={styles.addDriverText}>
          Invite a new chauffeur to register in the Driver App.
        </Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Pending Approval Drivers</Text>

      {pendingDrivers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No drivers pending approval.</Text>
        </View>
      ) : (
        pendingDrivers.map(renderDriverCard)
      )}

      <Text style={styles.sectionTitle}>Approved Drivers</Text>

      {approvedDrivers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No approved drivers yet.</Text>
        </View>
      ) : (
        approvedDrivers.map(renderDriverCard)
      )}

      <Text style={styles.sectionTitle}>Suspended Drivers</Text>

      {suspendedDrivers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No suspended drivers.</Text>
        </View>
      ) : (
        suspendedDrivers.map(renderDriverCard)
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
    fontSize: 34,
    fontWeight: "900",
  },
  statLabel: {
    color: "#fff",
    marginTop: 4,
  },
  addDriverCard: {
    backgroundColor: "rgba(212,175,55,0.12)",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#d4af37",
    marginBottom: 20,
  },
  addDriverTitle: {
    color: "#d4af37",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
  },
  addDriverText: {
    color: "#cbd5e1",
    lineHeight: 21,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 18,
  },
  emptyText: {
    color: "#cbd5e1",
  },
  driverCard: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 16,
  },
  driverHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  driverName: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "900",
  },
  driverSubText: {
    color: "#94a3b8",
    marginTop: 4,
    lineHeight: 19,
  },
  statusBadge: {
    backgroundColor: "#d4af37",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusBadgeText: {
    color: "#07111f",
    fontWeight: "900",
    fontSize: 11,
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
    marginBottom: 5,
  },
  warningText: {
    color: "#f97316",
    fontWeight: "900",
    marginBottom: 5,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  goldButton: {
    flex: 1,
    backgroundColor: "#d4af37",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  redButton: {
    flex: 1,
    backgroundColor: "#dc2626",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  orangeButton: {
    flex: 1,
    backgroundColor: "#f97316",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  greenButton: {
    flex: 1,
    backgroundColor: "#22c55e",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
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
  bottomSpace: {
    height: 50,
  },
});