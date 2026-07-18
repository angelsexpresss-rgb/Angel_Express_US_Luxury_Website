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
  CalendarClock,
  CarFront,
  CheckCircle2,
  Edit3,
  MapPin,
  MessageSquareText,
  ReceiptText,
  Route,
  ShieldCheck,
  Timer,
  XCircle,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

const OPTIONS = [
  {
    title: "Cancel Ride",
    code: "cancel_ride",
    subtitle: "Request cancellation review for this booking.",
    icon: XCircle,
    requiresDetails: true,
  },
  {
    title: "Change Pickup Location",
    code: "change_pickup",
    subtitle: "Update where your chauffeur should pick you up.",
    icon: MapPin,
    requiresDetails: true,
  },
  {
    title: "Change Drop-off Location",
    code: "change_dropoff",
    subtitle: "Update your destination before the ride starts.",
    icon: Route,
    requiresDetails: true,
  },
  {
    title: "Change Date",
    code: "change_date",
    subtitle: "Request a new ride date.",
    icon: CalendarClock,
    requiresDetails: true,
  },
  {
    title: "Change Time",
    code: "change_time",
    subtitle: "Request a new pickup time.",
    icon: Timer,
    requiresDetails: true,
  },
  {
    title: "Other Request",
    code: "other_request",
    subtitle: "Ask Angel Express operations for help.",
    icon: MessageSquareText,
    requiresDetails: true,
  },
];

function firstValue(...values: any[]) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
}

function normalize(value: any) {
  return String(value || "").trim().toLowerCase();
}

function titleCase(value: any) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayRideCategory(booking: any) {
  const value = firstValue(
    booking?.ride_category_label,
    booking?.ride_category_name,
    booking?.ride_category
  );

  const map: Record<string, string> = {
    private: "Standard Ride",
    student_private: "Student Ride",
    student_pool: "Student Shared Ride",
    airport: "Airport Transfer",
    tourist_event: "Tourist/Event Ride",
    corporate: "Corporate Ride",
  };

  return map[normalize(value)] || titleCase(value) || "Standard Ride";
}

function displayTripType(booking: any) {
  const value = normalize(
    firstValue(
      booking?.trip_type_label,
      booking?.trip_type,
      booking?.tripType
    )
  );

  if (value.includes("round")) return "Round Trip";
  if (value.includes("one")) return "One Way";

  return titleCase(value) || "One Way";
}

