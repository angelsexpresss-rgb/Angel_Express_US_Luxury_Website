import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Edit3,
  MapPin,
  MessageSquareText,
  ReceiptText,
  Route,
  ShieldCheck,
  Timer,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

const OPTIONS = [
  {
    title: "Cancel Ride",
    code: "cancel_ride",
    subtitle:
      "Request cancellation review. An assigned chauffeur is notified, but the ride remains active until Operations approves it.",
    icon: XCircle,
    placeholder:
      "Explain why you need to cancel. Include any timing or refund information Angel Express should review.",
  },
  {
    title: "Change Pickup Location",
    code: "change_pickup",
    subtitle:
      "Submit a new pickup address for Operations review and fare recalculation.",
    icon: MapPin,
    placeholder:
      "Enter the complete new pickup address and any pickup instructions.",
  },
  {
    title: "Change Drop-off Location",
    code: "change_dropoff",
    subtitle:
      "Submit a new destination for Operations review and fare recalculation.",
    icon: Route,
    placeholder:
      "Enter the complete new drop-off address and any destination instructions.",
  },
  {
    title: "Change Date",
    code: "change_date",
    subtitle:
      "Request a different ride date. Availability and pricing may change.",
    icon: CalendarClock,
    placeholder:
      "Enter the requested date, including year, and explain any flexibility.",
  },
  {
    title: "Change Time",
    code: "change_time",
    subtitle:
      "Request a different pickup time. Chauffeur availability may change.",
    icon: Timer,
    placeholder:
      "Enter the requested pickup time, time zone, and any acceptable time window.",
  },
  {
    title: "Passenger Count",
    code: "change_passenger_count",
    subtitle:
      "Update the number of passengers so the correct vehicle can be arranged.",
    icon: UserRound,
    placeholder:
      "Enter the new passenger count, including children and any car-seat needs.",
  },
  {
    title: "Luggage Update",
    code: "change_luggage",
    subtitle:
      "Update luggage quantity or oversized-item information.",
    icon: BriefcaseBusiness,
    placeholder:
      "List the number of bags and describe oversized items, mobility equipment, or special cargo.",
  },
  {
    title: "Student Shared Ride",
    code: "student_pool_change",
    subtitle:
      "Request to join, leave, or update your Student Shared Ride preferences.",
    icon: UsersRound,
    placeholder:
      "State whether you want to join or leave the Student Shared Ride and include your flexibility or matching preferences.",
  },
  {
    title: "Trip Notes",
    code: "update_trip_notes",
    subtitle:
      "Add accessibility, pickup, passenger, or chauffeur instructions.",
    icon: MessageSquareText,
    placeholder:
      "Enter the notes you want Operations and the assigned chauffeur to review.",
  },
  {
    title: "Other Request",
    code: "other_request",
    subtitle:
      "Ask Angel Express Operations for help with another booking matter.",
    icon: MessageSquareText,
    placeholder: "Describe the request and the result you need.",
  },
];

