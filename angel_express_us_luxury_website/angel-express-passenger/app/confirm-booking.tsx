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
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Clock,
  CreditCard,
  GraduationCap,
  MapPinned,
  ReceiptText,
  Route,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/passengerTheme";

type JsonRecord = Record<string, any>;

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

function formatDuration(value: any) {
  const minutes = Math.max(0, Math.round(Number(value || 0)));

  if (!minutes) return "N/A";

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
}

function formatDate(value?: string) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value?: string) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function displayTripType(value?: string) {
  return value === "round_trip" ? "Round Trip" : "One Way";
}

function displayRideCategory(value?: string, label?: string) {
  if (label) return label;

  const map: Record<string, string> = {
    private: "Standard Ride",
    airport: "Airport Transfer",
    student_private: "Student Ride",
    student_pool: "Student Shared Ride",
    tourist_event: "Tourist/Event Ride",
    corporate: "Corporate Ride",
  };

  return map[value || ""] || value || "Standard Ride";
}

export default function ConfirmBookingScreen() {
  const params = useLocalSearchParams();

  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const draftId = String(
    firstValue(params.draftId, params.draft_id, "") || ""
  );

  const accessToken = String(
    firstValue(params.accessToken, params.access_token, "") || ""
  );

  const [draft, setDraft] = useState<JsonRecord | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

    loadDraft();
  }, []);

  async function loadDraft() {
    try {
      setLoadingDraft(true);
      setErrorMessage("");

      if (!draftId) {
        throw new Error(
          "Booking draft ID is missing. Please return to the fare estimate."
        );
      }

      const { data, error } = await supabase.rpc("get_booking_draft_v2", {
        p_draft_id: draftId,
        p_access_token: accessToken || null,
      });

      if (error) throw error;

      const loadedDraft = data?.draft || data;

      if (!loadedDraft?.id) {
        throw new Error("The accepted booking draft could not be loaded.");
      }

      if (loadedDraft.status === "expired") {
        throw new Error(
          "This booking draft has expired. Please start a new booking."
        );
      }

      if (loadedDraft.status === "cancelled") {
        throw new Error("This booking draft has been cancelled.");
      }

      if (
        !["quote_accepted", "confirmed", "completed"].includes(
          String(loadedDraft.status)
        )
      ) {
        throw new Error(
          "The fare quote has not been accepted. Please return to the fare estimate."
        );
      }

      setDraft(loadedDraft);
    } catch (error: any) {
      console.error("Confirm Booking V2 load error:", error);

      const message =
        error?.message || "Angel Express could not load this booking draft.";

      setErrorMessage(message);
      Alert.alert("Booking Draft Error", message);
    } finally {
      setLoadingDraft(false);
    }
  }

  async function confirmBooking() {
    if (confirming || !draftId || !draft) return;

    try {
      setConfirming(true);

      const { data, error } = await supabase.rpc(
        "confirm_booking_draft_v2",
        {
          p_draft_id: draftId,
          p_access_token: accessToken || null,
        }
      );

      if (error) throw error;

      if (!data?.success || !data?.booking_id) {
        throw new Error(
          "The booking confirmation engine did not return a booking ID."
        );
      }

      const bookingId = String(data.booking_id);
      const bookingNumber = String(data.booking_number || "");
      const invoiceNumber = String(data.invoice_number || "");
      const finalFare = String(data.fare ?? draft.quoted_fare ?? "0");

      router.replace({
        pathname: "/success" as any,
        params: {
          bookingId,
          booking_id: bookingId,
          bookingNumber,
          booking_number: bookingNumber,
          invoiceNumber,
          invoice_number: invoiceNumber,
          finalFare,
          fare: finalFare,
          alreadyConfirmed: data.already_confirmed ? "true" : "false",
        },
      });
    } catch (error: any) {
      console.error("Confirm Booking V2 error:", error);

      const message =
        error?.message || "Angel Express could not confirm this booking.";

      Alert.alert("Booking Error", message);

      if (
        message.toLowerCase().includes("expired") ||
        message.toLowerCase().includes("accepted")
      ) {
        router.back();
      }
    } finally {
      setConfirming(false);
    }
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const finalFare = firstValue(
    draft?.quoted_fare,
    draft?.final_fare,
    draft?.total_fare,
    0
  );

  const subtotal = firstValue(
    draft?.quoted_subtotal,
    draft?.subtotal,
    finalFare
  );

  const totalDiscount = firstValue(
    draft?.quoted_discount,
    draft?.total_discount,
    Math.max(money(subtotal) - money(finalFare), 0)
  );

  const driverShare = firstValue(
    draft?.quoted_driver_share,
    draft?.driver_share,
    0
  );

  const companyShare = firstValue(
    draft?.quoted_company_share,
    draft?.company_share,
    0
  );

  const studentDiscount = firstValue(
    draft?.student_discount,
    draft?.fare_breakdown?.student_discount,
    0
  );

  const referralDiscount = firstValue(
    draft?.referral_discount,
    draft?.fare_breakdown?.referral_discount,
    0
  );

  const sharedRideDiscount = firstValue(
    draft?.shared_ride_discount,
    draft?.pool_discount,
    draft?.fare_breakdown?.shared_ride_discount,
    0
  );

  const isStudentPool =
    Boolean(draft?.student_pool_requested) ||
    draft?.ride_category === "student_pool";

  const rewardPoints = Math.max(
    0,
    Math.round(Number(draft?.route_distance_miles || 0))
  );

  if (loadingDraft) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loadingText}>
          Loading your accepted fare quote...
        </Text>
      </View>
    );
  }

  if (!draft || errorMessage) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Booking review unavailable</Text>

        <Text style={styles.errorText}>
          {errorMessage || "The booking draft could not be loaded."}
        </Text>

        <TouchableOpacity style={styles.retryButton} onPress={loadDraft}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.errorBackButton}
          onPress={() => router.back()}
        >
          <Text style={styles.errorBackText}>Back to Fare Estimate</Text>
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

            <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
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
            <Text style={styles.kicker}>FINAL RIDE REVIEW</Text>
            <Text style={styles.title}>Confirm Booking</Text>

            <Text style={styles.subtitle}>
              Review the accepted route and secure Fare Engine quote before
              submitting your ride request.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <CreditCard size={31} color={colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Accepted Fare</Text>
                <Text style={styles.heroPrice}>
                  {formatMoney(finalFare)}
                </Text>
                <Text style={styles.heroText}>
                  {Number(draft.route_distance_miles || 0).toFixed(1)} miles •{" "}
                  {formatDuration(draft.route_duration_minutes)}
                </Text>
              </View>
            </View>

            <View style={styles.statusGrid}>
              <StatusPill
                title="Quote"
                value="Accepted"
                styles={styles}
              />

              <StatusPill
                title="Student"
                value={
                  draft.student_verified ||
                  draft.student_discount_eligible
                    ? "Verified"
                    : "Standard"
                }
                styles={styles}
              />

              <StatusPill
                title="Shared Ride"
                value={isStudentPool ? "Enabled" : "No"}
                styles={styles}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MapPinned size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Trip Details</Text>
              </View>

              <Row
                label="Pickup"
                value={draft.pickup_address || "N/A"}
                styles={styles}
              />

              <Row
                label="Drop-off"
                value={draft.dropoff_address || "N/A"}
                styles={styles}
              />

              <IconRow
                icon={<CalendarDays size={17} color={colors.gold} />}
                label="Date"
                value={formatDate(draft.scheduled_at)}
                styles={styles}
              />

              <IconRow
                icon={<Clock size={17} color={colors.gold} />}
                label="Time"
                value={formatTime(draft.scheduled_at)}
                styles={styles}
              />

              <Row
                label="Trip Type"
                value={displayTripType(draft.trip_type)}
                styles={styles}
              />

              <Row
                label="Ride Category"
                value={displayRideCategory(
                  draft.ride_category,
                  draft.ride_category_label
                )}
                styles={styles}
              />

              <Row
                label="Passengers"
                value={String(draft.passenger_count || 1)}
                styles={styles}
              />

              <Row
                label="Luggage"
                value={String(draft.luggage_count || 0)}
                styles={styles}
              />

              {draft.notes ? (
                <Row label="Notes" value={draft.notes} styles={styles} />
              ) : null}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Route size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Accepted Fare Summary</Text>
              </View>

              <Row
                label="Quote Number"
                value={String(draft.quote_number || "Pending")}
                styles={styles}
              />

              <Row
                label="Pricing Version"
                value={String(draft.pricing_version || "V2")}
                styles={styles}
              />

              <Row
                label="Distance"
                value={`${Number(
                  draft.route_distance_miles || 0
                ).toFixed(1)} miles`}
                styles={styles}
              />

              <Row
                label="Drive Time"
                value={formatDuration(draft.route_duration_minutes)}
                styles={styles}
              />

              <Row
                label="Subtotal"
                value={formatMoney(subtotal)}
                styles={styles}
              />

              {money(studentDiscount) > 0 ? (
                <DiscountRow
                  icon={<GraduationCap size={17} color="#22c55e" />}
                  label="Student Discount"
                  value={`-${formatMoney(studentDiscount)}`}
                  styles={styles}
                />
              ) : null}

              {money(referralDiscount) > 0 ? (
                <DiscountRow
                  icon={<Tag size={17} color="#22c55e" />}
                  label="Referral Discount"
                  value={`-${formatMoney(referralDiscount)}`}
                  styles={styles}
                />
              ) : null}

              {money(sharedRideDiscount) > 0 ? (
                <DiscountRow
                  icon={<Users size={17} color="#22c55e" />}
                  label="Shared Ride Discount"
                  value={`-${formatMoney(sharedRideDiscount)}`}
                  styles={styles}
                />
              ) : null}

              <Row
                label="Total Savings"
                value={`-${formatMoney(totalDiscount)}`}
                styles={styles}
              />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Final Fare</Text>
                <Text style={styles.totalValue}>
                  {formatMoney(finalFare)}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <ReceiptText size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Booking Record</Text>
              </View>

              <Row
                label="Driver Share"
                value={formatMoney(driverShare)}
                styles={styles}
              />

              <Row
                label="Company Share"
                value={formatMoney(companyShare)}
                styles={styles}
              />

              <Row
                label="Payment"
                value="Collected after ride completion"
                styles={styles}
              />

              <View style={styles.secureBox}>
                <BadgeCheck size={18} color="#22c55e" />

                <Text style={styles.secureText}>
                  Your booking will be created from this accepted Fare Engine
                  quote. The app will not recalculate or alter the amount.
                </Text>
              </View>
            </View>

            <View style={styles.noticeCard}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Booking Notice</Text>
              </View>

              <Text style={styles.notice}>
                By confirming, you are submitting this ride request to Angel
                Express. The booking will appear in your trips and in the Owner
                and Driver operations systems.
              </Text>

              <View style={styles.rewardBox}>
                <Sparkles size={18} color={colors.gold} />

                <Text style={styles.rewardText}>
                  This ride may earn {rewardPoints} reward points after
                  completion.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                confirming && styles.buttonDisabled,
              ]}
              onPress={confirmBooking}
              disabled={confirming}
              activeOpacity={0.88}
            >
              {confirming ? (
                <View style={styles.buttonLoadingRow}>
                  <ActivityIndicator color={colors.navy} />
                  <Text style={styles.buttonText}>
                    Creating Booking
                  </Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>
                  Confirm Booking
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              disabled={confirming}
            >
              <Text style={styles.backButtonText}>
                Back to Fare Estimate
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
  styles,
}: {
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || "N/A"}</Text>
    </View>
  );
}

