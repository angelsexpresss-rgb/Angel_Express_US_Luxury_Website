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

export default function PaymentManagementScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadPayments();
    }, [])
  );

  async function loadPayments() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBookings(data || []);
    } catch (err: any) {
      Alert.alert("Payment Error", err.message || "Unable to load payments.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function getFare(booking: any) {
    return Number(booking.total || booking.total_price || booking.price || booking.fare || 0);
  }

  function getDriverShare(booking: any) {
    return Number(booking.driver_share || getFare(booking) * 0.7);
  }

  function getCompanyShare(booking: any) {
    return Number(booking.company_share || getFare(booking) * 0.3);
  }

  function isPaid(booking: any) {
    return (
      booking.paid === true ||
      booking.payment_status === "paid" ||
      booking.payment_status === "Paid"
    );
  }

  function getPassengerName(booking: any) {
    return booking.name || booking.passenger_name || booking.full_name || "Passenger";
  }

  function getPassengerPhone(booking: any) {
    return booking.phone || booking.passenger_phone || "";
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
    loadPayments();
  }

  function confirmPaid(booking: any) {
    updateBooking(
      booking.id,
      {
        paid: true,
        payment_status: "paid",
        paid_at: new Date().toISOString(),
      },
      "Payment confirmed."
    );
  }

  function markUnpaid(booking: any) {
    updateBooking(
      booking.id,
      {
        paid: false,
        payment_status: "unpaid",
      },
      "Payment marked as unpaid."
    );
  }

  function confirmZelleCashApp(booking: any, method: "Zelle" | "Cash App") {
    updateBooking(
      booking.id,
      {
        paid: true,
        payment_status: "paid",
        payment_method: method,
        manual_payment_confirmed: true,
        paid_at: new Date().toISOString(),
      },
      `${method} payment confirmed.`
    );
  }

  function markDriverPayoutPaid(booking: any) {
    updateBooking(
      booking.id,
      {
        driver_payout_status: "paid",
        driver_paid_at: new Date().toISOString(),
      },
      "Driver payout marked as paid."
    );
  }

  function markDriverPayoutPending(booking: any) {
    updateBooking(
      booking.id,
      {
        driver_payout_status: "pending",
      },
      "Driver payout marked as pending."
    );
  }

  function sendPaymentReminder(booking: any) {
    textPassenger(
      booking,
      `Hello ${getPassengerName(
        booking
      )}, this is Angel Express. Your trip payment of $${getFare(
        booking
      ).toFixed(2)} is pending. Please complete payment.`
    );
  }

  function sendReceipt(booking: any) {
    textPassenger(
      booking,
      `Angel Express Receipt: Trip #${booking.id}. Total fare: $${getFare(
        booking
      ).toFixed(2)}. Paid status: ${isPaid(booking) ? "Paid" : "Unpaid"}. Thank you for choosing Angel Express.`
    );
  }

  const totalRevenue = bookings.reduce((sum, item) => sum + getFare(item), 0);
  const paidBookings = bookings.filter(isPaid);
  const unpaidBookings = bookings.filter((item) => !isPaid(item));
  const paidRevenue = paidBookings.reduce((sum, item) => sum + getFare(item), 0);
  const unpaidRevenue = unpaidBookings.reduce((sum, item) => sum + getFare(item), 0);
  const driverPayoutTotal = bookings.reduce((sum, item) => sum + getDriverShare(item), 0);
  const companyShareTotal = bookings.reduce((sum, item) => sum + getCompanyShare(item), 0);
  const pendingDriverPayout = bookings
    .filter((item) => item.driver_payout_status !== "paid")
    .reduce((sum, item) => sum + getDriverShare(item), 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Loading Payment Management...</Text>
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
            loadPayments();
          }}
        />
      }
    >
      <Text style={styles.title}>💰 Payment Management</Text>

      <Text style={styles.subtitle}>
        Track total fare, driver 70%, company 30%, paid/unpaid status, manual
        confirmations, and driver payout status.
      </Text>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back to Dashboard</Text>
      </TouchableOpacity>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>${totalRevenue.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Total Fare</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>${paidRevenue.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Paid Revenue</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>${unpaidRevenue.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Unpaid</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>${companyShareTotal.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Company 30%</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>${driverPayoutTotal.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Driver 70%</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>${pendingDriverPayout.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Pending Payout</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Unpaid Trips</Text>

      {unpaidBookings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No unpaid trips.</Text>
        </View>
      ) : (
        unpaidBookings.map((booking) => renderPaymentCard(booking))
      )}

      <Text style={styles.sectionTitle}>Paid Trips</Text>

      {paidBookings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No paid trips yet.</Text>
        </View>
      ) : (
        paidBookings.map((booking) => renderPaymentCard(booking))
      )}

      <View style={styles.bottomSpace} />
    </ScrollView>
  );

  function renderPaymentCard(booking: any) {
    const fare = getFare(booking);
    const driverShare = getDriverShare(booking);
    const companyShare = getCompanyShare(booking);
    const paid = isPaid(booking);
    const payoutStatus = booking.driver_payout_status || "pending";

    return (
      <View key={booking.id} style={styles.paymentCard}>
        <Text style={styles.cardTitle}>Trip #{booking.id}</Text>

        <Text style={styles.cardText}>Passenger: {getPassengerName(booking)}</Text>
        <Text style={styles.cardText}>
          Route: {booking.pickup || "Pickup"} → {booking.dropoff || "Dropoff"}
        </Text>
        <Text style={styles.cardText}>Total Fare: ${fare.toFixed(2)}</Text>
        <Text style={styles.driverText}>Driver 70%: ${driverShare.toFixed(2)}</Text>
        <Text style={styles.companyText}>Company 30%: ${companyShare.toFixed(2)}</Text>
        <Text style={paid ? styles.paidText : styles.unpaidText}>
          Payment Status: {paid ? "Paid" : "Unpaid"}
        </Text>
        <Text style={styles.cardText}>
          Method: {booking.payment_method || "Not confirmed"}
        </Text>
        <Text style={styles.cardText}>
          Zelle/Cash App Confirmed: {booking.manual_payment_confirmed ? "Yes" : "No"}
        </Text>
        <Text style={styles.payoutText}>Driver Payout: {payoutStatus}</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.greenButton} onPress={() => confirmPaid(booking)}>
            <Text style={styles.darkButtonText}>Mark Paid</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.redButton} onPress={() => markUnpaid(booking)}>
            <Text style={styles.whiteButtonText}>Mark Unpaid</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.goldButton}
            onPress={() => confirmZelleCashApp(booking, "Zelle")}
          >
            <Text style={styles.darkButtonText}>Zelle Confirm</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.goldButton}
            onPress={() => confirmZelleCashApp(booking, "Cash App")}
          >
            <Text style={styles.darkButtonText}>Cash App Confirm</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.blueButton} onPress={() => markDriverPayoutPaid(booking)}>
            <Text style={styles.whiteButtonText}>Payout Paid</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.orangeButton} onPress={() => markDriverPayoutPending(booking)}>
            <Text style={styles.whiteButtonText}>Payout Pending</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.smsButton} onPress={() => sendPaymentReminder(booking)}>
            <Text style={styles.whiteButtonText}>Payment Reminder</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.receiptButton} onPress={() => sendReceipt(booking)}>
            <Text style={styles.whiteButtonText}>Send Receipt</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
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
  emptyText: { color: "#cbd5e1" },
  paymentCard: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 16,
  },
  cardTitle: {
    color: "#d4af37",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 10,
  },
  cardText: {
    color: "#cbd5e1",
    marginBottom: 5,
    lineHeight: 20,
  },
  driverText: {
    color: "#22c55e",
    fontWeight: "900",
    marginBottom: 5,
  },
  companyText: {
    color: "#60a5fa",
    fontWeight: "900",
    marginBottom: 5,
  },
  paidText: {
    color: "#22c55e",
    fontWeight: "900",
    marginTop: 5,
  },
  unpaidText: {
    color: "#f97316",
    fontWeight: "900",
    marginTop: 5,
  },
  payoutText: {
    color: "#d4af37",
    fontWeight: "900",
    marginTop: 5,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  greenButton: {
    flex: 1,
    backgroundColor: "#22c55e",
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
  orangeButton: {
    flex: 1,
    backgroundColor: "#f97316",
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
  bottomSpace: { height: 50 },
});