export default function ManageBookingScreen() {
  const params = useLocalSearchParams();

  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const bookingId = String(params.booking_id || params.bookingId || "");
  const routeInvoiceNumber = String(
    params.invoice_number || params.invoice_no || ""
  );
  const routeBookingNumber = String(params.booking_number || "");

  const [requestType, setRequestType] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [booking, setBooking] = useState<any>(null);

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

    loadBooking();
  }, []);

  async function loadBooking() {
    try {
      setLoadingBooking(true);

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

      const bookingEmail = normalize(
        firstValue(data.email, data.passenger_email, "")
      );

      const userEmail = normalize(user.email);

      const ownerMatches =
        !bookingOwnerId || bookingOwnerId === String(user.id);

      const emailMatches =
        !bookingEmail || bookingEmail === userEmail;

      if (!ownerMatches && !emailMatches) {
        throw new Error("You are not authorized to manage this booking.");
      }

      setBooking(data);
    } catch (error: any) {
      Alert.alert(
        "Booking Error",
        error.message || "Could not load this booking.",
        [
          {
            text: "View My Trips",
            onPress: () => router.replace("/my-trips" as any),
          },
        ]
      );
    } finally {
      setLoadingBooking(false);
    }
  }

  async function submitRequest() {
    try {
      if (!booking) {
        Alert.alert("Booking Missing", "This booking could not be loaded.");
        return;
      }

      if (!requestType) {
        Alert.alert(
          "Select Request Type",
          "Please choose what you want to change."
        );
        return;
      }

      const selectedOption = OPTIONS.find(
        (option) => option.title === requestType
      );

      if (selectedOption?.requiresDetails && !details.trim()) {
        Alert.alert(
          "Add Request Details",
          "Please provide the new information or reason for this request."
        );
        return;
      }

      const status = normalize(booking.status);
      const paymentStatus = normalize(booking.payment_status);

      if (["cancelled", "canceled"].includes(status)) {
        Alert.alert(
          "Booking Already Cancelled",
          "This booking has already been cancelled."
        );
        return;
      }

      if (status === "completed") {
        Alert.alert(
          "Ride Already Completed",
          "Completed rides can no longer be changed. Please use support for payment or receipt assistance."
        );
        return;
      }

      if (status === "in_progress") {
        Alert.alert(
          "Ride In Progress",
          "This ride has already started. Contact your chauffeur or Angel Express support for immediate assistance."
        );
        return;
      }

      if (selectedOption?.code === "cancel_ride" && paymentStatus === "paid") {
        Alert.alert(
          "Paid Booking",
          "This paid booking requires manual cancellation and refund review by Angel Express operations."
        );
      }

      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const bookingNumber = String(
        firstValue(
          booking.booking_number,
          booking.booking_no,
          routeBookingNumber,
          booking.id
        )
      );

      const invoiceNumber = String(
        firstValue(
          booking.invoice_number,
          booking.invoice_no,
          routeInvoiceNumber,
          ""
        )
      );

      /*
       * Keep this insert limited to the columns that already exist in the
       * current booking_change_requests table. Extra booking context can be
       * retrieved by the Owner App through booking_id.
       */
      const payload = {
        booking_id: bookingId,
        invoice_no: invoiceNumber || null,
        user_id: user.id,
        passenger_email: user.email || null,
        request_type: requestType,
        request_details: details.trim(),
        status: "Pending Review",
      };

      const { error } = await supabase
        .from("booking_change_requests")
        .insert(payload);

      if (error) throw error;

      Alert.alert(
        "Request Submitted",
        "Angel Express has received your request and will review it shortly.",
        [
          {
            text: "View My Trips",
            onPress: () => router.replace("/my-trips" as any),
          },
        ]
      );

      setDetails("");
      setRequestType("");
    } catch (error: any) {
      Alert.alert(
        "Request Error",
        error.message || "Could not submit request."
      );
    } finally {
      setSaving(false);
    }
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const bookingNumber = String(
    firstValue(
      booking?.booking_number,
      booking?.booking_no,
      routeBookingNumber,
      bookingId,
      "N/A"
    )
  );

  const invoiceNumber = String(
    firstValue(
      booking?.invoice_number,
      booking?.invoice_no,
      routeInvoiceNumber,
      "N/A"
    )
  );

  const pickup = String(
    firstValue(
      booking?.pickup_address,
      booking?.pickup,
      booking?.pickup_location,
      "Pickup not available"
    )
  );

  const dropoff = String(
    firstValue(
      booking?.dropoff_address,
      booking?.dropoff,
      booking?.dropoff_location,
      booking?.destination,
      "Drop-off not available"
    )
  );

  const rideDate = String(
    firstValue(
      booking?.ride_date,
      booking?.date,
      booking?.pickup_date,
      booking?.scheduled_at
        ? new Date(booking.scheduled_at).toLocaleDateString()
        : "",
      "Not available"
    )
  );

  const rideTime = String(
    firstValue(
      booking?.ride_time,
      booking?.time,
      booking?.pickup_time,
      booking?.scheduled_at
        ? new Date(booking.scheduled_at).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })
        : "",
      "Not available"
    )
  );

  if (loadingBooking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Loading booking...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Booking Unavailable</Text>
        <Text style={styles.errorText}>
          This booking could not be loaded or you may not have access to it.
        </Text>

        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => router.replace("/my-trips" as any)}
        >
          <Text style={styles.errorButtonText}>Back to My Trips</Text>
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
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
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
            <Text style={styles.kicker}>BOOKING OPERATIONS</Text>
            <Text style={styles.title}>Manage Booking</Text>

            <Text style={styles.subtitle}>
              Submit a change or cancellation request. Angel Express operations
              will review it before your ride is updated.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Edit3 size={31} color={colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Booking Change Request</Text>
                <Text style={styles.heroText}>
                  Booking {bookingNumber}
                </Text>
                <Text style={styles.heroText}>
                  Invoice {invoiceNumber}
                </Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.cardHeader}>
                <ReceiptText size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Booking Summary</Text>
              </View>

              <SummaryRow
                label="Booking Number"
                value={bookingNumber}
                styles={styles}
              />
              <SummaryRow
                label="Invoice Number"
                value={invoiceNumber}
                styles={styles}
              />
              <SummaryRow
                label="Status"
                value={titleCase(booking.status || "pending")}
                styles={styles}
              />
              <SummaryRow
                label="Ride Category"
                value={displayRideCategory(booking)}
                styles={styles}
              />
              <SummaryRow
                label="Trip Type"
                value={displayTripType(booking)}
                styles={styles}
              />
              <SummaryRow
                label="Pickup"
                value={pickup}
                styles={styles}
              />
              <SummaryRow
                label="Drop-off"
                value={dropoff}
                styles={styles}
              />
              <SummaryRow
                label="Date"
                value={rideDate}
                styles={styles}
              />
              <SummaryRow
                label="Time"
                value={rideTime}
                styles={styles}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>
                  What do you need help with?
                </Text>
              </View>

              {OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = requestType === option.title;

                return (
                  <TouchableOpacity
                    key={option.title}
                    style={[
                      styles.option,
                      selected && styles.selectedOption,
                    ]}
                    onPress={() => setRequestType(option.title)}
                    activeOpacity={0.86}
                  >
                    <View
                      style={[
                        styles.optionIcon,
                        selected && styles.optionIconActive,
                      ]}
                    >
                      <Icon
                        size={20}
                        color={selected ? colors.navy : colors.gold}
                      />
                    </View>

                    <View style={styles.optionTextBox}>
                      <Text
                        style={[
                          styles.optionTitle,
                          selected && styles.optionTitleActive,
                        ]}
                      >
                        {option.title}
                      </Text>

                      <Text
                        style={[
                          styles.optionSubtitle,
                          selected && styles.optionSubtitleActive,
                        ]}
                      >
                        {option.subtitle}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.optionArrow,
                        selected && styles.optionArrowActive,
                      ]}
                    >
                      ›
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MessageSquareText size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Request Details</Text>
              </View>

              <Text style={styles.helperText}>
                Add the new address, new date/time, cancellation reason,
                flight update, or any details Angel Express should review.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Describe your requested change..."
                placeholderTextColor={colors.placeholder}
                multiline
                value={details}
                onChangeText={setDetails}
                maxLength={1500}
              />

              <Text style={styles.characterCount}>
                {details.length}/1500
              </Text>
            </View>

            <View style={styles.noticeCard}>
              <View style={styles.noticeHeader}>
                <ShieldCheck size={20} color={colors.gold} />
                <Text style={styles.noticeTitle}>Important</Text>
              </View>

              <Text style={styles.noticeText}>
                This request does not automatically change your booking.
                Pricing-related changes may require a new fare quote before
                approval. Angel Express will contact you if confirmation or
                payment adjustment is needed.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                saving && styles.buttonDisabled,
              ]}
              onPress={submitRequest}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <Text style={styles.submitButtonText}>
                  Submit Request
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backTripsButton}
              onPress={() => router.replace("/my-trips" as any)}
            >
              <Text style={styles.backTripsText}>
                Back to My Trips
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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
    backButton: {
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
    backText: {
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
      fontSize: 36,
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
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 4,
    },
    heroText: {
      color: c.navy,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "800",
      opacity: 0.82,
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
    summaryCard: {
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

    summaryRow: {
      marginBottom: 13,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft,
      paddingBottom: 10,
    },
    summaryLabel: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    summaryValue: {
      color: c.text,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "800",
    },

    option: {
      minHeight: 78,
      backgroundColor: c.card2,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 18,
      padding: 14,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    selectedOption: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    optionIcon: {
      width: 44,
      height: 44,
      borderRadius: 15,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    optionIconActive: {
      backgroundColor: "rgba(255,255,255,0.28)",
      borderColor: "rgba(255,255,255,0.32)",
    },
    optionTextBox: {
      flex: 1,
    },
    optionTitle: {
      color: c.text,
      fontSize: 16,
      fontWeight: "900",
      marginBottom: 4,
    },
    optionTitleActive: {
      color: c.navy,
    },
    optionSubtitle: {
      color: c.text2,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "700",
    },
    optionSubtitleActive: {
      color: c.navy,
      opacity: 0.78,
    },
    optionArrow: {
      color: c.gold,
      fontSize: 32,
      fontWeight: "300",
      marginTop: -2,
    },
    optionArrowActive: {
      color: c.navy,
    },

    helperText: {
      color: c.text2,
      fontSize: 14.5,
      lineHeight: 22,
      marginBottom: 14,
      fontWeight: "700",
    },
    input: {
      backgroundColor: c.input,
      color: c.inputText,
      borderRadius: 16,
      padding: 16,
      minHeight: 128,
      borderWidth: 1,
      borderColor: c.borderSoft,
      textAlignVertical: "top",
      fontSize: 16,
      fontWeight: "700",
    },
    characterCount: {
      color: c.muted,
      fontSize: 12,
      fontWeight: "800",
      textAlign: "right",
      marginTop: 8,
    },

    noticeCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.border,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    noticeHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginBottom: 8,
    },
    noticeTitle: {
      color: c.gold,
      fontSize: 19,
      fontWeight: "900",
    },
    noticeText: {
      color: c.text2,
      fontSize: 14.5,
      lineHeight: 22,
      fontWeight: "700",
    },

    submitButton: {
      backgroundColor: c.gold,
      borderRadius: 16,
      paddingVertical: 17,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      ...v5Shadow(c),
    },
    submitButtonText: {
      color: c.navy,
      fontSize: 16,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    buttonDisabled: {
      opacity: 0.65,
    },
    backTripsButton: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
      backgroundColor: c.card,
    },
    backTripsText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
  });
}