function IconRow({
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
    <View style={styles.row}>
      <View style={styles.iconLabelRow}>
        {icon}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>

      <Text style={styles.rowValue}>{value || "N/A"}</Text>
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

function DiscountRow({
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
    <View style={styles.discountRow}>
      <View style={styles.discountLeft}>
        {icon}
        <Text style={styles.discountLabel}>{label}</Text>
      </View>

      <Text style={styles.discountValue}>{value}</Text>
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
      padding: 28,
    },
    loadingText: {
      color: c.text,
      marginTop: 14,
      fontWeight: "800",
      textAlign: "center",
      lineHeight: 21,
    },
    errorTitle: {
      color: c.gold,
      fontSize: 25,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 12,
    },
    errorText: {
      color: c.text2,
      fontSize: 15,
      fontWeight: "700",
      textAlign: "center",
      lineHeight: 23,
      marginBottom: 22,
    },
    retryButton: {
      backgroundColor: c.gold,
      borderRadius: 16,
      paddingVertical: 15,
      paddingHorizontal: 26,
      minWidth: 190,
      alignItems: "center",
    },
    retryButtonText: {
      color: c.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    errorBackButton: {
      paddingVertical: 16,
      paddingHorizontal: 20,
      marginTop: 10,
    },
    errorBackText: {
      color: c.gold,
      fontWeight: "900",
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
      fontSize: 14,
      lineHeight: 20,
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
      fontSize: 12.5,
      fontWeight: "900",
      textAlign: "center",
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
    iconLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginBottom: 4,
    },
    rowLabel: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    rowValue: {
      color: c.text,
      fontSize: 15.5,
      lineHeight: 22,
      fontWeight: "800",
    },

    discountRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 13,
    },
    discountLeft: {
      flex: 1,
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    discountLabel: {
      color: "#22c55e",
      fontSize: 15,
      fontWeight: "900",
      flex: 1,
    },
    discountValue: {
      color: "#22c55e",
      fontSize: 15,
      fontWeight: "900",
      textAlign: "right",
    },

    totalRow: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 16,
      marginTop: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    totalLabel: {
      color: c.gold,
      fontSize: 22,
      fontWeight: "900",
    },
    totalValue: {
      color: c.gold,
      fontSize: 25,
      fontWeight: "900",
    },

    secureBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      borderWidth: 1,
      borderColor: "rgba(34,197,94,0.35)",
      backgroundColor: "rgba(34,197,94,0.10)",
      borderRadius: 16,
      padding: 13,
      marginTop: 4,
    },
    secureText: {
      color: "#22c55e",
      fontSize: 13,
      fontWeight: "900",
      flex: 1,
      lineHeight: 20,
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
    notice: {
      color: c.text2,
      fontSize: 15,
      lineHeight: 23,
      fontWeight: "700",
    },
    rewardBox: {
      marginTop: 14,
      flexDirection: "row",
      gap: 9,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      borderRadius: 16,
      padding: 13,
    },
    rewardText: {
      color: c.gold,
      fontSize: 13.5,
      fontWeight: "900",
      flex: 1,
      lineHeight: 20,
    },

    button: {
      backgroundColor: c.gold,
      borderRadius: 16,
      paddingVertical: 17,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      ...v5Shadow(c),
    },
    buttonText: {
      color: c.navy,
      fontSize: 16,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    buttonLoadingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
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
