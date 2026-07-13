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

type EmergencyAlert = GenericRecord & {
  id: string;
  created_at?: string | null;
  booking_id?: string | number | null;
  driver_id?: string | null;
  passenger_id?: string | null;
  alert_type?: string | null;
  notes?: string | null;
  resolved?: boolean | null;
  status?: string | null;
  severity?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  alert_source?: string | null;
};

type BookingRecord = GenericRecord & {
  id: string | number;
  status?: string | null;
  name?: string | null;
  passenger_name?: string | null;
  email?: string | null;
  phone?: string | null;
  passenger_phone?: string | null;
  driver_id?: string | null;
  assigned_driver_id?: string | null;
  driver_name?: string | null;
  assigned_driver_name?: string | null;
  driver_phone?: string | null;
  assigned_driver_phone?: string | null;
  pickup?: string | null;
  pickup_address?: string | null;
  pickup_location?: string | null;
  dropoff?: string | null;
  dropoff_address?: string | null;
  dropoff_location?: string | null;
};

type DriverRecord = GenericRecord & {
  id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  plate_number?: string | null;
};

type LiveLocation = GenericRecord & {
  id: string;
  driver_id?: string | null;
  booking_id?: string | number | null;
  latitude?: number | null;
  longitude?: number | null;
  speed_mph?: number | string | null;
  emergency_status?: string | null;
  emergency_message?: string | null;
  last_updated?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  passenger_name?: string | null;
  passenger_phone?: string | null;
  trip_phase?: string | null;
  eta_minutes?: number | string | null;
  distance_to_target_miles?: number | string | null;
};

type SafetyFilter =
  | "all"
  | "active"
  | "critical"
  | "driver"
  | "passenger"
  | "owner"
  | "investigating"
  | "resolved"
  | "family";

type Tone = "gold" | "success" | "warning" | "danger" | "info";

