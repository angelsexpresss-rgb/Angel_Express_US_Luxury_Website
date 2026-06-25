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

export default function BookingManagementScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    try {
      setLoading(true);

      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (bookingsError) throw bookingsError;

      const { data: driversData, error: driversError } = await supabase
        .from("drivers")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (driversError) throw driversError;

      setBookings(bookingsData || []);
      setDrivers(driversData || []);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to load bookings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function getPassengerName(booking: any) {
    return booking.name || booking.passenger_name || booking.full_name || "Passenger";
  }

  function getPassengerPhone(booking: any) {
    return booking.phone || booking.passenger_phone || "";
  }

  function getDriverName(driver: any) {
    return (
      `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
      driver.full_name ||
      driver.name ||
      "Driver"
    );
  }

  function callPassenger(phone?: string) {
    if (!phone) {
      Alert.alert("No phone", "Passenger phone number not available.");
      return;
    }

    Linking.openURL(`tel:${phone}`);
  }

  function textPassenger(booking: any, message: string) {
    const phone = getPassengerPhone(booking);

    if (!phone) {
      Alert.alert("No phone", "Passenger phone number not available.");
      return;
    }

    Linking.openURL(`sms:${phone}?body=${encodeURIComponent(message)}`);
  }

  async function updateBooking(id: any, updateData: any, successMessage: string) {
    const { error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", id);

    if (error) {
      Alert.alert("Update Failed", error.message);
      return;
    }

    Alert.alert("Success", successMessage);
    loadData();
  }

  function approveBooking(booking: any) {
    updateBooking(
      booking.id,
      { status: "Confirmed" },
      "Booking approved and confirmed."
    );
  }

  function cancelBooking(booking: any) {
    Alert.alert("Cancel Trip", "Are you sure you want to cancel this trip?", [
      { text: "No", style: "cancel" },
      {
        text: "Cancel Trip",
        style: "destructive",
        onPress: () =>
          updateBooking(
            booking.id,
            { status: "Cancelled" },
            "Trip has been cancelled."
          ),
      },
    ]);
  }

  function confirmPayment(booking: any) {
    updateBooking(
      booking.id,
      {
        payment_status: "paid",
        paid: true,
        paid_at: new Date().toISOString(),
      },
      "Payment confirmed."
    );
  }

  function assignDriver(booking: any, driver: any) {
    updateBooking(
      booking.id,
      {
        driver_id: driver.id,
        driver_name: getDriverName(driver),
        assigned_driver_name: getDriverName(driver),
        driver_phone: driver.phone || driver.driver_phone || "",
        assigned_driver_phone: driver.phone || driver.driver_phone || "",
        status: "Driver Assigned",
      },
      `${getDriverName(driver)} assigned to this trip.`
    );
  }

  function sendReminder(booking: any) {
    textPassenger(
      booking,
      `Hello ${getPassengerName(
        booking
      )}, this is Angel Express reminding you about your upcoming trip. Pickup: ${
        booking.pickup || "your pickup location"
      }, Dropoff: ${booking.dropoff || "your destination"}.`
    );
  }

  function sendReceipt(booking: any) {
    textPassenger(
      booking,
      `Angel Express Receipt: Trip #${booking.id}. Total: $${
        booking.total || booking.total_price || booking.price || "0.00"
      }. Thank you for choosing Angel Express.`
    );
  }

  const pending = bookings.filter((b) =>
    ["Pending", "pending"].includes(b.status)
  );

  const active = bookings.filter((b) =>
    [
      "Confirmed",
      "Driver Assigned",
      "Arrived at Pickup",
      "Picked Up",
      "In Progress",
      "assigned",
      "driver_arrived",
      "in_progress",
    ].includes(b.status)
  );

  const completed = bookings.filter((b) =>
    ["Completed", "completed"].includes(b.status)
  );

  const cancelled = bookings.filter((b) =>
    ["Cancelled", "cancelled"].includes(b.status)
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Loading Booking Management...</Text>
      </View>
    );
  }

  function renderBookingCard(booking: any) {
    return (
      <View key={booking.id} style={styles.bookingCard}>
        <Text style={styles.bookingTitle}>Trip #{booking.id}</Text>

        <Text style={styles.bookingText}>Passenger: {getPassengerName(booking)}</Text>
        <Text style={styles.bookingText}>Phone: {getPassengerPhone(booking) || "Not available"}</Text>
        <Text style={styles.bookingText}>Pickup: {booking.pickup || booking.pickup_location || "Not set"}</Text>
        <Text style={styles.bookingText}>Dropoff: {booking.dropoff || booking.dropoff_location || "Not set"}</Text>
        <Text style={styles.bookingText}>Date: {booking.date || booking.trip_date || "Not set"}</Text>
        <Text style={styles.bookingText}>Time: {booking.time || booking.trip_time || "Not set"}</Text>
        <Text style={styles.statusText}>Status: {booking.status || "Pending"}</Text>
        <Text style={styles.paymentText}>
          Payment: {booking.payment_status || (booking.paid ? "paid" : "unpaid")}
        </Text>

        <Text style={styles.driverText}>
          Driver: {booking.driver_name || booking.assigned_driver_name || "Not assigned"}
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.goldButton} onPress={() => approveBooking(booking)}>
            <Text style={styles.darkButtonText}>Approve</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.blueButton} onPress={() => confirmPayment(booking)}>
            <Text style={styles.whiteButtonText}>Confirm Pay</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.callButton} onPress={() => callPassenger(getPassengerPhone(booking))}>
            <Text style={styles.darkButtonText}>Call Passenger</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.smsButton} onPress={() => sendReminder(booking)}>
            <Text style={styles.whiteButtonText}>Reminder</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.receiptButton} onPress={() => sendReceipt(booking)}>
            <Text style={styles.whiteButtonText}>Send Receipt</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerButton} onPress={() => cancelBooking(booking)}>
            <Text style={styles.whiteButtonText}>Cancel Trip</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.assignTitle}>Assign / Change Driver</Text>

        {drivers.length === 0 ? (
          <Text style={styles.noDriverText}>No approved drivers available.</Text>
        ) : (
          drivers.map((driver) => (
            <TouchableOpacity
              key={`${booking.id}-${driver.id}`}
              style={styles.driverAssignButton}
              onPress={() => assignDriver(booking, driver)}
            >
              <Text style={styles.driverAssignText}>
                Assign {getDriverName(driver)}
              </Text>
            </TouchableOpacity>
          ))
        )}
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
            loadData();
          }}
        />
      }
    >
      <Text style={styles.title}>📋 Booking Management</Text>

      <Text style={styles.subtitle}>
        Approve, assign drivers, change drivers, cancel trips, confirm payments,
        send reminders, and send receipts.
      </Text>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back to Dashboard</Text>
      </TouchableOpacity>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pending.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{active.length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{completed.length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{cancelled.length}</Text>
          <Text style={styles.statLabel}>Cancelled</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Pending Bookings</Text>
      {pending.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No pending bookings.</Text>
        </View>
      ) : (
        pending.map(renderBookingCard)
      )}

      <Text style={styles.sectionTitle}>Active / Confirmed Trips</Text>
      {active.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No active or confirmed trips.</Text>
        </View>
      ) : (
        active.map(renderBookingCard)
      )}

      <Text style={styles.sectionTitle}>Completed Trips</Text>
      {completed.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No completed trips yet.</Text>
        </View>
      ) : (
        completed.slice(0, 10).map(renderBookingCard)
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
    marginBottom: 20,
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
  bookingCard: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 16,
  },
  bookingTitle: {
    color: "#d4af37",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 10,
  },
  bookingText: {
    color: "#fff",
    marginBottom: 5,
    lineHeight: 20,
  },
  statusText: {
    color: "#22c55e",
    fontWeight: "900",
    marginTop: 6,
  },
  paymentText: {
    color: "#60a5fa",
    fontWeight: "900",
    marginTop: 4,
  },
  driverText: {
    color: "#d4af37",
    fontWeight: "900",
    marginTop: 6,
    marginBottom: 10,
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
  blueButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
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
    backgroundColor: "#7c3aed",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  receiptButton: {
    flex: 1,
    backgroundColor: "#0ea5e9",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  dangerButton: {
    flex: 1,
    backgroundColor: "#dc2626",
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
  assignTitle: {
    color: "#fff",
    fontWeight: "900",
    marginTop: 18,
    marginBottom: 10,
  },
  noDriverText: {
    color: "#94a3b8",
  },
  driverAssignButton: {
    backgroundColor: "rgba(212,175,55,0.12)",
    borderWidth: 1,
    borderColor: "#d4af37",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  driverAssignText: {
    color: "#d4af37",
    fontWeight: "900",
    textAlign: "center",
  },
  bottomSpace: {
    height: 50,
  },
});