import { useStripe } from "@stripe/stripe-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  BadgeCheck,
  CreditCard,
  DollarSign,
  FileCheck,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";

import {
  AE_COLORS,
  AngelCard,
  AngelHeroButton,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

const PAYMENT_WORKER_URL =
  "https://angel-express-payments.angelsexpresss.workers.dev";

const GOLD = AE_COLORS.gold;

export default function PayRideScreen() {
  const { bookingId } = useLocalSearchParams();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState("");

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
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

      if (String(data.payment_status).toLowerCase() === "paid") {
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

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const totalFare = Number(booking?.total_fare || booking?.total || 0);
  const driverShare = totalFare * 0.7;
  const companyShare = totalFare * 0.3;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.loadingText}>Preparing secure payment...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.bgWrap, { transform: [{ scale: bgScale }] }]}>
        <ImageBackground
          source={require("../assets/images/dashboard-bg.png")}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <View style={styles.kicker}>
              <Text style={styles.kickerText}>A  SECURE RIDE PAYMENT</Text>
            </View>

            <Text style={styles.title}>Pay Ride</Text>

            <Text style={styles.subtitle}>
              Your ride has been completed. Review your fare and complete secure
              payment through Stripe.
            </Text>

            <AngelCard variant="gold" style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <CreditCard size={30} color={AE_COLORS.navy2} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Amount Due</Text>
                <Text style={styles.heroPrice}>${totalFare.toFixed(2)}</Text>
                <Text style={styles.heroText}>
                  Secure payment powered by Stripe.
                </Text>
              </View>
            </AngelCard>

            <View style={styles.statusGrid}>
              <StatusPill title="Ride" value="Completed" />
              <StatusPill title="Invoice" value={booking?.invoice_status || "Pending"} />
              <StatusPill title="Payment" value={booking?.payment_status || "Unpaid"} />
            </View>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <ReceiptText size={22} color={GOLD} />
                <Text style={styles.cardTitle}>Payment Summary</Text>
              </View>

              <Row label="Booking ID" value={String(bookingId)} />
              <Row label="Invoice" value={booking?.invoice_no || "N/A"} />
              <Row label="Passenger" value={booking?.passenger_name || booking?.name || "N/A"} />
              <Row label="Pickup" value={booking?.pickup_address || booking?.pickup || "N/A"} />
              <Row label="Drop-off" value={booking?.dropoff_address || booking?.dropoff || "N/A"} />
              <Row label="Total Fare" value={`$${totalFare.toFixed(2)}`} strong />
              <Row label="Payment Status" value={booking?.payment_status || "unpaid"} />
            </AngelCard>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <DollarSign size={22} color={GOLD} />
                <Text style={styles.cardTitle}>Payout Breakdown</Text>
              </View>

              <Row label="Driver Share" value={`$${driverShare.toFixed(2)}`} />
              <Row label="Company Share" value={`$${companyShare.toFixed(2)}`} />
              <Text style={styles.smallNotice}>
                Driver payout is handled separately through Angel Express operations.
              </Text>
            </AngelCard>

            <AngelCard style={styles.noticeCard}>
              <View style={styles.noticeHeader}>
                <LockKeyhole size={22} color={GOLD} />
                <Text style={styles.noticeTitle}>Secure Checkout</Text>
              </View>

              <Text style={styles.noticeText}>
                Apple Pay, Google Pay, and card options will appear when available
                on your device. Angel Express does not store your full card details.
              </Text>

              <View style={styles.secureRow}>
                <SecureBadge icon={<ShieldCheck size={15} color="#22c55e" />} text="Encrypted" />
                <SecureBadge icon={<BadgeCheck size={15} color="#22c55e" />} text="Stripe" />
                <SecureBadge icon={<Sparkles size={15} color="#22c55e" />} text="Protected" />
              </View>
            </AngelCard>

            <AngelHeroButton
              title={paying ? "Processing..." : "Pay Full Ride Fare"}
              onPress={payRide}
              variant="gold"
              style={styles.payButton}
            />

            <AngelHeroButton
              title="Back to My Trips"
              onPress={() => router.replace("/my-trips" as any)}
              variant="outline"
              style={styles.backButton}
            />
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowValueStrong]}>
        {value}
      </Text>
    </View>
  );
}

function StatusPill({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusValue}>{value}</Text>
      <Text style={styles.statusTitle}>{title}</Text>
    </View>
  );
}

function SecureBadge({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <View style={styles.secureBadge}>
      {icon}
      <Text style={styles.secureBadgeText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AE_COLORS.navy, overflow: "hidden" },
  bgWrap: { ...StyleSheet.absoluteFillObject },
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(5,11,22,0.91)" },
  container: { flex: 1 },
  content: { padding: 22, paddingTop: 56, paddingBottom: 50 },

  center: {
    flex: 1,
    backgroundColor: AE_COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    color: AE_COLORS.white,
    marginTop: 16,
    fontSize: 16,
  },

  kicker: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  kickerText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  title: {
    color: GOLD,
    fontSize: 38,
    fontWeight: "900",
    marginBottom: 10,
  },
  subtitle: {
    color: AE_COLORS.textSoft,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },

  heroCard: {
    minHeight: 138,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: "rgba(6,17,31,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  heroCopy: { flex: 1 },
  heroTitle: {
    color: AE_COLORS.navy2,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
  },
  heroPrice: {
    color: AE_COLORS.navy2,
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: -1,
  },
  heroText: {
    color: "rgba(6,17,31,0.78)",
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: "800",
  },

  statusGrid: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 18,
  },
  statusPill: {
    flex: 1,
    backgroundColor: "rgba(13,20,34,0.84)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
    borderRadius: 17,
    padding: 12,
    alignItems: "center",
    minHeight: 76,
    justifyContent: "center",
  },
  statusValue: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  statusTitle: {
    color: AE_COLORS.white,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
    textAlign: "center",
  },

  card: {
    padding: 20,
    marginBottom: 18,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "900",
    flex: 1,
  },

  row: {
    marginBottom: 14,
  },
  rowLabel: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  rowValue: {
    color: AE_COLORS.white,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
  },
  rowValueStrong: {
    color: GOLD,
    fontSize: 20,
    fontWeight: "900",
  },

  smallNotice: {
    color: AE_COLORS.textSoft,
    fontSize: 13.5,
    lineHeight: 20,
    marginTop: 4,
  },

  noticeCard: {
    padding: 20,
    marginBottom: 18,
    borderColor: "rgba(34,197,94,0.25)",
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  noticeTitle: {
    color: GOLD,
    fontSize: 21,
    fontWeight: "900",
  },
  noticeText: {
    color: AE_COLORS.textSoft,
    fontSize: 15,
    lineHeight: 23,
  },

  secureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 16,
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34,197,94,0.10)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.28)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 11,
  },
  secureBadgeText: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "900",
  },

  payButton: {
    marginTop: 2,
  },
  backButton: {
    marginTop: 14,
  },
});