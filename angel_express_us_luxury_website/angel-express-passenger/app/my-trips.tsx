import * as Linking from "expo-linking";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  ChevronDown,
  ChevronRight,
  Clock3,
  CreditCard,
  GraduationCap,
  MapPinned,
  MessageCircle,
  Navigation,
  Phone,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  TimerReset,
  Star,
  UsersRound,
  UserRound,
  XCircle,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

const PENDING_STATUSES = [
  "pending",
  "confirmed",
  "booked",
  "pending_review",
  "pending_assignment",
];

const SMART_QUEUE_STATUSES = [
  "smart_queue",
  "student_pool_pending",
  "matching",
];

const SMART_QUEUE_READY_STATUSES = [
  "smart_queue_ready",
  "pool_matched",
];

const UNASSIGNED_STATUSES = ["unassigned"];

const ASSIGNED_STATUSES = [
  "assigned",
  "driver_assigned",
  "accepted",
  "driver_accepted",
  "driver_en_route",
  "en_route",
  "driver_arrived",
];

const IN_PROGRESS_STATUSES = [
  "passenger_onboard",
  "picked_up",
  "in_progress",
];
const COMPLETED_STATUSES = ["completed"];
const CANCELLED_STATUSES = ["cancelled", "canceled"];

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

function titleCaseFromCode(value?: string) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayRideCategory(trip: any) {
  const label = firstValue(
    trip.ride_category_label,
    trip.ride_category_name,
    trip.ride_category
  );

  const map: Record<string, string> = {
    private: "Standard Ride",
    student_private: "Student Ride",
    student_pool: "Student Pool Ride",
    airport: "Airport Transfer",
    tourist_event: "Tourist/Event Ride",
    corporate: "Corporate Ride",
  };

  return (
    map[String(label || "").toLowerCase()] ||
    titleCaseFromCode(label) ||
    "Standard Ride"
  );
}

function displayTripType(trip: any) {
  const value = String(
    firstValue(trip.trip_type_label, trip.trip_type, trip.tripType, "")
  ).toLowerCase();

  if (value.includes("round")) return "Round Trip";
  if (value.includes("one")) return "One Way";

  return titleCaseFromCode(value) || "One Way";
}

function getScheduledPickupDate(trip: any): Date | null {
  const directValue = firstValue(
    trip.scheduled_pickup_at,
    trip.scheduled_at,
    trip.pickup_datetime
  );

  if (directValue) {
    const directDate = new Date(directValue);
    if (!Number.isNaN(directDate.getTime())) return directDate;
  }

  const dateValue = firstValue(
    trip.ride_date,
    trip.date,
    trip.pickup_date
  );

  const timeValue = firstValue(
    trip.ride_time,
    trip.time,
    trip.pickup_time,
    "00:00"
  );

  if (!dateValue) return null;

  const dateText = String(dateValue).trim();
  const timeText = String(timeValue).trim();

  // Handles ISO dates such as 2026-07-18 plus 08:00 or 8:00 AM.
  const combined = new Date(`${dateText} ${timeText}`);
  if (!Number.isNaN(combined.getTime())) return combined;

  const dateOnly = new Date(dateText);
  if (!Number.isNaN(dateOnly.getTime())) return dateOnly;

  return null;
}

function isStudentPoolTrip(trip: any) {
  const category = normalize(
    firstValue(
      trip.ride_category,
      trip.ride_category_label,
      trip.ride_category_name
    )
  );

  return (
    category === "student_pool" ||
    category === "student shared ride" ||
    trip.student_pool_requested === true ||
    trip.shared_ride === true ||
    Boolean(firstValue(trip.student_pool_id, trip.pool_id))
  );
}


function getPoolId(trip: any) {
  return String(firstValue(trip.student_pool_id, trip.pool_id, "") || "");
}

function getPoolStatus(trip: any) {
  return normalize(
    firstValue(
      trip.pool_status,
      trip.student_pool_status,
      trip.pool?.status,
      trip.pool_member_status,
      trip.member_status,
      "pending_review"
    )
  );
}

function getPoolCapacity(trip: any) {
  return Math.max(
    1,
    numberValue(
      trip.pool_capacity,
      trip.expected_pool_size,
      trip.pool?.seats_total,
      4
    )
  );
}

function getPoolSeatsReserved(trip: any) {
  return Math.max(
    0,
    numberValue(
      trip.pool_seats_reserved,
      trip.pool?.seats_reserved,
      trip.seats_requested,
      0
    )
  );
}

function getPoolSeatsRemaining(trip: any) {
  const capacity = getPoolCapacity(trip);
  const direct = firstValue(
    trip.pool_seats_available,
    trip.pool?.seats_available
  );

  if (direct !== undefined && direct !== null && direct !== "") {
    return Math.max(0, numberValue(direct));
  }

  return Math.max(0, capacity - getPoolSeatsReserved(trip));
}