function normalize(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

function isResolved(alert: EmergencyAlert) {
  return (
    alert.resolved === true ||
    ["resolved", "closed", "dismissed"].includes(
      normalize(alert.status)
    )
  );
}

function alertSeverity(alert: EmergencyAlert) {
  const explicit = normalize(alert.severity);

  if (["critical", "high", "medium", "low"].includes(explicit)) {
    return explicit;
  }

  const combined = normalize(
    `${alert.alert_type || ""} ${alert.notes || ""}`
  );

  if (
    combined.includes("sos") ||
    combined.includes("crash") ||
    combined.includes("accident") ||
    combined.includes("police") ||
    combined.includes("medical")
  ) {
    return "critical";
  }

  if (
    combined.includes("intervention") ||
    combined.includes("emergency") ||
    combined.includes("unsafe")
  ) {
    return "high";
  }

  return "medium";
}

function alertSource(alert: EmergencyAlert) {
  const source = normalize(
    alert.alert_source || alert.alert_type
  );

  if (source.includes("driver")) return "Driver";
  if (source.includes("passenger")) return "Passenger";
  if (source.includes("owner")) return "Owner";
  if (source.includes("family")) return "Family";

  return "System";
}

function bookingPassengerName(
  booking?: BookingRecord,
  location?: LiveLocation
) {
  return (
    location?.passenger_name ||
    booking?.passenger_name ||
    booking?.name ||
    booking?.email ||
    "Passenger"
  );
}

function bookingPassengerPhone(
  booking?: BookingRecord,
  location?: LiveLocation
) {
  return (
    location?.passenger_phone ||
    booking?.passenger_phone ||
    booking?.phone ||
    ""
  );
}

function bookingDriverName(
  booking?: BookingRecord,
  driver?: DriverRecord,
  location?: LiveLocation
) {
  if (location?.driver_name) return location.driver_name;

  if (booking?.assigned_driver_name) {
    return booking.assigned_driver_name;
  }

  if (booking?.driver_name) return booking.driver_name;

  if (driver) {
    return (
      `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
      driver.full_name ||
      "Driver"
    );
  }

  return "Driver";
}

function bookingDriverPhone(
  booking?: BookingRecord,
  driver?: DriverRecord,
  location?: LiveLocation
) {
  return (
    location?.driver_phone ||
    booking?.assigned_driver_phone ||
    booking?.driver_phone ||
    driver?.phone ||
    ""
  );
}

function bookingPickup(booking?: BookingRecord) {
  return (
    booking?.pickup_address ||
    booking?.pickup ||
    booking?.pickup_location ||
    "Pickup not available"
  );
}

function bookingDropoff(booking?: BookingRecord) {
  return (
    booking?.dropoff_address ||
    booking?.dropoff ||
    booking?.dropoff_location ||
    "Drop-off not available"
  );
}

function cleanPhone(value?: string | null) {
  return String(value || "").replace(/[^\d+]/g, "");
}

export default function EmergencyCenterScreen() {
  const { theme, isDark } = useOwnerTheme();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingAlertId, setUpdatingAlertId] =
    useState<string | null>(null);

  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [bookings, setBookings] =
    useState<BookingRecord[]>([]);
  const [drivers, setDrivers] =
    useState<DriverRecord[]>([]);
  const [locations, setLocations] =
    useState<LiveLocation[]>([]);
  const [familyCheckins, setFamilyCheckins] =
    useState<GenericRecord[]>([]);

  const [query, setQuery] = useState("");
  const [filter, setFilter] =
    useState<SafetyFilter>("all");

  const [detailsVisible, setDetailsVisible] =
    useState(false);
  const [selectedAlert, setSelectedAlert] =
    useState<EmergencyAlert | null>(null);

  const isTablet = width >= 700;
  const isLarge = width >= 1050;

  useFocusEffect(
    useCallback(() => {
      loadSafetyData();

      const interval = setInterval(() => {
        loadSafetyData(false);
      }, 8000);

      return () => clearInterval(interval);
    }, [])
  );

  useEffect(() => {
    const channel = supabase
      .channel("owner-safety-command-center")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_alerts",
        },
        () => loadSafetyData(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_live_locations",
        },
        () => loadSafetyData(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => loadSafetyData(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "family_checkins",
        },
        () => loadSafetyData(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadSafetyData(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const [
        alertsResponse,
        bookingsResponse,
        driversResponse,
        locationsResponse,
        familyResponse,
      ] = await Promise.all([
        supabase
          .from("emergency_alerts")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase.from("bookings").select("*"),

        supabase.from("drivers").select("*"),

        supabase
          .from("driver_live_locations")
          .select("*")
          .order("last_updated", { ascending: false }),

        supabase
          .from("family_checkins")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (alertsResponse.error) throw alertsResponse.error;
      if (bookingsResponse.error) throw bookingsResponse.error;
      if (driversResponse.error) throw driversResponse.error;
      if (locationsResponse.error) throw locationsResponse.error;

      setAlerts(alertsResponse.data || []);
      setBookings(bookingsResponse.data || []);
      setDrivers(driversResponse.data || []);
      setLocations(locationsResponse.data || []);
      setFamilyCheckins(familyResponse.data || []);
    } catch (error: any) {
      Alert.alert(
        "Safety Command Center Error",
        error?.message || "Unable to load safety operations."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function bookingFor(alert: EmergencyAlert) {
    return bookings.find(
      (booking) =>
        String(booking.id) === String(alert.booking_id || "")
    );
  }

  function driverFor(alert: EmergencyAlert) {
    const booking = bookingFor(alert);
    const driverId =
      alert.driver_id ||
      booking?.driver_id ||
      booking?.assigned_driver_id;

    return drivers.find(
      (driver) => String(driver.id) === String(driverId || "")
    );
  }

  function locationFor(alert: EmergencyAlert) {
    return locations.find(
      (location) =>
        String(location.booking_id || "") ===
          String(alert.booking_id || "") ||
        String(location.driver_id || "") ===
          String(alert.driver_id || "")
    );
  }

  function relatedFamilyCheckins(alert: EmergencyAlert) {
    const booking = bookingFor(alert);

    return familyCheckins.filter((checkin) => {
      return (
        String(checkin.booking_id || "") ===
          String(alert.booking_id || "") ||
        String(checkin.passenger_id || "") ===
          String(booking?.passenger_id || booking?.user_id || "")
      );
    });
  }

  async function updateAlertSafely(
    alert: EmergencyAlert,
    candidates: GenericRecord[],
    successMessage: string
  ) {
    try {
      setUpdatingAlertId(alert.id);

      let lastError: any = null;
      let applied: GenericRecord | null = null;

      for (const candidate of candidates) {
        const { error } = await supabase
          .from("emergency_alerts")
          .update(candidate)
          .eq("id", alert.id);

        if (!error) {
          applied = candidate;
          lastError = null;
          break;
        }

        lastError = error;
      }

      if (lastError || !applied) {
        throw lastError || new Error("Unable to update alert.");
      }

      setAlerts((current) =>
        current.map((item) =>
          item.id === alert.id ? { ...item, ...applied } : item
        )
      );

      Alert.alert("Success", successMessage);
    } catch (error: any) {
      Alert.alert(
        "Update Failed",
        error?.message || "Unable to update this alert."
      );
    } finally {
      setUpdatingAlertId(null);
    }
  }

  function markInvestigating(alert: EmergencyAlert) {
    updateAlertSafely(
      alert,
      [
        { status: "investigating" },
        { resolved: false },
      ],
      "Alert marked as investigating."
    );
  }

  function markResolved(alert: EmergencyAlert) {
    Alert.alert(
      "Resolve Alert",
      "Confirm that this incident has been resolved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Resolve",
          onPress: () =>
            updateAlertSafely(
              alert,
              [
                {
                  resolved: true,
                  status: "resolved",
                  resolved_at: new Date().toISOString(),
                },
                {
                  resolved: true,
                  status: "resolved",
                },
                {
                  resolved: true,
                },
              ],
              "Emergency alert resolved."
            ),
        },
      ]
    );
  }

  function reopenAlert(alert: EmergencyAlert) {
    updateAlertSafely(
      alert,
      [
        {
          resolved: false,
          status: "active",
        },
        {
          resolved: false,
        },
      ],
      "Emergency alert reopened."
    );
  }

  function callNumber(phone?: string | null) {
    const cleaned = cleanPhone(phone);

    if (!cleaned) {
      Alert.alert(
        "Phone unavailable",
        "Phone number is not available."
      );
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
      Alert.alert(
        "Phone unavailable",
        "Phone number is not available."
      );
      return;
    }

    Linking.openURL(
      `sms:${cleaned}?body=${encodeURIComponent(message)}`
    );
  }

  function callEmergencyServices() {
    Alert.alert(
      "Call Emergency Services",
      "This will call 911. Continue only for a real emergency.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Call 911",
          style: "destructive",
          onPress: () => Linking.openURL("tel:911"),
        },
      ]
    );
  }

  function openLiveMap(alert: EmergencyAlert) {
    if (!alert.booking_id) {
      Alert.alert(
        "Trip unavailable",
        "This alert is not linked to a booking."
      );
      return;
    }

    router.push({
      pathname: "/live-map" as any,
      params: {
        bookingId: String(alert.booking_id),
      },
    });
  }

  const summary = useMemo(() => {
    const active = alerts.filter((alert) => !isResolved(alert));
    const resolved = alerts.filter(isResolved);
    const critical = active.filter(
      (alert) => alertSeverity(alert) === "critical"
    );
    const investigating = active.filter(
      (alert) =>
        normalize(alert.status) === "investigating"
    );
    const driverAlerts = alerts.filter(
      (alert) => alertSource(alert) === "Driver"
    );
    const passengerAlerts = alerts.filter(
      (alert) => alertSource(alert) === "Passenger"
    );
    const ownerAlerts = alerts.filter(
      (alert) => alertSource(alert) === "Owner"
    );
    const familyAlerts = alerts.filter(
      (alert) => alertSource(alert) === "Family"
    );

    return {
      active,
      resolved,
      critical,
      investigating,
      driverAlerts,
      passengerAlerts,
      ownerAlerts,
      familyAlerts,
    };
  }, [alerts]);

  function matchesFilter(alert: EmergencyAlert) {
    switch (filter) {
      case "active":
        return !isResolved(alert);
      case "critical":
        return (
          !isResolved(alert) &&
          alertSeverity(alert) === "critical"
        );
      case "driver":
        return alertSource(alert) === "Driver";
      case "passenger":
        return alertSource(alert) === "Passenger";
      case "owner":
        return alertSource(alert) === "Owner";
      case "investigating":
        return normalize(alert.status) === "investigating";
      case "resolved":
        return isResolved(alert);
      case "family":
        return alertSource(alert) === "Family";
      case "all":
      default:
        return true;
    }
  }

  const filteredAlerts = useMemo(() => {
    const search = query.trim().toLowerCase();

    return alerts.filter((alert) => {
      if (!matchesFilter(alert)) return false;

      if (!search) return true;

      const booking = bookingFor(alert);
      const driver = driverFor(alert);
      const location = locationFor(alert);

      return [
        alert.id,
        alert.booking_id,
        alert.alert_type,
        alert.notes,
        alert.status,
        alert.severity,
        alertSource(alert),
        bookingPassengerName(booking, location),
        bookingDriverName(booking, driver, location),
        bookingPickup(booking),
        bookingDropoff(booking),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [alerts, bookings, drivers, locations, filter, query]);

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

  function AlertCard({ alert }: { alert: EmergencyAlert }) {
    const booking = bookingFor(alert);
    const driver = driverFor(alert);
    const location = locationFor(alert);
    const severity = alertSeverity(alert);
    const resolved = isResolved(alert);
    const source = alertSource(alert);
    const checkins = relatedFamilyCheckins(alert);
    const updating = updatingAlertId === alert.id;

    const severityTone: Tone =
      severity === "critical"
        ? "danger"
        : severity === "high"
          ? "warning"
          : "info";

    const colors = toneColors(
      resolved ? "success" : severityTone
    );

    return (
      <View
        style={[
          styles.alertCard,
          {
            width: cardWidth(),
            backgroundColor: theme.colors.card,
            borderColor: resolved
              ? theme.colors.success
              : colors.color,
          },
          theme.shadows.soft,
        ]}
      >
        <View style={styles.alertHeader}>
          <View
            style={[
              styles.alertIcon,
              { backgroundColor: colors.background },
            ]}
          >
            <Ionicons
              name={
                resolved
                  ? "checkmark-circle-outline"
                  : "warning-outline"
              }
              size={23}
              color={colors.color}
            />
          </View>

          <View style={styles.alertTitleArea}>
            <Text
              style={[
                styles.alertTitle,
                { color: theme.colors.text },
              ]}
              numberOfLines={1}
            >
              {alert.alert_type || "Emergency Alert"}
            </Text>

            <Text
              style={[
                styles.alertSubtitle,
                { color: theme.colors.textMuted },
              ]}
            >
              Trip #{alert.booking_id || "Unknown"}
            </Text>
          </View>

          <View style={styles.headerBadges}>
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.background },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: colors.color },
                ]}
              >
                {resolved ? "Resolved" : severity}
              </Text>
            </View>

            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    theme.colors.goldTransparent,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: theme.colors.gold },
                ]}
              >
                {source}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.routeBlock}>
          <Ionicons
            name="location-outline"
            size={18}
            color={theme.colors.info}
          />
          <Text
            style={[
              styles.routeText,
              { color: theme.colors.textSecondary },
            ]}
            numberOfLines={2}
          >
            {bookingPickup(booking)} → {bookingDropoff(booking)}
          </Text>
        </View>

        <View
          style={[
            styles.peopleGrid,
            { borderTopColor: theme.colors.divider },
          ]}
        >
          <View style={styles.personBlock}>
            <Text
              style={[
                styles.personLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              DRIVER
            </Text>
            <Text
              style={[
                styles.personName,
                { color: theme.colors.text },
              ]}
              numberOfLines={1}
            >
              {bookingDriverName(booking, driver, location)}
            </Text>
            <Text
              style={[
                styles.personPhone,
                { color: theme.colors.textMuted },
              ]}
            >
              {bookingDriverPhone(
                booking,
                driver,
                location
              ) || "Phone unavailable"}
            </Text>
          </View>

          <View style={styles.personBlock}>
            <Text
              style={[
                styles.personLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              PASSENGER
            </Text>
            <Text
              style={[
                styles.personName,
                { color: theme.colors.text },
              ]}
              numberOfLines={1}
            >
              {bookingPassengerName(booking, location)}
            </Text>
            <Text
              style={[
                styles.personPhone,
                { color: theme.colors.textMuted },
              ]}
            >
              {bookingPassengerPhone(booking, location) ||
                "Phone unavailable"}
            </Text>
          </View>
        </View>

        <View style={styles.notesBlock}>
          <Text
            style={[
              styles.notesLabel,
              { color: theme.colors.textMuted },
            ]}
          >
            INCIDENT NOTES
          </Text>
          <Text
            style={[
              styles.notesText,
              { color: theme.colors.textSecondary },
            ]}
          >
            {alert.notes || "No incident notes provided."}
          </Text>
        </View>

        <View style={styles.liveGrid}>
          <View style={styles.liveMetric}>
            <Ionicons
              name="speedometer-outline"
              size={18}
              color={
                Number(location?.speed_mph || 0) > 85
                  ? theme.colors.danger
                  : theme.colors.success
              }
            />
            <Text
              style={[
                styles.liveValue,
                { color: theme.colors.text },
              ]}
            >
              {Number(location?.speed_mph || 0).toFixed(0)}
            </Text>
            <Text
              style={[
                styles.liveLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              mph
            </Text>
          </View>

          <View style={styles.liveMetric}>
            <Ionicons
              name="time-outline"
              size={18}
              color={theme.colors.info}
            />
            <Text
              style={[
                styles.liveValue,
                { color: theme.colors.text },
              ]}
            >
              {location?.eta_minutes
                ? Number(location.eta_minutes).toFixed(0)
                : "--"}
            </Text>
            <Text
              style={[
                styles.liveLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              ETA min
            </Text>
          </View>

          <View style={styles.liveMetric}>
            <Ionicons
              name="people-outline"
              size={18}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.liveValue,
                { color: theme.colors.text },
              ]}
            >
              {checkins.length}
            </Text>
            <Text
              style={[
                styles.liveLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              Check-ins
            </Text>
          </View>

          <View style={styles.liveMetric}>
            <Ionicons
              name="navigate-outline"
              size={18}
              color={theme.colors.info}
            />
            <Text
              style={[
                styles.liveValue,
                { color: theme.colors.text },
              ]}
            >
              {location?.distance_to_target_miles
                ? Number(
                    location.distance_to_target_miles
                  ).toFixed(1)
                : "--"}
            </Text>
            <Text
              style={[
                styles.liveLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              miles
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.alertTime,
            { color: theme.colors.textMuted },
          ]}
        >
          Created:{" "}
          {alert.created_at
            ? new Date(alert.created_at).toLocaleString()
            : "Unknown"}
        </Text>

        <View style={styles.contactActions}>
          <TouchableOpacity
            style={styles.contactAction}
            onPress={() =>
              callNumber(
                bookingDriverPhone(
                  booking,
                  driver,
                  location
                )
              )
            }
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
              Driver
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactAction}
            onPress={() =>
              callNumber(
                bookingPassengerPhone(booking, location)
              )
            }
          >
            <Ionicons
              name="person-circle-outline"
              size={20}
              color={theme.colors.info}
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
                bookingDriverPhone(
                  booking,
                  driver,
                  location
                ),
                `Angel Express safety team is checking on Trip #${alert.booking_id}.`
              )
            }
          >
            <Ionicons
              name="chatbubble-outline"
              size={20}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.contactActionText,
                { color: theme.colors.textMuted },
              ]}
            >
              Message
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactAction}
            onPress={() => openLiveMap(alert)}
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
            onPress={callEmergencyServices}
          >
            <Ionicons
              name="call"
              size={20}
              color={theme.colors.danger}
            />
            <Text
              style={[
                styles.contactActionText,
                { color: theme.colors.textMuted },
              ]}
            >
              911
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.managementActions,
            { borderTopColor: theme.colors.divider },
          ]}
        >
          {!resolved &&
          normalize(alert.status) !== "investigating" ? (
            <TouchableOpacity
              style={[
                styles.managementButton,
                {
                  backgroundColor:
                    theme.colors.warningSoft,
                  borderColor: theme.colors.warning,
                },
              ]}
              onPress={() => markInvestigating(alert)}
              disabled={updating}
            >
              <Ionicons
                name="search-outline"
                size={17}
                color={theme.colors.warning}
              />
              <Text
                style={[
                  styles.managementText,
                  { color: theme.colors.warning },
                ]}
              >
                Investigate
              </Text>
            </TouchableOpacity>
          ) : null}

          {!resolved ? (
            <TouchableOpacity
              style={[
                styles.managementButton,
                {
                  backgroundColor:
                    theme.colors.successSoft,
                  borderColor: theme.colors.success,
                },
              ]}
              onPress={() => markResolved(alert)}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.success}
                />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={17}
                    color={theme.colors.success}
                  />
                  <Text
                    style={[
                      styles.managementText,
                      { color: theme.colors.success },
                    ]}
                  >
                    Resolve
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.managementButton,
                {
                  backgroundColor:
                    theme.colors.warningSoft,
                  borderColor: theme.colors.warning,
                },
              ]}
              onPress={() => reopenAlert(alert)}
              disabled={updating}
            >
              <Ionicons
                name="refresh-circle-outline"
                size={17}
                color={theme.colors.warning}
              />
              <Text
                style={[
                  styles.managementText,
                  { color: theme.colors.warning },
                ]}
              >
                Reopen
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.managementButton,
              {
                backgroundColor:
                  theme.colors.goldTransparent,
                borderColor: theme.colors.gold,
              },
            ]}
            onPress={() => {
              setSelectedAlert(alert);
              setDetailsVisible(true);
            }}
          >
            <Ionicons
              name="information-circle-outline"
              size={17}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.managementText,
                { color: theme.colors.gold },
              ]}
            >
              Details
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
          color={theme.colors.danger}
        />
        <Text
          style={[
            styles.loadingText,
            { color: theme.colors.textSecondary },
          ]}
        >
          Loading Safety & Emergency Command Center...
        </Text>
      </View>
    );
  }

  const filters: {
    key: SafetyFilter;
    label: string;
    count: number;
  }[] = [
    {
      key: "all",
      label: "All",
      count: alerts.length,
    },
    {
      key: "active",
      label: "Active",
      count: summary.active.length,
    },
    {
      key: "critical",
      label: "Critical",
      count: summary.critical.length,
    },
    {
      key: "investigating",
      label: "Investigating",
      count: summary.investigating.length,
    },
    {
      key: "driver",
      label: "Driver SOS",
      count: summary.driverAlerts.length,
    },
    {
      key: "passenger",
      label: "Passenger SOS",
      count: summary.passengerAlerts.length,
    },
    {
      key: "owner",
      label: "Owner",
      count: summary.ownerAlerts.length,
    },
    {
      key: "family",
      label: "Family",
      count: summary.familyAlerts.length,
    },
    {
      key: "resolved",
      label: "Resolved",
      count: summary.resolved.length,
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
              ? "rgba(3,8,17,0.95)"
              : "rgba(245,247,250,0.97)",
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
                await loadSafetyData(false);
              }}
              tintColor={theme.colors.danger}
              colors={[theme.colors.danger]}
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
                  { color: theme.colors.danger },
                ]}
              >
                ANGEL EXPRESS SAFETY
              </Text>

              <Text
                style={[
                  styles.pageTitle,
                  { color: theme.colors.text },
                ]}
              >
                Safety & Emergency Command Center
              </Text>

              <Text
                style={[
                  styles.pageSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                Monitor SOS alerts, owner interventions, live trip
                safety, family check-ins, incident response, and
                resolution status.
              </Text>
            </View>
          </View>

          <View style={styles.metricGrid}>
            <MetricCard
              label="Active Alerts"
              value={summary.active.length}
              icon="warning-outline"
              tone={
                summary.active.length > 0
                  ? "danger"
                  : "success"
              }
            />

            <MetricCard
              label="Critical"
              value={summary.critical.length}
              icon="alert-circle-outline"
              tone={
                summary.critical.length > 0
                  ? "danger"
                  : "success"
              }
            />

            <MetricCard
              label="Investigating"
              value={summary.investigating.length}
              icon="search-outline"
              tone="warning"
            />

            <MetricCard
              label="Driver SOS"
              value={summary.driverAlerts.length}
              icon="car-outline"
              tone="danger"
            />

            <MetricCard
              label="Passenger SOS"
              value={summary.passengerAlerts.length}
              icon="person-outline"
              tone="danger"
            />

            <MetricCard
              label="Owner Interventions"
              value={summary.ownerAlerts.length}
              icon="shield-outline"
              tone="gold"
            />

            <MetricCard
              label="Family Check-ins"
              value={familyCheckins.length}
              icon="people-outline"
              tone="info"
            />

            <MetricCard
              label="Resolved"
              value={summary.resolved.length}
              icon="checkmark-done-outline"
              tone="success"
            />
          </View>

          <View
            style={[
              styles.emergencyBanner,
              {
                backgroundColor:
                  summary.critical.length > 0
                    ? theme.colors.dangerSoft
                    : theme.colors.successSoft,
                borderColor:
                  summary.critical.length > 0
                    ? theme.colors.danger
                    : theme.colors.success,
              },
            ]}
          >
            <View
              style={[
                styles.emergencyBannerIcon,
                {
                  backgroundColor:
                    summary.critical.length > 0
                      ? theme.colors.dangerSoft
                      : theme.colors.successSoft,
                },
              ]}
            >
              <Ionicons
                name={
                  summary.critical.length > 0
                    ? "warning"
                    : "shield-checkmark-outline"
                }
                size={24}
                color={
                  summary.critical.length > 0
                    ? theme.colors.danger
                    : theme.colors.success
                }
              />
            </View>

            <View style={styles.emergencyBannerTextArea}>
              <Text
                style={[
                  styles.emergencyBannerTitle,
                  { color: theme.colors.text },
                ]}
              >
                {summary.critical.length > 0
                  ? "Critical safety attention required"
                  : "Safety systems operational"}
              </Text>

              <Text
                style={[
                  styles.emergencyBannerText,
                  { color: theme.colors.textMuted },
                ]}
              >
                {summary.critical.length > 0
                  ? `${summary.critical.length} critical incident${
                      summary.critical.length === 1 ? "" : "s"
                    } require immediate review.`
                  : "No critical incidents currently require intervention."}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.call911Button,
                { backgroundColor: theme.colors.danger },
              ]}
              onPress={callEmergencyServices}
            >
              <Ionicons
                name="call"
                size={17}
                color="#ffffff"
              />
              <Text style={styles.call911Text}>911</Text>
            </TouchableOpacity>
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
                  backgroundColor:
                    theme.colors.inputBackground,
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
                placeholder="Search alert, trip, passenger, driver, notes, or route"
                placeholderTextColor={
                  theme.colors.inputPlaceholder
                }
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.searchInput,
                  { color: theme.colors.text },
                ]}
              />

              {query ? (
                <TouchableOpacity
                  onPress={() => setQuery("")}
                >
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
                          ? theme.colors.dangerSoft
                          : theme.colors.surfaceSoft,
                        borderColor: selected
                          ? theme.colors.danger
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
                            ? theme.colors.danger
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
                  filters.find(
                    (item) => item.key === filter
                  )?.label
                }{" "}
                Safety Alerts
              </Text>

              <Text
                style={[
                  styles.resultsSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                {filteredAlerts.length} result
                {filteredAlerts.length === 1 ? "" : "s"}
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
              onPress={() => loadSafetyData(false)}
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

          {filteredAlerts.length === 0 ? (
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
                name="shield-checkmark-outline"
                size={38}
                color={theme.colors.success}
              />

              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.text },
                ]}
              >
                No matching safety alerts
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textMuted },
                ]}
              >
                Driver SOS, passenger SOS, owner interventions, and
                incident alerts will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.alertGrid}>
              {filteredAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </View>
          )}
        </ScrollView>

        <Modal
          visible={detailsVisible}
          transparent
          animationType="slide"
          onRequestClose={() =>
            setDetailsVisible(false)
          }
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.detailsModal,
                {
                  backgroundColor:
                    theme.colors.surfaceElevated,
                  borderColor: theme.colors.cardBorderStrong,
                },
              ]}
            >
              <View
                style={[
                  styles.modalHeader,
                  {
                    borderBottomColor:
                      theme.colors.divider,
                  },
                ]}
              >
                <View style={styles.modalTitleArea}>
                  <Text
                    style={[
                      styles.modalEyebrow,
                      { color: theme.colors.danger },
                    ]}
                  >
                    INCIDENT DETAILS
                  </Text>

                  <Text
                    style={[
                      styles.modalTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    {selectedAlert?.alert_type ||
                      "Emergency Alert"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.modalClose,
                    {
                      backgroundColor:
                        theme.colors.surfaceSoft,
                      borderColor:
                        theme.colors.cardBorder,
                    },
                  ]}
                  onPress={() =>
                    setDetailsVisible(false)
                  }
                >
                  <Ionicons
                    name="close"
                    size={21}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {selectedAlert ? (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={
                    styles.detailsContent
                  }
                >
                  {[
                    [
                      "Alert ID",
                      selectedAlert.id,
                    ],
                    [
                      "Trip",
                      `#${selectedAlert.booking_id || "Unknown"}`,
                    ],
                    [
                      "Source",
                      alertSource(selectedAlert),
                    ],
                    [
                      "Severity",
                      alertSeverity(selectedAlert),
                    ],
                    [
                      "Status",
                      isResolved(selectedAlert)
                        ? "Resolved"
                        : selectedAlert.status || "Active",
                    ],
                    [
                      "Passenger",
                      bookingPassengerName(
                        bookingFor(selectedAlert),
                        locationFor(selectedAlert)
                      ),
                    ],
                    [
                      "Driver",
                      bookingDriverName(
                        bookingFor(selectedAlert),
                        driverFor(selectedAlert),
                        locationFor(selectedAlert)
                      ),
                    ],
                    [
                      "Pickup",
                      bookingPickup(
                        bookingFor(selectedAlert)
                      ),
                    ],
                    [
                      "Drop-off",
                      bookingDropoff(
                        bookingFor(selectedAlert)
                      ),
                    ],
                    [
                      "Notes",
                      selectedAlert.notes ||
                        "No incident notes",
                    ],
                    [
                      "Resolution Notes",
                      selectedAlert.resolution_notes ||
                        "No resolution notes",
                    ],
                    [
                      "Emergency Message",
                      locationFor(selectedAlert)
                        ?.emergency_message ||
                        "No emergency message",
                    ],
                    [
                      "Trip Phase",
                      locationFor(selectedAlert)
                        ?.trip_phase ||
                        bookingFor(selectedAlert)?.status ||
                        "Unknown",
                    ],
                    [
                      "Coordinates",
                      locationFor(selectedAlert)
                        ? `${Number(
                            locationFor(selectedAlert)
                              ?.latitude || 0
                          ).toFixed(6)}, ${Number(
                            locationFor(selectedAlert)
                              ?.longitude || 0
                          ).toFixed(6)}`
                        : "Unavailable",
                    ],
                    [
                      "Created",
                      selectedAlert.created_at
                        ? new Date(
                            selectedAlert.created_at
                          ).toLocaleString()
                        : "Unknown",
                    ],
                    [
                      "Resolved At",
                      selectedAlert.resolved_at
                        ? new Date(
                            selectedAlert.resolved_at
                          ).toLocaleString()
                        : "Not resolved",
                    ],
                  ].map(([label, value]) => (
                    <View
                      key={label}
                      style={[
                        styles.detailsRow,
                        {
                          borderBottomColor:
                            theme.colors.divider,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.detailsLabel,
                          {
                            color:
                              theme.colors.textMuted,
                          },
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

  emergencyBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
  },

  emergencyBannerIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  emergencyBannerTextArea: {
    flex: 1,
    paddingRight: 10,
  },

  emergencyBannerTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  emergencyBannerText: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 17,
  },

  call911Button: {
    minWidth: 70,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingHorizontal: 12,
  },

  call911Text: {
    color: "#ffffff",
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "900",
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

  alertGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  alertCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },

  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  alertIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  alertTitleArea: {
    flex: 1,
    paddingRight: 8,
  },

  alertTitle: {
    fontSize: 16,
    fontWeight: "900",
  },

  alertSubtitle: {
    marginTop: 3,
    fontSize: 10.5,
    fontWeight: "600",
  },

  headerBadges: {
    alignItems: "flex-end",
    gap: 6,
  },

  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  badgeText: {
    fontSize: 8.5,
    fontWeight: "900",
    textTransform: "capitalize",
  },

  routeBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 18,
  },

  routeText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "700",
  },

  peopleGrid: {
    flexDirection: "row",
    borderTopWidth: 1,
    marginTop: 18,
    paddingTop: 15,
  },

  personBlock: {
    width: "50%",
    paddingRight: 10,
  },

  personLabel: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  personName: {
    marginTop: 5,
    fontSize: 12.5,
    fontWeight: "900",
  },

  personPhone: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "600",
  },

  notesBlock: {
    marginTop: 15,
  },

  notesLabel: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  notesText: {
    marginTop: 6,
    fontSize: 11.5,
    lineHeight: 18,
    fontWeight: "600",
  },

  liveGrid: {
    flexDirection: "row",
    marginTop: 18,
  },

  liveMetric: {
    width: "25%",
    alignItems: "center",
  },

  liveValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "900",
  },

  liveLabel: {
    marginTop: 3,
    fontSize: 8.5,
    fontWeight: "700",
  },

  alertTime: {
    marginTop: 15,
    fontSize: 9.5,
    fontWeight: "600",
  },

  contactActions: {
    flexDirection: "row",
    marginTop: 14,
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
    lineHeight: 18,
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

  modalTitleArea: {
    flex: 1,
  },

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
