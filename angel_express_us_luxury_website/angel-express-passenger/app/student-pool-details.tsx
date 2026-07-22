import * as Linking from "expo-linking";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronRight,
  Clock3,
  GraduationCap,
  Headphones,
  MapPinned,
  Navigation,
  Phone,
  RefreshCcw,
  Route,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

type AnyRecord = Record<string, any>;

const ACTIVE_MEMBER_STATUSES = [
  "pending",
  "pending_review",
  "pending_approval",
  "approved",
  "active",
  "joined",
  "confirmed",
  "matched",
];

const TERMINAL_POOL_STATUSES = [
  "completed",
  "cancelled",
  "canceled",
  "rejected",
  "closed",
];

function firstValue(...values: any[]) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
}

function normalize(value: any) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function titleCase(value: any) {
  return normalize(value || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function numberValue(...values: any[]) {
  const parsed = Number(firstValue(...values, 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateTime(value: any) {
  if (!value) return "Schedule pending";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortId(value: any) {
  const text = String(value || "");
  if (!text) return "Pending";
  if (text.length <= 18) return text;
  return `${text.slice(0, 8)}...${text.slice(-6)}`;
}

function isDriverReady(pool: AnyRecord | null, booking: AnyRecord | null) {
  const driverId = firstValue(
    pool?.driver_id,
    pool?.assigned_driver_id,
    booking?.driver_id,
    booking?.assigned_driver_id
  );

  const status = normalize(
    firstValue(
      booking?.trip_phase,
      booking?.driver_status,
      booking?.status,
      pool?.status
    )
  );

  return Boolean(driverId) || [
    "assigned",
    "driver_assigned",
    "accepted",
    "driver_accepted",
    "driver_en_route",
    "en_route",
    "driver_arrived",
    "passenger_onboard",
    "picked_up",
    "in_progress",
  ].includes(status);
}

function getPoolProgressIndex(
  pool: AnyRecord | null,
  booking: AnyRecord | null
) {
  const status = normalize(
    firstValue(pool?.status, booking?.pool_status, "pending_review")
  );

  if (["cancelled", "canceled", "rejected"].includes(status)) return -1;
  if (["completed", "trip_completed"].includes(status)) return 5;

  if (isDriverReady(pool, booking)) {
    const tripStatus = normalize(
      firstValue(booking?.trip_phase, booking?.status)
    );

    if (
      [
        "passenger_onboard",
        "picked_up",
        "in_progress",
        "completed",
      ].includes(tripStatus)
    ) {
      return 5;
    }

    return 4;
  }

  if (
    [
      "confirmed",
      "ready",
      "pool_ready",
      "smart_queue_ready",
      "pool_matched",
      "dispatch_ready",
    ].includes(status)
  ) {
    return 3;
  }

  if (["forming", "open", "matching", "smart_queue"].includes(status)) {
    return 2;
  }

  if (["approved", "owner_approved"].includes(status)) return 1;

  return 0;
}

function getOwnerReviewLabel(pool: AnyRecord | null) {
  const status = normalize(pool?.status);

  if (["rejected", "cancelled", "canceled"].includes(status)) {
    return "Not Approved";
  }

  if (
    [
      "approved",
      "owner_approved",
      "forming",
      "open",
      "matching",
      "confirmed",
      "ready",
      "pool_ready",
      "driver_assigned",
      "assigned",
      "in_progress",
      "completed",
    ].includes(status)
  ) {
    return "Approved";
  }

  return "Pending Review";
}

function getMemberStatus(member: AnyRecord | null) {
  return titleCase(
    firstValue(
      member?.member_status,
      member?.status,
      "pending_review"
    )
  );
}

function getPoolStatusMessage(pool: AnyRecord | null) {
  const status = normalize(pool?.status || "pending_review");

  const messages: Record<string, string> = {
    pending_review:
      "Angel Express Operations is reviewing this Student Pool request.",
    pending_approval:
      "Your membership request is waiting for Operations approval.",
    approved:
      "Operations approved the request. Student matching will begin shortly.",
    owner_approved:
      "Operations approved this Student Pool. Matching is now active.",
    forming:
      "The pool is forming with verified students traveling on this route.",
    open:
      "This pool is open for more verified students.",
    matching:
      "Smart Queue is matching verified students for this route.",
    smart_queue:
      "Smart Queue is matching verified students for this route.",
    confirmed:
      "The Student Pool is confirmed and ready for chauffeur dispatch.",
    ready:
      "The Student Pool is ready for chauffeur dispatch.",
    pool_ready:
      "The Student Pool is ready for chauffeur dispatch.",
    assigned:
      "A chauffeur has been assigned to this Student Pool.",
    driver_assigned:
      "A chauffeur has been assigned to this Student Pool.",
    completed:
      "This Student Pool ride has been completed.",
    cancelled:
      "This Student Pool request was cancelled.",
    rejected:
      "This Student Pool request was not approved.",
  };

  return messages[status] || `Student Pool status: ${titleCase(status)}.`;
}

export default function StudentPoolDetailsScreen() {
  const params = useLocalSearchParams();
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const bookingId = String(
    firstValue(params.bookingId, params.booking_id, "") || ""
  );

  const incomingPoolId = String(
    firstValue(
      params.student_pool_id,
      params.poolId,
      params.pool_id,
      ""
    ) || ""
  );

  const [booking, setBooking] = useState<AnyRecord | null>(null);
  const [pool, setPool] = useState<AnyRecord | null>(null);
  const [members, setMembers] = useState<AnyRecord[]>([]);
  const [member, setMember] = useState<AnyRecord | null>(null);
  const [driver, setDriver] = useState<AnyRecord | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [errorText, setErrorText] = useState("");

  const mountedRef = useRef(true);
  const didAutoOpenLiveTrip = useRef(false);
  const pageFade = useRef(new Animated.Value(0)).current;
  const backgroundScale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  const resolvedPoolId = String(
    firstValue(pool?.id, booking?.student_pool_id, incomingPoolId, "") || ""
  );

  const driverId = String(
    firstValue(
      pool?.assigned_driver_id,
      pool?.driver_id,
      booking?.assigned_driver_id,
      booking?.driver_id,
      ""
    ) || ""
  );

  const capacity = Math.max(
    1,
    numberValue(
      pool?.seats_total,
      booking?.expected_pool_size,
      4
    )
  );

  const filledSeats = Math.min(
    capacity,
    Math.max(
      0,
      numberValue(
        pool?.seats_reserved,
        capacity - numberValue(pool?.seats_available),
        members.reduce(
          (sum, current) =>
            sum +
            Math.max(
              1,
              numberValue(
                current.seats_reserved,
                current.seats_requested,
                1
              )
            ),
          0
        )
      )
    )
  );

  const remainingSeats = Math.max(
    0,
    numberValue(pool?.seats_available, capacity - filledSeats)
  );

  const progressPercentage = Math.min(
    100,
    Math.max(0, (filledSeats / capacity) * 100)
  );

  const routeLabel = String(
    firstValue(
      pool?.route_label,
      pool?.pool_route,
      booking?.student_pool_route,
      `${firstValue(
        pool?.origin,
        booking?.pickup_address,
        booking?.pickup,
        "Pickup"
      )} → ${firstValue(
        pool?.destination,
        booking?.dropoff_address,
        booking?.dropoff,
        "Drop-off"
      )}`
    )
  );

  const scheduledAt = firstValue(
    pool?.scheduled_at,
    booking?.scheduled_at,
    booking?.pickup_at
  );

  const poolStatus = normalize(
    firstValue(pool?.status, booking?.pool_status, "pending_review")
  );

  const progressIndex = getPoolProgressIndex(pool, booking);
  const ownerReview = getOwnerReviewLabel(pool);
  const liveTripReady = isDriverReady(pool, booking);

  useEffect(() => {
    mountedRef.current = true;

    Animated.parallel([
      Animated.timing(pageFade, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
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
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.05,
            duration: 1150,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1150,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPoolDetails(false);
    }, [bookingId, incomingPoolId])
  );

  useEffect(() => {
    const channels: ReturnType<typeof supabase.channel>[] = [];

    if (bookingId) {
      channels.push(
        supabase
          .channel(`student-pool-booking-${bookingId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "bookings",
              filter: `id=eq.${bookingId}`,
            },
            () => void loadPoolDetails(true)
          )
          .subscribe()
      );
    }

    if (resolvedPoolId) {
      channels.push(
        supabase
          .channel(`student-pool-ride-${resolvedPoolId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "student_pool_rides",
              filter: `id=eq.${resolvedPoolId}`,
            },
            () => void loadPoolDetails(true)
          )
          .subscribe()
      );

      channels.push(
        supabase
          .channel(`student-pool-members-${resolvedPoolId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "student_pool_members",
              filter: `pool_id=eq.${resolvedPoolId}`,
            },
            () => void loadPoolDetails(true)
          )
          .subscribe()
      );
    }

    return () => {
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [bookingId, resolvedPoolId]);

  useEffect(() => {
    if (
      liveTripReady &&
      bookingId &&
      !didAutoOpenLiveTrip.current
    ) {
      didAutoOpenLiveTrip.current = true;

      const timer = setTimeout(() => {
        router.replace({
          pathname: "/live-trip" as any,
          params: {
            bookingId,
            booking_id: bookingId,
            student_pool_id: resolvedPoolId,
          },
        });
      }, 1800);

      return () => clearTimeout(timer);
    }
  }, [liveTripReady, bookingId, resolvedPoolId]);

  async function loadPoolDetails(silent = false) {
    try {
      if (!silent) setLoading(true);
      setErrorText("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in to view this Student Pool.");

      let nextBooking: AnyRecord | null = null;

      if (bookingId) {
        const { data, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", bookingId)
          .maybeSingle();

        if (error) throw error;
        nextBooking = data || null;
      }

      const nextPoolId = String(
        firstValue(
          nextBooking?.student_pool_id,
          incomingPoolId,
          ""
        ) || ""
      );

      if (!nextPoolId) {
        throw new Error(
          "This booking is not linked to a Student Pool yet."
        );
      }

      const [
        { data: poolData, error: poolError },
        { data: memberData, error: memberError },
      ] = await Promise.all([
        supabase
          .from("student_pool_rides")
          .select("*")
          .eq("id", nextPoolId)
          .maybeSingle(),
        supabase
          .from("student_pool_members")
          .select("*")
          .eq("pool_id", nextPoolId)
          .order("joined_at", { ascending: true }),
      ]);

      if (poolError) throw poolError;
      if (memberError) throw memberError;

      const nextMembers = memberData || [];

      const ownMember =
        nextMembers.find(
          (item) =>
            String(item.booking_id || "") === bookingId
        ) ||
        nextMembers.find(
          (item) =>
            String(
              firstValue(
                item.passenger_user_id,
                item.user_id,
                ""
              )
            ) === user.id
        ) ||
        null;

      const nextDriverId = String(
        firstValue(
          poolData?.assigned_driver_id,
          poolData?.driver_id,
          nextBooking?.assigned_driver_id,
          nextBooking?.driver_id,
          ""
        ) || ""
      );

      let nextDriver: AnyRecord | null = null;

      if (nextDriverId) {
        const { data: driverData, error: driverError } =
          await supabase
            .from("drivers")
            .select(
              "id, full_name, first_name, last_name, phone, rating, total_trips, driver_level, vehicle_make, vehicle_model, vehicle_year, plate_number, safety_badge"
            )
            .eq("id", nextDriverId)
            .maybeSingle();

        if (driverError) {
          console.warn(
            "Student Pool driver card warning:",
            driverError
          );
        } else {
          nextDriver = driverData || null;
        }
      }

      if (mountedRef.current) {
        setBooking(nextBooking);
        setPool(poolData || null);
        setMembers(nextMembers);
        setMember(ownMember);
        setDriver(nextDriver);
      }
    } catch (error: any) {
      console.warn("Student Pool details load error:", error);

      if (mountedRef.current) {
        setErrorText(
          error?.message ||
            "Student Pool details could not be loaded."
        );
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    await loadPoolDetails(true);
  }

  function contactSupport() {
    router.push({
      pathname: "/support" as any,
      params: {
        bookingId,
        booking_id: bookingId,
        student_pool_id: resolvedPoolId,
        subject: "Student Pool Support",
      },
    });
  }

  function openLiveTrip() {
    if (!bookingId) {
      Alert.alert(
        "Booking Unavailable",
        "The booking reference is unavailable."
      );
      return;
    }

    didAutoOpenLiveTrip.current = true;

    router.push({
      pathname: "/live-trip" as any,
      params: {
        bookingId,
        booking_id: bookingId,
        student_pool_id: resolvedPoolId,
      },
    });
  }

  function cleanPhone(value: string) {
    return String(value || "").replace(/[^\d+]/g, "");
  }

  function callDriver() {
    if (!driver?.phone) {
      Alert.alert(
        "Phone Unavailable",
        "The chauffeur phone number is not available yet."
      );
      return;
    }

    void Linking.openURL(`tel:${cleanPhone(driver.phone)}`);
  }

  function requestLeavePool() {
    const status = normalize(
      firstValue(member?.member_status, member?.status)
    );

    if (TERMINAL_POOL_STATUSES.includes(poolStatus)) {
      Alert.alert(
        "Pool Closed",
        "This Student Pool is already closed and cannot be changed."
      );
      return;
    }

    if (liveTripReady || progressIndex >= 4) {
      Alert.alert(
        "Contact Support",
        "A chauffeur has already been assigned. Contact Angel Express Support to request a change."
      );
      return;
    }

    if (
      status &&
      !ACTIVE_MEMBER_STATUSES.includes(status)
    ) {
      Alert.alert(
        "Membership Inactive",
        `Your current member status is ${titleCase(status)}.`
      );
      return;
    }

    Alert.alert(
      "Leave Student Pool?",
      "Your seat will be released and your Student Pool membership will be cancelled. This action cannot be undone.",
      [
        {
          text: "Keep My Seat",
          style: "cancel",
        },
        {
          text: "Leave Pool",
          style: "destructive",
          onPress: () => void leavePool(),
        },
      ]
    );
  }

  async function leavePool() {
    if (leaving) return;

    try {
      setLeaving(true);

      if (!member?.id) {
        throw new Error(
          "Your Student Pool membership record was not found."
        );
      }

      const { error: memberUpdateError } = await supabase
        .from("student_pool_members")
        .update({
          status: "cancelled",
          member_status: "cancelled",
          removed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", member.id);

      if (memberUpdateError) throw memberUpdateError;

      if (bookingId) {
        const { error: bookingUpdateError } = await supabase
          .from("bookings")
          .update({
            pool_member_status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId);

        if (bookingUpdateError) {
          console.warn(
            "Booking pool status update warning:",
            bookingUpdateError
          );
        }
      }

      Alert.alert(
        "Student Pool Left",
        "Your seat has been released. Angel Express Operations has been notified.",
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
        "Unable to Leave Pool",
        error?.message ||
          "Your Student Pool membership could not be updated."
      );
    } finally {
      setLeaving(false);
    }
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const driverName = driver
    ? firstValue(
        driver.full_name,
        `${driver.first_name || ""} ${
          driver.last_name || ""
        }`.trim(),
        "Angel Express Chauffeur"
      )
    : "";

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.gold}
            />
          }
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.84}
            >
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.themePill}
              onPress={toggleTheme}
              activeOpacity={0.84}
            >
              <Text style={styles.themeText}>
                {themeMode === "dark"
                  ? "☀️ Light"
                  : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <View style={styles.hero}>
              <Animated.View
                style={[
                  styles.heroIcon,
                  { transform: [{ scale: pulse }] },
                ]}
              >
                <GraduationCap
                  size={38}
                  color={colors.navy}
                  strokeWidth={2.4}
                />
              </Animated.View>

              <Text style={styles.kicker}>
                ANGEL EXPRESS STUDENT TRAVEL
              </Text>
              <Text style={styles.title}>
                Student Pool
              </Text>
              <Text style={styles.subtitle}>
                Live pool coordination, verified-student matching,
                owner review, and chauffeur assignment.
              </Text>
            </View>

            {errorText ? (
              <View style={styles.errorCard}>
                <AlertTriangle
                  size={22}
                  color="#FDBA74"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorTitle}>
                    Pool details unavailable
                  </Text>
                  <Text style={styles.errorText}>
                    {errorText}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() =>
                    void loadPoolDetails(false)
                  }
                >
                  <RefreshCcw
                    size={17}
                    color={colors.navy}
                  />
                </TouchableOpacity>
              </View>
            ) : null}

            {loading ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator
                  color={colors.gold}
                  size="large"
                />
                <Text style={styles.loadingText}>
                  Loading Student Pool...
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.statusHero}>
                  <View style={styles.statusHeroTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.statusLabel}>
                        LIVE POOL STATUS
                      </Text>
                      <Text style={styles.statusValue}>
                        {titleCase(poolStatus)}
                      </Text>
                    </View>

                    <View style={styles.poolIdPill}>
                      <Text style={styles.poolIdLabel}>
                        POOL ID
                      </Text>
                      <Text style={styles.poolIdValue}>
                        {shortId(resolvedPoolId)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.statusMessage}>
                    {getPoolStatusMessage(pool)}
                  </Text>

                  {liveTripReady ? (
                    <View style={styles.autoTransitionBox}>
                      <Navigation
                        size={18}
                        color="#93C5FD"
                      />
                      <Text style={styles.autoTransitionText}>
                        Chauffeur assigned. Opening Live Trip
                        automatically...
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.metricGrid}>
                  <MetricCard
                    icon={
                      <UsersRound
                        size={21}
                        color={colors.gold}
                      />
                    }
                    label="Seats Filled"
                    value={`${filledSeats}/${capacity}`}
                    styles={styles}
                  />

                  <MetricCard
                    icon={
                      <UserRound
                        size={21}
                        color={colors.gold}
                      />
                    }
                    label="Seats Remaining"
                    value={String(remainingSeats)}
                    styles={styles}
                  />

                  <MetricCard
                    icon={
                      <ShieldCheck
                        size={21}
                        color={colors.gold}
                      />
                    }
                    label="Owner Review"
                    value={ownerReview}
                    styles={styles}
                  />

                  <MetricCard
                    icon={
                      <CheckCircle2
                        size={21}
                        color={colors.gold}
                      />
                    }
                    label="Your Status"
                    value={getMemberStatus(member)}
                    styles={styles}
                  />
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <UsersRound
                      size={22}
                      color={colors.gold}
                    />
                    <Text style={styles.cardTitle}>
                      Live Pool Occupancy
                    </Text>
                  </View>

                  <View style={styles.progressHeader}>
                    <Text style={styles.progressTitle}>
                      Matching Progress
                    </Text>
                    <Text style={styles.progressValue}>
                      {Math.round(progressPercentage)}%
                    </Text>
                  </View>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progressPercentage}%`,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.seatGrid}>
                    {Array.from({
                      length: capacity,
                    }).map((_, index) => {
                      const occupied =
                        index < filledSeats;

                      return (
                        <View
                          key={`pool-seat-${index}`}
                          style={[
                            styles.seatCard,
                            occupied &&
                              styles.seatCardOccupied,
                          ]}
                        >
                          <UserRound
                            size={20}
                            color={
                              occupied
                                ? colors.navy
                                : colors.gold
                            }
                          />
                          <Text
                            style={[
                              styles.seatText,
                              occupied &&
                                styles.seatTextOccupied,
                            ]}
                          >
                            {occupied
                              ? `Student ${index + 1}`
                              : "Available"}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <Text style={styles.privacyText}>
                    Passenger identities are hidden for privacy.
                    Angel Express Operations can see verified
                    member information.
                  </Text>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Route
                      size={22}
                      color={colors.gold}
                    />
                    <Text style={styles.cardTitle}>
                      Pool Route
                    </Text>
                  </View>

                  <View style={styles.routeBox}>
                    <MapPinned
                      size={21}
                      color={colors.gold}
                    />
                    <Text style={styles.routeText}>
                      {routeLabel}
                    </Text>
                  </View>

                  <InfoLine
                    icon={
                      <CalendarDays
                        size={17}
                        color={colors.gold}
                      />
                    }
                    label="Scheduled Ride"
                    value={formatDateTime(scheduledAt)}
                    styles={styles}
                  />

                  <InfoLine
                    icon={
                      <UsersRound
                        size={17}
                        color={colors.gold}
                      />
                    }
                    label="Expected Capacity"
                    value={`${capacity} passenger seat${
                      capacity === 1 ? "" : "s"
                    }`}
                    styles={styles}
                  />

                  <InfoLine
                    icon={
                      <ShieldCheck
                        size={17}
                        color={colors.gold}
                      />
                    }
                    label="Pool Reference"
                    value={shortId(resolvedPoolId)}
                    styles={styles}
                  />
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Sparkles
                      size={22}
                      color={colors.gold}
                    />
                    <Text style={styles.cardTitle}>
                      Pool Timeline
                    </Text>
                  </View>

                  {[
                    {
                      title: "Request Received",
                      detail:
                        "Your Student Pool request was securely created.",
                    },
                    {
                      title: "Owner Review",
                      detail:
                        "Angel Express Operations verifies and approves the pool.",
                    },
                    {
                      title: "Student Matching",
                      detail:
                        "Smart Queue matches verified students on the route.",
                    },
                    {
                      title: "Pool Ready",
                      detail:
                        "The required pool conditions have been met.",
                    },
                    {
                      title: "Driver Assigned",
                      detail:
                        "An approved chauffeur accepts the grouped ride.",
                    },
                    {
                      title: "Trip Active",
                      detail:
                        "All passengers follow the shared live-trip experience.",
                    },
                  ].map((step, index) => {
                    const complete =
                      progressIndex >= index;
                    const active =
                      progressIndex === index &&
                      progressIndex >= 0;

                    return (
                      <View
                        key={step.title}
                        style={styles.timelineRow}
                      >
                        <View
                          style={[
                            styles.timelineDot,
                            complete &&
                              styles.timelineDotComplete,
                            active &&
                              styles.timelineDotActive,
                          ]}
                        >
                          {complete ? (
                            <CheckCircle2
                              size={16}
                              color={colors.navy}
                              strokeWidth={3}
                            />
                          ) : (
                            <Text
                              style={styles.timelineDotText}
                            >
                              {index + 1}
                            </Text>
                          )}
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.timelineTitle,
                              complete &&
                                styles.timelineTitleComplete,
                            ]}
                          >
                            {step.title}
                          </Text>
                          <Text
                            style={styles.timelineDetail}
                          >
                            {step.detail}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <ShieldCheck
                      size={22}
                      color={colors.gold}
                    />
                    <Text style={styles.cardTitle}>
                      Member Status
                    </Text>
                  </View>

                  <InfoLine
                    icon={
                      <GraduationCap
                        size={17}
                        color={colors.gold}
                      />
                    }
                    label="Membership"
                    value={getMemberStatus(member)}
                    styles={styles}
                  />

                  <InfoLine
                    icon={
                      <UsersRound
                        size={17}
                        color={colors.gold}
                      />
                    }
                    label="Seats Reserved"
                    value={String(
                      Math.max(
                        1,
                        numberValue(
                          member?.seats_reserved,
                          booking?.seats_requested,
                          1
                        )
                      )
                    )}
                    styles={styles}
                  />

                  <InfoLine
                    icon={
                      <ShieldCheck
                        size={17}
                        color={colors.gold}
                      />
                    }
                    label="Owner Review"
                    value={ownerReview}
                    styles={styles}
                  />

                  <View style={styles.memberList}>
                    {Array.from({
                      length: capacity,
                    }).map((_, index) => {
                      const memberRecord =
                        members[index] || null;

                      return (
                        <View
                          key={`anonymous-member-${index}`}
                          style={styles.memberRow}
                        >
                          <View
                            style={[
                              styles.memberAvatar,
                              memberRecord &&
                                styles.memberAvatarActive,
                            ]}
                          >
                            <UserRound
                              size={17}
                              color={
                                memberRecord
                                  ? colors.navy
                                  : colors.gold
                              }
                            />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text
                              style={styles.memberTitle}
                            >
                              {memberRecord
                                ? `Verified Student ${
                                    index + 1
                                  }`
                                : "Waiting for Student"}
                            </Text>
                            <Text
                              style={styles.memberStatus}
                            >
                              {memberRecord
                                ? titleCase(
                                    firstValue(
                                      memberRecord.member_status,
                                      memberRecord.status,
                                      "active"
                                    )
                                  )
                                : "Available Seat"}
                            </Text>
                          </View>

                          {memberRecord ? (
                            <CheckCircle2
                              size={18}
                              color="#2ECC71"
                            />
                          ) : (
                            <Clock3
                              size={18}
                              color={colors.gold}
                            />
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <CarFront
                      size={22}
                      color={colors.gold}
                    />
                    <Text style={styles.cardTitle}>
                      Driver Assignment
                    </Text>
                  </View>

                  {driver ? (
                    <>
                      <Text style={styles.driverName}>
                        {driverName}
                      </Text>

                      <View style={styles.driverRatingRow}>
                        <Star
                          size={16}
                          color={colors.gold}
                          fill={colors.gold}
                        />
                        <Text style={styles.driverRating}>
                          {Number(
                            driver.rating || 5
                          ).toFixed(1)}{" "}
                          Rating •{" "}
                          {driver.total_trips || 0} Trips
                        </Text>
                      </View>

                      <InfoLine
                        icon={
                          <CarFront
                            size={17}
                            color={colors.gold}
                          />
                        }
                        label="Vehicle"
                        value={
                          [
                            driver.vehicle_year,
                            driver.vehicle_make,
                            driver.vehicle_model,
                          ]
                            .filter(Boolean)
                            .join(" ") ||
                          "Vehicle details pending"
                        }
                        styles={styles}
                      />

                      <InfoLine
                        icon={
                          <ShieldCheck
                            size={17}
                            color={colors.gold}
                          />
                        }
                        label="Plate"
                        value={
                          driver.plate_number ||
                          "Pending"
                        }
                        styles={styles}
                      />

                      <View style={styles.driverActions}>
                        <TouchableOpacity
                          style={styles.driverActionButton}
                          onPress={callDriver}
                        >
                          <Phone
                            size={17}
                            color={colors.navy}
                          />
                          <Text
                            style={
                              styles.driverActionText
                            }
                          >
                            Call Driver
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.driverActionButton}
                          onPress={openLiveTrip}
                        >
                          <Navigation
                            size={17}
                            color={colors.navy}
                          />
                          <Text
                            style={
                              styles.driverActionText
                            }
                          >
                            Live Trip
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <View style={styles.pendingDriverBox}>
                      <Clock3
                        size={20}
                        color={colors.gold}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={styles.pendingDriverTitle}
                        >
                          Chauffeur Assignment Pending
                        </Text>
                        <Text
                          style={styles.pendingDriverText}
                        >
                          A chauffeur will be dispatched
                          after the Student Pool is approved
                          and ready.
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {liveTripReady ? (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={openLiveTrip}
                    activeOpacity={0.88}
                  >
                    <Navigation
                      size={19}
                      color={colors.navy}
                    />
                    <Text style={styles.primaryButtonText}>
                      Open Live Trip
                    </Text>
                    <ChevronRight
                      size={20}
                      color={colors.navy}
                    />
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.supportButton}
                  onPress={contactSupport}
                  activeOpacity={0.86}
                >
                  <Headphones
                    size={19}
                    color={colors.gold}
                  />
                  <Text style={styles.supportButtonText}>
                    Contact Support
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.leaveButton,
                    leaving &&
                      styles.disabledButton,
                  ]}
                  onPress={requestLeavePool}
                  disabled={leaving}
                  activeOpacity={0.86}
                >
                  {leaving ? (
                    <ActivityIndicator
                      size="small"
                      color="#FCA5A5"
                    />
                  ) : (
                    <XCircle
                      size={19}
                      color="#FCA5A5"
                    />
                  )}
                  <Text style={styles.leaveButtonText}>
                    {leaving
                      ? "Leaving Pool..."
                      : "Leave Student Pool"}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.footerText}>
                  Verified Students • Private Coordination •
                  Angel Express Safety
                </Text>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function MetricCard({
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
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>{icon}</View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={styles.metricValue}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function InfoLine({
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
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>

      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
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
      paddingBottom: 54,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 22,
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
    hero: {
      alignItems: "center",
      marginBottom: 22,
    },
    heroIcon: {
      width: 84,
      height: 84,
      borderRadius: 28,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 17,
      ...v5Shadow(c),
    },
    kicker: {
      color: c.gold,
      fontSize: 11.5,
      fontWeight: "900",
      letterSpacing: 1.4,
      textAlign: "center",
      marginBottom: 7,
    },
    title: {
      color: c.text,
      fontSize: 38,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 9,
    },
    subtitle: {
      color:
        c.mode === "dark"
          ? "#E5EAF2"
          : c.text2,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "700",
      textAlign: "center",
      maxWidth: 520,
    },
    errorCard: {
      backgroundColor: "rgba(249,115,22,0.12)",
      borderWidth: 1,
      borderColor: "rgba(249,115,22,0.42)",
      borderRadius: 18,
      padding: 15,
      marginBottom: 18,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },
    errorTitle: {
      color:
        c.mode === "dark"
          ? "#FED7AA"
          : "#9A3412",
      fontSize: 14,
      fontWeight: "900",
      marginBottom: 3,
    },
    errorText: {
      color:
        c.mode === "dark"
          ? "#FED7AA"
          : "#9A3412",
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "700",
    },
    retryButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingCard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 22,
      padding: 30,
      alignItems: "center",
      ...v5Shadow(c),
    },
    loadingText: {
      color: c.text,
      fontSize: 16,
      fontWeight: "800",
      marginTop: 13,
    },
    statusHero: {
      backgroundColor:
        c.mode === "dark"
          ? "rgba(168,85,247,0.12)"
          : "#FAF5FF",
      borderWidth: 1,
      borderColor: "rgba(168,85,247,0.42)",
      borderRadius: 24,
      padding: 19,
      marginBottom: 16,
      ...v5Shadow(c),
    },
    statusHeroTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 12,
    },
    statusLabel: {
      color: c.gold,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1,
      marginBottom: 4,
    },
    statusValue: {
      color: c.text,
      fontSize: 25,
      fontWeight: "900",
    },
    poolIdPill: {
      maxWidth: "43%",
      borderRadius: 15,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 9,
      paddingHorizontal: 11,
    },
    poolIdLabel: {
      color: c.gold,
      fontSize: 9.5,
      fontWeight: "900",
      marginBottom: 3,
    },
    poolIdValue: {
      color: c.text,
      fontSize: 11.5,
      fontWeight: "900",
    },
    statusMessage: {
      color:
        c.mode === "dark"
          ? "#E9D5FF"
          : "#6B21A8",
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "800",
    },
    autoTransitionBox: {
      marginTop: 13,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: "rgba(59,130,246,0.52)",
      backgroundColor: "rgba(59,130,246,0.16)",
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },
    autoTransitionText: {
      color: "#93C5FD",
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "900",
      flex: 1,
    },
    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 16,
    },
    metricCard: {
      width: "48%",
      minHeight: 125,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 19,
      padding: 14,
      ...v5Shadow(c),
    },
    metricIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    metricLabel: {
      color:
        c.mode === "dark"
          ? "#B8C2D0"
          : c.muted,
      fontSize: 10.5,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 5,
    },
    metricValue: {
      color: c.gold,
      fontSize: 16,
      lineHeight: 21,
      fontWeight: "900",
    },
    card: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 22,
      padding: 18,
      marginBottom: 16,
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
      fontSize: 20,
      fontWeight: "900",
      flex: 1,
    },
    progressHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      marginBottom: 8,
    },
    progressTitle: {
      color: c.text,
      fontSize: 14,
      fontWeight: "900",
    },
    progressValue: {
      color: c.gold,
      fontSize: 14,
      fontWeight: "900",
    },
    progressTrack: {
      height: 11,
      borderRadius: 999,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
      marginBottom: 15,
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: c.gold,
    },
    seatGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 9,
      marginBottom: 13,
    },
    seatCard: {
      width: "48%",
      minHeight: 76,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      padding: 11,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    seatCardOccupied: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    seatText: {
      color: c.gold,
      fontSize: 11.5,
      fontWeight: "900",
      textAlign: "center",
    },
    seatTextOccupied: {
      color: c.navy,
    },
    privacyText: {
      color:
        c.mode === "dark"
          ? "#B8C2D0"
          : c.muted,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "700",
      textAlign: "center",
    },
    routeBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      marginBottom: 14,
    },
    routeText: {
      color: c.text,
      fontSize: 16,
      lineHeight: 23,
      fontWeight: "800",
      flex: 1,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft,
      paddingBottom: 12,
      marginBottom: 12,
    },
    infoIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.soft,
    },
    infoLabel: {
      color: c.gold,
      fontSize: 10.5,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 3,
    },
    infoValue: {
      color: c.text,
      fontSize: 14.5,
      lineHeight: 20,
      fontWeight: "800",
    },
    timelineRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 16,
    },
    timelineDot: {
      width: 34,
      height: 34,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    timelineDotComplete: {
      borderColor: c.gold,
      backgroundColor: c.gold,
    },
    timelineDotActive: {
      borderWidth: 3,
    },
    timelineDotText: {
      color: c.gold,
      fontSize: 11,
      fontWeight: "900",
    },
    timelineTitle: {
      color: c.text,
      fontSize: 15,
      fontWeight: "900",
      marginBottom: 3,
    },
    timelineTitleComplete: {
      color: c.gold,
    },
    timelineDetail: {
      color:
        c.mode === "dark"
          ? "#B8C2D0"
          : c.text2,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "700",
    },
    memberList: {
      gap: 9,
      marginTop: 2,
    },
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borderSoft,
      backgroundColor: c.soft,
      padding: 11,
    },
    memberAvatar: {
      width: 38,
      height: 38,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    memberAvatarActive: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    memberTitle: {
      color: c.text,
      fontSize: 13.5,
      fontWeight: "900",
      marginBottom: 2,
    },
    memberStatus: {
      color:
        c.mode === "dark"
          ? "#B8C2D0"
          : c.muted,
      fontSize: 11.5,
      fontWeight: "700",
    },
    driverName: {
      color: c.text,
      fontSize: 24,
      fontWeight: "900",
      marginBottom: 7,
    },
    driverRatingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginBottom: 14,
    },
    driverRating: {
      color: c.gold,
      fontSize: 14,
      fontWeight: "900",
    },
    driverActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 3,
    },
    driverActionButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: c.gold,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      paddingHorizontal: 10,
    },
    driverActionText: {
      color: c.navy,
      fontSize: 12.5,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    pendingDriverBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      padding: 14,
    },
    pendingDriverTitle: {
      color: c.gold,
      fontSize: 14,
      fontWeight: "900",
      marginBottom: 4,
    },
    pendingDriverText: {
      color:
        c.mode === "dark"
          ? "#E5EAF2"
          : c.text2,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "700",
    },
    primaryButton: {
      minHeight: 56,
      borderRadius: 17,
      backgroundColor: c.gold,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 18,
      marginBottom: 12,
      ...v5Shadow(c),
    },
    primaryButtonText: {
      color: c.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
      flex: 1,
      textAlign: "center",
    },
    supportButton: {
      minHeight: 54,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      paddingHorizontal: 18,
      marginBottom: 12,
    },
    supportButtonText: {
      color: c.gold,
      fontSize: 14.5,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    leaveButton: {
      minHeight: 54,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: "rgba(239,68,68,0.48)",
      backgroundColor: "rgba(239,68,68,0.12)",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      paddingHorizontal: 18,
    },
    leaveButtonText: {
      color: "#FCA5A5",
      fontSize: 14.5,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    disabledButton: {
      opacity: 0.6,
    },
    footerText: {
      color:
        c.mode === "dark"
          ? "#B8C2D0"
          : c.muted,
      textAlign: "center",
      fontSize: 10.5,
      lineHeight: 16,
      fontWeight: "800",
      letterSpacing: 0.4,
      marginTop: 21,
    },
  });
}
