import { useStripe } from "@stripe/stripe-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const PAYMENT_WORKER_URL =
  "https://angel-express-payments.angelsexpresss.workers.dev";

export default function PayRideScreen() {
  const { bookingId } = useLocalSearchParams();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    loadPayment();
  }, []);

  async function loadPayment() {
    try {
      setLoading(true);

      const id = Number(bookingId);

      if (!id) {
        throw new Error("Missing booking ID.");
      }

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (String(data.status).toLowerCase() !== "completed") {
        Alert.alert(
          "Ride Not Completed",
          "Payment is only available after your ride has been completed.",
          [
            {
              text: "View My Trips",
              onPress: () => router.replace("/my-trips" as any),
            },
          ]
        );
        return;
      }

      if (data.payment_status === "paid") {
        Alert.alert("Already Paid", "This ride has already been paid.", [
          {
            text: "View My Trips",
            onPress: () => router.replace("/my-trips" as any),
          },
        ]);
        return;
      }

      setBooking(data);

      const res = await fetch(
        `${PAYMENT_WORKER_URL}/create-ride-payment-intent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            booking_id: id,
          }),
        }
      );

      const paymentData = await res.json();

      if (!res.ok || !paymentData.client_secret) {
        throw new Error(paymentData.error || "Could not start payment.");
      }

      setClientSecret(paymentData.client_secret);

      const { error: sheetError } = await initPaymentSheet({
        merchantDisplayName: "Angel Express Mobility",
        paymentIntentClientSecret: paymentData.client_secret,
        allowsDelayedPaymentMethods: false,
      });

      if (sheetError) throw sheetError;
    } catch (error: any) {
      Alert.alert("Payment Error", error.message || "Could not load payment.");
    } finally {
      setLoading(false);
    }
  }

  async function payRide() {
    if (!clientSecret || paying) return;

    try {
      setPaying(true);

      const { error } = await presentPaymentSheet();

      if (error) {
        Alert.alert("Payment Cancelled", error.message);
        return;
      }

      const id = Number(bookingId);

      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          payment_method: "stripe",
          invoice_status: "Paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      Alert.alert(
        "Payment Successful",
        "Your ride payment has been completed successfully.",
        [
          {
            text: "View My Trips",
            onPress: () => router.replace("/my-trips" as any),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Payment Error", error.message || "Payment failed.");
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text style={styles.loadingText}>Preparing secure payment...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Pay Ride</Text>

      <Text style={styles.subtitle}>
        Your ride has been completed. Please complete payment for your trip.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment Summary</Text>

        <Row label="Booking ID" value={String(bookingId)} />
        <Row
          label="Total Fare"
          value={`$${Number(
            booking?.total_fare || booking?.total || 0
          ).toFixed(2)}`}
        />
        <Row label="Payment Status" value={booking?.payment_status || "unpaid"} />
      </View>

      <TouchableOpacity
        style={[styles.button, paying && styles.buttonDisabled]}
        onPress={payRide}
        disabled={paying}
      >
        {paying ? (
          <ActivityIndicator color="#071426" />
        ) : (
          <Text style={styles.buttonText}>Pay Full Ride Fare</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.notice}>
        Secure payment powered by Stripe. Apple Pay, Google Pay, and card options
        will appear when available on your device.
      </Text>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#040C18",
  },
  content: {
    padding: 22,
    paddingTop: 70,
    paddingBottom: 50,
  },
  center: {
    flex: 1,
    backgroundColor: "#040C18",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    color: "#FFFFFF",
    marginTop: 16,
    fontSize: 16,
  },
  title: {
    color: "#D4AF37",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 10,
  },
  subtitle: {
    color: "#C9D0D8",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#071426",
    borderRadius: 18,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },
  cardTitle: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 16,
  },
  row: {
    marginBottom: 14,
  },
  rowLabel: {
    color: "#D4AF37",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  rowValue: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  button: {
    backgroundColor: "#D4AF37",
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#071426",
    fontSize: 18,
    fontWeight: "900",
  },
  notice: {
    color: "#C9D0D8",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});