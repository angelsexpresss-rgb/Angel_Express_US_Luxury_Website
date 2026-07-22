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
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzfjXYUphz8-nyETcdMYOpHCPoBY33V17OkAZMODpBRVT2V6m8H9DTG5iBM63QqbHtR/exec";

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
    student_pool: "Student Pool Ride",
    tourist_event: "Tourist/Event Ride",
    corporate: "Corporate Ride",
  };

  return map[value || ""] || value || "Standard Ride";
}


function normalizeBoolean(value: any) {
  if (typeof value === "boolean") return value;

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return ["true", "1", "yes", "on"].includes(normalized);
}

function normalizePoolMode(draft: JsonRecord) {
  const requestedMode = String(
    firstValue(
      draft.student_pool_mode,
      draft.student_pool_id ? "join" : "create",
      "create"
    )
  )
    .trim()
    .toLowerCase();

  return requestedMode === "join" ? "join" : "create";
}

function validateStudentPoolDraft(draft: JsonRecord) {
  const isStudentPool =
    draft.ride_category === "student_pool" ||
    normalizeBoolean(draft.student_pool_requested) ||
    normalizeBoolean(draft.shared_ride);

  if (!isStudentPool) return;

  const isVerified =
    normalizeBoolean(draft.student_verified) ||
    normalizeBoolean(draft.student_discount_eligible);

  if (!isVerified) {
    throw new Error(
      "Student Pool Ride requires an approved student verification."
    );
  }

  const seatsRequested = Number(
    firstValue(draft.seats_requested, draft.passenger_count, 1)
  );

  const expectedPoolSize = Number(
    firstValue(draft.expected_pool_size, seatsRequested)
  );

  if (
    !Number.isInteger(seatsRequested) ||
    seatsRequested < 1 ||
    seatsRequested > 4
  ) {
    throw new Error(
      "Student Pool seats requested must be a whole number between 1 and 4."
    );
  }

  if (
    !Number.isInteger(expectedPoolSize) ||
    expectedPoolSize < seatsRequested ||
    expectedPoolSize > 4
  ) {
    throw new Error(
      "Student Pool capacity must be between the requested seats and 4."
    );
  }

  const poolMode = normalizePoolMode(draft);

  if (poolMode === "join" && !draft.student_pool_id) {
    throw new Error(
      "The selected Student Pool could not be identified. Return to Student Travel and select the pool again."
    );
  }
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
  const [termsAccepted, setTermsAccepted] = useState(false);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;
  const confirmationLockRef = useRef(false);

  useEffect(() => {
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

    const entranceAnimation = Animated.timing(pageFade, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    });

    backgroundAnimation.start();
    entranceAnimation.start();
    void loadDraft();

    return () => {
      backgroundAnimation.stop();
      entranceAnimation.stop();
    };
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

      const quoteExpiry = loadedDraft.quote_expires_at
        ? new Date(loadedDraft.quote_expires_at).getTime()
        : null;

      if (
        quoteExpiry &&
        quoteExpiry <= Date.now() &&
        !["confirmed", "completed"].includes(String(loadedDraft.status))
      ) {
        throw new Error(
          "The accepted fare quote has expired. Return to the fare estimate and refresh your quote."
        );
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


  async function synchronizeStudentPoolBooking({
    bookingId,
    bookingNumber,
  }: {
    bookingId: string;
    bookingNumber: string;
  }) {
    if (!draft) {
      throw new Error("The Student Pool draft is unavailable.");
    }

    const isPool =
      draft.ride_category === "student_pool" ||
      normalizeBoolean(draft.student_pool_requested) ||
      normalizeBoolean(draft.shared_ride);

    if (!isPool) {
      return {
        success: true,
        student_pool_id: null,
        pool_member_id: null,
        pool_status: null,
        already_linked: false,
      };
    }

    validateStudentPoolDraft(draft);

    const poolMode = normalizePoolMode(draft);
    const seatsRequested = Math.max(
      1,
      Number(
        firstValue(
          draft.seats_requested,
          draft.passenger_count,
          1
        )
      ) || 1
    );
    const expectedPoolSize = Math.max(
      seatsRequested,
      Number(
        firstValue(
          draft.expected_pool_size,
          seatsRequested
        )
      ) || seatsRequested
    );

    /*
      This RPC must be installed in Supabase before Student Pool confirmation
      is tested. It is intentionally server-side so seat reservation, pool
      capacity checks, membership creation, booking linkage, and idempotency
      happen atomically.
    */
    const { data, error } = await supabase.rpc(
      "sync_student_pool_booking_v1",
      {
        p_booking_id: bookingId,
        p_draft_id: draftId,
        p_access_token: accessToken || null,
        p_request: {
          source_platform:
            draft.source_platform || "passenger_app",
          booking_number: bookingNumber || null,
          pool_mode: poolMode,
          student_pool_id: draft.student_pool_id || null,
          seats_requested: seatsRequested,
          expected_pool_size: expectedPoolSize,
          student_pool_route:
            draft.student_pool_route || null,
          pool_member_status:
            draft.pool_member_status ||
            (poolMode === "join"
              ? "pending_approval"
              : "creator_pending_review"),
          pickup_address: draft.pickup_address,
          pickup_city: draft.pickup_city,
          pickup_state: draft.pickup_state,
          pickup_postal_code:
            draft.pickup_postal_code,
          pickup_latitude:
            draft.pickup_latitude,
          pickup_longitude:
            draft.pickup_longitude,
          dropoff_address: draft.dropoff_address,
          dropoff_city: draft.dropoff_city,
          dropoff_state: draft.dropoff_state,
          dropoff_postal_code:
            draft.dropoff_postal_code,
          dropoff_latitude:
            draft.dropoff_latitude,
          dropoff_longitude:
            draft.dropoff_longitude,
          scheduled_at: draft.scheduled_at,
          return_scheduled_at:
            draft.return_scheduled_at,
          trip_type: draft.trip_type,
          passenger_count:
            draft.passenger_count,
          luggage_count: draft.luggage_count,
          quoted_fare: draft.quoted_fare,
          quoted_driver_share:
            draft.quoted_driver_share,
          quoted_company_share:
            draft.quoted_company_share,
        },
      }
    );

    if (error) throw error;

    const result = data?.result || data || {};

    if (!result?.success) {
      throw new Error(
        result?.message ||
          "The Student Pool booking could not be synchronized."
      );
    }

    return {
      success: true,
      student_pool_id:
        result.student_pool_id ||
        result.pool_id ||
        draft.student_pool_id ||
        null,
      pool_member_id:
        result.pool_member_id ||
        result.member_id ||
        null,
      pool_status:
        result.pool_status ||
        result.status ||
        (poolMode === "join"
          ? "pending_approval"
          : "pending_review"),
      already_linked:
        Boolean(result.already_linked),
    };
  }

  async function sendBookingConfirmation({
    bookingId,
    bookingNumber,
    invoiceNumber,
    finalFare,
    poolResult,
  }: {
    bookingId: string;
    bookingNumber: string;
    invoiceNumber: string;
    finalFare: string;
    poolResult: {
      student_pool_id?: string | null;
      pool_member_id?: string | null;
      pool_status?: string | null;
      already_linked?: boolean;
    };
  }) {
    if (!draft) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const passengerEmail = String(
        firstValue(
          draft.passenger_email,
          draft.email,
          user?.email,
          ""
        )
      ).trim();

      const passengerName = String(
        firstValue(
          draft.passenger_name,
          draft.name,
          passengerEmail,
          "Angel Express Passenger"
        )
      ).trim();

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          booking_id: bookingId,
          booking_number: bookingNumber,
          invoice_no: invoiceNumber,
          invoice_number: invoiceNumber,

          name: passengerName,
          passenger_name: passengerName,
          email: passengerEmail,
          passenger_email: passengerEmail,
          phone: firstValue(
            draft.passenger_phone,
            draft.phone,
            ""
          ),

          pickup: draft.pickup_address,
          pickup_address: draft.pickup_address,
          dropoff: draft.dropoff_address,
          dropoff_address: draft.dropoff_address,

          pickup_lat: firstValue(
            draft.pickup_latitude,
            draft.pickup_lat
          ),
          pickup_lng: firstValue(
            draft.pickup_longitude,
            draft.pickup_lng
          ),
          dropoff_lat: firstValue(
            draft.dropoff_latitude,
            draft.dropoff_lat
          ),
          dropoff_lng: firstValue(
            draft.dropoff_longitude,
            draft.dropoff_lng
          ),

          scheduled_at: draft.scheduled_at,
          return_scheduled_at:
            draft.return_scheduled_at || null,
          date: firstValue(
            draft.ride_date,
            draft.date,
            draft.scheduled_at
          ),
          time: firstValue(
            draft.ride_time,
            draft.time,
            draft.scheduled_at
          ),

          trip_type: draft.trip_type,
          ride_category: draft.ride_category,
          ride_category_label:
            draft.ride_category_label || null,

          passengers: Number(
            firstValue(
              draft.passenger_count,
              draft.passengers,
              1
            )
          ),
          luggage_count: Number(
            firstValue(draft.luggage_count, 0)
          ),
          notes: draft.notes || "",

          promo_code:
            draft.promotion_code ||
            draft.promo_code ||
            "",
          referral_code:
            draft.referral_code || "",
          referral_discount: Number(
            firstValue(draft.referral_discount, 0)
          ),
          referral_applied:
            normalizeBoolean(draft.referral_applied),

          student_verified:
            normalizeBoolean(draft.student_verified),
          student_discount: Number(
            firstValue(
              draft.student_discount,
              draft.fare_breakdown?.student_discount,
              0
            )
          ),
          student_shared_ride: isStudentPool,
          student_pool_requested: isStudentPool,
          student_pool_id:
            poolResult.student_pool_id || null,
          pool_member_id:
            poolResult.pool_member_id || null,
          pool_status:
            poolResult.pool_status || null,
          seats_requested: Number(
            firstValue(
              draft.seats_requested,
              draft.passenger_count,
              1
            )
          ),
          expected_pool_size: Number(
            firstValue(
              draft.expected_pool_size,
              draft.seats_requested,
              draft.passenger_count,
              1
            )
          ),

          miles: Number(
            firstValue(
              draft.route_distance_miles,
              draft.distance_miles,
              0
            )
          ),
          duration_minutes: Number(
            firstValue(
              draft.route_duration_minutes,
              draft.duration_minutes,
              0
            )
          ),
          pricing_version:
            draft.pricing_version || "V2",
          base: Number(
            firstValue(
              draft.quoted_subtotal,
              draft.subtotal,
              finalFare,
              0
            )
          ),
          discount: Number(
            firstValue(
              draft.quoted_discount,
              draft.total_discount,
              0
            )
          ),
          total: Number(finalFare || 0),
          total_fare: Number(finalFare || 0),
          amount_paid: 0,
          balance_due: Number(finalFare || 0),

          source: "passenger_app",
          source_platform: "passenger_app",

          send_passenger_email: true,
          send_owner_email: true,
          create_calendar_event: true,
          owner_email: "support@angelexpressus.com",
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(
          responseText ||
            `Confirmation service returned ${response.status}.`
        );
      }

      console.log(
        "Passenger/owner email and calendar confirmation sent:",
        responseText
      );
    } catch (deliveryError: any) {
      /*
       * The booking is already confirmed in Supabase. Email or calendar
       * delivery must never create a duplicate booking or block the success
       * screen. Log the failure for retry/support instead.
       */
      console.warn(
        "Booking confirmed, but email/calendar delivery failed:",
        deliveryError
      );
    }
  }

  async function confirmBooking() {
    if (
      confirming ||
      confirmationLockRef.current ||
      !draftId ||
      !draft
    ) {
      return;
    }

    if (!termsAccepted) {
      Alert.alert(
        "Agreement Required",
        "Please accept the Terms of Service and cancellation policy before confirming your booking."
      );
      return;
    }

    const quoteExpiry = draft.quote_expires_at
      ? new Date(draft.quote_expires_at).getTime()
      : null;

    if (
      quoteExpiry &&
      quoteExpiry <= Date.now() &&
      !["confirmed", "completed"].includes(String(draft.status))
    ) {
      Alert.alert(
        "Quote Expired",
        "Your accepted fare quote has expired. Return to the fare estimate and refresh it."
      );
      router.back();
      return;
    }

    try {
      validateStudentPoolDraft(draft);

      confirmationLockRef.current = true;
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

      const poolResult = await synchronizeStudentPoolBooking({
        bookingId,
        bookingNumber,
      });

      await sendBookingConfirmation({
        bookingId,
        bookingNumber,
        invoiceNumber,
        finalFare,
        poolResult,
      });

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

          isStudentPool: isStudentPool ? "true" : "false",
          student_pool_id:
            poolResult.student_pool_id || "",
          pool_member_id:
            poolResult.pool_member_id || "",
          pool_status:
            poolResult.pool_status || "",
          pool_already_linked:
            poolResult.already_linked ? "true" : "false",
          student_pool_mode:
            isStudentPool
              ? normalizePoolMode(draft)
              : "",
          seats_requested: isStudentPool
            ? String(
                firstValue(
                  draft.seats_requested,
                  draft.passenger_count,
                  1
                )
              )
            : "",
          expected_pool_size: isStudentPool
            ? String(
                firstValue(
                  draft.expected_pool_size,
                  draft.seats_requested,
                  draft.passenger_count,
                  1
                )
              )
            : "",
        },
      });
    } catch (error: any) {
      console.error("Confirm Booking V2 error:", error);

      const message =
        error?.message || "Angel Express could not confirm this booking.";

      const isPoolSyncError =
        isStudentPool &&
        (
          message.toLowerCase().includes("student pool") ||
          message.toLowerCase().includes("sync_student_pool") ||
          message.toLowerCase().includes("capacity") ||
          message.toLowerCase().includes("seat")
        );

      Alert.alert(
        isPoolSyncError
          ? "Student Pool Confirmation Error"
          : "Booking Error",
        isPoolSyncError
          ? `${message}\n\nYour booking may already have been created. Do not submit repeatedly. Check My Trips or contact Angel Express Support if the booking appears without a pool status.`
          : message
      );

      if (
        message.toLowerCase().includes("expired") ||
        message.toLowerCase().includes("accepted")
      ) {
        router.back();
      }
    } finally {
      confirmationLockRef.current = false;
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
    Boolean(draft?.shared_ride) ||
    draft?.ride_category === "student_pool";

  const studentPoolMode = draft
    ? normalizePoolMode(draft)
    : "create";

  const seatsRequested = Math.max(
    1,
    Number(
      firstValue(
        draft?.seats_requested,
        draft?.passenger_count,
        1
      )
    ) || 1
  );

  const expectedPoolSize = Math.max(
    seatsRequested,
    Number(
      firstValue(
        draft?.expected_pool_size,
        seatsRequested
      )
    ) || seatsRequested
  );

  const farePerSeat =
    isStudentPool && seatsRequested > 0
      ? money(finalFare) / seatsRequested
      : 0;

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
                <CreditCard size={31} color={colors.onGold || colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>
                  {isStudentPool
                    ? "Accepted Student Pool Fare"
                    : "Accepted Fare"}
                </Text>
                <Text style={styles.heroPrice}>
                  {formatMoney(finalFare)}
                </Text>
                <Text style={styles.heroText}>
                  {Number(draft.route_distance_miles || 0).toFixed(1)} miles •{" "}
                  {formatDuration(draft.route_duration_minutes)}
                  {isStudentPool
                    ? ` • ${seatsRequested} seat${seatsRequested === 1 ? "" : "s"}`
                    : ""}
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
                title={isStudentPool ? "Pool Action" : "Shared Ride"}
                value={
                  isStudentPool
                    ? studentPoolMode === "join"
                      ? "Join Pool"
                      : "Create Pool"
                    : "No"
                }
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

              {draft.flight_number ? (
                <Row
                  label="Flight Number"
                  value={String(draft.flight_number)}
                  styles={styles}
                />
              ) : null}

              {draft.airport_terminal ? (
                <Row
                  label="Terminal / Airline"
                  value={String(draft.airport_terminal)}
                  styles={styles}
                />
              ) : null}

              {draft.notes ? (
                <Row label="Notes" value={draft.notes} styles={styles} />
              ) : null}
            </View>

            {isStudentPool ? (
              <View style={styles.poolCard}>
                <View style={styles.cardHeader}>
                  <Users size={22} color={colors.gold} />
                  <Text style={styles.cardTitle}>
                    Student Pool Details
                  </Text>
                </View>

                <Row
                  label="Pool Action"
                  value={
                    studentPoolMode === "join"
                      ? "Join Existing Pool"
                      : "Create New Pool"
                  }
                  styles={styles}
                />

                <Row
                  label="Seats Reserved"
                  value={String(seatsRequested)}
                  styles={styles}
                />

                <Row
                  label="Expected Pool Capacity"
                  value={String(expectedPoolSize)}
                  styles={styles}
                />

                <Row
                  label="Fare Per Reserved Seat"
                  value={formatMoney(farePerSeat)}
                  styles={styles}
                />

                {draft.student_pool_id ? (
                  <Row
                    label="Pool Reference"
                    value={String(draft.student_pool_id)}
                    styles={styles}
                  />
                ) : null}

                {draft.student_pool_route ? (
                  <Row
                    label="Pool Route"
                    value={String(draft.student_pool_route)}
                    styles={styles}
                  />
                ) : null}

                <View style={styles.poolStatusBox}>
                  <GraduationCap size={19} color="#22c55e" />

                  <Text style={styles.poolStatusText}>
                    {studentPoolMode === "join"
                      ? "Your seats will be reserved in the selected pool after confirmation. Angel Express Operations will verify capacity and approve your membership."
                      : "A pending Student Pool will be created after confirmation. Angel Express Operations will review and publish it before matching other verified students."}
                  </Text>
                </View>
              </View>
            ) : null}

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
                  label="Student Pool Savings"
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
                {isStudentPool
                  ? "By confirming, Angel Express will create your individual booking and link it to the Student Pool system. The pool will appear in your trips and in Owner Operations. Drivers will only receive the grouped trip after owner approval and assignment."
                  : "By confirming, you are submitting this ride request to Angel Express. The booking will appear in your trips and in the Owner and Driver operations systems."}
              </Text>

              <View style={styles.rewardBox}>
                <Sparkles size={18} color={colors.gold} />

                <Text style={styles.rewardText}>
                  This ride may earn {rewardPoints} reward points after
                  completion.
                </Text>
              </View>
            </View>

            <View style={styles.agreementCard}>
              <TouchableOpacity
                style={styles.agreementRow}
                onPress={() => setTermsAccepted((current) => !current)}
                activeOpacity={0.85}
                disabled={confirming}
              >
                <View
                  style={[
                    styles.checkbox,
                    termsAccepted && styles.checkboxActive,
                  ]}
                >
                  {termsAccepted ? (
                    <BadgeCheck size={18} color={colors.onGold || colors.navy} />
                  ) : null}
                </View>

                <Text style={styles.agreementText}>
                  I agree to the Angel Express Terms of Service and understand
                  that cancellation or no-show fees may apply after a driver is
                  assigned or begins traveling to the pickup location.
                  {isStudentPool
                    ? " I also understand that Student Pool participation is subject to verification, seat availability, owner approval, and grouped-trip operating rules."
                    : ""}
                </Text>
              </TouchableOpacity>

              <View style={styles.policyLinks}>
                <TouchableOpacity
                  onPress={() => router.push("/terms" as any)}
                  activeOpacity={0.8}
                  disabled={confirming}
                >
                  <Text style={styles.policyLink}>Read Terms</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/privacy" as any)}
                  activeOpacity={0.8}
                  disabled={confirming}
                >
                  <Text style={styles.policyLink}>Privacy Policy</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.cancellationText}>
                Cancellation notice: fees may apply for late cancellations,
                passenger no-shows, or material trip changes after confirmation.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                (confirming || !termsAccepted) && styles.buttonDisabled,
              ]}
              onPress={confirmBooking}
              disabled={confirming || !termsAccepted}
              activeOpacity={0.88}
            >
              {confirming ? (
                <View style={styles.buttonLoadingRow}>
                  <ActivityIndicator color={colors.onGold || colors.navy} />
                  <Text style={styles.buttonText}>
                    Creating Booking
                  </Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>
                  {isStudentPool
                    ? "Confirm Student Pool Booking"
                    : "Confirm Booking"}
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
      color: c.text2 || c.textSecondary,
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
      color: c.onGold || c.navy,
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
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 2,
    },
    heroPrice: {
      color: c.onGold || c.navy,
      fontSize: 42,
      fontWeight: "900",
      letterSpacing: -1,
    },
    heroText: {
      color: c.onGold || c.navy,
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
      borderColor: c.borderSoft || c.lightBorder,
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

    row: {
      marginBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft || c.lightBorder,
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

    poolCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: "rgba(34,197,94,0.38)",
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    poolStatusBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 9,
      borderWidth: 1,
      borderColor: "rgba(34,197,94,0.35)",
      backgroundColor: "rgba(34,197,94,0.10)",
      borderRadius: 16,
      padding: 13,
      marginTop: 4,
    },
    poolStatusText: {
      color: "#22c55e",
      fontSize: 13,
      fontWeight: "900",
      flex: 1,
      lineHeight: 20,
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
      borderColor: c.borderSoft || c.lightBorder,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    notice: {
      color: c.text2 || c.textSecondary,
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

    agreementCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    agreementRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: c.gold,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    checkboxActive: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    agreementText: {
      flex: 1,
      color: c.text,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "800",
    },
    policyLinks: {
      flexDirection: "row",
      alignItems: "center",
      gap: 20,
      marginTop: 14,
      marginLeft: 38,
    },
    policyLink: {
      color: c.gold,
      fontSize: 13,
      fontWeight: "900",
      textDecorationLine: "underline",
    },
    cancellationText: {
      color: c.text2 || c.textSecondary,
      fontSize: 12.5,
      lineHeight: 19,
      fontWeight: "700",
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.borderSoft,
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
      color: c.onGold || c.navy,
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
