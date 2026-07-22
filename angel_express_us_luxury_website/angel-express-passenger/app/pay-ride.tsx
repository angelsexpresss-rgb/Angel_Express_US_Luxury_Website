import { useStripe } from "@stripe/stripe-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  BadgeCheck,
  CreditCard,
  DollarSign,
  HeartHandshake,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

const PAYMENT_WORKER_URL =
  "https://angel-express-payments.angelsexpresss.workers.dev";

function firstValue(...values: any[]) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
}

function numberValue(...values: any[]) {
  const value = firstValue(...values);
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function PayRideScreen() {
  const params = useLocalSearchParams();
  const bookingId = String(params.bookingId || params.booking_id || "");

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [tipPreset, setTipPreset] = useState<number | "custom">(0);
  const [customTipText, setCustomTipText] = useState("");

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgScale, {
          toValue: 1.04,
          duration: 8500,
          useNativeDriver: true,
        }),
        Animated.timing(bgScale, {
          toValue: 1,
          duration: 8500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.timing(pageFade, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();

    loadPayment();
  }, []);

  async function loadPayment() {
    try {
      setLoading(true);

      if (!bookingId) {
        throw new Error("Missing booking ID.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Booking not found.");

      const bookingOwnerId = String(
        firstValue(data.user_id, data.passenger_id, "")
      );

      const bookingEmail = String(
        firstValue(data.email, data.passenger_email, "")
      )
        .trim()
        .toLowerCase();

      const userEmail = String(user.email || "").trim().toLowerCase();

      if (
        bookingOwnerId &&
        bookingOwnerId !== user.id &&
        bookingEmail &&
        bookingEmail !== userEmail
      ) {
        throw new Error("You are not authorized to pay for this booking.");
      }

      if (String(data.status || "").toLowerCase() !== "completed") {
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

      if (String(data.payment_status || "").toLowerCase() === "paid") {
        Alert.alert("Already Paid", "This ride has already been paid.", [
          {
            text: "View My Trips",
            onPress: () => router.replace("/my-trips" as any),
          },
        ]);
        return;
      }

      const amountDue = numberValue(
        data.balance_due,
        data.total_fare,
        data.final_fare,
        data.total,
        data.amount,
        0
      );

      if (amountDue <= 0) {
        throw new Error(
          "This booking has no payable balance. Please contact Angel Express support."
        );
      }

      setBooking(data);
    } catch (error: any) {
      Alert.alert(
        "Payment Error",
        error.message || "Could not load payment."
      );
    } finally {
      setLoading(false);
    }
  }

  async function payRide() {
    if (paying || !booking) return;

    try {
      setPaying(true);

      const rideBalance = numberValue(
        booking.balance_due,
        booking.total_fare,
        booking.final_fare,
        booking.total,
        booking.amount,
        0
      );

      const tipAmount = selectedTipAmount;
      const paymentTotal = rideBalance + tipAmount;

      const res = await fetch(
        `${PAYMENT_WORKER_URL}/create-ride-payment-intent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            booking_id: bookingId,
            tip_amount: Number(tipAmount.toFixed(2)),
            ride_amount: Number(rideBalance.toFixed(2)),
            total_amount: Number(paymentTotal.toFixed(2)),
          }),
        }
      );

      const paymentData = await res.json();

      if (!res.ok || !paymentData.client_secret) {
        throw new Error(
          paymentData.error ||
            "Could not start secure payment."
        );
      }

      const { error: sheetError } = await initPaymentSheet({
        merchantDisplayName: "Angel Express Mobility",
        paymentIntentClientSecret: paymentData.client_secret,
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: {
          name:
            booking.passenger_name ||
            booking.name ||
            undefined,
          email:
            booking.email ||
            booking.passenger_email ||
            undefined,
        },
      });

      if (sheetError) throw sheetError;

      const { error } = await presentPaymentSheet();

      if (error) {
        if (error.code !== "Canceled") {
          Alert.alert("Payment Cancelled", error.message);
        }
        return;
      }

      /*
       * Temporary client-side compatibility update.
       *
       * Production recommendation:
       * Stripe webhook -> secure backend -> bookings payment fields.
       *
       * The driver receives 100% of the tip. The original company
       * share remains unchanged.
       */
      const originalDriverShare = numberValue(
        booking.driver_share,
        booking.driver_payout,
        rideBalance * 0.7
      );

      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          payment_method: "stripe",
          invoice_status: "Paid",
          paid_at: new Date().toISOString(),
          balance_due: 0,

          tip_amount: Number(tipAmount.toFixed(2)),
          driver_tip: Number(tipAmount.toFixed(2)),
          total_paid: Number(paymentTotal.toFixed(2)),
          driver_payout_total: Number(
            (originalDriverShare + tipAmount).toFixed(2)
          ),

          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .neq("payment_status", "paid");

      if (updateError) throw updateError;

      Alert.alert(
        "Payment Successful",
        tipAmount > 0
          ? `Your ride payment was completed successfully. Your $${tipAmount.toFixed(
              2
            )} tip will go directly to your driver.`
          : "Your ride payment has been completed successfully.",
        [
          {
            text: "View My Trips",
            onPress: () =>
              router.replace("/my-trips" as any),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Payment Error",
        error.message || "Payment failed."
      );
    } finally {
      setPaying(false);
    }
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const subtotal = numberValue(
    booking?.subtotal,
    booking?.base_fare,
    booking?.base,
    booking?.total_fare,
    0
  );

  const totalDiscount = numberValue(
    booking?.total_discount,
    booking?.discount,
    Math.max(
      subtotal -
        numberValue(
          booking?.total_fare,
          booking?.final_fare,
          booking?.total,
          0
        ),
      0
    )
  );

  const totalFare = numberValue(
    booking?.balance_due,
    booking?.total_fare,
    booking?.final_fare,
    booking?.total,
    booking?.amount,
    0
  );

  const selectedTipAmount = useMemo(() => {
    if (tipPreset === "custom") {
      const cleaned = customTipText.replace(/[^0-9.]/g, "");
      const parsed = Number(cleaned || 0);

      if (!Number.isFinite(parsed) || parsed < 0) {
        return 0;
      }

      return Math.min(parsed, 500);
    }

    return totalFare * tipPreset;
  }, [tipPreset, customTipText, totalFare]);

  const paymentTotal = totalFare + selectedTipAmount;

  const driverShare = numberValue(
    booking?.driver_share,
    booking?.driver_payout,
    totalFare * 0.7
  );

  const companyShare = numberValue(
    booking?.company_share,
    totalFare - driverShare,
    totalFare * 0.3
  );

  const driverReceives = driverShare + selectedTipAmount;

  const bookingNumber = String(
    firstValue(
      booking?.booking_number,
      booking?.booking_no,
      bookingId,
      "N/A"
    )
  );

  const invoiceNumber = String(
    firstValue(
      booking?.invoice_number,
      booking?.invoice_no,
      "N/A"
    )
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>
          Preparing secure payment...
        </Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>
          Payment unavailable
        </Text>

        <Text style={styles.errorText}>
          This ride could not be prepared for payment.
        </Text>

        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => router.replace("/my-trips" as any)}
        >
          <Text style={styles.errorButtonText}>
            Back to My Trips
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.bgWrap, { transform: [{ scale: bgScale }] }]}
      >
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
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backTopButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backTopText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.themePill}
              onPress={toggleTheme}
            >
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <Text style={styles.kicker}>
              SECURE RIDE PAYMENT
            </Text>
            <Text style={styles.title}>Pay Ride</Text>

            <Text style={styles.subtitle}>
              Your ride has been completed. Review the fare, add an optional
              driver tip, and complete secure payment through Stripe.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <CreditCard size={31} color={colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Balance Due</Text>
                <Text style={styles.heroPrice}>
                  ${paymentTotal.toFixed(2)}
                </Text>
                <Text style={styles.heroText}>
                  Ride fare plus your selected driver tip.
                </Text>
              </View>
            </View>

            <View style={styles.statusGrid}>
              <StatusPill
                title="Ride"
                value="Completed"
                styles={styles}
              />

              <StatusPill
                title="Invoice"
                value={booking?.invoice_status || "Pending"}
                styles={styles}
              />

              <StatusPill
                title="Payment"
                value={booking?.payment_status || "Unpaid"}
                styles={styles}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <ReceiptText size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>
                  Payment Summary
                </Text>
              </View>

              <Row
                label="Booking Number"
                value={bookingNumber}
                styles={styles}
              />

              <Row
                label="Invoice Number"
                value={invoiceNumber}
                styles={styles}
              />

              <Row
                label="Passenger"
                value={
                  booking?.passenger_name ||
                  booking?.name ||
                  "N/A"
                }
                styles={styles}
              />

              <Row
                label="Pickup"
                value={
                  booking?.pickup_address ||
                  booking?.pickup ||
                  "N/A"
                }
                styles={styles}
              />

              <Row
                label="Drop-off"
                value={
                  booking?.dropoff_address ||
                  booking?.dropoff ||
                  "N/A"
                }
                styles={styles}
              />

              <Row
                label="Subtotal"
                value={`$${subtotal.toFixed(2)}`}
                styles={styles}
              />

              <Row
                label="Total Discount"
                value={`-$${totalDiscount.toFixed(2)}`}
                styles={styles}
              />

              <Row
                label="Balance Due"
                value={`$${totalFare.toFixed(2)}`}
                strong
                styles={styles}
              />

              <Row
                label="Payment Status"
                value={booking?.payment_status || "unpaid"}
                styles={styles}
              />
            </View>


            <View style={styles.tipCard}>
              <View style={styles.cardHeader}>
                <HeartHandshake size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>
                  Tip Your Driver
                </Text>
              </View>

              <Text style={styles.tipIntro}>
                Tips are optional. Angel Express sends 100% of your tip
                directly to the driver.
              </Text>

              <View style={styles.tipOptions}>
                {[
                  { label: "No Tip", value: 0 },
                  { label: "10%", value: 0.1 },
                  { label: "15%", value: 0.15 },
                  { label: "20%", value: 0.2 },
                ].map((option) => {
                  const active = tipPreset === option.value;

                  return (
                    <TouchableOpacity
                      key={option.label}
                      style={[
                        styles.tipOption,
                        active && styles.tipOptionActive,
                      ]}
                      onPress={() => {
                        setTipPreset(option.value);
                        setCustomTipText("");
                      }}
                      activeOpacity={0.86}
                    >
                      <Text
                        style={[
                          styles.tipOptionLabel,
                          active && styles.tipOptionLabelActive,
                        ]}
                      >
                        {option.label}
                      </Text>

                      {option.value > 0 ? (
                        <Text
                          style={[
                            styles.tipOptionAmount,
                            active && styles.tipOptionAmountActive,
                          ]}
                        >
                          ${(totalFare * option.value).toFixed(2)}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={[
                    styles.tipOption,
                    tipPreset === "custom" &&
                      styles.tipOptionActive,
                  ]}
                  onPress={() => setTipPreset("custom")}
                  activeOpacity={0.86}
                >
                  <Text
                    style={[
                      styles.tipOptionLabel,
                      tipPreset === "custom" &&
                        styles.tipOptionLabelActive,
                    ]}
                  >
                    Custom
                  </Text>

                  <Text
                    style={[
                      styles.tipOptionAmount,
                      tipPreset === "custom" &&
                        styles.tipOptionAmountActive,
                    ]}
                  >
                    Other
                  </Text>
                </TouchableOpacity>
              </View>

              {tipPreset === "custom" ? (
                <View style={styles.customTipWrap}>
                  <Text style={styles.customTipCurrency}>$</Text>

                  <TextInput
                    value={customTipText}
                    onChangeText={(value) => {
                      const cleaned = value
                        .replace(/[^0-9.]/g, "")
                        .replace(/(\..*)\./g, "$1");

                      setCustomTipText(cleaned);
                    }}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.muted}
                    style={styles.customTipInput}
                    maxLength={7}
                  />
                </View>
              ) : null}

              <View style={styles.tipSummary}>
                <Row
                  label="Ride Balance"
                  value={`$${totalFare.toFixed(2)}`}
                  styles={styles}
                />

                <Row
                  label="Driver Tip"
                  value={`$${selectedTipAmount.toFixed(2)}`}
                  styles={styles}
                />

                <Row
                  label="Total Payment"
                  value={`$${paymentTotal.toFixed(2)}`}
                  strong
                  styles={styles}
                />
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <DollarSign size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>
                  Payout Breakdown
                </Text>
              </View>

              <Row
                label="Driver Fare Share"
                value={`$${driverShare.toFixed(2)}`}
                styles={styles}
              />

              <Row
                label="Driver Tip"
                value={`$${selectedTipAmount.toFixed(2)}`}
                styles={styles}
              />

              <Row
                label="Driver Receives"
                value={`$${driverReceives.toFixed(2)}`}
                strong
                styles={styles}
              />

              <Row
                label="Company Share"
                value={`$${companyShare.toFixed(2)}`}
                styles={styles}
              />

              <Text style={styles.smallNotice}>
                The company share is calculated from the original ride fare.
                One hundred percent of the selected tip goes to the driver.
              </Text>
            </View>

            <View style={styles.noticeCard}>
              <View style={styles.noticeHeader}>
                <LockKeyhole size={22} color={colors.gold} />
                <Text style={styles.noticeTitle}>
                  Secure Checkout
                </Text>
              </View>

              <Text style={styles.noticeText}>
                Apple Pay, Google Pay, and card options will appear when
                available on your device. Angel Express does not store your
                full card details.
              </Text>

              <View style={styles.secureRow}>
                <SecureBadge
                  icon={
                    <ShieldCheck size={15} color="#22c55e" />
                  }
                  text="Encrypted"
                  styles={styles}
                />

                <SecureBadge
                  icon={
                    <BadgeCheck size={15} color="#22c55e" />
                  }
                  text="Stripe"
                  styles={styles}
                />

                <SecureBadge
                  icon={
                    <Sparkles size={15} color="#22c55e" />
                  }
                  text="Protected"
                  styles={styles}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.payButton,
                paying && styles.buttonDisabled,
              ]}
              onPress={payRide}
              disabled={paying}
            >
              {paying ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <Text style={styles.payButtonText}>
                  Pay ${paymentTotal.toFixed(2)}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() =>
                router.replace("/my-trips" as any)
              }
            >
              <Text style={styles.backButtonText}>
                Back to My Trips
              </Text>
            </TouchableOpacity>
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
  styles,
}: {
  label: string;
  value: string;
  strong?: boolean;
  styles: any;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          strong && styles.rowValueStrong,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function StatusPill({
  title,
  value,
  styles,
}: {
  title: string;
  value: string;
  styles: any;
}) {
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
  styles,
}: {
  icon: React.ReactNode;
  text: string;
  styles: any;
}) {
  return (
    <View style={styles.secureBadge}>
      {icon}
      <Text style={styles.secureBadgeText}>{text}</Text>
    </View>
  );
}

function createStyles(c: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
      overflow: "hidden",
    },
    bgWrap: {
      ...StyleSheet.absoluteFillObject,
    },
    background: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
    },
    container: {
      flex: 1,
    },
    content: {
      padding: 22,
      paddingTop: 58,
      paddingBottom: 54,
    },

    center: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    loadingText: {
      color: c.text,
      marginTop: 16,
      fontSize: 16,
      fontWeight: "800",
    },
    errorTitle: {
      color: c.gold,
      fontSize: 24,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 10,
    },
    errorText: {
      color: c.text2,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 18,
    },
    errorButton: {
      backgroundColor: c.gold,
      borderRadius: 16,
      paddingVertical: 15,
      paddingHorizontal: 24,
    },
    errorButtonText: {
      color: c.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    backTopButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    backTopText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
    },
    themePill: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    themeText: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    kicker: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.6,
      marginBottom: 8,
    },
    title: {
      color: c.text,
      fontSize: 38,
      fontWeight: "900",
      marginBottom: 10,
    },
    subtitle: {
      color: c.text2,
      fontSize: 15.5,
      lineHeight: 23,
      marginBottom: 22,
      fontWeight: "700",
    },

    heroCard: {
      backgroundColor: c.gold,
      borderRadius: 24,
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 18,
      gap: 14,
      ...v5Shadow(c),
    },
    heroIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroCopy: {
      flex: 1,
    },
    heroTitle: {
      color: c.navy,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 2,
    },
    heroPrice: {
      color: c.navy,
      fontSize: 42,
      fontWeight: "900",
      letterSpacing: -1,
    },
    heroText: {
      color: c.navy,
      fontSize: 14.5,
      lineHeight: 21,
      fontWeight: "800",
      opacity: 0.82,
    },

    statusGrid: {
      flexDirection: "row",
      gap: 9,
      marginBottom: 18,
    },
    statusPill: {
      flex: 1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 17,
      padding: 12,
      alignItems: "center",
      minHeight: 76,
      justifyContent: "center",
      ...v5Shadow(c),
    },
    statusValue: {
      color: c.gold,
      fontSize: 13,
      fontWeight: "900",
      textAlign: "center",
      textTransform: "capitalize",
    },
    statusTitle: {
      color: c.text,
      fontSize: 11,
      fontWeight: "800",
      marginTop: 5,
      textAlign: "center",
    },

    card: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },
    cardTitle: {
      color: c.gold,
      fontSize: 21,
      fontWeight: "900",
      flex: 1,
    },

    row: {
      marginBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft,
      paddingBottom: 11,
    },
    rowLabel: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    rowValue: {
      color: c.text,
      fontSize: 15.5,
      lineHeight: 22,
      fontWeight: "800",
    },
    rowValueStrong: {
      color: c.gold,
      fontSize: 20,
      fontWeight: "900",
    },

    smallNotice: {
      color: c.text2,
      fontSize: 13.5,
      lineHeight: 20,
      marginTop: 4,
      fontWeight: "700",
    },

    tipCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    tipIntro: {
      color: c.text2,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "700",
      marginBottom: 16,
    },
    tipOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 9,
      marginBottom: 14,
    },
    tipOption: {
      width: "48%",
      minHeight: 66,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    tipOptionActive: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    tipOptionLabel: {
      color: c.gold,
      fontSize: 14,
      fontWeight: "900",
      marginBottom: 3,
    },
    tipOptionLabelActive: {
      color: c.navy,
    },
    tipOptionAmount: {
      color: c.text2,
      fontSize: 11.5,
      fontWeight: "800",
    },
    tipOptionAmountActive: {
      color: c.navy,
      opacity: 0.8,
    },
    customTipWrap: {
      minHeight: 56,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 15,
      marginBottom: 15,
    },
    customTipCurrency: {
      color: c.gold,
      fontSize: 22,
      fontWeight: "900",
      marginRight: 8,
    },
    customTipInput: {
      flex: 1,
      color: c.text,
      fontSize: 21,
      fontWeight: "900",
      paddingVertical: 12,
    },
    tipSummary: {
      borderTopWidth: 1,
      borderTopColor: c.borderSoft,
      paddingTop: 15,
      marginTop: 2,
    },

    noticeCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: "rgba(34,197,94,0.25)",
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    noticeHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    noticeTitle: {
      color: c.gold,
      fontSize: 21,
      fontWeight: "900",
    },
    noticeText: {
      color: c.text2,
      fontSize: 15,
      lineHeight: 23,
      fontWeight: "700",
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
      backgroundColor: c.gold,
      borderRadius: 16,
      paddingVertical: 17,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      ...v5Shadow(c),
    },
    payButtonText: {
      color: c.navy,
      fontSize: 16,
      fontWeight: "900",
      textTransform: "uppercase",
      textAlign: "center",
    },
    buttonDisabled: {
      opacity: 0.65,
    },
    backButton: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
      backgroundColor: c.card,
    },
    backButtonText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
  });
}
