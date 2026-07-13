import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { useOwnerTheme } from "../lib/ownerTheme";
import { supabase } from "../lib/supabase";

type GenericRecord = Record<string, any>;

type BookingRecord = GenericRecord & {
  id: string | number;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
  status?: string | null;
  source?: string | null;
  payment_status?: string | null;
  user_id?: string | null;
  passenger_id?: string | null;
  name?: string | null;
  passenger_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  passenger_email?: string | null;
  phone?: string | null;
  passenger_phone?: string | null;
  pickup?: string | null;
  pickup_address?: string | null;
  pickup_location?: string | null;
  dropoff?: string | null;
  dropoff_address?: string | null;
  dropoff_location?: string | null;
  destination?: string | null;
  date?: string | null;
  ride_date?: string | null;
  trip_date?: string | null;
  time?: string | null;
  ride_time?: string | null;
  trip_time?: string | null;
  driver_id?: string | null;
  assigned_driver_id?: string | null;
  driver_name?: string | null;
  assigned_driver_name?: string | null;
  driver_phone?: string | null;
  assigned_driver_phone?: string | null;
  total?: number | string | null;
  total_fare?: number | string | null;
  total_price?: number | string | null;
  price?: number | string | null;
  student_verified?: boolean | null;
  is_student?: boolean | null;
  student_discount?: number | string | null;
};

type DriverRecord = GenericRecord & {
  id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  is_online?: boolean | null;
  status?: string | null;
  current_trip_id?: string | number | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: string | null;
  plate_number?: string | null;
};

type LiveLocation = GenericRecord & {
  id: string;
  driver_id?: string | null;
  booking_id?: string | number | null;
  latitude?: number | null;
  longitude?: number | null;
  speed_mph?: number | string | null;
  heading?: number | string | null;
  status?: string | null;
  emergency_status?: string | null;
  last_updated?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  passenger_name?: string | null;
  passenger_phone?: string | null;
  eta_minutes?: number | string | null;
  distance_to_target_miles?: number | string | null;
  vehicle_type?: string | null;
  trip_phase?: string | null;
  emergency_message?: string | null;
};

type DispatchFilter =
  | "all"
  | "pending"
  | "assigned"
  | "active"
  | "pickup"
  | "onboard"
  | "emergency"
  | "completed"
  | "cancelled";

type Tone = "gold" | "success" | "warning" | "danger" | "info";