const LOCKED_STATUSES = [
  "driver_en_route",
  "en_route",
  "driver_arrived",
  "passenger_onboard",
  "picked_up",
  "in_progress",
  "completed",
  "payment_completed",
  "cancelled",
  "canceled",
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

function lifecycleMessage(status: string) {
  const value = normalize(status);

  if (["smart_queue", "student_pool_pending", "matching"].includes(value)) {
    return "This Student Shared Ride is still matching. You may request changes, but they can affect pool eligibility and pricing.";
  }

  if (value === "unassigned") {
    return "This booking remains active while Angel Express searches for a chauffeur. Changes and cancellation requests still require Operations approval.";
  }

  if (
    ["driver_assigned", "assigned", "accepted", "driver_accepted"].includes(
      value
    )
  ) {
    return "A chauffeur is connected to this ride. New requests are sent to Operations and the chauffeur.";
  }

  return "This booking is eligible for a change request. Operations must approve the request before the ride is updated.";
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

  const [selectedCode, setSelectedCode] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [openRequests, setOpenRequests] = useState<any[]>([]);

  const mountedRef = useRef(true);
  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  const selectedOption = OPTIONS.find(
    (option) => option.code === selectedCode
  );

  useEffect(() => {
    mountedRef.current = true;

    const backgroundAnimation = Animated.loop(
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
    );

    backgroundAnimation.start();

    Animated.timing(pageFade, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();

    void loadPage();

    const channel = supabase
      .channel(`manage-booking-v6-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${bookingId}`,
        },
        () => void loadPage(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_change_requests",
          filter: `booking_id=eq.${bookingId}`,
        },
        () => void loadPage(false)
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      backgroundAnimation.stop();
      void supabase.removeChannel(channel);
    };
  }, [bookingId]);

  async function loadPage(showLoader = true) {
    try {
      if (showLoader) setLoadingBooking(true);

      if (!bookingId) {
        throw new Error("Missing booking ID.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const [bookingResult, requestsResult] = await Promise.all([
        supabase
          .from("bookings")
          .select("*")
          .eq("id", bookingId)
          .maybeSingle(),
        supabase
          .from("booking_change_requests")
          .select("*")
          .eq("booking_id", bookingId)
          .order("created_at", { ascending: false }),
      ]);

      if (bookingResult.error) throw bookingResult.error;
      if (!bookingResult.data) throw new Error("Booking not found.");

      const data = bookingResult.data;
      const bookingOwnerId = String(
        firstValue(
          data.user_id,
          data.passenger_user_id,
          data.passenger_id,
          ""
        )
      );
      const bookingEmail = normalize(
        firstValue(data.email, data.passenger_email, "")
      );
      const userEmail = normalize(user.email);

      const ownerMatches =
        !bookingOwnerId || bookingOwnerId === String(user.id);
      const emailMatches = !bookingEmail || bookingEmail === userEmail;

      if (!ownerMatches && !emailMatches) {
        throw new Error("You are not authorized to manage this booking.");
      }

      if (mountedRef.current) {
        setBooking(data);
        setOpenRequests(
          (requestsResult.data || []).filter((request) =>
            [
              "pending",
              "pending review",
              "under review",
              "awaiting owner review",
            ].includes(normalize(request.status))
          )
        );
      }
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
      if (mountedRef.current) {
        setLoadingBooking(false);
        setRefreshing(false);
      }
    }
  }

  async function refreshPage() {
    setRefreshing(true);
    await loadPage(false);
  }

  function chooseOption(code: string) {
    const status = normalize(
      firstValue(booking?.status, booking?.booking_status)
    );

    if (LOCKED_STATUSES.includes(status)) {
      Alert.alert(
        "Booking Changes Locked",
        "This ride is already active, completed, or cancelled. Contact Angel Express Support for immediate assistance."
      );
      return;
    }

    setSelectedCode(code);
    setDetails("");
  }

  function confirmSubmit() {
    if (!selectedOption) {
      Alert.alert(
        "Select Request Type",
        "Please choose what you want to change."
      );
      return;
    }

    if (!details.trim()) {
      Alert.alert(
        "Add Request Details",
        "Please provide the new information or reason for this request."
      );
      return;
    }

    const duplicate = openRequests.some(
      (request) =>
        normalize(request.request_code) === normalize(selectedOption.code) ||
        normalize(request.request_type) === normalize(selectedOption.title)
    );

    if (duplicate) {
      Alert.alert(
        "Request Already Pending",
        "A request of this type is already waiting for Operations review."
      );
      return;
    }

    const isCancel = selectedOption.code === "cancel_ride";
    const assignedDriverId = firstValue(
      booking?.driver_id,
      booking?.assigned_driver_id
    );

    Alert.alert(
      isCancel ? "Submit Cancellation Request?" : "Submit Change Request?",
      isCancel
        ? assignedDriverId
          ? "Operations and your assigned chauffeur will be notified. The ride is not cancelled until Operations approves the request."
          : "Operations will be notified. The ride is not cancelled until Operations approves the request."
        : assignedDriverId
        ? "Operations and your assigned chauffeur will receive this request. Your booking stays unchanged until approval."
        : "Operations will receive this request. Your booking stays unchanged until approval.",
      [
        { text: "Go Back", style: "cancel" },
        {
          text: isCancel ? "Request Cancellation" : "Submit Request",
          style: isCancel ? "destructive" : "default",
          onPress: () => void submitRequest(),
        },
      ]
    );
  }

  async function submitRequest() {
    try {
      if (!booking || !selectedOption) return;

      setSaving(true);

      const payload = {
        previous_status: firstValue(
          booking.status,
          booking.booking_status,
          "pending"
        ),
        previous_pickup: firstValue(
          booking.pickup_address,
          booking.pickup,
          booking.pickup_location
        ),
        previous_dropoff: firstValue(
          booking.dropoff_address,
          booking.dropoff,
          booking.dropoff_location,
          booking.destination
        ),
        previous_date: firstValue(
          booking.ride_date,
          booking.date,
          booking.pickup_date
        ),
        previous_time: firstValue(
          booking.ride_time,
          booking.time,
          booking.pickup_time
        ),
        passenger_count: firstValue(
          booking.passenger_count,
          booking.number_of_passengers
        ),
        luggage_count: firstValue(
          booking.luggage_count,
          booking.number_of_bags
        ),
        ride_category: firstValue(
          booking.ride_category,
          booking.ride_category_label
        ),
      };

      const { data, error } = await supabase.rpc(
        "ae_submit_booking_change_request",
        {
          p_booking_id: bookingId,
          p_request_code: selectedOption.code,
          p_request_title: selectedOption.title,
          p_request_details: details.trim(),
          p_request_payload: payload,
        }
      );

      if (error) throw error;

      const response =
        data && typeof data === "object" ? data : {};

      setDetails("");
      setSelectedCode("");
      await loadPage(false);

      Alert.alert(
        "Request Submitted",
        response.driver_notified
          ? "Angel Express Operations and your assigned chauffeur were notified. Your booking remains unchanged until Operations approves the request."
          : "Angel Express Operations was notified. Your booking remains unchanged until Operations approves the request.",
        [
          {
            text: "View My Trips",
            onPress: () => router.replace("/my-trips" as any),
          },
          { text: "Stay Here" },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Request Error",
        error.message || "Could not submit request."
      );
    } finally {
      if (mountedRef.current) setSaving(false);
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

  const scheduledValue = firstValue(
    booking?.scheduled_pickup_at,
    booking?.scheduled_at
  );

  const rideDate = String(
    firstValue(
      booking?.ride_date,
      booking?.date,
      booking?.pickup_date,
      scheduledValue
        ? new Date(scheduledValue).toLocaleDateString()
        : "",
      "Not available"
    )
  );

  const rideTime = String(
    firstValue(
      booking?.ride_time,
      booking?.time,
      booking?.pickup_time,
      scheduledValue
        ? new Date(scheduledValue).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })
        : "",
      "Not available"
    )
  );

  const status = normalize(
    firstValue(booking?.status, booking?.booking_status, "pending")
  );
  const changesLocked = LOCKED_STATUSES.includes(status);

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshPage}
              tintColor={colors.gold}
            />
          }
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
              Submit changes safely without silently altering an active ride.
              Operations reviews every request and assigned chauffeurs receive
              relevant updates.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Edit3 size={31} color={colors.onGold || colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Booking Change Center</Text>
                <Text style={styles.heroText}>
                  Booking {bookingNumber}
                </Text>
                <Text style={styles.heroText}>
                  Invoice {invoiceNumber}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.lifecycleCard,
                status === "unassigned" && styles.unassignedCard,
              ]}
            >
              <ShieldCheck size={21} color={colors.gold} />
              <View style={styles.lifecycleCopy}>
                <Text style={styles.lifecycleTitle}>
                  {titleCase(status)}
                </Text>
                <Text style={styles.lifecycleText}>
                  {lifecycleMessage(status)}
                </Text>
              </View>
            </View>

            {changesLocked ? (
              <View style={styles.lockedCard}>
                <XCircle size={21} color={colors.danger} />
                <View style={styles.lifecycleCopy}>
                  <Text style={styles.lockedTitle}>
                    Online Changes Locked
                  </Text>
                  <Text style={styles.lockedText}>
                    This ride is active, completed, or cancelled. Use Passenger
                    Support for immediate assistance.
                  </Text>
                </View>
              </View>
            ) : null}

            {openRequests.length > 0 ? (
              <View style={styles.pendingRequestCard}>
                <CheckCircle2 size={21} color={colors.warning} />
                <View style={styles.lifecycleCopy}>
                  <Text style={styles.pendingRequestTitle}>
                    {openRequests.length} Request
                    {openRequests.length === 1 ? "" : "s"} Awaiting Review
                  </Text>
                  <Text style={styles.pendingRequestText}>
                    Realtime status updates will appear here after Operations
                    reviews your request.
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.summaryCard}>
              <View style={styles.cardHeader}>
                <ReceiptText size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Booking Summary</Text>
              </View>

              <SummaryRow label="Booking Number" value={bookingNumber} styles={styles} />
              <SummaryRow label="Invoice Number" value={invoiceNumber} styles={styles} />
              <SummaryRow label="Status" value={titleCase(status)} styles={styles} />
              <SummaryRow label="Ride Category" value={displayRideCategory(booking)} styles={styles} />
              <SummaryRow label="Trip Type" value={displayTripType(booking)} styles={styles} />
              <SummaryRow label="Pickup" value={pickup} styles={styles} />
              <SummaryRow label="Drop-off" value={dropoff} styles={styles} />
              <SummaryRow label="Date" value={rideDate} styles={styles} />
              <SummaryRow label="Time" value={rideTime} styles={styles} />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>
                  What do you need to change?
                </Text>
              </View>

              {OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = selectedCode === option.code;
                const duplicatePending = openRequests.some(
                  (request) =>
                    normalize(request.request_code) ===
                      normalize(option.code) ||
                    normalize(request.request_type) ===
                      normalize(option.title)
                );

                return (
                  <TouchableOpacity
                    key={option.code}
                    style={[
                      styles.option,
                      selected && styles.selectedOption,
                      (changesLocked || duplicatePending) &&
                        styles.disabledOption,
                    ]}
                    onPress={() => chooseOption(option.code)}
                    disabled={changesLocked || duplicatePending}
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
                        color={
                          selected
                            ? colors.onGold || colors.navy
                            : colors.gold
                        }
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
                        {duplicatePending
                          ? "A request of this type is already awaiting review."
                          : option.subtitle}
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
                {selectedOption
                  ? selectedOption.placeholder
                  : "Select a request above, then provide the complete new information or reason."}
              </Text>

              <TextInput
                style={[
                  styles.input,
                  changesLocked && styles.disabledInput,
                ]}
                placeholder={
                  selectedOption?.placeholder ||
                  "Describe your requested change..."
                }
                placeholderTextColor={colors.placeholder}
                multiline
                value={details}
                onChangeText={setDetails}
                maxLength={1500}
                editable={!changesLocked}
              />

              <Text style={styles.characterCount}>
                {details.length}/1500
              </Text>
            </View>

            <View style={styles.noticeCard}>
              <View style={styles.noticeHeader}>
                <ShieldCheck size={20} color={colors.gold} />
                <Text style={styles.noticeTitle}>
                  Approval and Fare Protection
                </Text>
              </View>

              <Text style={styles.noticeText}>
                Route, schedule, passenger, luggage, and Student Shared Ride
                changes may produce a new fare quote. Cancellation requests do
                not immediately cancel the booking. Paid bookings require
                refund review. The owner must approve the request before any
                operational booking data changes.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (saving || changesLocked || !selectedOption) &&
                  styles.buttonDisabled,
              ]}
              onPress={confirmSubmit}
              disabled={saving || changesLocked || !selectedOption}
            >
              {saving ? (
                <ActivityIndicator color={colors.onGold || colors.navy} />
              ) : (
                <Text style={styles.submitButtonText}>
                  Submit for Owner Approval
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backTripsButton}
              onPress={() => router.replace("/my-trips" as any)}
            >
              <Text style={styles.backTripsText}>Back to My Trips</Text>
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
      color: c.text2 || c.textSecondary,
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
      color: c.onGold || c.navy,
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
      color: c.text2 || c.textSecondary,
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
      color: c.onGold || c.navy,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 4,
    },
    heroText: {
      color: c.onGold || c.navy,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "800",
      opacity: 0.84,
    },
    lifecycleCard: {
      backgroundColor: c.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      marginBottom: 16,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 11,
    },
    unassignedCard: {
      borderColor: "rgba(249,115,22,0.55)",
      backgroundColor:
        c.mode === "dark"
          ? "rgba(249,115,22,0.12)"
          : "rgba(249,115,22,0.08)",
    },
    lifecycleCopy: {
      flex: 1,
    },
    lifecycleTitle: {
      color: c.gold,
      fontWeight: "900",
      fontSize: 16,
      marginBottom: 4,
    },
    lifecycleText: {
      color: c.text2 || c.textSecondary,
      fontWeight: "700",
      lineHeight: 20,
    },
    lockedCard: {
      backgroundColor:
        c.mode === "dark"
          ? "rgba(239,68,68,0.12)"
          : "rgba(239,68,68,0.08)",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "rgba(239,68,68,0.46)",
      padding: 16,
      marginBottom: 16,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 11,
    },
    lockedTitle: {
      color: c.danger,
      fontWeight: "900",
      fontSize: 16,
      marginBottom: 4,
    },
    lockedText: {
      color: c.text2 || c.textSecondary,
      fontWeight: "700",
      lineHeight: 20,
    },
    pendingRequestCard: {
      backgroundColor:
        c.mode === "dark"
          ? "rgba(245,158,11,0.11)"
          : "rgba(245,158,11,0.07)",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "rgba(245,158,11,0.42)",
      padding: 16,
      marginBottom: 16,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 11,
    },
    pendingRequestTitle: {
      color: c.warning,
      fontWeight: "900",
      fontSize: 16,
      marginBottom: 4,
    },
    pendingRequestText: {
      color: c.text2 || c.textSecondary,
      fontWeight: "700",
      lineHeight: 20,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    summaryCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
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
      borderBottomColor: c.borderSoft || c.lightBorder,
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
      minHeight: 86,
      backgroundColor: c.card2,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
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
    disabledOption: {
      opacity: 0.52,
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
      color: c.onGold || c.navy,
    },
    optionSubtitle: {
      color: c.text2 || c.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "700",
    },
    optionSubtitleActive: {
      color: c.onGold || c.navy,
      opacity: 0.82,
    },
    optionArrow: {
      color: c.gold,
      fontSize: 32,
      fontWeight: "300",
      marginTop: -2,
    },
    optionArrowActive: {
      color: c.onGold || c.navy,
    },
    helperText: {
      color: c.text2 || c.textSecondary,
      fontSize: 14.5,
      lineHeight: 22,
      marginBottom: 14,
      fontWeight: "700",
    },
    input: {
      backgroundColor: c.input,
      color: c.text,
      borderRadius: 16,
      padding: 16,
      minHeight: 138,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      textAlignVertical: "top",
      fontSize: 16,
      fontWeight: "700",
    },
    disabledInput: {
      opacity: 0.55,
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
      color: c.text2 || c.textSecondary,
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
      color: c.onGold || c.navy,
      fontSize: 16,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    buttonDisabled: {
      opacity: 0.54,
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
