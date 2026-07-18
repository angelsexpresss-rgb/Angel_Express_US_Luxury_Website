import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Clock3,
  CreditCard,
  FileText,
  Home,
  MapPinned,
  ReceiptText,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

type BookingRecord = Record<string, any>;

function firstValue(...values: any[]) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
}

function money(value: any) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(value: any) {
  return `$${money(value).toFixed(2)}`;
}

function formatDate(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortenId(value?: string) {
  if (!value) return "Unavailable";
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default function BookingSuccessScreen() {
  const params = useLocalSearchParams();

  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const bookingId = String(
    firstValue(params.bookingId, params.booking_id, "") || ""
  );

  const incomingBookingNumber = String(
    firstValue(params.bookingNumber, params.booking_number, "") || ""
  );

  const incomingInvoiceNumber = String(
    firstValue(params.invoiceNumber, params.invoice_number, "") || ""
  );

  const incomingFare = firstValue(
    params.finalFare,
    params.fare,
    params.totalFare,
    0
  );

  const alreadyConfirmed =
    String(firstValue(params.alreadyConfirmed, "false")) === "true";

  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(Boolean(bookingId));

  const pageFade = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0.72)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const backgroundScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(pageFade, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 5,
        tension: 58,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.07,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundScale, {
          toValue: 1.04,
          duration: 8500,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundScale, {
          toValue: 1,
          duration: 8500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    loadBooking();

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.replace("/my-trips" as any);
        return true;
      }
    );

    return () => subscription.remove();
  }, []);

  async function loadBooking() {
    if (!bookingId) {
      setLoadingBooking(false);
      return;
    }

    try {
      setLoadingBooking(true);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .maybeSingle();

      if (error) {
        console.warn("Booking success refresh skipped:", error.message);
        return;
      }

      if (data) {
        setBooking(data);
      }
    } catch (error) {
      console.warn("Booking success refresh skipped:", error);
    } finally {
      setLoadingBooking(false);
    }
  }

  const bookingNumber = String(
    firstValue(
      booking?.booking_number,
      booking?.booking_no,
      incomingBookingNumber,
      "Pending"
    )
  );

  const invoiceNumber = String(
    firstValue(
      booking?.invoice_number,
      booking?.invoice_no,
      incomingInvoiceNumber,
      "Pending"
    )
  );

  const finalFare = firstValue(
    booking?.total_fare,
    booking?.final_fare,
    booking?.total,
    incomingFare,
    0
  );

  const paymentStatus = String(
    firstValue(booking?.payment_status, "unpaid")
  );

  const pickupAddress = String(
    firstValue(booking?.pickup_address, booking?.pickup, "")
  );

  const dropoffAddress = String(
    firstValue(booking?.dropoff_address, booking?.dropoff, "")
  );

  const scheduledAt = String(
    firstValue(booking?.scheduled_at, "")
  );

  const rideDate = String(
    firstValue(
      formatDate(scheduledAt),
      booking?.ride_date,
      booking?.date,
      ""
    )
  );

  const rideTime = String(
    firstValue(
      formatTime(scheduledAt),
      booking?.ride_time,
      booking?.time,
      ""
    )
  );

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [26, 0],
  });

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.bgWrap,
          { transform: [{ scale: backgroundScale }] },
        ]}
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
            <View style={styles.brandPill}>
              <Sparkles size={16} color={colors.gold} />
              <Text style={styles.brandPillText}>ANGEL EXPRESS</Text>
            </View>

            <TouchableOpacity
              style={styles.themePill}
              onPress={toggleTheme}
              activeOpacity={0.84}
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
            <View style={styles.successHero}>
              <Animated.View
                style={[
                  styles.successIconWrap,
                  {
                    transform: [
                      { scale: Animated.multiply(checkScale, pulse) },
                    ],
                  },
                ]}
              >
                <BadgeCheck size={58} color={colors.navy} strokeWidth={2.4} />
              </Animated.View>

              <Text style={styles.kicker}>RIDE REQUEST RECEIVED</Text>

              <Text style={styles.title}>
                Booking Confirmed
              </Text>

              <Text style={styles.subtitle}>
                Your Angel Express ride request has been securely created and
                added to our operations system.
              </Text>

              {alreadyConfirmed ? (
                <View style={styles.infoPill}>
                  <ShieldCheck size={16} color={colors.gold} />
                  <Text style={styles.infoPillText}>
                    This booking was already confirmed. No duplicate was
                    created.
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.fareCard}>
              <View style={styles.fareCardTop}>
                <View>
                  <Text style={styles.fareLabel}>FINAL FARE</Text>
                  <Text style={styles.fareAmount}>
                    {formatMoney(finalFare)}
                  </Text>
                </View>

                <View style={styles.fareIcon}>
                  <CreditCard size={26} color={colors.navy} />
                </View>
              </View>

              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payment Status</Text>
                <Text style={styles.paymentValue}>
                  {paymentStatus.toLowerCase() === "paid"
                    ? "Paid"
                    : "Due after ride"}
                </Text>
              </View>
            </View>

            <View style={styles.referenceGrid}>
              <ReferenceCard
                icon={<ReceiptText size={21} color={colors.gold} />}
                label="Booking Number"
                value={bookingNumber}
                styles={styles}
              />

              <ReferenceCard
                icon={<FileText size={21} color={colors.gold} />}
                label="Invoice Number"
                value={invoiceNumber}
                styles={styles}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Route size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Ride Summary</Text>

                {loadingBooking ? (
                  <ActivityIndicator size="small" color={colors.gold} />
                ) : null}
              </View>

              {pickupAddress ? (
                <DetailRow
                  icon={<MapPinned size={17} color={colors.gold} />}
                  label="Pickup"
                  value={pickupAddress}
                  styles={styles}
                />
              ) : null}

              {dropoffAddress ? (
                <DetailRow
                  icon={<MapPinned size={17} color={colors.gold} />}
                  label="Drop-off"
                  value={dropoffAddress}
                  styles={styles}
                />
              ) : null}

              {rideDate ? (
                <DetailRow
                  icon={<CalendarDays size={17} color={colors.gold} />}
                  label="Date"
                  value={rideDate}
                  styles={styles}
                />
              ) : null}

              {rideTime ? (
                <DetailRow
                  icon={<Clock3 size={17} color={colors.gold} />}
                  label="Time"
                  value={rideTime}
                  styles={styles}
                />
              ) : null}

              <DetailRow
                icon={<ShieldCheck size={17} color={colors.gold} />}
                label="Booking ID"
                value={shortenId(bookingId)}
                styles={styles}
              />
            </View>

            <View style={styles.noticeCard}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>What Happens Next</Text>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepText}>
                  Angel Express reviews and coordinates your ride request.
                </Text>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepText}>
                  Your assigned driver and live-trip details will appear in My
                  Trips.
                </Text>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepText}>
                  Payment is collected after the ride is completed unless your
                  booking states otherwise.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace("/my-trips" as any)}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryButtonText}>View My Trips</Text>
              <ArrowRight size={19} color={colors.navy} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace("/dashboard" as any)}
              activeOpacity={0.88}
            >
              <Home size={18} color={colors.gold} />
              <Text style={styles.secondaryButtonText}>
                Return to Dashboard
              </Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              Comfort • Reliability • Security • Cleanliness
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function ReferenceCard({
  icon,
  label,
  value,
  styles,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.referenceCard}>
      <View style={styles.referenceIcon}>{icon}</View>
      <Text style={styles.referenceLabel}>{label}</Text>
      <Text style={styles.referenceValue} numberOfLines={2}>
        {value || "Pending"}
      </Text>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  styles,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>{icon}</View>

      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
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
      paddingBottom: 52,
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    brandPill: {
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
    brandPillText: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1,
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

    successHero: {
      alignItems: "center",
      marginBottom: 22,
    },
    successIconWrap: {
      width: 104,
      height: 104,
      borderRadius: 34,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
      ...v5Shadow(c),
    },
    kicker: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.6,
      marginBottom: 8,
      textAlign: "center",
    },
    title: {
      color: c.text,
      fontSize: 38,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 10,
    },
    subtitle: {
      color: c.text2,
      fontSize: 15.5,
      lineHeight: 23,
      fontWeight: "700",
      textAlign: "center",
      maxWidth: 500,
    },
    infoPill: {
      marginTop: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      borderRadius: 16,
      paddingVertical: 11,
      paddingHorizontal: 13,
    },
    infoPillText: {
      color: c.gold,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "900",
      flex: 1,
    },

    fareCard: {
      backgroundColor: c.gold,
      borderRadius: 24,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    fareCardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
    },
    fareLabel: {
      color: c.navy,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    fareAmount: {
      color: c.navy,
      fontSize: 42,
      fontWeight: "900",
      letterSpacing: -1,
    },
    fareIcon: {
      width: 56,
      height: 56,
      borderRadius: 19,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    paymentRow: {
      borderTopWidth: 1,
      borderTopColor: "rgba(4,17,34,0.18)",
      paddingTop: 14,
      marginTop: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    paymentLabel: {
      color: c.navy,
      fontSize: 13,
      fontWeight: "800",
      opacity: 0.8,
    },
    paymentValue: {
      color: c.navy,
      fontSize: 14,
      fontWeight: "900",
    },

    referenceGrid: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 18,
    },
    referenceCard: {
      flex: 1,
      minHeight: 132,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 20,
      padding: 15,
      ...v5Shadow(c),
    },
    referenceIcon: {
      width: 39,
      height: 39,
      borderRadius: 13,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 11,
    },
    referenceLabel: {
      color: c.text2,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 6,
    },
    referenceValue: {
      color: c.gold,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "900",
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

    detailRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 11,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft,
      paddingBottom: 13,
      marginBottom: 13,
    },
    detailIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    detailCopy: {
      flex: 1,
    },
    detailLabel: {
      color: c.gold,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    detailValue: {
      color: c.text,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "800",
    },

    noticeCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 11,
      marginBottom: 13,
    },
    stepNumber: {
      width: 28,
      height: 28,
      borderRadius: 10,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
    },
    stepNumberText: {
      color: c.navy,
      fontSize: 12,
      fontWeight: "900",
    },
    stepText: {
      color: c.text2,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "700",
      flex: 1,
    },

    primaryButton: {
      backgroundColor: c.gold,
      borderRadius: 17,
      paddingVertical: 17,
      paddingHorizontal: 20,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 10,
      ...v5Shadow(c),
    },
    primaryButtonText: {
      color: c.navy,
      fontSize: 16,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 17,
      paddingVertical: 16,
      paddingHorizontal: 20,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 9,
      marginTop: 13,
    },
    secondaryButtonText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    footerText: {
      color: c.text2,
      textAlign: "center",
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.4,
      marginTop: 22,
    },
  });
}