function normalize(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

function passengerName(trip: BookingRecord) {
  return (
    trip.name ||
    trip.passenger_name ||
    trip.full_name ||
    trip.email ||
    "Passenger"
  );
}

function passengerPhone(trip: BookingRecord) {
  return trip.phone || trip.passenger_phone || "";
}

function pickup(trip: BookingRecord) {
  return (
    trip.pickup_address ||
    trip.pickup ||
    trip.pickup_location ||
    "Pickup not set"
  );
}

function dropoff(trip: BookingRecord) {
  return (
    trip.dropoff_address ||
    trip.dropoff ||
    trip.dropoff_location ||
    trip.destination ||
    "Drop-off not set"
  );
}

function driverName(trip: BookingRecord) {
  return (
    trip.assigned_driver_name ||
    trip.driver_name ||
    "Not assigned"
  );
}

function driverPhone(trip: BookingRecord) {
  return (
    trip.assigned_driver_phone ||
    trip.driver_phone ||
    ""
  );
}

function tripDate(trip: BookingRecord) {
  return trip.date || trip.ride_date || trip.trip_date || "Not set";
}

function tripTime(trip: BookingRecord) {
  return trip.time || trip.ride_time || trip.trip_time || "Not set";
}

function amount(trip: BookingRecord) {
  return Number(
    trip.total_fare ??
      trip.total ??
      trip.total_price ??
      trip.price ??
      0
  );
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

function cleanPhone(value?: string | null) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function isStudent(trip: BookingRecord) {
  return (
    trip.student_verified === true ||
    trip.is_student === true ||
    Number(trip.student_discount || 0) > 0
  );
}

function isEmergency(location?: LiveLocation) {
  return Boolean(
    location &&
      normalize(location.emergency_status) !== "" &&
      normalize(location.emergency_status) !== "normal"
  );
}

function isPending(trip: BookingRecord) {
  return ["pending", "pendingconfirmation", "confirmed", "scheduled"].includes(
    normalize(trip.status)
  );
}

function isAssigned(trip: BookingRecord) {
  return ["driverassigned", "assigned", "driveraccepted", "accepted"].includes(
    normalize(trip.status)
  );
}

function isPickup(trip: BookingRecord) {
  return ["arriving", "driverarrived", "arrivedatpickup"].includes(
    normalize(trip.status)
  );
}

function isOnboard(trip: BookingRecord) {
  return ["pickedup", "inprogress", "active", "started"].includes(
    normalize(trip.status)
  );
}

function isActive(trip: BookingRecord) {
  return isAssigned(trip) || isPickup(trip) || isOnboard(trip);
}

function isCompleted(trip: BookingRecord) {
  return normalize(trip.status) === "completed";
}

function isCancelled(trip: BookingRecord) {
  return ["cancelled", "canceled"].includes(normalize(trip.status));
}

export default function LiveTripsScreen() {
  const { theme, isDark } = useOwnerTheme();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [locations, setLocations] = useState<LiveLocation[]>([]);
  const [alerts, setAlerts] = useState<GenericRecord[]>([]);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DispatchFilter>("all");

  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<BookingRecord | null>(null);

  const isTablet = width >= 700;
  const isLarge = width >= 1050;

  useFocusEffect(
    useCallback(() => {
      loadDispatchData();
    }, [])
  );

  useEffect(() => {
    const channel = supabase
      .channel("owner-live-dispatch-board")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadDispatchData(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        () => loadDispatchData(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_live_locations",
        },
        () => loadDispatchData(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_alerts",
        },
        () => loadDispatchData(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadDispatchData(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const [
        bookingResponse,
        driverResponse,
        locationResponse,
        alertResponse,
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase.from("drivers").select("*"),

        supabase
          .from("driver_live_locations")
          .select("*")
          .order("last_updated", { ascending: false }),

        supabase
          .from("emergency_alerts")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (bookingResponse.error) throw bookingResponse.error;
      if (driverResponse.error) throw driverResponse.error;
      if (locationResponse.error) throw locationResponse.error;

      setBookings(bookingResponse.data || []);
      setDrivers(driverResponse.data || []);
      setLocations(locationResponse.data || []);
      setAlerts(alertResponse.data || []);
    } catch (error: any) {
      Alert.alert(
        "Dispatch Center Error",
        error?.message || "Unable to load live operations."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function liveLocation(trip: BookingRecord) {
    return locations.find(
      (location) =>
        String(location.booking_id || "") === String(trip.id)
    );
  }

  function assignedDriver(trip: BookingRecord) {
    const id = trip.driver_id || trip.assigned_driver_id;

    if (!id) return undefined;

    return drivers.find((driver) => String(driver.id) === String(id));
  }

  async function updateStatus(
    trip: BookingRecord,
    status: string,
    successMessage: string
  ) {
    try {
      setUpdatingId(trip.id);

      const { error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", trip.id);

      if (error) throw error;

      setBookings((current) =>
        current.map((item) =>
          String(item.id) === String(trip.id)
            ? { ...item, status }
            : item
        )
      );

      Alert.alert("Success", successMessage);
    } catch (error: any) {
      Alert.alert(
        "Update Failed",
        error?.message || "Unable to update trip."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function callNumber(phone?: string | null) {
    const cleaned = cleanPhone(phone);

    if (!cleaned) {
      Alert.alert("Phone unavailable", "No phone number is available.");
      return;
    }

    Linking.openURL(`tel:${cleaned}`);
  }

  function textNumber(
    phone: string | null | undefined,
    message: string
  ) {
    const cleaned = cleanPhone(phone);

    if (!cleaned) {
      Alert.alert("Phone unavailable", "No phone number is available.");
      return;
    }

    Linking.openURL(
      `sms:${cleaned}?body=${encodeURIComponent(message)}`
    );
  }

  function openMap(trip: BookingRecord) {
    router.push({
      pathname: "/live-map" as any,
      params: { bookingId: String(trip.id) },
    });
  }

  function openBooking(trip: BookingRecord) {
    router.push("/booking-management");
  }

  function triggerEmergency(trip: BookingRecord) {
    const location = liveLocation(trip);

    Alert.alert(
      "Emergency Intervention",
      `Create an owner intervention alert for Trip #${trip.id}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create Alert",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("emergency_alerts")
                .insert({
                  booking_id: trip.id,
                  driver_id:
                    trip.driver_id || trip.assigned_driver_id || null,
                  alert_type: "Owner Intervention",
                  notes: `Owner intervention created for ${passengerName(
                    trip
                  )}.`,
                });

              if (error) throw error;

              if (location?.id) {
                await supabase
                  .from("driver_live_locations")
                  .update({
                    emergency_status: "owner_intervention",
                    emergency_message: "Owner intervention triggered",
                    last_updated: new Date().toISOString(),
                  })
                  .eq("id", location.id);
              }

              Alert.alert(
                "Emergency Alert Created",
                "This trip is now flagged for intervention."
              );

              loadDispatchData(false);
            } catch (error: any) {
              Alert.alert(
                "Emergency Error",
                error?.message || "Unable to create the alert."
              );
            }
          },
        },
      ]
    );
  }

  const summary = useMemo(() => {
    const active = bookings.filter(isActive);
    const pending = bookings.filter(isPending);
    const assigned = bookings.filter(isAssigned);
    const pickup = bookings.filter(isPickup);
    const onboard = bookings.filter(isOnboard);
    const completed = bookings.filter(isCompleted);
    const cancelled = bookings.filter(isCancelled);

    const emergencyTrips = bookings.filter((trip) =>
      isEmergency(liveLocation(trip))
    );

    const busyDriverIds = new Set(
      active
        .map((trip) => trip.driver_id || trip.assigned_driver_id)
        .filter(Boolean)
        .map(String)
    );

    const onlineDrivers = drivers.filter(
      (driver) => driver.is_online === true
    );

    const etaRows = active
      .map((trip) => Number(liveLocation(trip)?.eta_minutes || 0))
      .filter((value) => value > 0);

    const averageEta =
      etaRows.length > 0
        ? etaRows.reduce((sum, value) => sum + value, 0) /
          etaRows.length
        : 0;

    const utilization =
      onlineDrivers.length > 0
        ? Math.round(
            (busyDriverIds.size / onlineDrivers.length) * 100
          )
        : 0;

    return {
      active,
      pending,
      assigned,
      pickup,
      onboard,
      completed,
      cancelled,
      emergencyTrips,
      busyDriverIds,
      onlineDrivers,
      averageEta,
      utilization,
    };
  }, [bookings, drivers, locations]);

  function matchesFilter(trip: BookingRecord) {
    switch (filter) {
      case "pending":
        return isPending(trip);
      case "assigned":
        return isAssigned(trip);
      case "active":
        return isActive(trip);
      case "pickup":
        return isPickup(trip);
      case "onboard":
        return isOnboard(trip);
      case "emergency":
        return isEmergency(liveLocation(trip));
      case "completed":
        return isCompleted(trip);
      case "cancelled":
        return isCancelled(trip);
      case "all":
      default:
        return true;
    }
  }

  const filteredTrips = useMemo(() => {
    const search = query.trim().toLowerCase();

    return bookings.filter((trip) => {
      if (!matchesFilter(trip)) return false;

      if (!search) return true;

      return [
        trip.id,
        passengerName(trip),
        passengerPhone(trip),
        driverName(trip),
        pickup(trip),
        dropoff(trip),
        trip.status,
        trip.source,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [bookings, locations, filter, query]);

  function toneColors(tone: Tone) {
    if (tone === "success") {
      return {
        color: theme.colors.success,
        background: theme.colors.successSoft,
      };
    }

    if (tone === "warning") {
      return {
        color: theme.colors.warning,
        background: theme.colors.warningSoft,
      };
    }

    if (tone === "danger") {
      return {
        color: theme.colors.danger,
        background: theme.colors.dangerSoft,
      };
    }

    if (tone === "info") {
      return {
        color: theme.colors.info,
        background: theme.colors.infoSoft,
      };
    }

    return {
      color: theme.colors.gold,
      background: theme.colors.goldTransparent,
    };
  }

  function metricWidth() {
    if (isLarge) return "23.5%";
    if (isTablet) return "31.8%";
    return "48%";
  }

  function cardWidth() {
    if (isLarge) return "48.8%";
    return "100%";
  }

  function MetricCard({
    label,
    value,
    icon,
    tone,
  }: {
    label: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    tone: Tone;
  }) {
    const colors = toneColors(tone);

    return (
      <View
        style={[
          styles.metricCard,
          {
            width: metricWidth(),
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.cardBorder,
          },
          theme.shadows.soft,
        ]}
      >
        <View
          style={[
            styles.metricIcon,
            { backgroundColor: colors.background },
          ]}
        >
          <Ionicons
            name={icon}
            size={21}
            color={colors.color}
          />
        </View>

        <Text
          style={[
            styles.metricValue,
            { color: theme.colors.text },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>

        <Text
          style={[
            styles.metricLabel,
            { color: theme.colors.textMuted },
          ]}
        >
          {label}
        </Text>
      </View>
    );
  }

  function TripCard({ trip }: { trip: BookingRecord }) {
    const location = liveLocation(trip);
    const driver = assignedDriver(trip);
    const emergency = isEmergency(location);
    const updating =
      String(updatingId) === String(trip.id);

    const eta = Number(location?.eta_minutes || 0);
    const distance = Number(
      location?.distance_to_target_miles || 0
    );
    const speed = Number(location?.speed_mph || 0);

    return (
      <View
        style={[
          styles.tripCard,
          {
            width: cardWidth(),
            backgroundColor: theme.colors.card,
            borderColor: emergency
              ? theme.colors.danger
              : theme.colors.cardBorder,
          },
          theme.shadows.soft,
        ]}
      >
        <View style={styles.tripHeader}>
          <View
            style={[
              styles.tripIcon,
              {
                backgroundColor: emergency
                  ? theme.colors.dangerSoft
                  : theme.colors.goldTransparent,
              },
            ]}
          >
            <Ionicons
              name={
                emergency
                  ? "warning-outline"
                  : "navigate-outline"
              }
              size={22}
              color={
                emergency
                  ? theme.colors.danger
                  : theme.colors.gold
              }
            />
          </View>

          <View style={styles.tripTitleArea}>
            <Text
              style={[
                styles.tripTitle,
                { color: theme.colors.text },
              ]}
            >
              Trip #{trip.id}
            </Text>

            <Text
              style={[
                styles.tripPassenger,
                { color: theme.colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {passengerName(trip)}
            </Text>
          </View>

          <View style={styles.headerBadges}>
            <View
              style={[
                styles.sourceBadge,
                {
                  backgroundColor:
                    normalize(trip.source).includes("website")
                      ? theme.colors.infoSoft
                      : theme.colors.goldTransparent,
                },
              ]}
            >
              <Text
                style={[
                  styles.sourceBadgeText,
                  {
                    color:
                      normalize(trip.source).includes("website")
                        ? theme.colors.info
                        : theme.colors.gold,
                  },
                ]}
              >
                {normalize(trip.source).includes("website")
                  ? "Website"
                  : "Passenger App"}
              </Text>
            </View>

            {isStudent(trip) ? (
              <View
                style={[
                  styles.sourceBadge,
                  {
                    backgroundColor:
                      theme.colors.successSoft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sourceBadgeText,
                    { color: theme.colors.success },
                  ]}
                >
                  Student
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isCompleted(trip)
                  ? theme.colors.successSoft
                  : isCancelled(trip)
                    ? theme.colors.dangerSoft
                    : isActive(trip)
                      ? theme.colors.infoSoft
                      : theme.colors.warningSoft,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: isCompleted(trip)
                    ? theme.colors.success
                    : isCancelled(trip)
                      ? theme.colors.danger
                      : isActive(trip)
                        ? theme.colors.info
                        : theme.colors.warning,
                },
              ]}
            >
              {trip.status || "Pending"}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  normalize(trip.payment_status) === "paid"
                    ? theme.colors.successSoft
                    : theme.colors.warningSoft,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    normalize(trip.payment_status) === "paid"
                      ? theme.colors.success
                      : theme.colors.warning,
                },
              ]}
            >
              {normalize(trip.payment_status) === "paid"
                ? "Paid"
                : "Unpaid"}
            </Text>
          </View>

          {emergency ? (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: theme.colors.dangerSoft },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: theme.colors.danger },
                ]}
              >
                Emergency
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.routeBlock}>
          <View style={styles.routeGraphic}>
            <View
              style={[
                styles.routeDot,
                { backgroundColor: theme.colors.success },
              ]}
            />
            <View
              style={[
                styles.routeLine,
                { backgroundColor: theme.colors.divider },
              ]}
            />
            <View
              style={[
                styles.routeDot,
                { backgroundColor: theme.colors.danger },
              ]}
            />
          </View>

          <View style={styles.routeTextArea}>
            <View>
              <Text
                style={[
                  styles.routeLabel,
                  { color: theme.colors.textMuted },
                ]}
              >
                PICKUP
              </Text>
              <Text
                style={[
                  styles.routeValue,
                  { color: theme.colors.textSecondary },
                ]}
                numberOfLines={2}
              >
                {pickup(trip)}
              </Text>
            </View>

            <View>
              <Text
                style={[
                  styles.routeLabel,
                  { color: theme.colors.textMuted },
                ]}
              >
                DROP-OFF
              </Text>
              <Text
                style={[
                  styles.routeValue,
                  { color: theme.colors.textSecondary },
                ]}
                numberOfLines={2}
              >
                {dropoff(trip)}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.liveGrid,
            { borderTopColor: theme.colors.divider },
          ]}
        >
          <View style={styles.liveMetric}>
            <Ionicons
              name="time-outline"
              size={18}
              color={theme.colors.info}
            />
            <Text
              style={[
                styles.liveMetricValue,
                { color: theme.colors.text },
              ]}
            >
              {eta > 0 ? `${eta.toFixed(0)} min` : "--"}
            </Text>
            <Text
              style={[
                styles.liveMetricLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              ETA
            </Text>
          </View>

          <View style={styles.liveMetric}>
            <Ionicons
              name="speedometer-outline"
              size={18}
              color={
                speed > 85
                  ? theme.colors.danger
                  : theme.colors.success
              }
            />
            <Text
              style={[
                styles.liveMetricValue,
                { color: theme.colors.text },
              ]}
            >
              {speed.toFixed(0)} mph
            </Text>
            <Text
              style={[
                styles.liveMetricLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              Speed
            </Text>
          </View>

          <View style={styles.liveMetric}>
            <Ionicons
              name="navigate-circle-outline"
              size={18}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.liveMetricValue,
                { color: theme.colors.text },
              ]}
            >
              {distance > 0
                ? `${distance.toFixed(1)} mi`
                : "--"}
            </Text>
            <Text
              style={[
                styles.liveMetricLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              Distance
            </Text>
          </View>

          <View style={styles.liveMetric}>
            <Ionicons
              name="cash-outline"
              size={18}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.liveMetricValue,
                { color: theme.colors.text },
              ]}
            >
              {money(amount(trip))}
            </Text>
            <Text
              style={[
                styles.liveMetricLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              Fare
            </Text>
          </View>
        </View>

        <View style={styles.driverBlock}>
          <View
            style={[
              styles.driverAvatar,
              { backgroundColor: theme.colors.infoSoft },
            ]}
          >
            <Ionicons
              name="car-sport-outline"
              size={21}
              color={theme.colors.info}
            />
          </View>

          <View style={styles.driverTextArea}>
            <Text
              style={[
                styles.driverName,
                { color: theme.colors.text },
              ]}
              numberOfLines={1}
            >
              {driverName(trip)}
            </Text>

            <Text
              style={[
                styles.driverMeta,
                { color: theme.colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {driver
                ? [
                    driver.vehicle_year,
                    driver.vehicle_make,
                    driver.vehicle_model,
                    driver.plate_number,
                  ]
                    .filter(Boolean)
                    .join(" • ")
                : location?.vehicle_type ||
                  "Vehicle details unavailable"}
            </Text>
          </View>
        </View>

        <View style={styles.contactActions}>
          <TouchableOpacity
            style={styles.contactAction}
            onPress={() => callNumber(passengerPhone(trip))}
          >
            <Ionicons
              name="call-outline"
              size={20}
              color={theme.colors.success}
            />
            <Text
              style={[
                styles.contactActionText,
                { color: theme.colors.textMuted },
              ]}
            >
              Passenger
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactAction}
            onPress={() =>
              textNumber(
                passengerPhone(trip),
                `Hello ${passengerName(
                  trip
                )}, Angel Express is checking on Trip #${trip.id}.`
              )
            }
          >
            <Ionicons
              name="chatbubble-outline"
              size={20}
              color={theme.colors.info}
            />
            <Text
              style={[
                styles.contactActionText,
                { color: theme.colors.textMuted },
              ]}
            >
              Text
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactAction}
            onPress={() => callNumber(driverPhone(trip))}
          >
            <Ionicons
              name="car-outline"
              size={20}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.contactActionText,
                { color: theme.colors.textMuted },
              ]}
            >
              Driver
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactAction}
            onPress={() => openMap(trip)}
          >
            <Ionicons
              name="map-outline"
              size={20}
              color={theme.colors.info}
            />
            <Text
              style={[
                styles.contactActionText,
                { color: theme.colors.textMuted },
              ]}
            >
              Live Map
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactAction}
            onPress={() => {
              setSelectedTrip(trip);
              setDetailsVisible(true);
            }}
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.contactActionText,
                { color: theme.colors.textMuted },
              ]}
            >
              Details
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.managementActions,
            { borderTopColor: theme.colors.divider },
          ]}
        >
          {isAssigned(trip) || isPickup(trip) ? (
            <TouchableOpacity
              style={[
                styles.managementButton,
                {
                  backgroundColor: theme.colors.successSoft,
                  borderColor: theme.colors.success,
                },
              ]}
              onPress={() =>
                updateStatus(
                  trip,
                  "In Progress",
                  "Trip marked as in progress."
                )
              }
              disabled={updating}
            >
              <Ionicons
                name="play-circle-outline"
                size={17}
                color={theme.colors.success}
              />
              <Text
                style={[
                  styles.managementText,
                  { color: theme.colors.success },
                ]}
              >
                Start Trip
              </Text>
            </TouchableOpacity>
          ) : null}

          {isOnboard(trip) ? (
            <TouchableOpacity
              style={[
                styles.managementButton,
                {
                  backgroundColor: theme.colors.successSoft,
                  borderColor: theme.colors.success,
                },
              ]}
              onPress={() =>
                updateStatus(
                  trip,
                  "Completed",
                  "Trip completed."
                )
              }
              disabled={updating}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={17}
                color={theme.colors.success}
              />
              <Text
                style={[
                  styles.managementText,
                  { color: theme.colors.success },
                ]}
              >
                Complete
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[
              styles.managementButton,
              {
                backgroundColor: theme.colors.infoSoft,
                borderColor: theme.colors.info,
              },
            ]}
            onPress={() => openBooking(trip)}
          >
            <Ionicons
              name="calendar-outline"
              size={17}
              color={theme.colors.info}
            />
            <Text
              style={[
                styles.managementText,
                { color: theme.colors.info },
              ]}
            >
              Booking
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.managementButton,
              {
                backgroundColor: theme.colors.dangerSoft,
                borderColor: theme.colors.danger,
              },
            ]}
            onPress={() => triggerEmergency(trip)}
          >
            <Ionicons
              name="warning-outline"
              size={17}
              color={theme.colors.danger}
            />
            <Text
              style={[
                styles.managementText,
                { color: theme.colors.danger },
              ]}
            >
              Emergency
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={theme.colors.gold}
        />
        <Text
          style={[
            styles.loadingText,
            { color: theme.colors.textSecondary },
          ]}
        >
          Loading Operations Dispatch Board...
        </Text>
      </View>
    );
  }

  const filters: {
    key: DispatchFilter;
    label: string;
    count: number;
  }[] = [
    { key: "all", label: "All", count: bookings.length },
    {
      key: "pending",
      label: "Pending",
      count: summary.pending.length,
    },
    {
      key: "assigned",
      label: "Assigned",
      count: summary.assigned.length,
    },
    {
      key: "active",
      label: "Active",
      count: summary.active.length,
    },
    {
      key: "pickup",
      label: "Pickup",
      count: summary.pickup.length,
    },
    {
      key: "onboard",
      label: "Onboard",
      count: summary.onboard.length,
    },
    {
      key: "emergency",
      label: "Emergency",
      count: summary.emergencyTrips.length,
    },
    {
      key: "completed",
      label: "Completed",
      count: summary.completed.length,
    },
    {
      key: "cancelled",
      label: "Cancelled",
      count: summary.cancelled.length,
    },
  ];

  return (
    <ImageBackground
      source={require("../assets/images/owner-bg.png")}
      style={[
        styles.background,
        { backgroundColor: theme.colors.background },
      ]}
      resizeMode="cover"
    >
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: isDark
              ? "rgba(3,8,17,0.94)"
              : "rgba(245,247,250,0.96)",
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.container,
            { maxWidth: isLarge ? 1350 : 1100 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await loadDispatchData(false);
              }}
              tintColor={theme.colors.gold}
              colors={[theme.colors.gold]}
            />
          }
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              style={[
                styles.backButton,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={theme.colors.gold}
              />
            </TouchableOpacity>

            <View style={styles.titleArea}>
              <Text
                style={[
                  styles.eyebrow,
                  { color: theme.colors.gold },
                ]}
              >
                ANGEL EXPRESS OPERATIONS
              </Text>

              <Text
                style={[
                  styles.pageTitle,
                  { color: theme.colors.text },
                ]}
              >
                Operations Dispatch Board
              </Text>

              <Text
                style={[
                  styles.pageSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                Monitor pending, assigned, active, onboard, completed,
                cancelled, and emergency trips in real time.
              </Text>
            </View>
          </View>

          <View style={styles.metricGrid}>
            <MetricCard
              label="Active Trips"
              value={summary.active.length}
              icon="navigate-outline"
              tone="success"
            />
            <MetricCard
              label="Drivers Online"
              value={summary.onlineDrivers.length}
              icon="radio-outline"
              tone="success"
            />
            <MetricCard
              label="Drivers Busy"
              value={summary.busyDriverIds.size}
              icon="car-sport-outline"
              tone="info"
            />
            <MetricCard
              label="Waiting Pickup"
              value={summary.pickup.length}
              icon="location-outline"
              tone="warning"
            />
            <MetricCard
              label="Passenger Onboard"
              value={summary.onboard.length}
              icon="people-outline"
              tone="info"
            />
            <MetricCard
              label="Emergency Alerts"
              value={summary.emergencyTrips.length}
              icon="warning-outline"
              tone={
                summary.emergencyTrips.length > 0
                  ? "danger"
                  : "success"
              }
            />
            <MetricCard
              label="Average ETA"
              value={
                summary.averageEta > 0
                  ? `${summary.averageEta.toFixed(0)} min`
                  : "--"
              }
              icon="time-outline"
              tone="gold"
            />
            <MetricCard
              label="Fleet Utilization"
              value={`${summary.utilization}%`}
              icon="speedometer-outline"
              tone="gold"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.mapShortcut,
              {
                backgroundColor: theme.colors.goldTransparent,
                borderColor: theme.colors.gold,
              },
            ]}
            onPress={() => router.push("/live-map")}
          >
            <View
              style={[
                styles.mapShortcutIcon,
                { backgroundColor: theme.colors.goldTransparent },
              ]}
            >
              <Ionicons
                name="map-outline"
                size={24}
                color={theme.colors.gold}
              />
            </View>

            <View style={styles.mapShortcutTextArea}>
              <Text
                style={[
                  styles.mapShortcutTitle,
                  { color: theme.colors.text },
                ]}
              >
                Open Live Dispatch Map
              </Text>

              <Text
                style={[
                  styles.mapShortcutText,
                  { color: theme.colors.textMuted },
                ]}
              >
                View moving drivers, pickup points, destinations, ETAs,
                and emergencies.
              </Text>
            </View>

            <Ionicons
              name="arrow-forward"
              size={20}
              color={theme.colors.gold}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.searchPanel,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorderStrong,
              },
              theme.shadows.soft,
            ]}
          >
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: theme.colors.inputBackground,
                  borderColor: theme.colors.inputBorder,
                },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={20}
                color={theme.colors.textMuted}
              />

              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search trip, passenger, driver, phone, or route"
                placeholderTextColor={theme.colors.inputPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.searchInput,
                  { color: theme.colors.text },
                ]}
              />

              {query ? (
                <TouchableOpacity onPress={() => setQuery("")}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {filters.map((item) => {
                const selected = filter === item.key;

                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selected
                          ? theme.colors.goldTransparent
                          : theme.colors.surfaceSoft,
                        borderColor: selected
                          ? theme.colors.gold
                          : theme.colors.cardBorder,
                      },
                    ]}
                    onPress={() => setFilter(item.key)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        {
                          color: selected
                            ? theme.colors.gold
                            : theme.colors.textMuted,
                        },
                      ]}
                    >
                      {item.label} ({item.count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.resultsHeader}>
            <View>
              <Text
                style={[
                  styles.resultsTitle,
                  { color: theme.colors.text },
                ]}
              >
                {
                  filters.find((item) => item.key === filter)
                    ?.label
                }{" "}
                Trips
              </Text>

              <Text
                style={[
                  styles.resultsSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                {filteredTrips.length} result
                {filteredTrips.length === 1 ? "" : "s"}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.refreshButton,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
              onPress={() => loadDispatchData(false)}
            >
              <Ionicons
                name="refresh"
                size={18}
                color={theme.colors.gold}
              />
              <Text
                style={[
                  styles.refreshText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Refresh
              </Text>
            </TouchableOpacity>
          </View>

          {filteredTrips.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <Ionicons
                name="navigate-outline"
                size={34}
                color={theme.colors.gold}
              />
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.text },
                ]}
              >
                No matching trips
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textMuted },
                ]}
              >
                Adjust the search or choose another filter.
              </Text>
            </View>
          ) : (
            <View style={styles.tripGrid}>
              {filteredTrips.map((trip) => (
                <TripCard key={String(trip.id)} trip={trip} />
              ))}
            </View>
          )}
        </ScrollView>

        <Modal
          visible={detailsVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDetailsVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.detailsModal,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.cardBorderStrong,
                },
              ]}
            >
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: theme.colors.divider },
                ]}
              >
                <View style={styles.modalTitleArea}>
                  <Text
                    style={[
                      styles.modalEyebrow,
                      { color: theme.colors.gold },
                    ]}
                  >
                    LIVE TRIP DETAILS
                  </Text>

                  <Text
                    style={[
                      styles.modalTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    {selectedTrip
                      ? `Trip #${selectedTrip.id}`
                      : "Trip Details"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.modalClose,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                  onPress={() => setDetailsVisible(false)}
                >
                  <Ionicons
                    name="close"
                    size={21}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {selectedTrip ? (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.detailsContent}
                >
                  {[
                    ["Passenger", passengerName(selectedTrip)],
                    [
                      "Passenger Phone",
                      passengerPhone(selectedTrip) || "Not provided",
                    ],
                    ["Driver", driverName(selectedTrip)],
                    [
                      "Driver Phone",
                      driverPhone(selectedTrip) || "Not provided",
                    ],
                    ["Status", selectedTrip.status || "Pending"],
                    [
                      "Payment",
                      selectedTrip.payment_status || "Unpaid",
                    ],
                    ["Date", tripDate(selectedTrip)],
                    ["Time", tripTime(selectedTrip)],
                    ["Pickup", pickup(selectedTrip)],
                    ["Drop-off", dropoff(selectedTrip)],
                    ["Fare", money(amount(selectedTrip))],
                    [
                      "Trip Phase",
                      liveLocation(selectedTrip)?.trip_phase ||
                        selectedTrip.status ||
                        "Pending",
                    ],
                    [
                      "ETA",
                      liveLocation(selectedTrip)?.eta_minutes
                        ? `${Number(
                            liveLocation(selectedTrip)?.eta_minutes
                          ).toFixed(0)} minutes`
                        : "Unavailable",
                    ],
                    [
                      "Distance",
                      liveLocation(selectedTrip)
                        ?.distance_to_target_miles
                        ? `${Number(
                            liveLocation(selectedTrip)
                              ?.distance_to_target_miles
                          ).toFixed(2)} miles`
                        : "Unavailable",
                    ],
                    [
                      "Speed",
                      `${Number(
                        liveLocation(selectedTrip)?.speed_mph || 0
                      ).toFixed(1)} mph`,
                    ],
                    [
                      "Emergency",
                      liveLocation(selectedTrip)?.emergency_status ||
                        "normal",
                    ],
                  ].map(([label, value]) => (
                    <View
                      key={label}
                      style={[
                        styles.detailsRow,
                        { borderBottomColor: theme.colors.divider },
                      ]}
                    >
                      <Text
                        style={[
                          styles.detailsLabel,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {label}
                      </Text>

                      <Text
                        style={[
                          styles.detailsValue,
                          { color: theme.colors.text },
                        ]}
                      >
                        {value}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
            </View>
          </View>
        </Modal>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1 },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "700",
  },

  container: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 60,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  titleArea: { flex: 1 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 5,
  },
  pageTitle: {
    fontSize: 29,
    fontWeight: "900",
  },
  pageSubtitle: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 760,
  },

  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  metricCard: {
    minHeight: 132,
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    marginBottom: 13,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  metricValue: {
    fontSize: 27,
    fontWeight: "900",
  },
  metricLabel: {
    marginTop: 5,
    fontSize: 11.5,
    fontWeight: "700",
  },

  mapShortcut: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 21,
    padding: 16,
    marginBottom: 20,
  },
  mapShortcutIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  mapShortcutTextArea: {
    flex: 1,
    paddingRight: 10,
  },
  mapShortcutTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  mapShortcutText: {
    marginTop: 5,
    fontSize: 11.5,
    lineHeight: 17,
  },

  searchPanel: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginBottom: 26,
  },
  searchBox: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 15,
  },
  searchInput: {
    flex: 1,
    height: 52,
    marginHorizontal: 10,
    fontSize: 14,
    fontWeight: "600",
  },
  filterRow: {
    gap: 9,
    paddingTop: 14,
    paddingRight: 10,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "800",
  },

  resultsHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: "900",
  },
  resultsSubtitle: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600",
  },
  refreshButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
  },
  refreshText: {
    marginLeft: 7,
    fontSize: 12,
    fontWeight: "800",
  },

  tripGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tripCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  tripHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  tripIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tripTitleArea: {
    flex: 1,
    paddingRight: 8,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  tripPassenger: {
    marginTop: 3,
    fontSize: 10.5,
    fontWeight: "600",
  },
  headerBadges: {
    alignItems: "flex-end",
    gap: 6,
  },
  sourceBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  sourceBadgeText: {
    fontSize: 8.5,
    fontWeight: "900",
  },

  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 15,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
  },

  routeBlock: {
    flexDirection: "row",
    marginTop: 20,
  },
  routeGraphic: {
    width: 18,
    alignItems: "center",
    marginRight: 10,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  routeLine: {
    width: 2,
    flex: 1,
    minHeight: 45,
    marginVertical: 4,
  },
  routeTextArea: {
    flex: 1,
    gap: 18,
  },
  routeLabel: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 1,
  },
  routeValue: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },

  liveGrid: {
    flexDirection: "row",
    borderTopWidth: 1,
    marginTop: 18,
    paddingTop: 16,
  },
  liveMetric: {
    width: "25%",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  liveMetricValue: {
    marginTop: 6,
    fontSize: 12.5,
    fontWeight: "900",
  },
  liveMetricLabel: {
    marginTop: 4,
    fontSize: 8.5,
    fontWeight: "700",
  },

  driverBlock: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },
  driverAvatar: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  driverTextArea: { flex: 1 },
  driverName: {
    fontSize: 13,
    fontWeight: "900",
  },
  driverMeta: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "600",
  },

  contactActions: {
    flexDirection: "row",
    marginTop: 17,
  },
  contactAction: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  contactActionText: {
    marginTop: 5,
    fontSize: 8.5,
    fontWeight: "700",
  },

  managementActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 14,
  },
  managementButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
  },
  managementText: {
    marginLeft: 6,
    fontSize: 10.5,
    fontWeight: "900",
  },

  emptyState: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 22,
    padding: 30,
  },
  emptyTitle: {
    marginTop: 13,
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 12,
    textAlign: "center",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.66)",
    justifyContent: "flex-end",
  },
  detailsModal: {
    maxHeight: "90%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    padding: 18,
  },
  modalTitleArea: { flex: 1 },
  modalEyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  modalTitle: {
    marginTop: 4,
    fontSize: 21,
    fontWeight: "900",
  },
  modalClose: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsContent: {
    padding: 18,
    paddingBottom: 40,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingVertical: 13,
  },
  detailsLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
  },
  detailsValue: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "900",
    textAlign: "right",
  },
});
