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
  ArrowLeft,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  CreditCard,
  MapPinned,
  MessageCircle,
  Navigation,
  Phone,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  Star,
  UserRound,
  XCircle,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

const PENDING_STATUSES = ["pending", "confirmed", "booked"];

const ASSIGNED_STATUSES = [
  "assigned",
  "driver_assigned",
  "accepted",
  "driver_accepted",
  "driver_arrived",
];

const IN_PROGRESS_STATUSES = ["in_progress"];
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
    student_pool: "Student Shared Ride",
    airport: "Airport Transfer",
    tourist_event: "Tourist/Event Ride",
    corporate: "Corporate Ride",
  };

  return map[String(label || "").toLowerCase()] || titleCaseFromCode(label) || "Standard Ride";
}

function displayTripType(trip: any) {
  const value = String(
    firstValue(trip.trip_type_label, trip.trip_type, trip.tripType, "")
  ).toLowerCase();

  if (value.includes("round")) return "Round Trip";
  if (value.includes("one")) return "One Way";

  return titleCaseFromCode(value) || "One Way";
}

export default function MyTripsScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);

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

      setTrips(data || []);
    } catch (error: any) {
      Alert.alert("Trips Error", error.message || "Could not load trips.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const sections = [
    {
      title: "Pending",
      description: "Ride requests waiting for review or confirmation.",
      icon: <Clock3 size={20} color={colors.gold} />,
      trips: trips.filter((t) => isPendingStatus(t.status)),
    },
    {
      title: "Assigned",
      description: "Rides with a chauffeur assigned or preparing.",
      icon: <UserRound size={20} color={colors.gold} />,
      trips: trips.filter((t) => isAssignedStatus(t.status)),
    },
    {
      title: "In Progress",
      description: "Active rides currently moving.",
      icon: <Navigation size={20} color={colors.gold} />,
      trips: trips.filter((t) => isInProgressStatus(t.status)),
    },
    {
      title: "Completed",
      description: "Finished rides, receipts, payments, and driver reviews.",
      icon: <CheckCircle2 size={20} color={colors.gold} />,
      trips: trips.filter((t) => isCompletedStatus(t.status)),
    },
    {
      title: "Cancelled",
      description: "Cancelled ride requests and cancelled trips.",
      icon: <XCircle size={20} color={colors.gold} />,
      trips: trips.filter((t) => isCancelledStatus(t.status)),
    },
  ];

  const activeTrips = trips.filter(
    (trip) =>
      isAssignedStatus(trip.status) ||
      isInProgressStatus(trip.status) ||
      normalize(trip.status) === "driver_arrived"
  ).length;

  const completedTrips = trips.filter((trip) =>
    isCompletedStatus(trip.status)
  ).length;

  const unpaidCompletedTrips = trips.filter(
    (trip) =>
      isCompletedStatus(trip.status) &&
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
              View pending, assigned, live, completed, cancelled, paid, and unpaid Angel
              Express rides.
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
                  {unpaidCompletedTrips} payment due
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
    (trip.scheduled_at
      ? new Date(trip.scheduled_at).toLocaleDateString()
      : "Date not added");

  const time =
    trip.ride_time ||
    trip.time ||
    trip.pickup_time ||
    (trip.scheduled_at
      ? new Date(trip.scheduled_at).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : "Time not added");

  const normalizedStatus = normalize(trip.status);
  const displayStatus = getDisplayStatus(trip.status);
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

  if (isPendingStatus(normalizedStatus)) {
    return "Waiting for Angel Express to review and assign your ride.";
  }

  if (normalizedStatus === "driver_assigned") {
    return "Your chauffeur has accepted this ride and is preparing for pickup.";
  }

  if (
    normalizedStatus === "assigned" ||
    normalizedStatus === "accepted" ||
    normalizedStatus === "driver_accepted"
  ) {
    return "Your chauffeur has accepted this ride.";
  }

  if (normalizedStatus === "driver_arrived") {
    return "Your chauffeur has arrived at pickup.";
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
    return "This ride was cancelled.";
  }

  return "Ride status updated.";
}

function getDisplayStatus(status: string) {
  const normalizedStatus = normalize(status);

  if (isPendingStatus(normalizedStatus)) return "Pending";
  if (normalizedStatus === "driver_assigned") return "Assigned";
  if (normalizedStatus === "driver_arrived") return "Driver Arrived";
  if (normalizedStatus === "assigned") return "Assigned";
  if (normalizedStatus === "accepted") return "Assigned";
  if (normalizedStatus === "driver_accepted") return "Assigned";
  if (isInProgressStatus(normalizedStatus)) return "In Progress";
  if (isCompletedStatus(normalizedStatus)) return "Completed";
  if (isCancelledStatus(normalizedStatus)) return "Cancelled";

  return String(status || "Pending").replace(/_/g, " ");
}

function getStatusPillStyle(status: string, styles: any) {
  const normalizedStatus = normalize(status);

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
      color: c.text2,
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
      color: c.text2,
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
      color: c.muted,
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
      color: c.text2,
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
      color: c.muted,
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
      color: c.muted,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "700",
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
      color: c.text2,
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