function getPoolProgressIndex(trip: any) {
  const status = getPoolStatus(trip);

  if (["cancelled", "canceled", "rejected", "removed"].includes(status)) {
    return -1;
  }

  if (["completed", "trip_completed"].includes(status)) return 5;
  if (
    ["in_progress", "picked_up", "passenger_onboard", "driver_arrived"].includes(
      status
    )
  ) {
    return 5;
  }

  if (
    [
      "driver_assigned",
      "assigned",
      "accepted",
      "driver_accepted",
      "driver_en_route",
      "en_route",
    ].includes(status)
  ) {
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

function getPoolStatusMessage(trip: any) {
  const status = getPoolStatus(trip);

  const messages: Record<string, string> = {
    pending_review:
      "Angel Express Operations is reviewing this Student Pool request.",
    creator_pending_review:
      "Your new Student Pool is awaiting Operations review.",
    pending_approval:
      "Your request to join this Student Pool is awaiting approval.",
    approved:
      "Your Student Pool request has been approved.",
    owner_approved:
      "Operations approved this Student Pool and matching is beginning.",
    forming:
      "The pool is forming and matching verified students.",
    open:
      "The pool is open to additional verified students.",
    matching:
      "Smart Queue is matching eligible students for this route.",
    smart_queue:
      "Smart Queue is matching eligible students for this route.",
    confirmed:
      "The Student Pool is confirmed and ready for chauffeur dispatch.",
    ready:
      "The Student Pool is ready for chauffeur dispatch.",
    pool_ready:
      "The Student Pool is ready for chauffeur dispatch.",
    driver_assigned:
      "A chauffeur has been assigned to the Student Pool.",
    assigned:
      "A chauffeur has been assigned to the Student Pool.",
    completed:
      "This Student Pool ride has been completed.",
    cancelled:
      "This Student Pool request was cancelled.",
    rejected:
      "This Student Pool request was not approved.",
  };

  return messages[status] || `Student Pool status: ${titleCaseFromCode(status)}.`;
}

function shortPoolId(value: string) {
  if (!value) return "Pending";
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function getEffectiveStatus(trip: any) {
  const storedStatus = normalize(trip.status);

  if (!isPendingStatus(storedStatus)) {
    return storedStatus;
  }

  if (trip.driver_id || trip.assigned_driver_id) {
    return storedStatus;
  }

  // A Student Pool remains in Smart Queue while matching. It should not be
  // treated as Unassigned until the pool has been released for dispatch.
  if (
    isStudentPoolTrip(trip) &&
    trip.pool_ready !== true &&
    !SMART_QUEUE_READY_STATUSES.includes(storedStatus)
  ) {
    return "smart_queue";
  }

  const scheduledPickup = getScheduledPickupDate(trip);
  if (!scheduledPickup) return storedStatus;

  const unassignedAt = scheduledPickup.getTime() + 45 * 60 * 1000;

  return Date.now() >= unassignedAt ? "unassigned" : storedStatus;
}

export default function MyTripsScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(true);

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

    mountedRef.current = true;

    const channel = supabase
      .channel("passenger-my-trips-v6")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          void loadTrips(false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_pool_rides",
        },
        () => {
          void loadTrips(false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_pool_members",
        },
        () => {
          void loadTrips(false);
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTrips(false);
    }, [])
  );

  async function loadTrips(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      if (!isRefresh) setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        setTrips([]);
        return;
      }

      const userEmail = user.email?.trim().toLowerCase() || "";

      let query = supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (userEmail) {
        query = query.or(`user_id.eq.${user.id},email.ilike.${userEmail}`);
      } else {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const seen = new Set<string>();
      const uniqueTrips = (data || []).filter((trip) => {
        const key = String(trip.id || "");
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const poolIds = Array.from(
        new Set(
          uniqueTrips
            .map((trip) => getPoolId(trip))
            .filter(Boolean)
        )
      );

      let poolsById: Record<string, any> = {};
      let membershipsByBookingId: Record<string, any> = {};

      if (poolIds.length > 0) {
        const [{ data: pools, error: poolsError }, { data: members, error: membersError }] =
          await Promise.all([
            supabase
              .from("student_pool_rides")
              .select(
                "id, status, route_label, campus_hub, origin, destination, seats_total, seats_available, seats_reserved, scheduled_at, creator_user_id, lead_booking_id, updated_at"
              )
              .in("id", poolIds),
            supabase
              .from("student_pool_members")
              .select(
                "id, pool_id, booking_id, passenger_user_id, seats_reserved, status, member_status, joined_at"
              )
              .in("pool_id", poolIds),
          ]);

        if (poolsError) {
          console.warn("Student Pool rides load warning:", poolsError);
        }

        if (membersError) {
          console.warn("Student Pool memberships load warning:", membersError);
        }

        poolsById = Object.fromEntries(
          (pools || []).map((pool) => [String(pool.id), pool])
        );

        membershipsByBookingId = Object.fromEntries(
          (members || [])
            .filter((member) => member.booking_id)
            .map((member) => [String(member.booking_id), member])
        );
      }

      const enrichedTrips = uniqueTrips.map((trip) => {
        const poolId = getPoolId(trip);
        const pool = poolId ? poolsById[poolId] : null;
        const membership = membershipsByBookingId[String(trip.id)] || null;

        if (!pool && !membership) return trip;

        return {
          ...trip,
          pool,
          pool_status: firstValue(
            pool?.status,
            membership?.member_status,
            membership?.status,
            trip.pool_status
          ),
          pool_member_status: firstValue(
            membership?.member_status,
            membership?.status,
            trip.pool_member_status
          ),
          pool_capacity: firstValue(
            pool?.seats_total,
            trip.expected_pool_size,
            trip.pool_capacity
          ),
          pool_seats_reserved: firstValue(
            pool?.seats_reserved,
            trip.pool_seats_reserved
          ),
          pool_seats_available: firstValue(
            pool?.seats_available,
            trip.pool_seats_available
          ),
          pool_member_seats: firstValue(
            membership?.seats_reserved,
            trip.seats_requested
          ),
          student_pool_route: firstValue(
            pool?.route_label,
            trip.student_pool_route
          ),
        };
      });

      if (mountedRef.current) {
        setTrips(enrichedTrips);
      }
    } catch (error: any) {
      Alert.alert("Trips Error", error.message || "Could not load trips.");
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  const sections = [
    {
      title: "Pending",
      description:
        "Confirmed bookings still within the normal chauffeur-dispatch window.",
      icon: <Clock3 size={20} color={colors.gold} />,
      trips: trips.filter((t) => isPendingStatus(getEffectiveStatus(t))),
    },
    {
      title: "Smart Queue",
      description:
        "Student Shared Rides currently matching eligible students and building a pool.",
      icon: <UsersRound size={20} color={colors.gold} />,
      trips: trips.filter((t) => isSmartQueueStatus(getEffectiveStatus(t))),
    },
    {
      title: "Unassigned",
      description:
        "Rides that still need a chauffeur after the dispatch deadline or a declined assignment.",
      icon: <AlertTriangle size={20} color={colors.gold} />,
      trips: trips.filter((t) => isUnassignedStatus(getEffectiveStatus(t))),
    },
    {
      title: "Assigned",
      description:
        "Rides reserved for or accepted by an Angel Express chauffeur.",
      icon: <UserRound size={20} color={colors.gold} />,
      trips: trips.filter(
        (t) =>
          isAssignedStatus(getEffectiveStatus(t)) ||
          isSmartQueueReadyStatus(getEffectiveStatus(t))
      ),
    },
    {
      title: "In Progress",
      description: "Active rides currently moving.",
      icon: <Navigation size={20} color={colors.gold} />,
      trips: trips.filter((t) => isInProgressStatus(getEffectiveStatus(t))),
    },
    {
      title: "Completed",
      description: "Finished rides, receipts, payments, and driver reviews.",
      icon: <CheckCircle2 size={20} color={colors.gold} />,
      trips: trips.filter((t) => isCompletedStatus(getEffectiveStatus(t))),
    },
    {
      title: "Cancelled",
      description: "Trips explicitly cancelled by a passenger, driver, owner, or authorized process.",
      icon: <XCircle size={20} color={colors.gold} />,
      trips: trips.filter((t) => isCancelledStatus(getEffectiveStatus(t))),
    },
  ];

  const activeTrips = trips.filter(
    (trip) =>
      isAssignedStatus(getEffectiveStatus(trip)) ||
      isSmartQueueReadyStatus(getEffectiveStatus(trip)) ||
      isInProgressStatus(getEffectiveStatus(trip))
  ).length;

  const completedTrips = trips.filter((trip) =>
    isCompletedStatus(getEffectiveStatus(trip))
  ).length;

  const studentPoolTrips = trips.filter((trip) =>
    isStudentPoolTrip(trip)
  ).length;

  const unpaidCompletedTrips = trips.filter(
    (trip) =>
      isCompletedStatus(getEffectiveStatus(trip)) &&
      normalize(trip.payment_status || "unpaid") !== "paid"
  ).length;

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadTrips(true)}
              tintColor={colors.gold}
            />
          }
        >
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
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
            <Text style={styles.kicker}>TRIP MANAGEMENT</Text>
            <Text style={styles.title}>My Trips</Text>

            <Text style={styles.subtitle}>
              View pending, Smart Queue, unassigned, assigned, live,
              completed, cancelled, paid, and unpaid Angel Express rides.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <CarFront size={31} color={colors.navy} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>
                  {trips.length} Total Trip{trips.length === 1 ? "" : "s"}
                </Text>
                <Text style={styles.heroText}>
                  {activeTrips} active • {completedTrips} completed •{" "}
                  {studentPoolTrips} Student Pool • {unpaidCompletedTrips} payment due
                </Text>
              </View>
            </View>

            <View style={styles.quickRow}>
              <TouchableOpacity
                style={styles.quickButton}
                onPress={() => router.push("/book-ride" as any)}
              >
                <CarFront size={18} color={colors.gold} />
                <Text style={styles.quickText}>Book Ride</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickButton}
                onPress={() => loadTrips(true)}
              >
                <RefreshCcw size={18} color={colors.gold} />
                <Text style={styles.quickText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.gold} size="large" />
                <Text style={styles.loadingText}>Loading your trips...</Text>
              </View>
            ) : trips.length === 0 ? (
              <View style={styles.emptyBox}>
                <CarFront size={34} color={colors.gold} />
                <Text style={styles.emptyTitle}>No Trips Yet</Text>
                <Text style={styles.emptyText}>
                  Your bookings will appear here after you request a ride.
                </Text>

                <TouchableOpacity
                  style={styles.goldButton}
                  onPress={() => router.push("/book-ride" as any)}
                >
                  <Text style={styles.goldButtonText}>Book a Ride</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.dropdownBox}>
                {sections.map((section, index) => (
                  <DropdownPanel
                    key={section.title}
                    title={`${section.title} (${section.trips.length})`}
                    description={section.description}
                    icon={section.icon}
                    defaultOpen={index === 0 || section.trips.length > 0}
                    styles={styles}
                    colors={colors}
                  >
                    {section.trips.length === 0 ? (
                      <Text style={styles.noTripsText}>
                        No {section.title.toLowerCase()} trips.
                      </Text>
                    ) : (
                      section.trips.map((trip) => (
                        <TripCard
                          key={String(trip.id)}
                          trip={trip}
                          styles={styles}
                          colors={colors}
                        />
                      ))
                    )}
                  </DropdownPanel>
                ))}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function TripCard({
  trip,
  styles,
  colors,
}: {
  trip: any;
  styles: any;
  colors: any;
}) {
  const [driver, setDriver] = useState<any>(null);
  const [driverLoading, setDriverLoading] = useState(false);

  const pickup =
    trip.pickup_address ||
    trip.pickup ||
    trip.pickup_location ||
    "Pickup not added";

  const dropoff =
    trip.dropoff_address ||
    trip.dropoff ||
    trip.dropoff_location ||
    trip.destination ||
    "Drop-off not added";

  const date =
    trip.ride_date ||
    trip.date ||
    trip.pickup_date ||
    (firstValue(trip.scheduled_pickup_at, trip.scheduled_at)
      ? new Date(
          firstValue(trip.scheduled_pickup_at, trip.scheduled_at)
        ).toLocaleDateString()
      : "Date not added");

  const time =
    trip.ride_time ||
    trip.time ||
    trip.pickup_time ||
    (firstValue(trip.scheduled_pickup_at, trip.scheduled_at)
      ? new Date(
          firstValue(trip.scheduled_pickup_at, trip.scheduled_at)
        ).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : "Time not added");

  const normalizedStatus = getEffectiveStatus(trip);
  const displayStatus = getDisplayStatus(normalizedStatus);
  const paymentStatus = normalize(trip.payment_status || "unpaid");

  const bookingNumber = String(
    firstValue(trip.booking_number, trip.booking_no, trip.id, "Pending")
  );

  const invoiceNumber = String(
    firstValue(trip.invoice_number, trip.invoice_no, "Pending")
  );

  const total = numberValue(
    trip.total_fare,
    trip.final_fare,
    trip.balance_due,
    trip.total,
    trip.total_price,
    trip.amount,
    0
  );

  const source = firstValue(trip.source_platform, trip.source, trip.source_app, "app");
  const miles = numberValue(
    trip.route_distance_miles,
    trip.distance_miles,
    trip.estimated_miles,
    trip.miles,
    0
  );

  const pricingVersion = String(
    firstValue(trip.pricing_version, trip.pricing_model, "")
  );

  const rideCategory = displayRideCategory(trip);
  const tripType = displayTripType(trip);
  const driverId = trip.driver_id || trip.assigned_driver_id;

  const studentPool = isStudentPoolTrip(trip);
  const poolId = getPoolId(trip);
  const poolStatus = getPoolStatus(trip);
  const poolCapacity = getPoolCapacity(trip);
  const poolSeatsFilled = getPoolSeatsReserved(trip);
  const poolSeatsRemaining = getPoolSeatsRemaining(trip);
  const passengerSeats = Math.max(
    1,
    numberValue(trip.pool_member_seats, trip.seats_requested, 1)
  );
  const poolProgressIndex = getPoolProgressIndex(trip);
  const poolRoute = String(
    firstValue(
      trip.student_pool_route,
      trip.pool?.route_label,
      trip.pool?.campus_hub,
      `${pickup} → ${dropoff}`
    )
  );

  const canPayRide =
    isCompletedStatus(normalizedStatus) && paymentStatus !== "paid";

  const isPaid =
    isCompletedStatus(normalizedStatus) && paymentStatus === "paid";

  const canTrackLive =
    isAssignedStatus(normalizedStatus) ||
    isInProgressStatus(normalizedStatus);

  useEffect(() => {
    if (driverId) {
      loadDriverCard(driverId);
    } else {
      setDriver(null);
    }
  }, [driverId]);

  async function loadDriverCard(id: string) {
    try {
      setDriverLoading(true);

      const { data, error } = await supabase
        .from("drivers")
        .select(
          "id, full_name, first_name, last_name, phone, rating, total_trips, driver_level, vehicle_make, vehicle_model, vehicle_year, plate_number, years_driving, safety_badge"
        )
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      setDriver(data || null);
    } catch {
      setDriver(null);
    } finally {
      setDriverLoading(false);
    }
  }

  function cleanPhone(phone: string) {
    return String(phone || "").replace(/[^\d+]/g, "");
  }

  function callDriver() {
    if (!driver?.phone) {
      Alert.alert("Phone Missing", "Chauffeur phone number is not available.");
      return;
    }

    Linking.openURL(`tel:${cleanPhone(driver.phone)}`);
  }

  function textDriver() {
    if (!driver?.phone) {
      Alert.alert("Phone Missing", "Chauffeur phone number is not available.");
      return;
    }

    Linking.openURL(`sms:${cleanPhone(driver.phone)}`);
  }

  function openManageBooking() {
    router.push({
      pathname: "/manage-booking" as any,
      params: {
        booking_id: String(trip.id || ""),
        bookingId: String(trip.id || ""),
        booking_number: bookingNumber,
        invoice_no: invoiceNumber,
        invoice_number: invoiceNumber,
      },
    });
  }

  function openRateDriver() {
    router.push({
      pathname: "/rate-driver" as any,
      params: {
        booking_id: String(trip.id || ""),
        bookingId: String(trip.id || ""),
        booking_number: bookingNumber,
        invoice_no: invoiceNumber,
        invoice_number: invoiceNumber,
      },
    });
  }

  function openPayRide() {
    router.push({
      pathname: "/pay-ride" as any,
      params: {
        bookingId: String(trip.id || ""),
        booking_id: String(trip.id || ""),
      },
    });
  }

  function openPoolDetails() {
    router.push({
      pathname: "/student-pool-details" as any,
      params: {
        bookingId: String(trip.id || ""),
        booking_id: String(trip.id || ""),
        student_pool_id: poolId,
        poolId,
      },
    });
  }

  function openLiveTrip() {
    router.push({
      pathname: "/live-trip" as any,
      params: {
        booking_id: String(trip.id || ""),
        bookingId: String(trip.id || ""),
        booking_number: bookingNumber,
        invoice_no: invoiceNumber,
        invoice_number: invoiceNumber,
      },
    });
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.referenceBlock}>
          <View style={styles.invoiceRow}>
            <ReceiptText size={18} color={colors.gold} />
            <Text style={styles.invoice}>Booking: {bookingNumber}</Text>
          </View>

          <Text style={styles.invoiceSub}>Invoice: {invoiceNumber}</Text>

          {studentPool ? (
            <View style={styles.studentPoolBadge}>
              <GraduationCap size={14} color={colors.navy} />
              <Text style={styles.studentPoolBadgeText}>
                STUDENT POOL RIDE
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.statusPill,
            getStatusPillStyle(normalizedStatus, styles),
          ]}
        >
          <Text style={styles.status}>{displayStatus}</Text>
        </View>
      </View>

      <View style={styles.lifecycleBox}>
        <ShieldCheck size={18} color={colors.gold} />
        <Text style={styles.lifecycleText}>
          {getLifecycleMessage(normalizedStatus, paymentStatus)}
        </Text>
      </View>

      {studentPool ? (
        <View style={styles.poolCard}>
          <View style={styles.poolCardHeader}>
            <View style={styles.poolIconWrap}>
              <GraduationCap size={23} color={colors.navy} />
            </View>

            <View style={styles.poolHeaderCopy}>
              <Text style={styles.poolEyebrow}>STUDENT POOL ENGINE</Text>
              <Text style={styles.poolTitle}>
                {titleCaseFromCode(poolStatus)}
              </Text>
            </View>

            <View style={styles.poolSeatsPill}>
              <UsersRound size={15} color={colors.gold} />
              <Text style={styles.poolSeatsPillText}>
                {Math.min(poolSeatsFilled, poolCapacity)}/{poolCapacity}
              </Text>
            </View>
          </View>

          <Text style={styles.poolMessage}>
            {getPoolStatusMessage(trip)}
          </Text>

          <View style={styles.poolMetaGrid}>
            <View style={styles.poolMetaBox}>
              <Text style={styles.poolMetaLabel}>Pool ID</Text>
              <Text style={styles.poolMetaValue}>
                {shortPoolId(poolId)}
              </Text>
            </View>

            <View style={styles.poolMetaBox}>
              <Text style={styles.poolMetaLabel}>Your Seats</Text>
              <Text style={styles.poolMetaValue}>{passengerSeats}</Text>
            </View>

            <View style={styles.poolMetaBox}>
              <Text style={styles.poolMetaLabel}>Seats Filled</Text>
              <Text style={styles.poolMetaValue}>
                {Math.min(poolSeatsFilled, poolCapacity)}
              </Text>
            </View>

            <View style={styles.poolMetaBox}>
              <Text style={styles.poolMetaLabel}>Seats Left</Text>
              <Text style={styles.poolMetaValue}>{poolSeatsRemaining}</Text>
            </View>
          </View>

          <View style={styles.poolRouteBox}>
            <MapPinned size={17} color={colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.poolRouteLabel}>POOL ROUTE</Text>
              <Text style={styles.poolRouteText}>{poolRoute}</Text>
            </View>
          </View>

          <View style={styles.occupancyHeader}>
            <Text style={styles.occupancyTitle}>Pool Occupancy</Text>
            <Text style={styles.occupancyValue}>
              {Math.min(poolSeatsFilled, poolCapacity)} of {poolCapacity} filled
            </Text>
          </View>

          <View style={styles.occupancyTrack}>
            <View
              style={[
                styles.occupancyFill,
                {
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      (Math.min(poolSeatsFilled, poolCapacity) /
                        Math.max(poolCapacity, 1)) *
                        100
                    )
                  )}%`,
                },
              ]}
            />
          </View>

          <View style={styles.seatRow}>
            {Array.from({ length: poolCapacity }).map((_, index) => {
              const occupied = index < poolSeatsFilled;

              return (
                <View
                  key={`${poolId || trip.id}-seat-${index}`}
                  style={[
                    styles.seatDot,
                    occupied && styles.seatDotOccupied,
                  ]}
                >
                  <UserRound
                    size={15}
                    color={occupied ? colors.navy : colors.gold}
                  />
                </View>
              );
            })}
          </View>

          <View style={styles.poolTimeline}>
            {[
              "Request",
              "Review",
              "Matching",
              "Pool Ready",
              "Driver",
              "Trip",
            ].map((label, index) => {
              const complete = poolProgressIndex >= index;
              const active =
                poolProgressIndex === index && poolProgressIndex >= 0;

              return (
                <View
                  key={`${poolId || trip.id}-${label}`}
                  style={styles.poolTimelineItem}
                >
                  <View
                    style={[
                      styles.poolTimelineDot,
                      complete && styles.poolTimelineDotComplete,
                      active && styles.poolTimelineDotActive,
                    ]}
                  >
                    {complete ? (
                      <CheckCircle2
                        size={13}
                        color={colors.navy}
                        strokeWidth={3}
                      />
                    ) : (
                      <Text style={styles.poolTimelineDotText}>
                        {index + 1}
                      </Text>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.poolTimelineLabel,
                      complete && styles.poolTimelineLabelComplete,
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.poolDetailsButton}
            onPress={openPoolDetails}
            activeOpacity={0.86}
          >
            <UsersRound size={17} color={colors.navy} />
            <Text style={styles.poolDetailsButtonText}>
              View Student Pool
            </Text>
            <ChevronRight size={18} color={colors.navy} />
          </TouchableOpacity>
        </View>
      ) : null}

      {normalizedStatus === "unassigned" && normalize(trip.status) !== "unassigned" ? (
        <View style={styles.derivedStatusBox}>
          <AlertTriangle size={17} color="#FDBA74" />
          <Text style={styles.derivedStatusText}>
            The scheduled pickup passed more than 45 minutes ago without an
            accepted chauffeur. This trip is now displayed as Unassigned.
          </Text>
        </View>
      ) : null}

      {driverId ? (
        <View style={styles.driverCard}>
          <View style={styles.driverTitleRow}>
            <UserRound size={20} color={colors.gold} />
            <Text style={styles.driverCardTitle}>Your Chauffeur</Text>
          </View>

          {driverLoading ? (
            <Text style={styles.driverMuted}>
              Loading chauffeur details...
            </Text>
          ) : driver ? (
            <>
              <Text style={styles.driverName}>
                {driver.full_name ||
                  `${driver.first_name || ""} ${
                    driver.last_name || ""
                  }`.trim() ||
                  "Angel Express Chauffeur"}
              </Text>

              <View style={styles.driverMetaRow}>
                <Star
                  size={16}
                  color={colors.gold}
                  fill={colors.gold}
                />
                <Text style={styles.driverRating}>
                  {Number(driver.rating || 5).toFixed(1)} Rating •{" "}
                  {driver.total_trips || 0} Trips
                </Text>
              </View>

              <Text style={styles.driverLevel}>
                {driver.driver_level || "Bronze"} Chauffeur
              </Text>

              <InfoLine
                label="Vehicle"
                value={
                  [
                    driver.vehicle_year,
                    driver.vehicle_make,
                    driver.vehicle_model,
                  ]
                    .filter(Boolean)
                    .join(" ") || "Vehicle not added"
                }
                styles={styles}
              />

              <InfoLine
                label="Plate Number"
                value={driver.plate_number || "Not provided"}
                styles={styles}
              />

              <InfoLine
                label="Experience"
                value={
                  driver.years_driving
                    ? `${driver.years_driving} year(s) driving`
                    : "Experience not added"
                }
                styles={styles}
              />

              <View style={styles.safetyBadge}>
                <Text style={styles.safetyBadgeText}>
                  {driver.safety_badge
                    ? "Angel Express Safety Verified"
                    : "Angel Express Approved Chauffeur"}
                </Text>
              </View>

              <View style={styles.driverContactRow}>
                <TouchableOpacity
                  style={styles.driverContactButton}
                  onPress={callDriver}
                >
                  <Phone size={16} color={colors.navy} />
                  <Text style={styles.driverContactText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.driverContactButton}
                  onPress={textDriver}
                >
                  <MessageCircle size={16} color={colors.navy} />
                  <Text style={styles.driverContactText}>Text</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={styles.driverMuted}>
              Chauffeur assigned. Details will appear shortly.
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.noDriverBox}>
          <Text style={styles.noDriverText}>
            {isCancelledStatus(normalizedStatus)
              ? "This ride was cancelled before chauffeur assignment."
              : isSmartQueueStatus(normalizedStatus)
              ? "Smart Queue is matching verified students for your Student Pool Ride."
              : isUnassignedStatus(normalizedStatus)
              ? "This ride remains active and Angel Express is searching for a chauffeur."
              : "Chauffeur assignment pending."}
          </Text>
        </View>
      )}

      <View style={styles.routeBox}>
        <View style={styles.routeLine}>
          <MapPinned size={18} color={colors.gold} />
          <Text style={styles.route}>{pickup}</Text>
        </View>

        <Text style={styles.routeArrow}>↓</Text>

        <View style={styles.routeLine}>
          <CarFront size={18} color={colors.gold} />
          <Text style={styles.route}>{dropoff}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <Detail
          icon={<CalendarDays size={16} color={colors.gold} />}
          text={`Date: ${date}`}
          styles={styles}
        />
        <Detail
          icon={<Clock3 size={16} color={colors.gold} />}
          text={`Time: ${time}`}
          styles={styles}
        />
        <Detail
          icon={<CarFront size={16} color={colors.gold} />}
          text={`Ride: ${rideCategory}`}
          styles={styles}
        />
        <Detail
          icon={<Navigation size={16} color={colors.gold} />}
          text={`Trip Type: ${tripType}`}
          styles={styles}
        />
        <Detail
          icon={<MapPinned size={16} color={colors.gold} />}
          text={`Distance: ${miles.toFixed(1)} miles`}
          styles={styles}
        />
        <Detail
          icon={<CreditCard size={16} color={colors.gold} />}
          text={`Total: $${total.toFixed(2)}`}
          styles={styles}
        />
        <Detail
          icon={<CreditCard size={16} color={colors.gold} />}
          text={`Payment: ${paymentStatus}`}
          styles={styles}
        />
        <Detail
          icon={<ReceiptText size={16} color={colors.gold} />}
          text={`Source: ${source}`}
          styles={styles}
        />

        {studentPool ? (
          <>
            <Detail
              icon={<GraduationCap size={16} color={colors.gold} />}
              text={`Pool Status: ${titleCaseFromCode(poolStatus)}`}
              styles={styles}
            />
            <Detail
              icon={<UsersRound size={16} color={colors.gold} />}
              text={`Pool Occupancy: ${Math.min(
                poolSeatsFilled,
                poolCapacity
              )}/${poolCapacity}`}
              styles={styles}
            />
          </>
        ) : null}

        {pricingVersion ? (
          <Detail
            icon={<ShieldCheck size={16} color={colors.gold} />}
            text={`Pricing Version: ${pricingVersion}`}
            styles={styles}
          />
        ) : null}
      </View>

      {canTrackLive && (
        <TouchableOpacity style={styles.liveButton} onPress={openLiveTrip}>
          <Navigation size={17} color="#93C5FD" />
          <Text style={styles.liveButtonText}>Track Live Trip</Text>
        </TouchableOpacity>
      )}

      {canPayRide && (
        <View style={styles.paymentBox}>
          <Text style={styles.paymentTitle}>
            Ride Completed — Payment Due
          </Text>
          <Text style={styles.paymentText}>
            Full Ride Fare: ${total.toFixed(2)}
          </Text>

          <TouchableOpacity style={styles.goldButton} onPress={openPayRide}>
            <CreditCard size={17} color={colors.navy} />
            <Text style={styles.goldButtonText}>Pay Ride</Text>
          </TouchableOpacity>
        </View>
      )}

      {isPaid && (
        <View style={styles.paidBox}>
          <CheckCircle2 size={18} color="#2ECC71" />
          <Text style={styles.paidText}>Paid</Text>
        </View>
      )}

      {!isCompletedStatus(normalizedStatus) &&
        !isCancelledStatus(normalizedStatus) && (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={openManageBooking}
          >
            <Text style={styles.manageButtonText}>Manage Booking</Text>
          </TouchableOpacity>
        )}

      {isCompletedStatus(normalizedStatus) && (
        <TouchableOpacity
          style={styles.rateButton}
          onPress={openRateDriver}
        >
          <Star size={17} color={colors.gold} />
          <Text style={styles.rateButtonText}>
            Rate Your Chauffeur
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function DropdownPanel({
  title,
  description,
  icon,
  children,
  defaultOpen,
  styles,
  colors,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  styles: any;
  colors: any;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));

  return (
    <View style={styles.dropdownWrap}>
      <TouchableOpacity
        style={styles.dropdownHeader}
        onPress={() => setOpen(!open)}
        activeOpacity={0.86}
      >
        <View style={styles.dropdownLeft}>
          <View style={styles.dropdownIcon}>{icon}</View>

          <View style={{ flex: 1 }}>
            <Text style={styles.dropdownTitle}>{title}</Text>
            <Text style={styles.dropdownDescription}>{description}</Text>
          </View>
        </View>

        {open ? (
          <ChevronDown size={25} color={colors.gold} />
        ) : (
          <ChevronRight size={25} color={colors.gold} />
        )}
      </TouchableOpacity>

      {open ? <View style={styles.dropdownBody}>{children}</View> : null}
    </View>
  );
}

function InfoLine({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.driverInfoBox}>
      <Text style={styles.driverInfoLabel}>{label}</Text>
      <Text style={styles.driverInfoValue}>{value}</Text>
    </View>
  );
}

function Detail({
  icon,
  text,
  styles,
}: {
  icon: React.ReactNode;
  text: string;
  styles: any;
}) {
  return (
    <View style={styles.detailRow}>
      {icon}
      <Text style={styles.detailText}>{text}</Text>
    </View>
  );
}

function getLifecycleMessage(status: string, paymentStatus: string) {
  const normalizedStatus = normalize(status);
  const normalizedPayment = normalize(paymentStatus);

  if (isSmartQueueStatus(normalizedStatus)) {
    return "Smart Queue is matching your Student Shared Ride with eligible students and a chauffeur.";
  }

  if (isSmartQueueReadyStatus(normalizedStatus)) {
    return "Your student pool is ready and has entered chauffeur dispatch.";
  }

  if (isUnassignedStatus(normalizedStatus)) {
    return "Your booking remains active. Angel Express is rebroadcasting it to chauffeurs and Operations.";
  }

  if (isPendingStatus(normalizedStatus)) {
    return "Your booking is confirmed and currently within the normal chauffeur-dispatch window.";
  }

  if (normalizedStatus === "driver_assigned") {
    return "A chauffeur has been selected and is reviewing the assignment.";
  }

  if (
    normalizedStatus === "assigned" ||
    normalizedStatus === "accepted" ||
    normalizedStatus === "driver_accepted"
  ) {
    return "Your chauffeur accepted this ride.";
  }

  if (
    normalizedStatus === "driver_en_route" ||
    normalizedStatus === "en_route"
  ) {
    return "Your chauffeur is on the way to your pickup location.";
  }

  if (normalizedStatus === "driver_arrived") {
    return "Your chauffeur has arrived at pickup.";
  }

  if (
    normalizedStatus === "passenger_onboard" ||
    normalizedStatus === "picked_up"
  ) {
    return "You are onboard. Your trip is now active.";
  }

  if (isInProgressStatus(normalizedStatus)) {
    return "Ride in progress.";
  }

  if (isCompletedStatus(normalizedStatus) && normalizedPayment === "paid") {
    return "Ride completed and paid.";
  }

  if (isCompletedStatus(normalizedStatus)) {
    return "Ride completed. Payment is now due.";
  }

  if (isCancelledStatus(normalizedStatus)) {
    return "This ride was explicitly cancelled.";
  }

  return "Ride status updated.";
}

function getDisplayStatus(status: string) {
  const normalizedStatus = normalize(status);

  if (isSmartQueueStatus(normalizedStatus)) return "Smart Queue";
  if (isSmartQueueReadyStatus(normalizedStatus)) return "Pool Ready";
  if (isUnassignedStatus(normalizedStatus)) return "Unassigned";
  if (isPendingStatus(normalizedStatus)) return "Pending";
  if (normalizedStatus === "driver_assigned") return "Driver Reviewing";
  if (normalizedStatus === "driver_en_route" || normalizedStatus === "en_route") {
    return "Driver En Route";
  }
  if (normalizedStatus === "driver_arrived") return "Driver Arrived";
  if (
    normalizedStatus === "assigned" ||
    normalizedStatus === "accepted" ||
    normalizedStatus === "driver_accepted"
  ) {
    return "Assigned";
  }
  if (
    normalizedStatus === "passenger_onboard" ||
    normalizedStatus === "picked_up"
  ) {
    return "Passenger Onboard";
  }
  if (isInProgressStatus(normalizedStatus)) return "In Progress";
  if (isCompletedStatus(normalizedStatus)) return "Completed";
  if (isCancelledStatus(normalizedStatus)) return "Cancelled";

  return titleCaseFromCode(status || "pending");
}

function getStatusPillStyle(status: string, styles: any) {
  const normalizedStatus = normalize(status);

  if (isSmartQueueStatus(normalizedStatus)) return styles.smartQueuePill;
  if (isSmartQueueReadyStatus(normalizedStatus)) return styles.assignedPill;
  if (isUnassignedStatus(normalizedStatus)) return styles.unassignedPill;
  if (isPendingStatus(normalizedStatus)) return styles.pendingPill;
  if (isAssignedStatus(normalizedStatus)) return styles.assignedPill;
  if (isInProgressStatus(normalizedStatus)) return styles.progressPill;
  if (isCompletedStatus(normalizedStatus)) return styles.completedPill;
  if (isCancelledStatus(normalizedStatus)) return styles.cancelledPill;

  return {};
}

function isPendingStatus(status: string) {
  return PENDING_STATUSES.includes(normalize(status));
}

function isSmartQueueStatus(status: string) {
  return SMART_QUEUE_STATUSES.includes(normalize(status));
}

function isSmartQueueReadyStatus(status: string) {
  return SMART_QUEUE_READY_STATUSES.includes(normalize(status));
}

function isUnassignedStatus(status: string) {
  return UNASSIGNED_STATUSES.includes(normalize(status));
}

function isAssignedStatus(status: string) {
  return ASSIGNED_STATUSES.includes(normalize(status));
}

function isInProgressStatus(status: string) {
  return IN_PROGRESS_STATUSES.includes(normalize(status));
}

function isCompletedStatus(status: string) {
  return COMPLETED_STATUSES.includes(normalize(status));
}

function isCancelledStatus(status: string) {
  return CANCELLED_STATUSES.includes(normalize(status));
}

function normalize(status: string) {
  return String(status || "pending").trim().toLowerCase();
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
      fontSize: 38,
      fontWeight: "900",
      marginBottom: 10,
    },
    subtitle: {
      color: c.mode === "dark" ? "#E5EAF2" : c.text2,
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
      gap: 14,
      marginBottom: 17,
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
    heroTitle: {
      color: c.navy,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 4,
    },
    heroText: {
      color: c.navy,
      fontSize: 14,
      fontWeight: "800",
      lineHeight: 20,
      opacity: 0.82,
    },
    quickRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 22,
    },
    quickButton: {
      flex: 1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    quickText: {
      color: c.gold,
      fontWeight: "900",
      fontSize: 13,
    },
    loadingBox: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 22,
      alignItems: "center",
      padding: 28,
      ...v5Shadow(c),
    },
    loadingText: {
      color: c.text,
      marginTop: 14,
      fontSize: 16,
      fontWeight: "800",
    },
    emptyBox: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 22,
      padding: 24,
      alignItems: "center",
      ...v5Shadow(c),
    },
    emptyTitle: {
      color: c.text,
      fontSize: 24,
      fontWeight: "900",
      marginTop: 12,
      marginBottom: 10,
    },
    emptyText: {
      color: c.mode === "dark" ? "#E5EAF2" : c.text2,
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 22,
      textAlign: "center",
      fontWeight: "700",
    },
    dropdownBox: {
      gap: 14,
    },
    dropdownWrap: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
      borderRadius: 23,
      overflow: "hidden",
      ...v5Shadow(c),
    },
    dropdownHeader: {
      minHeight: 76,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      backgroundColor:
        c.mode === "dark" ? "rgba(212,175,55,0.08)" : "#FFF8E8",
    },
    dropdownLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    dropdownIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    dropdownTitle: {
      color: c.text,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 3,
    },
    dropdownDescription: {
      color: c.mode === "dark" ? "#E5EAF2" : c.text2,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "700",
    },
    dropdownBody: {
      padding: 14,
      borderTopWidth: 1,
      borderTopColor: c.borderSoft,
    },
    noTripsText: {
      color: c.mode === "dark" ? "#B8C2D0" : c.muted,
      fontSize: 15,
      paddingVertical: 12,
      fontWeight: "800",
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
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 14,
      alignItems: "center",
    },
    referenceBlock: {
      flex: 1,
    },
    invoiceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    invoice: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      flex: 1,
    },
    invoiceSub: {
      color: c.mode === "dark" ? "#E5EAF2" : c.text2,
      fontSize: 12.5,
      fontWeight: "800",
      marginTop: 4,
      marginLeft: 26,
    },
    statusPill: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: c.soft,
    },
    pendingPill: {
      borderColor: "rgba(212,175,55,0.45)",
      backgroundColor: "rgba(212,175,55,0.10)",
    },
    smartQueuePill: {
      borderColor: "rgba(168,85,247,0.50)",
      backgroundColor: "rgba(168,85,247,0.16)",
    },
    unassignedPill: {
      borderColor: "rgba(249,115,22,0.55)",
      backgroundColor: "rgba(249,115,22,0.16)",
    },
    assignedPill: {
      borderColor: "rgba(59,130,246,0.45)",
      backgroundColor: "rgba(59,130,246,0.16)",
    },
    progressPill: {
      borderColor: "rgba(249,115,22,0.50)",
      backgroundColor: "rgba(249,115,22,0.16)",
    },
    completedPill: {
      borderColor: "rgba(46,204,113,0.45)",
      backgroundColor: "rgba(46,204,113,0.12)",
    },
    cancelledPill: {
      borderColor: "rgba(239,68,68,0.50)",
      backgroundColor: "rgba(239,68,68,0.16)",
    },
    status: {
      color: c.text,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    studentPoolBadge: {
      alignSelf: "flex-start",
      marginTop: 9,
      borderRadius: 999,
      backgroundColor: c.gold,
      paddingVertical: 6,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    studentPoolBadgeText: {
      color: c.navy,
      fontSize: 10.5,
      fontWeight: "900",
      letterSpacing: 0.5,
    },
    poolCard: {
      backgroundColor:
        c.mode === "dark" ? "rgba(168,85,247,0.10)" : "#FAF5FF",
      borderWidth: 1,
      borderColor: "rgba(168,85,247,0.42)",
      borderRadius: 20,
      padding: 16,
      marginBottom: 15,
    },
    poolCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      marginBottom: 12,
    },
    poolIconWrap: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
    },
    poolHeaderCopy: {
      flex: 1,
    },
    poolEyebrow: {
      color: c.gold,
      fontSize: 10.5,
      fontWeight: "900",
      letterSpacing: 1,
      marginBottom: 3,
    },
    poolTitle: {
      color: c.text,
      fontSize: 20,
      fontWeight: "900",
    },
    poolSeatsPill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    poolSeatsPillText: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
    },
    poolMessage: {
      color: c.mode === "dark" ? "#E9D5FF" : "#6B21A8",
      fontSize: 13.5,
      lineHeight: 20,
      fontWeight: "800",
      marginBottom: 14,
    },
    poolMetaGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
    },
    poolMetaBox: {
      width: "48%",
      minHeight: 68,
      borderRadius: 14,
      padding: 11,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft,
    },
    poolMetaLabel: {
      color: c.mode === "dark" ? "#B8C2D0" : c.muted,
      fontSize: 10.5,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    poolMetaValue: {
      color: c.gold,
      fontSize: 16,
      fontWeight: "900",
    },
    poolRouteBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 9,
      padding: 12,
      borderRadius: 14,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 14,
    },
    poolRouteLabel: {
      color: c.gold,
      fontSize: 10.5,
      fontWeight: "900",
      marginBottom: 4,
    },
    poolRouteText: {
      color: c.text,
      fontSize: 13.5,
      lineHeight: 19,
      fontWeight: "800",
    },
    occupancyHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      marginBottom: 8,
    },
    occupancyTitle: {
      color: c.text,
      fontSize: 13.5,
      fontWeight: "900",
    },
    occupancyValue: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
    },
    occupancyTrack: {
      height: 9,
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
    },
    occupancyFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: c.gold,
    },
    seatRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 11,
      marginBottom: 15,
    },
    seatDot: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
    },
    seatDotOccupied: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    poolTimeline: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 4,
      marginBottom: 15,
    },
    poolTimelineItem: {
      flex: 1,
      alignItems: "center",
    },
    poolTimelineDot: {
      width: 25,
      height: 25,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 5,
    },
    poolTimelineDotComplete: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    poolTimelineDotActive: {
      borderWidth: 2,
    },
    poolTimelineDotText: {
      color: c.gold,
      fontSize: 9.5,
      fontWeight: "900",
    },
    poolTimelineLabel: {
      color: c.mode === "dark" ? "#B8C2D0" : c.muted,
      fontSize: 8.5,
      lineHeight: 11,
      fontWeight: "800",
      textAlign: "center",
    },
    poolTimelineLabelComplete: {
      color: c.gold,
    },
    poolDetailsButton: {
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: c.gold,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 14,
    },
    poolDetailsButtonText: {
      color: c.navy,
      fontSize: 13.5,
      fontWeight: "900",
      textTransform: "uppercase",
      flex: 1,
      textAlign: "center",
    },
    lifecycleBox: {
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 13,
      marginBottom: 14,
      flexDirection: "row",
      gap: 10,
    },
    lifecycleText: {
      color: c.gold,
      fontSize: 14,
      fontWeight: "800",
      lineHeight: 20,
      flex: 1,
    },
    driverCard: {
      backgroundColor:
        c.mode === "dark" ? "rgba(212,175,55,0.08)" : "#FFF8E8",
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
    },
    driverTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginBottom: 8,
    },
    driverCardTitle: {
      color: c.gold,
      fontSize: 18,
      fontWeight: "900",
    },
    driverName: {
      color: c.text,
      fontSize: 23,
      fontWeight: "900",
      marginBottom: 6,
    },
    driverMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginBottom: 5,
    },
    driverRating: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "800",
    },
    driverLevel: {
      color: c.text,
      fontSize: 14,
      fontWeight: "800",
      marginBottom: 12,
    },
    driverInfoBox: {
      marginBottom: 10,
    },
    driverInfoLabel: {
      color: c.mode === "dark" ? "#B8C2D0" : c.muted,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 3,
    },
    driverInfoValue: {
      color: c.text,
      fontSize: 15,
      fontWeight: "700",
    },
    safetyBadge: {
      backgroundColor: "rgba(46,204,113,0.12)",
      borderWidth: 1,
      borderColor: "rgba(46,204,113,0.45)",
      borderRadius: 12,
      padding: 11,
      marginTop: 4,
      marginBottom: 12,
    },
    safetyBadgeText: {
      color: "#2ECC71",
      fontWeight: "900",
      textAlign: "center",
    },
    driverContactRow: {
      flexDirection: "row",
      gap: 10,
    },
    driverContactButton: {
      flex: 1,
      backgroundColor: c.gold,
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 7,
    },
    driverContactText: {
      color: c.navy,
      fontSize: 14,
      fontWeight: "900",
    },
    driverMuted: {
      color: c.mode === "dark" ? "#B8C2D0" : c.muted,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "700",
    },
    derivedStatusBox: {
      backgroundColor: "rgba(249,115,22,0.12)",
      borderWidth: 1,
      borderColor: "rgba(249,115,22,0.42)",
      borderRadius: 14,
      padding: 13,
      marginBottom: 14,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 9,
    },
    derivedStatusText: {
      color: c.mode === "dark" ? "#FED7AA" : "#9A3412",
      fontSize: 13.5,
      lineHeight: 20,
      fontWeight: "800",
      flex: 1,
    },
    noDriverBox: {
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 13,
      marginBottom: 14,
    },
    noDriverText: {
      color: c.gold,
      fontWeight: "800",
    },
    routeBox: {
      marginTop: 2,
    },
    routeLine: {
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start",
    },
    route: {
      color: c.text,
      fontSize: 16,
      lineHeight: 23,
      flex: 1,
      fontWeight: "700",
    },
    routeArrow: {
      color: c.gold,
      fontSize: 20,
      marginVertical: 4,
      marginLeft: 4,
    },
    details: {
      marginTop: 14,
      borderTopWidth: 1,
      borderTopColor: c.borderSoft,
      paddingTop: 12,
      gap: 8,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },
    detailText: {
      color: c.mode === "dark" ? "#E5EAF2" : c.text2,
      fontSize: 14,
      flex: 1,
      fontWeight: "700",
    },
    liveButton: {
      backgroundColor: "rgba(59,130,246,0.18)",
      borderWidth: 1,
      borderColor: "rgba(59,130,246,0.55)",
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 14,
    },
    liveButtonText: {
      color: "#93C5FD",
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    paymentBox: {
      marginTop: 14,
      padding: 14,
      borderRadius: 16,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
    },
    paymentTitle: {
      color: c.gold,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 8,
    },
    paymentText: {
      color: c.text,
      fontSize: 14,
      marginBottom: 10,
      fontWeight: "700",
    },
    paidBox: {
      marginTop: 14,
      padding: 14,
      borderRadius: 14,
      backgroundColor: "rgba(46,204,113,0.12)",
      borderWidth: 1,
      borderColor: "rgba(46,204,113,0.4)",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    paidText: {
      color: "#2ECC71",
      fontSize: 16,
      fontWeight: "900",
      textAlign: "center",
    },
    goldButton: {
      backgroundColor: c.gold,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 8,
    },
    goldButtonText: {
      color: c.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    manageButton: {
      backgroundColor: c.gold,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      marginTop: 14,
    },
    manageButtonText: {
      color: c.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    rateButton: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    rateButtonText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
  });
}
