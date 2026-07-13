import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as Clipboard from "expo-clipboard";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { useOwnerTheme } from "../lib/ownerTheme";
import { supabase } from "../lib/supabase";

const DRIVER_SIGNUP_LINK =
  process.env.EXPO_PUBLIC_DRIVER_SIGNUP_URL ||
  "https://angel-express-us.netlify.app/";

type GenericRecord = Record<string, any>;

type DriverRecord = GenericRecord & {
  id: string;
  user_id?: string | null;
  profile_id?: string | null;
  created_at?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  driver_phone?: string | null;
  status?: string | null;
  is_online?: boolean | null;
  rating?: number | string | null;
  driver_level?: string | null;
  complaints_count?: number | null;
  safety_checkins?: number | null;
  current_booking_id?: string | null;
  current_trip_id?: string | number | null;
  driver_license_url?: string | null;
  insurance_url?: string | null;
  vehicle_registration_url?: string | null;
  profile_photo_url?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: string | number | null;
  license_plate?: string | null;
  plate_number?: string | null;
  background_check_status?: string | null;
  insurance_status?: string | null;
  license_status?: string | null;
  inspection_status?: string | null;
};

type BookingRecord = GenericRecord & {
  id: string | number;
  driver_id?: string | null;
  assigned_driver_id?: string | null;
  status?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  payment_status?: string | null;
  driver_payout_status?: string | null;
  payout_status?: string | null;
  total?: number | string | null;
  total_price?: number | string | null;
  total_fare?: number | string | null;
  price?: number | string | null;
  pickup?: string | null;
  pickup_address?: string | null;
  dropoff?: string | null;
  dropoff_address?: string | null;
  passenger_name?: string | null;
  name?: string | null;
};

type DriverFilter =
  | "all"
  | "pending"
  | "approved"
  | "online"
  | "active"
  | "suspended"
  | "rejected";

type Tone = "gold" | "success" | "warning" | "danger" | "info";

function normalize(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

function driverName(driver: DriverRecord) {
  return (
    `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
    driver.full_name ||
    driver.name ||
    "Driver"
  );
}

function driverPhone(driver: DriverRecord) {
  return driver.phone || driver.driver_phone || "";
}

function cleanPhone(phone?: string | null) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function bookingAmount(booking: BookingRecord) {
  return Number(
    booking.total_fare ??
      booking.total ??
      booking.total_price ??
      booking.price ??
      0
  );
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

function isCompleted(booking: BookingRecord) {
  return normalize(booking.status) === "completed";
}

function isActiveBooking(booking: BookingRecord) {
  return [
    "assigned",
    "driverassigned",
    "driveraccepted",
    "accepted",
    "driverarrived",
    "arrivedatpickup",
    "pickedup",
    "inprogress",
    "active",
    "started",
  ].includes(normalize(booking.status));
}

function isOpenAlert(alert: GenericRecord) {
  return ![
    "resolved",
    "closed",
    "dismissed",
    "cancelled",
    "canceled",
  ].includes(
    normalize(
      alert.status ||
        alert.alert_status ||
        alert.resolution_status
    )
  );
}

function isTruthyOnlineValue(value: any) {
  if (value === true || value === 1) return true;

  return [
    "true",
    "1",
    "online",
    "available",
    "active",
    "ready",
  ].includes(normalize(String(value ?? "")));
}

function matchesDriverFilter(
  driver: DriverRecord,
  filter: DriverFilter,
  activeDriverIds: Set<string>,
  onlineDriverIds: Set<string>
) {
  const status = normalize(driver.status);

  switch (filter) {
    case "pending":
      return ["pending", "pendingapproval", "underreview"].includes(status);
    case "approved":
      return status === "approved";
    case "online":
      return onlineDriverIds.has(String(driver.id));
    case "active":
      return activeDriverIds.has(String(driver.id));
    case "suspended":
      return status === "suspended";
    case "rejected":
      return status === "rejected";
    case "all":
    default:
      return true;
  }
}

export default function DriverManagementScreen() {
  const { theme, isDark } = useOwnerTheme();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingDriverId, setUpdatingDriverId] =
    useState<string | null>(null);

  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [liveLocations, setLiveLocations] = useState<GenericRecord[]>([]);
  const [alerts, setAlerts] = useState<GenericRecord[]>([]);
  const [reviews, setReviews] = useState<GenericRecord[]>([]);
  const [supportMessages, setSupportMessages] =
    useState<GenericRecord[]>([]);

  const [query, setQuery] = useState("");
  const [filter, setFilter] =
    useState<DriverFilter>("all");

  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedDriver, setSelectedDriver] =
    useState<DriverRecord | null>(null);

  const isTablet = width >= 700;
  const isLarge = width >= 1050;

  useFocusEffect(
    useCallback(() => {
      loadDriverData();
    }, [])
  );

  useEffect(() => {
    const channel = supabase
      .channel("owner-driver-operations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        () => loadDriverData(false)
      )

      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadDriverData(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_live_locations",
        },
        () => loadDriverData(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_alerts",
        },
        () => loadDriverData(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadDriverData(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const [
        driversResponse,
        bookingsResponse,
        locationsResponse,
        alertsResponse,
        reviewsResponse,
        supportResponse,
      ] = await Promise.all([
        supabase
          .from("drivers")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("driver_live_locations")
          .select("*"),

        supabase
          .from("emergency_alerts")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("driver_reviews")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("driver_support_messages")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);
      if (driversResponse.error) throw driversResponse.error;

      if (bookingsResponse.error) throw bookingsResponse.error;

      setDrivers(driversResponse.data || []);
      setBookings(bookingsResponse.data || []);
      setLiveLocations(locationsResponse.data || []);
      setAlerts(alertsResponse.data || []);
      setReviews(reviewsResponse.data || []);
      setSupportMessages(supportResponse.data || []);
    } catch (error: any) {
      Alert.alert(
        "Driver Operations Error",
        error?.message || "Unable to load driver operations."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function updateDriverStatus(
    driver: DriverRecord,
    status: string,
    successMessage: string
  ) {
    try {
      setUpdatingDriverId(driver.id);

      const { error } = await supabase
        .from("drivers")
        .update({ status })
        .eq("id", driver.id);

      if (error) throw error;

      setDrivers((current) =>
        current.map((item) =>
          item.id === driver.id ? { ...item, status } : item
        )
      );

      Alert.alert("Success", successMessage);
    } catch (error: any) {
      Alert.alert(
        "Update Failed",
        error?.message || "Unable to update driver status."
      );
    } finally {
      setUpdatingDriverId(null);
    }
  }

  function approveDriver(driver: DriverRecord) {
    updateDriverStatus(
      driver,
      "approved",
      `${driverName(driver)} approved.`
    );
  }

  function rejectDriver(driver: DriverRecord) {
    Alert.alert(
      "Reject Driver",
      `Reject ${driverName(driver)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () =>
            updateDriverStatus(
              driver,
              "rejected",
              `${driverName(driver)} rejected.`
            ),
        },
      ]
    );
  }

  function suspendDriver(driver: DriverRecord) {
    Alert.alert(
      "Suspend Driver",
      `Suspend ${driverName(driver)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Suspend",
          style: "destructive",
          onPress: () =>
            updateDriverStatus(
              driver,
              "suspended",
              `${driverName(driver)} suspended.`
            ),
        },
      ]
    );
  }

  function reactivateDriver(driver: DriverRecord) {
    updateDriverStatus(
      driver,
      "approved",
      `${driverName(driver)} reactivated.`
    );
  }

  function callDriver(driver: DriverRecord) {
    const phone = cleanPhone(driverPhone(driver));

    if (!phone) {
      Alert.alert(
        "Phone unavailable",
        "Driver phone number is not available."
      );
      return;
    }

    Linking.openURL(`tel:${phone}`);
  }

  function smsDriver(driver: DriverRecord) {
    const phone = cleanPhone(driverPhone(driver));

    if (!phone) {
      Alert.alert(
        "Phone unavailable",
        "Driver phone number is not available."
      );
      return;
    }

    const message = `Hello ${driverName(
      driver
    )}, this is Angel Express dispatch.`;

    Linking.openURL(
      `sms:${phone}?body=${encodeURIComponent(message)}`
    );
  }

  function whatsappDriver(driver: DriverRecord) {
    const phone = cleanPhone(driverPhone(driver)).replace("+", "");

    if (!phone) {
      Alert.alert(
        "Phone unavailable",
        "Driver WhatsApp number is not available."
      );
      return;
    }

    const message = `Hello ${driverName(
      driver
    )}, this is Angel Express dispatch.`;

    Linking.openURL(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    );
  }

  async function copyDriverSignupLink() {
    await Clipboard.setStringAsync(DRIVER_SIGNUP_LINK);

    Alert.alert(
      "Link Copied",
      "The chauffeur signup link has been copied."
    );
  }

  async function shareDriverSignupLink() {
    try {
      await Share.share({
        title: "Join Angel Express as a Chauffeur",
        message: `Join Angel Express as a chauffeur. Register here: ${DRIVER_SIGNUP_LINK}`,
        url: DRIVER_SIGNUP_LINK,
      });
    } catch (error: any) {
      Alert.alert(
        "Share Failed",
        error?.message || "Unable to share the signup link."
      );
    }
  }

  function getDriverBookings(driver: DriverRecord) {
    const driverIds = new Set(
      [
        driver.id,
        driver.user_id,
        driver.profile_id,
      ]
        .filter(Boolean)
        .map(String)
    );

    return bookings.filter((booking) =>
      driverIds.has(
        String(
          booking.driver_id ||
            booking.assigned_driver_id ||
            booking.assigned_driver_user_id ||
            ""
        )
      )
    );
  }

  function getCompletedTrips(driver: DriverRecord) {
    return getDriverBookings(driver).filter(isCompleted);
  }

  function getActiveTrip(driver: DriverRecord) {
    const currentTripId =
      driver.current_trip_id || driver.current_booking_id;

    if (currentTripId) {
      const matchingCurrentTrip = bookings.find(
        (booking) =>
          String(booking.id) === String(currentTripId)
      );

      if (matchingCurrentTrip) {
        return matchingCurrentTrip;
      }
    }

    return getDriverBookings(driver).find(isActiveBooking);
  }

  function getLiveLocation(driver: DriverRecord) {
    const driverIds = new Set(
      [
        driver.id,
        driver.user_id,
        driver.profile_id,
      ]
        .filter(Boolean)
        .map(String)
    );

    return liveLocations.find((location) =>
      driverIds.has(
        String(
          location.driver_id ||
            location.user_id ||
            location.profile_id ||
            ""
        )
      )
    );
  }

  function isDriverOnline(driver: DriverRecord) {
    if (
      isTruthyOnlineValue(driver.is_online) ||
      isTruthyOnlineValue(driver.online) ||
      isTruthyOnlineValue(driver.available) ||
      isTruthyOnlineValue(driver.is_available) ||
      isTruthyOnlineValue(driver.availability_status) ||
      isTruthyOnlineValue(driver.online_status)
    ) {
      return true;
    }

    const location = getLiveLocation(driver);

    if (!location) return false;

    if (
      isTruthyOnlineValue(location.is_online) ||
      isTruthyOnlineValue(location.online) ||
      isTruthyOnlineValue(location.available) ||
      isTruthyOnlineValue(location.is_available) ||
      isTruthyOnlineValue(location.status) ||
      isTruthyOnlineValue(location.availability_status) ||
      isTruthyOnlineValue(location.online_status)
    ) {
      return true;
    }

    const lastSeenValue =
      location.last_updated ||
      location.updated_at ||
      location.created_at ||
      location.recorded_at;

    if (!lastSeenValue) return false;

    const lastSeen = new Date(lastSeenValue).getTime();

    if (Number.isNaN(lastSeen)) return false;

    // Treat a driver with a fresh live-location update as online.
    return Date.now() - lastSeen <= 10 * 60 * 1000;
  }

  function getDriverAlerts(driver: DriverRecord) {
    return alerts.filter(
      (alert) =>
        String(alert.driver_id || "") === String(driver.id)
    );
  }

  function getDriverReviews(driver: DriverRecord) {
    return reviews.filter(
      (review) =>
        String(review.driver_id || "") === String(driver.id)
    );
  }

  function getDriverSupport(driver: DriverRecord) {
    return supportMessages.filter(
      (message) =>
        String(message.driver_id || "") === String(driver.id)
    );
  }

  function lifetimeEarnings(driver: DriverRecord) {
    return getCompletedTrips(driver).reduce(
      (sum, trip) => sum + bookingAmount(trip) * 0.7,
      0
    );
  }

  function weeklyEarnings(driver: DriverRecord) {
    const sevenDaysAgo = Date.now() - 7 * 86400000;

    return getCompletedTrips(driver).reduce((sum, trip) => {
      const completedAt = new Date(
        trip.completed_at || trip.created_at || 0
      ).getTime();

      if (!completedAt || completedAt < sevenDaysAgo) {
        return sum;
      }

      return sum + bookingAmount(trip) * 0.7;
    }, 0);
  }

  function pendingPayout(driver: DriverRecord) {
    return getCompletedTrips(driver).reduce((sum, trip) => {
      const payoutStatus = normalize(
        trip.driver_payout_status ||
          trip.payout_status ||
          trip.payment_status
      );

      if (
        payoutStatus === "paid" ||
        payoutStatus === "driverpaid"
      ) {
        return sum;
      }

      return sum + bookingAmount(trip) * 0.7;
    }, 0);
  }

  const summary = useMemo(() => {
    const activeDriverIds = new Set(
      bookings
        .filter(isActiveBooking)
        .map((booking) =>
          String(
            booking.driver_id ||
              booking.assigned_driver_id ||
              ""
          )
        )
        .filter(Boolean)
    );

    const pending = drivers.filter((driver) =>
      ["pending", "pendingapproval", "underreview"].includes(
        normalize(driver.status)
      )
    );

    const approved = drivers.filter(
      (driver) => normalize(driver.status) === "approved"
    );

    const suspended = drivers.filter(
      (driver) => normalize(driver.status) === "suspended"
    );

    const rejected = drivers.filter(
      (driver) => normalize(driver.status) === "rejected"
    );

    const onlineDriverIds = new Set(
      drivers
        .filter((driver) => isDriverOnline(driver))
        .map((driver) => String(driver.id))
    );

    const online = drivers.filter((driver) =>
      onlineDriverIds.has(String(driver.id))
    );

    const active = drivers.filter((driver) =>
      activeDriverIds.has(String(driver.id)) ||
      Boolean(getActiveTrip(driver))
    );

    const openAlerts = alerts.filter(isOpenAlert);

    return {
      activeDriverIds,
      onlineDriverIds,
      pending,
      approved,
      suspended,
      rejected,
      online,
      active,
      openAlerts,
    };
  }, [drivers, bookings, alerts]);

  const filteredDrivers = useMemo(() => {
    const search = query.trim().toLowerCase();

    return drivers.filter((driver) => {
      if (
        !matchesDriverFilter(
          driver,
          filter,
          summary.activeDriverIds,
          summary.onlineDriverIds
        )
      ) {
        return false;
      }

      if (!search) return true;

      const searchable = [
        driverName(driver),
        driver.email,
        driverPhone(driver),
        driver.status,
        driver.driver_level,
        driver.vehicle_make,
        driver.vehicle_model,
        driver.license_plate,
        driver.plate_number,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(search);
    });
  }, [
    drivers,
    filter,
    query,
    summary.activeDriverIds,
    summary.onlineDriverIds,
  ]);

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

  function driverCardWidth() {
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

  function StatusBadge({ driver }: { driver: DriverRecord }) {
    const status = normalize(driver.status);

    let tone: Tone = "warning";

    if (status === "approved") tone = "success";
    if (status === "suspended" || status === "rejected") {
      tone = "danger";
    }

    const colors = toneColors(tone);

    return (
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: colors.background },
        ]}
      >
        <Text
          style={[
            styles.statusBadgeText,
            { color: colors.color },
          ]}
        >
          {driver.status || "Unknown"}
        </Text>
      </View>
    );
  }

  function DriverCard({ driver }: { driver: DriverRecord }) {
    const name = driverName(driver);
    const activeTrip = getActiveTrip(driver);
    const location = getLiveLocation(driver);
    const completed = getCompletedTrips(driver);
    const driverAlerts = getDriverAlerts(driver);
    const driverReviews = getDriverReviews(driver);
    const support = getDriverSupport(driver);
    const updating = updatingDriverId === driver.id;
    const status = normalize(driver.status);
    const online = isDriverOnline(driver);

    const averageReview =
      driverReviews.length > 0
        ? driverReviews.reduce(
            (sum, review) =>
              sum + Number(review.rating || review.score || 0),
            0
          ) / driverReviews.length
        : Number(driver.rating || 5);

    return (
      <View
        style={[
          styles.driverCard,
          {
            width: driverCardWidth(),
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.cardBorder,
          },
          theme.shadows.soft,
        ]}
      >
        <View style={styles.driverHeader}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: theme.colors.goldTransparent,
              },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                { color: theme.colors.gold },
              ]}
            >
              {name.charAt(0).toUpperCase()}
            </Text>

            <View
              style={[
                styles.onlineIndicator,
                {
                  backgroundColor: online
                    ? theme.colors.success
                    : theme.colors.offline,
                  borderColor: theme.colors.card,
                },
              ]}
            />
          </View>

          <View style={styles.driverTitleArea}>
            <Text
              style={[
                styles.driverName,
                { color: theme.colors.text },
              ]}
              numberOfLines={1}
            >
              {name}
            </Text>

            <Text
              style={[
                styles.driverContact,
                { color: theme.colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {driver.email || "Email not provided"}
            </Text>

            <Text
              style={[
                styles.driverContact,
                { color: theme.colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {driverPhone(driver) || "Phone not provided"}
            </Text>
          </View>

          <StatusBadge driver={driver} />
        </View>

        <View style={styles.badgeRow}>
          <View
            style={[
              styles.smallBadge,
              {
                backgroundColor: online
                  ? theme.colors.successSoft
                  : theme.colors.surfaceSoft,
              },
            ]}
          >
            <Ionicons
              name="radio-outline"
              size={13}
              color={
                online
                  ? theme.colors.success
                  : theme.colors.textMuted
              }
            />
            <Text
              style={[
                styles.smallBadgeText,
                {
                  color: driver.is_online
                    ? theme.colors.success
                    : theme.colors.textMuted,
                },
              ]}
            >
              {online ? "Online" : "Offline"}
            </Text>
          </View>

          <View
            style={[
              styles.smallBadge,
              {
                backgroundColor: theme.colors.goldTransparent,
              },
            ]}
          >
            <Ionicons
              name="star"
              size={13}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.smallBadgeText,
                { color: theme.colors.gold },
              ]}
            >
              {averageReview.toFixed(1)}
            </Text>
          </View>

          <View
            style={[
              styles.smallBadge,
              {
                backgroundColor: theme.colors.infoSoft,
              },
            ]}
          >
            <Ionicons
              name="ribbon-outline"
              size={13}
              color={theme.colors.info}
            />
            <Text
              style={[
                styles.smallBadgeText,
                { color: theme.colors.info },
              ]}
            >
              {driver.driver_level || "Bronze"}
            </Text>
          </View>

          {activeTrip ? (
            <View
              style={[
                styles.smallBadge,
                {
                  backgroundColor: theme.colors.warningSoft,
                },
              ]}
            >
              <Ionicons
                name="navigate-outline"
                size={13}
                color={theme.colors.warning}
              />
              <Text
                style={[
                  styles.smallBadgeText,
                  { color: theme.colors.warning },
                ]}
              >
                Trip #{activeTrip.id}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.operationsGrid,
            { borderTopColor: theme.colors.divider },
          ]}
        >
          <View style={styles.operationItem}>
            <Ionicons
              name="checkmark-done-outline"
              size={18}
              color={theme.colors.success}
            />
            <Text
              style={[
                styles.operationValue,
                { color: theme.colors.text },
              ]}
            >
              {completed.length}
            </Text>
            <Text
              style={[
                styles.operationLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              Completed
            </Text>
          </View>

          <View style={styles.operationItem}>
            <Ionicons
              name="cash-outline"
              size={18}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.operationValueSmall,
                { color: theme.colors.text },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {money(weeklyEarnings(driver))}
            </Text>
            <Text
              style={[
                styles.operationLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              This Week
            </Text>
          </View>

          <View style={styles.operationItem}>
            <Ionicons
              name="wallet-outline"
              size={18}
              color={theme.colors.warning}
            />
            <Text
              style={[
                styles.operationValueSmall,
                { color: theme.colors.text },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {money(pendingPayout(driver))}
            </Text>
            <Text
              style={[
                styles.operationLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              Pending
            </Text>
          </View>

          <View style={styles.operationItem}>
            <Ionicons
              name="warning-outline"
              size={18}
              color={
                driverAlerts.filter(isOpenAlert).length > 0
                  ? theme.colors.danger
                  : theme.colors.success
              }
            />
            <Text
              style={[
                styles.operationValue,
                { color: theme.colors.text },
              ]}
            >
              {driverAlerts.filter(isOpenAlert).length}
            </Text>
            <Text
              style={[
                styles.operationLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              Alerts
            </Text>
          </View>
        </View>

        <View style={styles.vehicleBlock}>
          <View
            style={[
              styles.vehicleIcon,
              {
                backgroundColor: theme.colors.infoSoft,
              },
            ]}
          >
            <Ionicons
              name="car-sport-outline"
              size={22}
              color={theme.colors.info}
            />
          </View>

          <View style={styles.vehicleTextArea}>
            <Text
              style={[
                styles.vehicleTitle,
                { color: theme.colors.text },
              ]}
            >
              {[
                driver.vehicle_year,
                driver.vehicle_make,
                driver.vehicle_model,
              ]
                .filter(Boolean)
                .join(" ") || "Vehicle details not provided"}
            </Text>

            <Text
              style={[
                styles.vehicleMeta,
                { color: theme.colors.textMuted },
              ]}
            >
              Plate: {driver.plate_number || driver.license_plate || "Not provided"}
            </Text>
          </View>
        </View>

        <View style={styles.locationBlock}>
          <Ionicons
            name="location-outline"
            size={18}
            color={theme.colors.success}
          />
          <Text
            style={[
              styles.locationText,
              { color: theme.colors.textSecondary },
            ]}
            numberOfLines={2}
          >
            {location
              ? `${Number(location.latitude || 0).toFixed(
                  4
                )}, ${Number(location.longitude || 0).toFixed(
                  4
                )}`
              : "Live location unavailable"}
          </Text>
        </View>

        <View style={styles.contactActions}>
          <TouchableOpacity
            style={styles.contactAction}
            onPress={() => callDriver(driver)}
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
              Call
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactAction}
            onPress={() => smsDriver(driver)}
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
              SMS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactAction}
            onPress={() => whatsappDriver(driver)}
          >
            <Ionicons
              name="logo-whatsapp"
              size={20}
              color={theme.colors.success}
            />
            <Text
              style={[
                styles.contactActionText,
                { color: theme.colors.textMuted },
              ]}
            >
              WhatsApp
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactAction}
            onPress={() => {
              setSelectedDriver(driver);
              setDetailsVisible(true);
            }}
          >
            <Ionicons
              name="document-text-outline"
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
          {status !== "approved" ? (
            <TouchableOpacity
              style={[
                styles.managementButton,
                {
                  backgroundColor: theme.colors.successSoft,
                  borderColor: theme.colors.success,
                },
              ]}
              onPress={() => approveDriver(driver)}
              disabled={updating}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={17}
                color={theme.colors.success}
              />
              <Text
                style={[
                  styles.managementButtonText,
                  { color: theme.colors.success },
                ]}
              >
                Approve
              </Text>
            </TouchableOpacity>
          ) : null}

          {status === "suspended" ? (
            <TouchableOpacity
              style={[
                styles.managementButton,
                {
                  backgroundColor: theme.colors.successSoft,
                  borderColor: theme.colors.success,
                },
              ]}
              onPress={() => reactivateDriver(driver)}
              disabled={updating}
            >
              <Ionicons
                name="refresh-circle-outline"
                size={17}
                color={theme.colors.success}
              />
              <Text
                style={[
                  styles.managementButtonText,
                  { color: theme.colors.success },
                ]}
              >
                Reactivate
              </Text>
            </TouchableOpacity>
          ) : null}

          {status === "approved" ? (
            <TouchableOpacity
              style={[
                styles.managementButton,
                {
                  backgroundColor: theme.colors.warningSoft,
                  borderColor: theme.colors.warning,
                },
              ]}
              onPress={() => suspendDriver(driver)}
              disabled={updating}
            >
              <Ionicons
                name="pause-circle-outline"
                size={17}
                color={theme.colors.warning}
              />
              <Text
                style={[
                  styles.managementButtonText,
                  { color: theme.colors.warning },
                ]}
              >
                Suspend
              </Text>
            </TouchableOpacity>
          ) : null}

          {status !== "rejected" ? (
            <TouchableOpacity
              style={[
                styles.managementButton,
                {
                  backgroundColor: theme.colors.dangerSoft,
                  borderColor: theme.colors.danger,
                },
              ]}
              onPress={() => rejectDriver(driver)}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.danger}
                />
              ) : (
                <>
                  <Ionicons
                    name="close-circle-outline"
                    size={17}
                    color={theme.colors.danger}
                  />
                  <Text
                    style={[
                      styles.managementButtonText,
                      { color: theme.colors.danger },
                    ]}
                  >
                    Reject
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>

        {support.filter(isOpenAlert).length > 0 ? (
          <View
            style={[
              styles.supportBanner,
              {
                backgroundColor: theme.colors.warningSoft,
                borderColor: theme.colors.warning,
              },
            ]}
          >
            <Ionicons
              name="headset-outline"
              size={19}
              color={theme.colors.warning}
            />
            <Text
              style={[
                styles.supportBannerText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {support.filter(isOpenAlert).length} open support
              message
              {support.filter(isOpenAlert).length === 1 ? "" : "s"}
            </Text>
          </View>
        ) : null}
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
          Loading Driver Operations Center...
        </Text>
      </View>
    );
  }

  const filters: {
    key: DriverFilter;
    label: string;
    count: number;
  }[] = [
    { key: "all", label: "All", count: drivers.length },
    {
      key: "pending",
      label: "Pending",
      count: summary.pending.length,
    },
    {
      key: "approved",
      label: "Approved",
      count: summary.approved.length,
    },
    {
      key: "online",
      label: "Online",
      count: summary.online.length,
    },
    {
      key: "active",
      label: "Active Trip",
      count: summary.active.length,
    },
    {
      key: "suspended",
      label: "Suspended",
      count: summary.suspended.length,
    },
    {
      key: "rejected",
      label: "Rejected",
      count: summary.rejected.length,
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
                await loadDriverData(false);
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
                Driver Operations Center
              </Text>

              <Text
                style={[
                  styles.pageSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                Approve, monitor, contact, protect, and manage
                every Angel Express driver.
              </Text>
            </View>
          </View>

          <View style={styles.metricGrid}>
            <MetricCard
              label="Total Drivers"
              value={drivers.length}
              icon="people-outline"
              tone="gold"
            />
            <MetricCard
              label="Online"
              value={summary.online.length}
              icon="radio-outline"
              tone="success"
            />
            <MetricCard
              label="Active Trips"
              value={summary.active.length}
              icon="navigate-outline"
              tone="info"
            />
            <MetricCard
              label="Pending Approval"
              value={summary.pending.length}
              icon="time-outline"
              tone="warning"
            />
            <MetricCard
              label="Approved"
              value={summary.approved.length}
              icon="shield-checkmark-outline"
              tone="success"
            />
            <MetricCard
              label="Suspended"
              value={summary.suspended.length}
              icon="pause-circle-outline"
              tone="danger"
            />
            <MetricCard
              label="Safety Alerts"
              value={summary.openAlerts.length}
              icon="warning-outline"
              tone={
                summary.openAlerts.length > 0
                  ? "danger"
                  : "success"
              }
            />
            <MetricCard
              label="Rejected"
              value={summary.rejected.length}
              icon="close-circle-outline"
              tone="danger"
            />
          </View>

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
                placeholder="Search driver, phone, email, vehicle, or plate"
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

          <View
            style={[
              styles.inviteCard,
              {
                backgroundColor: theme.colors.goldTransparent,
                borderColor: theme.colors.cardBorderStrong,
              },
            ]}
          >
            <View style={styles.inviteTopRow}>
              <View
                style={[
                  styles.inviteIcon,
                  {
                    backgroundColor: theme.colors.goldTransparent,
                  },
                ]}
              >
                <Ionicons
                  name="person-add-outline"
                  size={24}
                  color={theme.colors.gold}
                />
              </View>

              <View style={styles.inviteTextArea}>
                <Text
                  style={[
                    styles.inviteTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  Invite a New Driver
                </Text>
                <Text
                  style={[
                    styles.inviteText,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Share the chauffeur signup link. New applications
                  will appear in the pending approval queue.
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.signupLinkBox,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <Ionicons
                name="link-outline"
                size={18}
                color={theme.colors.gold}
              />
              <Text
                style={[
                  styles.signupLinkText,
                  { color: theme.colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {DRIVER_SIGNUP_LINK}
              </Text>
            </View>

            <View style={styles.inviteActions}>
              <TouchableOpacity
                style={[
                  styles.inviteActionButton,
                  {
                    backgroundColor: theme.colors.gold,
                  },
                ]}
                onPress={copyDriverSignupLink}
              >
                <Ionicons
                  name="copy-outline"
                  size={17}
                  color={theme.colors.textInverse}
                />
                <Text
                  style={[
                    styles.inviteActionText,
                    { color: theme.colors.textInverse },
                  ]}
                >
                  Copy Link
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.inviteActionButton,
                  {
                    backgroundColor: theme.colors.infoSoft,
                    borderColor: theme.colors.info,
                    borderWidth: 1,
                  },
                ]}
                onPress={shareDriverSignupLink}
              >
                <Ionicons
                  name="share-social-outline"
                  size={17}
                  color={theme.colors.info}
                />
                <Text
                  style={[
                    styles.inviteActionText,
                    { color: theme.colors.info },
                  ]}
                >
                  Share Link
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.resultsHeader}>
            <View>
              <Text
                style={[
                  styles.resultsTitle,
                  { color: theme.colors.text },
                ]}
              >
                {filters.find((item) => item.key === filter)?.label} Drivers
              </Text>

              <Text
                style={[
                  styles.resultsSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                {filteredDrivers.length} result
                {filteredDrivers.length === 1 ? "" : "s"}
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
              onPress={() => loadDriverData(false)}
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

          {filteredDrivers.length === 0 ? (
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
                name="car-sport-outline"
                size={34}
                color={theme.colors.gold}
              />
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.text },
                ]}
              >
                No matching drivers
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textMuted },
                ]}
              >
                Adjust your search or choose another filter.
              </Text>
            </View>
          ) : (
            <View style={styles.driverGrid}>
              {filteredDrivers.map((driver) => (
                <DriverCard key={driver.id} driver={driver} />
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
                    DRIVER PROFILE
                  </Text>

                  <Text
                    style={[
                      styles.modalTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    {selectedDriver
                      ? driverName(selectedDriver)
                      : "Driver Details"}
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

              {selectedDriver ? (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.detailsContent}
                >
                  <Text
                    style={[
                      styles.detailsSectionTitle,
                      { color: theme.colors.gold },
                    ]}
                  >
                    DRIVER SUMMARY
                  </Text>

                  {[
                    ["Email", selectedDriver.email || "Not provided"],
                    ["Phone", driverPhone(selectedDriver) || "Not provided"],
                    ["Status", selectedDriver.status || "Unknown"],
                    [
                      "Online",
                      isDriverOnline(selectedDriver) ? "Yes" : "No",
                    ],
                    [
                      "Rating",
                      Number(selectedDriver.rating || 5).toFixed(1),
                    ],
                    [
                      "Driver Level",
                      selectedDriver.driver_level || "Bronze",
                    ],
                    [
                      "Completed Trips",
                      String(getCompletedTrips(selectedDriver).length),
                    ],
                    [
                      "Lifetime Earnings",
                      money(lifetimeEarnings(selectedDriver)),
                    ],
                    [
                      "Pending Payout",
                      money(pendingPayout(selectedDriver)),
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

                  <Text
                    style={[
                      styles.detailsSectionTitle,
                      { color: theme.colors.gold },
                    ]}
                  >
                    VEHICLE
                  </Text>

                  {[
                    [
                      "Vehicle",
                      [
                        selectedDriver.vehicle_year,
                        selectedDriver.vehicle_make,
                        selectedDriver.vehicle_model,
                      ]
                        .filter(Boolean)
                        .join(" ") || "Not provided",
                    ],
                    [
                      "License Plate",
                      selectedDriver.plate_number ||
                        selectedDriver.license_plate ||
                        "Not provided",
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

                  <Text
                    style={[
                      styles.detailsSectionTitle,
                      { color: theme.colors.gold },
                    ]}
                  >
                    DOCUMENTS
                  </Text>

                  {[
                    [
                      "Driver License",
                      selectedDriver.driver_license_url
                        ? "Uploaded"
                        : "Not uploaded",
                    ],
                    [
                      "Insurance",
                      selectedDriver.insurance_url
                        ? "Uploaded"
                        : "Not uploaded",
                    ],
                    [
                      "Vehicle Registration",
                      selectedDriver.vehicle_registration_url
                        ? "Uploaded"
                        : "Not uploaded",
                    ],
                    [
                      "Profile Photo",
                      selectedDriver.profile_photo_url
                        ? "Uploaded"
                        : "Not uploaded",
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
                          {
                            color:
                              value === "Uploaded"
                                ? theme.colors.success
                                : theme.colors.warning,
                          },
                        ]}
                      >
                        {value}
                      </Text>
                    </View>
                  ))}

                  <Text
                    style={[
                      styles.detailsSectionTitle,
                      { color: theme.colors.gold },
                    ]}
                  >
                    SAFETY & SUPPORT
                  </Text>

                  {[
                    [
                      "Emergency Alerts",
                      String(getDriverAlerts(selectedDriver).length),
                    ],
                    [
                      "Open Alerts",
                      String(
                        getDriverAlerts(selectedDriver).filter(isOpenAlert)
                          .length
                      ),
                    ],
                    [
                      "Support Messages",
                      String(getDriverSupport(selectedDriver).length),
                    ],
                    [
                      "Complaints",
                      String(selectedDriver.complaints_count || 0),
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
  pageTitle: { fontSize: 29, fontWeight: "900" },
  pageSubtitle: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 700,
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
  metricValue: { fontSize: 27, fontWeight: "900" },
  metricLabel: {
    marginTop: 5,
    fontSize: 11.5,
    fontWeight: "700",
  },

  searchPanel: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
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
  filterChipText: { fontSize: 11, fontWeight: "800" },

  inviteCard: {
    borderWidth: 1,
    borderRadius: 21,
    padding: 16,
    marginBottom: 26,
  },

  inviteTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  inviteIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  inviteTextArea: {
    flex: 1,
    paddingRight: 10,
  },
  inviteTitle: { fontSize: 15, fontWeight: "900" },
  inviteText: {
    marginTop: 5,
    fontSize: 11.5,
    lineHeight: 17,
  },

  signupLinkBox: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 13,
    marginTop: 15,
  },

  signupLinkText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    fontWeight: "700",
  },

  inviteActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  inviteActionButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },

  inviteActionText: {
    marginLeft: 7,
    fontSize: 11,
    fontWeight: "900",
  },

  resultsHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  resultsTitle: { fontSize: 22, fontWeight: "900" },
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

  driverGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  driverCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  driverHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 23, fontWeight: "900" },
  onlineIndicator: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 15,
    height: 15,
    borderRadius: 999,
    borderWidth: 3,
  },
  driverTitleArea: {
    flex: 1,
    paddingRight: 8,
  },
  driverName: { fontSize: 16, fontWeight: "900" },
  driverContact: {
    marginTop: 3,
    fontSize: 9.5,
    fontWeight: "600",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    textTransform: "capitalize",
  },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 16,
  },
  smallBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  smallBadgeText: {
    marginLeft: 4,
    fontSize: 8.5,
    fontWeight: "900",
  },

  operationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    marginTop: 18,
    paddingTop: 16,
  },
  operationItem: {
    width: "25%",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  operationValue: {
    marginTop: 7,
    fontSize: 19,
    fontWeight: "900",
  },
  operationValueSmall: {
    marginTop: 7,
    fontSize: 13,
    fontWeight: "900",
  },
  operationLabel: {
    marginTop: 4,
    fontSize: 8.5,
    fontWeight: "700",
    textAlign: "center",
  },

  vehicleBlock: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },
  vehicleIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vehicleTextArea: { flex: 1 },
  vehicleTitle: { fontSize: 13, fontWeight: "900" },
  vehicleMeta: {
    marginTop: 4,
    fontSize: 10.5,
    fontWeight: "600",
  },

  locationBlock: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  locationText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    lineHeight: 16,
  },

  contactActions: {
    flexDirection: "row",
    marginTop: 18,
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
  managementButtonText: {
    marginLeft: 6,
    fontSize: 10.5,
    fontWeight: "900",
  },

  supportBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  supportBannerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    fontWeight: "700",
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
    maxHeight: "88%",
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
  detailsSectionTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
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
