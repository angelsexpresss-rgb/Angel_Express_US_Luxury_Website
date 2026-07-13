import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import {
  getOwnerBookingStatusStyle,
  useOwnerTheme,
} from "../lib/ownerTheme";
import { supabase } from "../lib/supabase";

type GenericRecord = Record<string, any>;

type BookingRecord = GenericRecord & {
  id: string | number;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
  paid_at?: string | null;
  status?: string | null;
  payment_status?: string | null;
  paid?: boolean | null;
  source?: string | null;
  name?: string | null;
  passenger_name?: string | null;
  full_name?: string | null;
  phone?: string | null;
  passenger_phone?: string | null;
  email?: string | null;
  passenger_email?: string | null;
  phone_number?: string | null;
  customer_phone?: string | null;
  contact_phone?: string | null;
  customer_email?: string | null;
  resolved_name?: string | null;
  resolved_phone?: string | null;
  resolved_email?: string | null;
  pickup?: string | null;
  pickup_location?: string | null;
  pickup_address?: string | null;
  dropoff?: string | null;
  dropoff_location?: string | null;
  dropoff_address?: string | null;
  date?: string | null;
  trip_date?: string | null;
  time?: string | null;
  trip_time?: string | null;
  driver_id?: string | null;
  assigned_driver_id?: string | null;
  driver_name?: string | null;
  assigned_driver_name?: string | null;
  driver_phone?: string | null;
  assigned_driver_phone?: string | null;
  total?: number | string | null;
  total_price?: number | string | null;
  total_fare?: number | string | null;
  price?: number | string | null;
  student_verified?: boolean | null;
  is_student?: boolean | null;
  student_discount?: number | string | null;
};

type DriverRecord = GenericRecord & {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  phone?: string | null;
  driver_phone?: string | null;
  rating?: number | string | null;
  is_online?: boolean | null;
  status?: string | null;
  driver_level?: string | null;
  current_booking_id?: string | null;
};

type BookingFilter =
  | "all"
  | "pending"
  | "assigned"
  | "active"
  | "completed"
  | "cancelled"
  | "website"
  | "app"
  | "student";

type Tone = "gold" | "success" | "warning" | "danger" | "info";

function normalize(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

function looksLikeEmail(value?: string | null) {
  return Boolean(value && value.includes("@"));
}

function getPassengerName(booking: BookingRecord) {
  const candidates = [
    booking.resolved_name,
    booking.passenger_name,
    booking.full_name,
    booking.name,
  ];

  const validName = candidates.find(
    (value) => value && !looksLikeEmail(String(value))
  );

  if (validName) return String(validName);

  return normalize(booking.source).includes("website")
    ? "Website Passenger"
    : "Passenger";
}

function getPassengerPhone(booking: BookingRecord) {
  return (
    booking.resolved_phone ||
    booking.phone ||
    booking.passenger_phone ||
    booking.phone_number ||
    booking.customer_phone ||
    booking.contact_phone ||
    booking.mobile ||
    booking.mobile_number ||
    ""
  );
}

function getPassengerEmail(booking: BookingRecord) {
  return (
    booking.resolved_email ||
    booking.email ||
    booking.passenger_email ||
    booking.customer_email ||
    (looksLikeEmail(booking.name) ? booking.name : "") ||
    ""
  );
}

function getDriverName(driver: DriverRecord) {
  return (
    `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
    driver.full_name ||
    driver.name ||
    "Driver"
  );
}

function getAssignedDriverName(booking: BookingRecord) {
  return (
    booking.assigned_driver_name ||
    booking.driver_name ||
    "Not assigned"
  );
}

function getAssignedDriverPhone(booking: BookingRecord) {
  return (
    booking.assigned_driver_phone ||
    booking.driver_phone ||
    ""
  );
}

function getPickup(booking: BookingRecord) {
  return (
    booking.pickup_address ||
    booking.pickup ||
    booking.pickup_location ||
    "Pickup not set"
  );
}

function getDropoff(booking: BookingRecord) {
  return (
    booking.dropoff_address ||
    booking.dropoff ||
    booking.dropoff_location ||
    "Drop-off not set"
  );
}

function getTripDate(booking: BookingRecord) {
  return booking.date || booking.trip_date || "Not set";
}

function getTripTime(booking: BookingRecord) {
  return booking.time || booking.trip_time || "Not set";
}

function getAmount(booking: BookingRecord) {
  return Number(
    booking.total_fare ??
      booking.total ??
      booking.total_price ??
      booking.price ??
      0
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

function isStudentBooking(booking: BookingRecord) {
  return (
    booking.student_verified === true ||
    booking.is_student === true ||
    Number(booking.student_discount || 0) > 0
  );
}

function isPaid(booking: BookingRecord) {
  return (
    normalize(booking.payment_status) === "paid" ||
    normalize(booking.invoice_status) === "paid"
  );
}

function isPending(booking: BookingRecord) {
  return [
    "pending",
    "pendingconfirmation",
    "scheduled",
  ].includes(normalize(booking.status));
}

function isAssigned(booking: BookingRecord) {
  return [
    "driverassigned",
    "assigned",
    "driveraccepted",
    "accepted",
  ].includes(normalize(booking.status));
}

function isActive(booking: BookingRecord) {
  return [
    "arrivedatpickup",
    "driverarrived",
    "pickedup",
    "inprogress",
    "active",
    "started",
    "arriving",
  ].includes(normalize(booking.status));
}

function isCompleted(booking: BookingRecord) {
  return normalize(booking.status) === "completed";
}

function isCancelled(booking: BookingRecord) {
  return ["cancelled", "canceled"].includes(
    normalize(booking.status)
  );
}

function sourceLabel(booking: BookingRecord) {
  const source = normalize(booking.source);

  if (source.includes("website")) return "Website";
  if (source.includes("app")) return "Passenger App";
  return booking.source || "Angel Express";
}

function matchesFilter(
  booking: BookingRecord,
  filter: BookingFilter
) {
  switch (filter) {
    case "pending":
      return isPending(booking);
    case "assigned":
      return isAssigned(booking);
    case "active":
      return isActive(booking);
    case "completed":
      return isCompleted(booking);
    case "cancelled":
      return isCancelled(booking);
    case "website":
      return normalize(booking.source).includes("website");
    case "app":
      return normalize(booking.source).includes("app");
    case "student":
      return isStudentBooking(booking);
    case "all":
    default:
      return true;
  }
}

export default function BookingManagementScreen() {
  const { theme, isDark } = useOwnerTheme();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] =
    useState<string | number | null>(null);

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [changeRequests, setChangeRequests] =
    useState<GenericRecord[]>([]);

  const [query, setQuery] = useState("");
  const [filter, setFilter] =
    useState<BookingFilter>("all");

  const [assignmentVisible, setAssignmentVisible] =
    useState(false);
  const [selectedBooking, setSelectedBooking] =
    useState<BookingRecord | null>(null);
  const [driverQuery, setDriverQuery] = useState("");

  const [timelineVisible, setTimelineVisible] =
    useState(false);
  const [timelineBooking, setTimelineBooking] =
    useState<BookingRecord | null>(null);

  const isTablet = width >= 700;
  const isLarge = width >= 1050;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    const channel = supabase
      .channel("owner-booking-command-center")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => loadData(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drivers",
        },
        () => loadData(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_change_requests",
        },
        () => loadData(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadData(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const [
        bookingsResponse,
        driversResponse,
        changeRequestsResponse,
        passengersResponse,
        passengerProfilesResponse,
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("drivers")
          .select("*")
          .eq("status", "approved")
          .order("created_at", { ascending: false }),

        supabase
          .from("booking_change_requests")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase.from("passengers").select("*"),

        supabase.from("passenger_profiles").select("*"),
      ]);

      if (bookingsResponse.error) {
        throw bookingsResponse.error;
      }

      if (driversResponse.error) {
        throw driversResponse.error;
      }

      const passengerRows = [
        ...(passengersResponse.data || []),
        ...(passengerProfilesResponse.data || []),
      ];

      const byId = new Map<string, GenericRecord>();
      const byEmail = new Map<string, GenericRecord>();

      passengerRows.forEach((passenger) => {
        [
          passenger.id,
          passenger.user_id,
          passenger.passenger_id,
          passenger.profile_id,
        ]
          .filter(Boolean)
          .forEach((value) =>
            byId.set(String(value), passenger)
          );

        const email = String(
          passenger.email ||
            passenger.passenger_email ||
            passenger.customer_email ||
            ""
        )
          .trim()
          .toLowerCase();

        if (email) byEmail.set(email, passenger);
      });

      const enrichedBookings = (
        bookingsResponse.data || []
      ).map((booking: BookingRecord) => {
        const bookingEmail = String(
          booking.email ||
            booking.passenger_email ||
            booking.customer_email ||
            (looksLikeEmail(booking.name)
              ? booking.name
              : "") ||
            ""
        )
          .trim()
          .toLowerCase();

        const relatedPassenger =
          byId.get(
            String(
              booking.user_id ||
                booking.passenger_id ||
                booking.customer_id ||
                ""
            )
          ) ||
          byEmail.get(bookingEmail);

        const relatedName = relatedPassenger
          ? (
              `${relatedPassenger.first_name || ""} ${
                relatedPassenger.last_name || ""
              }`
            ).trim() ||
            relatedPassenger.full_name ||
            relatedPassenger.name ||
            relatedPassenger.passenger_name
          : "";

        const relatedPhone = relatedPassenger
          ? relatedPassenger.phone ||
            relatedPassenger.phone_number ||
            relatedPassenger.mobile ||
            relatedPassenger.mobile_number ||
            relatedPassenger.passenger_phone ||
            relatedPassenger.emergency_contact_phone
          : "";

        const relatedEmail = relatedPassenger
          ? relatedPassenger.email ||
            relatedPassenger.passenger_email ||
            relatedPassenger.customer_email
          : "";

        return {
          ...booking,
          resolved_name: relatedName || null,
          resolved_phone: relatedPhone || null,
          resolved_email: relatedEmail || null,
        };
      });

      setBookings(enrichedBookings);
      setDrivers(driversResponse.data || []);
      setChangeRequests(changeRequestsResponse.data || []);
    } catch (error: any) {
      Alert.alert(
        "Booking Command Center",
        error?.message || "Unable to load booking operations."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function updateBooking(
    booking: BookingRecord,
    updateData: GenericRecord,
    successMessage: string
  ) {
    try {
      setUpdatingId(booking.id);

      const { error } = await supabase
        .from("bookings")
        .update(updateData)
        .eq("id", booking.id);

      if (error) throw error;

      setBookings((current) =>
        current.map((item) =>
          String(item.id) === String(booking.id)
            ? {
                ...item,
                ...updateData,
              }
            : item
        )
      );

      Alert.alert("Success", successMessage);
    } catch (error: any) {
      Alert.alert(
        "Update Failed",
        error?.message || "Unable to update this booking."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function confirmBooking(booking: BookingRecord) {
    updateBooking(
      booking,
      { status: "Confirmed" },
      "Booking confirmed."
    );
  }

  function markDriverArrived(booking: BookingRecord) {
    updateBooking(
      booking,
      { status: "Arrived at Pickup" },
      "Driver marked as arrived at pickup."
    );
  }

  function startTrip(booking: BookingRecord) {
    updateBooking(
      booking,
      {
        status: "In Progress",
      },
      "Trip started."
    );
  }

  function completeTrip(booking: BookingRecord) {
    Alert.alert(
      "Complete Trip",
      "Confirm that this trip has been completed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: () =>
            updateBooking(
              booking,
              {
                status: "Completed",
                completed_at: new Date().toISOString(),
              },
              "Trip completed."
            ),
        },
      ]
    );
  }

  function cancelBooking(booking: BookingRecord) {
    Alert.alert(
      "Cancel Booking",
      "This will cancel the passenger's trip. Continue?",
      [
        { text: "Keep Booking", style: "cancel" },
        {
          text: "Cancel Trip",
          style: "destructive",
          onPress: () =>
            updateBooking(
              booking,
              {
                status: "Cancelled",
              },
              "Booking cancelled."
            ),
        },
      ]
    );
  }

  function confirmPayment(booking: BookingRecord) {
    updateBooking(
      booking,
      {
        payment_status: "paid",
      },
      "Payment confirmed."
    );
  }

  function markUnpaid(booking: BookingRecord) {
    updateBooking(
      booking,
      {
        payment_status: "unpaid",
      },
      "Payment marked as unpaid."
    );
  }

  function assignDriver(
    booking: BookingRecord,
    driver: DriverRecord
  ) {
    const driverName = getDriverName(driver);
    const driverPhone =
      driver.phone || driver.driver_phone || "";

    updateBooking(
      booking,
      {
        driver_id: driver.id,
        driver_name: driverName,
        assigned_driver_name: driverName,
        driver_phone: driverPhone,
        assigned_driver_phone: driverPhone,
        status: "Driver Assigned",
      },
      `${driverName} assigned to this trip.`
    );

    setAssignmentVisible(false);
    setSelectedBooking(null);
    setDriverQuery("");
  }

  function openAssignment(booking: BookingRecord) {
    setSelectedBooking(booking);
    setAssignmentVisible(true);
  }

  function openTimeline(booking: BookingRecord) {
    setTimelineBooking(booking);
    setTimelineVisible(true);
  }

  function callPhone(phone?: string | null) {
    if (!phone) {
      Alert.alert(
        "Phone unavailable",
        "No phone number is available."
      );
      return;
    }

    Linking.openURL(`tel:${phone}`);
  }

  function textPhone(
    phone: string | null | undefined,
    body: string
  ) {
    if (!phone) {
      Alert.alert(
        "Phone unavailable",
        "No phone number is available."
      );
      return;
    }

    Linking.openURL(
      `sms:${phone}?body=${encodeURIComponent(body)}`
    );
  }

  function emailPassenger(booking: BookingRecord) {
    const email = getPassengerEmail(booking);

    if (!email) {
      Alert.alert(
        "Email unavailable",
        "No passenger email is available."
      );
      return;
    }

    Linking.openURL(
      `mailto:${email}?subject=${encodeURIComponent(
        `Angel Express Trip #${booking.id}`
      )}`
    );
  }

  function sendReminder(booking: BookingRecord) {
    textPhone(
      getPassengerPhone(booking),
      `Hello ${getPassengerName(
        booking
      )}, this is Angel Express reminding you about your upcoming trip from ${getPickup(
        booking
      )} to ${getDropoff(booking)} on ${getTripDate(
        booking
      )} at ${getTripTime(booking)}.`
    );
  }

  function sendReceipt(booking: BookingRecord) {
    textPhone(
      getPassengerPhone(booking),
      `Angel Express Receipt: Trip #${
        booking.id
      }. Total: ${formatMoney(
        getAmount(booking)
      )}. Thank you for choosing Angel Express.`
    );
  }

  const summary = useMemo(() => {
    const pending = bookings.filter(isPending);
    const assigned = bookings.filter(isAssigned);
    const active = bookings.filter(isActive);
    const completed = bookings.filter(isCompleted);
    const cancelled = bookings.filter(isCancelled);
    const website = bookings.filter((booking) =>
      normalize(booking.source).includes("website")
    );
    const app = bookings.filter((booking) =>
      normalize(booking.source).includes("app")
    );
    const unassigned = bookings.filter(
      (booking) =>
        (isPending(booking) ||
          normalize(booking.status) === "confirmed") &&
        !(
          booking.driver_id ||
          booking.assigned_driver_id ||
          booking.driver_name ||
          booking.assigned_driver_name
        )
    );

    const revenue = completed.reduce(
      (sum, booking) => sum + getAmount(booking),
      0
    );

    return {
      pending,
      assigned,
      active,
      completed,
      cancelled,
      website,
      app,
      unassigned,
      revenue,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return bookings.filter((booking) => {
      if (!matchesFilter(booking, filter)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchable = [
        booking.id,
        getPassengerName(booking),
        getPassengerPhone(booking),
        getPassengerEmail(booking),
        getAssignedDriverName(booking),
        getPickup(booking),
        getDropoff(booking),
        booking.status,
        booking.payment_status,
        booking.source,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [bookings, filter, query]);

  const filteredDrivers = useMemo(() => {
    const search = driverQuery.trim().toLowerCase();

    return drivers
      .filter((driver) => {
        if (!search) return true;

        return [
          getDriverName(driver),
          driver.phone,
          driver.driver_phone,
          driver.driver_level,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((a, b) => {
        if (a.is_online && !b.is_online) return -1;
        if (!a.is_online && b.is_online) return 1;

        return (
          Number(b.rating || 0) -
          Number(a.rating || 0)
        );
      });
  }, [drivers, driverQuery]);

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

  function bookingWidth() {
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

  function ActionButton({
    label,
    icon,
    tone = "gold",
    onPress,
    disabled,
  }: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    tone?: Tone;
    onPress: () => void;
    disabled?: boolean;
  }) {
    const colors = toneColors(tone);

    return (
      <TouchableOpacity
        style={[
          styles.actionButton,
          {
            backgroundColor: colors.background,
            borderColor: colors.color,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        <Ionicons
          name={icon}
          size={16}
          color={colors.color}
        />
        <Text
          style={[
            styles.actionButtonText,
            { color: colors.color },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  function BookingCard({
    booking,
  }: {
    booking: BookingRecord;
  }) {
    const statusStyle = getOwnerBookingStatusStyle(
      booking.status
    );

    const paid = isPaid(booking);
    const updating =
      String(updatingId) === String(booking.id);

    const requestCount = changeRequests.filter(
      (request) =>
        String(
          request.booking_id ||
            request.trip_id ||
            request.ride_id
        ) === String(booking.id) &&
        ![
          "resolved",
          "approved",
          "rejected",
          "closed",
        ].includes(normalize(request.status))
    ).length;

    return (
      <View
        style={[
          styles.bookingCard,
          {
            width: bookingWidth(),
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.cardBorder,
          },
          theme.shadows.soft,
        ]}
      >
        <View style={styles.bookingHeader}>
          <View
            style={[
              styles.passengerAvatar,
              {
                backgroundColor:
                  theme.colors.goldTransparent,
              },
            ]}
          >
            <Text
              style={[
                styles.passengerInitial,
                { color: theme.colors.gold },
              ]}
            >
              {getPassengerName(booking)
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <View style={styles.bookingTitleArea}>
            <Text
              style={[
                styles.passengerName,
                { color: theme.colors.text },
              ]}
              numberOfLines={1}
            >
              {getPassengerName(booking)}
            </Text>

            <Text
              style={[
                styles.bookingNumber,
                { color: theme.colors.textMuted },
              ]}
            >
              Trip #{booking.id}
            </Text>

            <Text
              style={[
                styles.bookingContact,
                { color: theme.colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {getPassengerPhone(booking) || "Phone not provided"}
            </Text>

            <Text
              style={[
                styles.bookingContact,
                { color: theme.colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {getPassengerEmail(booking) || "Email not provided"}
            </Text>
          </View>

          <View style={styles.headerBadges}>
            <View
              style={[
                styles.sourceBadge,
                {
                  backgroundColor:
                    normalize(booking.source).includes(
                      "website"
                    )
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
                      normalize(booking.source).includes(
                        "website"
                      )
                        ? theme.colors.info
                        : theme.colors.gold,
                  },
                ]}
              >
                {sourceLabel(booking)}
              </Text>
            </View>

            {isStudentBooking(booking) ? (
              <View
                style={[
                  styles.studentBadge,
                  {
                    backgroundColor:
                      theme.colors.successSoft,
                  },
                ]}
              >
                <Ionicons
                  name="school-outline"
                  size={12}
                  color={theme.colors.success}
                />
                <Text
                  style={[
                    styles.studentBadgeText,
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
                backgroundColor: statusStyle.background,
              },
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                { color: statusStyle.color },
              ]}
            >
              {booking.status || "Pending"}
            </Text>
          </View>

          <View
            style={[
              styles.paymentBadge,
              {
                backgroundColor: paid
                  ? theme.colors.successSoft
                  : theme.colors.warningSoft,
              },
            ]}
          >
            <Ionicons
              name={
                paid
                  ? "checkmark-circle-outline"
                  : "time-outline"
              }
              size={14}
              color={
                paid
                  ? theme.colors.success
                  : theme.colors.warning
              }
            />
            <Text
              style={[
                styles.paymentBadgeText,
                {
                  color: paid
                    ? theme.colors.success
                    : theme.colors.warning,
                },
              ]}
            >
              {paid ? "Paid" : "Unpaid"}
            </Text>
          </View>

          {requestCount > 0 ? (
            <View
              style={[
                styles.requestBadge,
                {
                  backgroundColor:
                    theme.colors.warningSoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.requestBadgeText,
                  { color: theme.colors.warning },
                ]}
              >
                {requestCount} change request
                {requestCount === 1 ? "" : "s"}
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

          <View style={styles.routeTextBlock}>
            <View style={styles.routeItem}>
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
                {getPickup(booking)}
              </Text>
            </View>

            <View style={styles.routeItem}>
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
                {getDropoff(booking)}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.detailGrid,
            { borderTopColor: theme.colors.divider },
          ]}
        >
          <View style={styles.detailItem}>
            <Ionicons
              name="calendar-outline"
              size={17}
              color={theme.colors.gold}
            />
            <View style={styles.detailTextArea}>
              <Text
                style={[
                  styles.detailLabel,
                  { color: theme.colors.textMuted },
                ]}
              >
                DATE
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {getTripDate(booking)}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Ionicons
              name="time-outline"
              size={17}
              color={theme.colors.info}
            />
            <View style={styles.detailTextArea}>
              <Text
                style={[
                  styles.detailLabel,
                  { color: theme.colors.textMuted },
                ]}
              >
                TIME
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {getTripTime(booking)}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Ionicons
              name="car-outline"
              size={17}
              color={theme.colors.success}
            />
            <View style={styles.detailTextArea}>
              <Text
                style={[
                  styles.detailLabel,
                  { color: theme.colors.textMuted },
                ]}
              >
                DRIVER
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: theme.colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {getAssignedDriverName(booking)}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Ionicons
              name="cash-outline"
              size={17}
              color={theme.colors.gold}
            />
            <View style={styles.detailTextArea}>
              <Text
                style={[
                  styles.detailLabel,
                  { color: theme.colors.textMuted },
                ]}
              >
                FARE
              </Text>
              <Text
                style={[
                  styles.detailValueStrong,
                  { color: theme.colors.gold },
                ]}
              >
                {formatMoney(getAmount(booking))}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.primaryActions}>
          {(isPending(booking) ||
            normalize(booking.status) === "pendingconfirmation") && (
            <ActionButton
              label="Confirm"
              icon="checkmark-circle-outline"
              tone="success"
              onPress={() => confirmBooking(booking)}
              disabled={updating}
            />
          )}

          {!booking.driver_id &&
          !booking.assigned_driver_id ? (
            <ActionButton
              label="Assign Driver"
              icon="person-add-outline"
              tone="gold"
              onPress={() => openAssignment(booking)}
              disabled={updating}
            />
          ) : (
            <ActionButton
              label="Change Driver"
              icon="swap-horizontal-outline"
              tone="gold"
              onPress={() => openAssignment(booking)}
              disabled={updating}
            />
          )}

          {isAssigned(booking) && (
            <ActionButton
              label="Driver Arrived"
              icon="location-outline"
              tone="info"
              onPress={() => markDriverArrived(booking)}
              disabled={updating}
            />
          )}

          {(isAssigned(booking) ||
            normalize(booking.status) ===
              "arrivedatpickup") && (
            <ActionButton
              label="Start Trip"
              icon="play-circle-outline"
              tone="success"
              onPress={() => startTrip(booking)}
              disabled={updating}
            />
          )}

          {isActive(booking) && (
            <ActionButton
              label="Complete"
              icon="checkmark-done-outline"
              tone="success"
              onPress={() => completeTrip(booking)}
              disabled={updating}
            />
          )}

          {!paid ? (
            <ActionButton
              label="Confirm Pay"
              icon="card-outline"
              tone="info"
              onPress={() => confirmPayment(booking)}
              disabled={updating}
            />
          ) : (
            <ActionButton
              label="Mark Unpaid"
              icon="close-circle-outline"
              tone="warning"
              onPress={() => markUnpaid(booking)}
              disabled={updating}
            />
          )}
        </View>

        <View
          style={[
            styles.secondaryActions,
            { borderTopColor: theme.colors.divider },
          ]}
        >
          <TouchableOpacity
            style={styles.iconAction}
            onPress={() =>
              callPhone(getPassengerPhone(booking))
            }
          >
            <Ionicons
              name="call-outline"
              size={20}
              color={theme.colors.success}
            />
            <Text
              style={[
                styles.iconActionText,
                { color: theme.colors.textMuted },
              ]}
            >
              Call Passenger
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconAction}
            onPress={() => sendReminder(booking)}
          >
            <Ionicons
              name="chatbubble-outline"
              size={20}
              color={theme.colors.info}
            />
            <Text
              style={[
                styles.iconActionText,
                { color: theme.colors.textMuted },
              ]}
            >
              Reminder
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconAction}
            onPress={() => emailPassenger(booking)}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.iconActionText,
                { color: theme.colors.textMuted },
              ]}
            >
              Email
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconAction}
            onPress={() => sendReceipt(booking)}
          >
            <Ionicons
              name="receipt-outline"
              size={20}
              color={theme.colors.info}
            />
            <Text
              style={[
                styles.iconActionText,
                { color: theme.colors.textMuted },
              ]}
            >
              Receipt
            </Text>
          </TouchableOpacity>

          {getAssignedDriverPhone(booking) ? (
            <TouchableOpacity
              style={styles.iconAction}
              onPress={() =>
                callPhone(
                  getAssignedDriverPhone(booking)
                )
              }
            >
              <Ionicons
                name="car-sport-outline"
                size={20}
                color={theme.colors.success}
              />
              <Text
                style={[
                  styles.iconActionText,
                  { color: theme.colors.textMuted },
                ]}
              >
                Call Driver
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.iconAction}
            onPress={() => openTimeline(booking)}
          >
            <Ionicons
              name="time-outline"
              size={20}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.iconActionText,
                { color: theme.colors.textMuted },
              ]}
            >
              Timeline
            </Text>
          </TouchableOpacity>
        </View>

        {!isCompleted(booking) &&
        !isCancelled(booking) ? (
          <TouchableOpacity
            style={[
              styles.cancelButton,
              {
                backgroundColor: theme.colors.dangerSoft,
                borderColor: theme.colors.danger,
              },
            ]}
            onPress={() => cancelBooking(booking)}
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
                  size={18}
                  color={theme.colors.danger}
                />
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: theme.colors.danger },
                  ]}
                >
                  Cancel Booking
                </Text>
              </>
            )}
          </TouchableOpacity>
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
          Loading Booking Command Center...
        </Text>
      </View>
    );
  }

  const filters: {
    key: BookingFilter;
    label: string;
    count?: number;
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
      key: "completed",
      label: "Completed",
      count: summary.completed.length,
    },
    {
      key: "cancelled",
      label: "Cancelled",
      count: summary.cancelled.length,
    },
    {
      key: "website",
      label: "Website",
      count: summary.website.length,
    },
    {
      key: "app",
      label: "Passenger App",
      count: summary.app.length,
    },
    {
      key: "student",
      label: "Student",
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
                await loadData(false);
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
                Booking Command Center
              </Text>
              <Text
                style={[
                  styles.pageSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                Search, assign, manage, contact, and monitor every
                Angel Express booking.
              </Text>
            </View>
          </View>

          <View style={styles.metricGrid}>
            <MetricCard
              label="Pending"
              value={summary.pending.length}
              icon="time-outline"
              tone="warning"
            />
            <MetricCard
              label="Active Trips"
              value={summary.active.length}
              icon="navigate-outline"
              tone="success"
            />
            <MetricCard
              label="Need Drivers"
              value={summary.unassigned.length}
              icon="person-add-outline"
              tone={
                summary.unassigned.length > 0
                  ? "danger"
                  : "success"
              }
            />
            <MetricCard
              label="Completed"
              value={summary.completed.length}
              icon="checkmark-done-outline"
              tone="success"
            />
            <MetricCard
              label="Cancelled"
              value={summary.cancelled.length}
              icon="close-circle-outline"
              tone="danger"
            />
            <MetricCard
              label="Website"
              value={summary.website.length}
              icon="globe-outline"
              tone="info"
            />
            <MetricCard
              label="Passenger App"
              value={summary.app.length}
              icon="phone-portrait-outline"
              tone="gold"
            />
            <MetricCard
              label="Recorded Revenue"
              value={formatMoney(summary.revenue)}
              icon="cash-outline"
              tone="gold"
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
                placeholder="Search passenger, phone, trip ID, driver, or route"
                placeholderTextColor={
                  theme.colors.inputPlaceholder
                }
                style={[
                  styles.searchInput,
                  { color: theme.colors.text },
                ]}
                autoCapitalize="none"
                autoCorrect={false}
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
                      {item.label}
                      {typeof item.count === "number"
                        ? ` (${item.count})`
                        : ""}
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
                {filter === "all"
                  ? "All Bookings"
                  : `${filters.find((f) => f.key === filter)?.label} Bookings`}
              </Text>
              <Text
                style={[
                  styles.resultsSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                {filteredBookings.length} result
                {filteredBookings.length === 1 ? "" : "s"}
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
              onPress={() => loadData(false)}
            >
              <Ionicons
                name="refresh"
                size={18}
                color={theme.colors.gold}
              />
              <Text
                style={[
                  styles.refreshButtonText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Refresh
              </Text>
            </TouchableOpacity>
          </View>

          {filteredBookings.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIcon,
                  {
                    backgroundColor:
                      theme.colors.goldTransparent,
                  },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={30}
                  color={theme.colors.gold}
                />
              </View>

              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.text },
                ]}
              >
                No matching bookings
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textMuted },
                ]}
              >
                Adjust your search or select another filter.
              </Text>
            </View>
          ) : (
            <View style={styles.bookingGrid}>
              {filteredBookings.map((booking) => (
                <BookingCard
                  key={String(booking.id)}
                  booking={booking}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <Modal
          visible={assignmentVisible}
          transparent
          animationType="slide"
          onRequestClose={() =>
            setAssignmentVisible(false)
          }
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.assignmentModal,
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
                    DISPATCH
                  </Text>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    Assign Driver
                  </Text>
                  <Text
                    style={[
                      styles.modalSubtitle,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {selectedBooking
                      ? `Trip #${selectedBooking.id} • ${getPassengerName(
                          selectedBooking
                        )}`
                      : ""}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.modalCloseButton,
                    {
                      backgroundColor:
                        theme.colors.surfaceSoft,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                  onPress={() => {
                    setAssignmentVisible(false);
                    setSelectedBooking(null);
                    setDriverQuery("");
                  }}
                >
                  <Ionicons
                    name="close"
                    size={21}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.driverSearch,
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
                  value={driverQuery}
                  onChangeText={setDriverQuery}
                  placeholder="Search approved drivers"
                  placeholderTextColor={
                    theme.colors.inputPlaceholder
                  }
                  style={[
                    styles.driverSearchInput,
                    { color: theme.colors.text },
                  ]}
                />
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.driverList}
              >
                {filteredDrivers.length === 0 ? (
                  <View style={styles.noDrivers}>
                    <Ionicons
                      name="car-outline"
                      size={30}
                      color={theme.colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.noDriversText,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      No approved drivers found.
                    </Text>
                  </View>
                ) : (
                  filteredDrivers.map((driver) => {
                    const name = getDriverName(driver);
                    const busy = Boolean(
                      driver.current_booking_id
                    );
                    const isCurrentDriver = selectedBooking
                      ? getAssignedDriverName(selectedBooking) === name
                      : false;

                    return (
                      <View
                        key={driver.id}
                        style={[
                          styles.driverOption,
                          {
                            backgroundColor:
                              theme.colors.card,
                            borderColor:
                              theme.colors.cardBorder,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.driverOptionAvatar,
                            {
                              backgroundColor:
                                theme.colors.goldTransparent,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.driverOptionInitial,
                              { color: theme.colors.gold },
                            ]}
                          >
                            {name.charAt(0).toUpperCase()}
                          </Text>
                          <View
                            style={[
                              styles.driverAvailabilityDot,
                              {
                                backgroundColor:
                                  driver.is_online
                                    ? theme.colors.success
                                    : theme.colors.offline,
                                borderColor:
                                  theme.colors.card,
                              },
                            ]}
                          />
                        </View>

                        <View style={styles.driverOptionInfo}>
                          <Text
                            style={[
                              styles.driverOptionName,
                              { color: theme.colors.text },
                            ]}
                          >
                            {name}
                          </Text>

                          <Text
                            style={[
                              styles.driverOptionMeta,
                              { color: theme.colors.textMuted },
                            ]}
                          >
                            ★{" "}
                            {Number(
                              driver.rating || 5
                            ).toFixed(1)}{" "}
                            •{" "}
                            {driver.driver_level || "Bronze"}
                          </Text>

                          <Text
                            style={[
                              styles.driverAvailabilityText,
                              {
                                color: busy
                                  ? theme.colors.warning
                                  : driver.is_online
                                    ? theme.colors.success
                                    : theme.colors.textMuted,
                              },
                            ]}
                          >
                            {busy
                              ? "Currently assigned"
                              : driver.is_online
                                ? "Online and available"
                                : "Offline"}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.assignButton,
                            {
                              backgroundColor:
                                driver.is_online && !busy
                                  ? theme.colors.gold
                                  : theme.colors.surfaceMuted,
                            },
                          ]}
                          disabled={
                            !selectedBooking ||
                            busy
                          }
                          onPress={() => {
                            if (selectedBooking) {
                              assignDriver(
                                selectedBooking,
                                driver
                              );
                            }
                          }}
                        >
                          <Text
                            style={[
                              styles.assignButtonText,
                              {
                                color:
                                  driver.is_online && !busy
                                    ? theme.colors.textInverse
                                    : theme.colors.textMuted,
                              },
                            ]}
                          >
                            {busy
                              ? "Busy"
                              : isCurrentDriver
                                ? "Assigned"
                                : "Assign"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={timelineVisible}
          transparent
          animationType="fade"
          onRequestClose={() =>
            setTimelineVisible(false)
          }
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setTimelineVisible(false)}
          >
            <Pressable
              style={[
                styles.timelineModal,
                {
                  backgroundColor:
                    theme.colors.surfaceElevated,
                  borderColor: theme.colors.cardBorderStrong,
                },
              ]}
              onPress={() => {}}
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
                    BOOKING HISTORY
                  </Text>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    Trip Timeline
                  </Text>
                  <Text
                    style={[
                      styles.modalSubtitle,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {timelineBooking
                      ? `Trip #${timelineBooking.id}`
                      : ""}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.modalCloseButton,
                    {
                      backgroundColor:
                        theme.colors.surfaceSoft,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                  onPress={() =>
                    setTimelineVisible(false)
                  }
                >
                  <Ionicons
                    name="close"
                    size={21}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {timelineBooking ? (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.timelineContent}
                >
                  {[
                    {
                      title: "Booking created",
                      time:
                        timelineBooking.created_at ||
                        "Time unavailable",
                      icon: "calendar-outline" as const,
                      tone: "gold" as Tone,
                    },
                    {
                      title:
                        timelineBooking.driver_id ||
                        timelineBooking.assigned_driver_name ||
                        timelineBooking.driver_name
                          ? "Driver assigned"
                          : "Awaiting driver assignment",
                      time:
                        timelineBooking.driver_id ||
                        timelineBooking.assigned_driver_name ||
                        timelineBooking.driver_name
                          ? getAssignedDriverName(timelineBooking)
                          : "Not completed",
                      icon: "person-add-outline" as const,
                      tone:
                        timelineBooking.driver_id ||
                        timelineBooking.assigned_driver_name ||
                        timelineBooking.driver_name
                          ? ("success" as Tone)
                          : ("warning" as Tone),
                    },
                    {
                      title:
                        isActive(timelineBooking) ||
                        isCompleted(timelineBooking)
                          ? "Trip started"
                          : "Trip not started",
                      time:
                        isActive(timelineBooking) ||
                        isCompleted(timelineBooking)
                          ? `Current status: ${
                              timelineBooking.status || "In Progress"
                            }`
                          : "Not completed",
                      icon: "play-circle-outline" as const,
                      tone:
                        isActive(timelineBooking) ||
                        isCompleted(timelineBooking)
                          ? ("success" as Tone)
                          : ("warning" as Tone),
                    },
                    {
                      title:
                        timelineBooking.completed_at
                          ? "Trip completed"
                          : "Trip not completed",
                      time:
                        timelineBooking.completed_at ||
                        "Not completed",
                      icon: "checkmark-done-outline" as const,
                      tone:
                        timelineBooking.completed_at
                          ? ("success" as Tone)
                          : ("info" as Tone),
                    },
                    {
                      title:
                        isPaid(timelineBooking)
                          ? "Payment received"
                          : "Payment pending",
                      time:
                        isPaid(timelineBooking)
                          ? "Payment status: Paid"
                          : "Payment status: Unpaid",
                      icon: "card-outline" as const,
                      tone:
                        isPaid(timelineBooking)
                          ? ("success" as Tone)
                          : ("warning" as Tone),
                    },
                  ].map((item, index) => {
                    const colors = toneColors(item.tone);

                    return (
                      <View
                        key={`${item.title}-${index}`}
                        style={styles.timelineItem}
                      >
                        <View style={styles.timelineGraphic}>
                          <View
                            style={[
                              styles.timelineIcon,
                              {
                                backgroundColor:
                                  colors.background,
                              },
                            ]}
                          >
                            <Ionicons
                              name={item.icon}
                              size={19}
                              color={colors.color}
                            />
                          </View>

                          {index < 4 ? (
                            <View
                              style={[
                                styles.timelineLine,
                                {
                                  backgroundColor:
                                    theme.colors.divider,
                                },
                              ]}
                            />
                          ) : null}
                        </View>

                        <View style={styles.timelineTextArea}>
                          <Text
                            style={[
                              styles.timelineTitle,
                              { color: theme.colors.text },
                            ]}
                          >
                            {item.title}
                          </Text>
                          <Text
                            style={[
                              styles.timelineTime,
                              {
                                color:
                                  theme.colors.textMuted,
                              },
                            ]}
                          >
                            {item.time}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  overlay: {
    flex: 1,
  },

  container: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 60,
  },

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

  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 28,
  },

  backButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  titleArea: {
    flex: 1,
  },

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

  metricValue: {
    fontSize: 27,
    fontWeight: "900",
  },

  metricLabel: {
    marginTop: 5,
    fontSize: 11.5,
    fontWeight: "700",
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

  refreshButtonText: {
    marginLeft: 7,
    fontSize: 12,
    fontWeight: "800",
  },

  bookingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  bookingCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },

  bookingHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  passengerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  passengerInitial: {
    fontSize: 22,
    fontWeight: "900",
  },

  bookingTitleArea: {
    flex: 1,
    paddingRight: 8,
  },

  passengerName: {
    fontSize: 16,
    fontWeight: "900",
  },

  bookingNumber: {
    marginTop: 3,
    fontSize: 10.5,
    fontWeight: "600",
  },

  bookingContact: {
    marginTop: 3,
    fontSize: 9.5,
    fontWeight: "600",
  },

  headerBadges: {
    alignItems: "flex-end",
    gap: 6,
  },

  sourceBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  sourceBadgeText: {
    fontSize: 9,
    fontWeight: "900",
  },

  studentBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  studentBadgeText: {
    marginLeft: 4,
    fontSize: 8.5,
    fontWeight: "900",
  },

  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: "900",
  },

  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  paymentBadgeText: {
    marginLeft: 5,
    fontSize: 9,
    fontWeight: "900",
  },

  requestBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  requestBadgeText: {
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

  routeTextBlock: {
    flex: 1,
    gap: 18,
  },

  routeItem: {
    flex: 1,
  },

  routeLabel: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 1,
  },

  routeValue: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "700",
  },

  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    marginTop: 19,
    paddingTop: 15,
  },

  detailItem: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  detailTextArea: {
    flex: 1,
    marginLeft: 8,
  },

  detailLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  detailValue: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
  },

  detailValueStrong: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "900",
  },

  primaryActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },

  actionButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  actionButtonText: {
    marginLeft: 6,
    fontSize: 10.5,
    fontWeight: "900",
  },

  secondaryActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    marginTop: 17,
    paddingTop: 14,
  },

  iconAction: {
    width: "33.33%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },

  iconActionText: {
    marginTop: 5,
    fontSize: 8.5,
    fontWeight: "700",
    textAlign: "center",
  },

  cancelButton: {
    minHeight: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 14,
  },

  cancelButtonText: {
    marginLeft: 7,
    fontSize: 11,
    fontWeight: "900",
  },

  emptyState: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 22,
    padding: 30,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 14,
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

  assignmentModal: {
    maxHeight: "88%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingBottom: 24,
  },

  timelineModal: {
    maxHeight: "80%",
    width: "92%",
    maxWidth: 620,
    alignSelf: "center",
    borderRadius: 26,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: "20%",
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

  modalSubtitle: {
    marginTop: 4,
    fontSize: 11,
  },

  modalCloseButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  driverSearch: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 15,
    margin: 16,
    paddingHorizontal: 14,
  },

  driverSearchInput: {
    flex: 1,
    height: 50,
    marginLeft: 9,
    fontSize: 14,
  },

  driverList: {
    paddingHorizontal: 16,
    paddingBottom: 26,
  },

  driverOption: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 11,
  },

  driverOptionAvatar: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  driverOptionInitial: {
    fontSize: 20,
    fontWeight: "900",
  },

  driverAvailabilityDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 3,
  },

  driverOptionInfo: {
    flex: 1,
    paddingRight: 8,
  },

  driverOptionName: {
    fontSize: 14,
    fontWeight: "900",
  },

  driverOptionMeta: {
    marginTop: 4,
    fontSize: 10.5,
    fontWeight: "700",
  },

  driverAvailabilityText: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: "800",
  },

  assignButton: {
    minWidth: 72,
    minHeight: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  assignButtonText: {
    fontSize: 10.5,
    fontWeight: "900",
  },

  noDrivers: {
    alignItems: "center",
    paddingVertical: 30,
  },

  noDriversText: {
    marginTop: 10,
    fontSize: 12,
  },

  timelineContent: {
    padding: 18,
  },

  timelineItem: {
    flexDirection: "row",
    minHeight: 80,
  },

  timelineGraphic: {
    width: 44,
    alignItems: "center",
  },

  timelineIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 32,
    marginTop: 5,
  },

  timelineTextArea: {
    flex: 1,
    paddingLeft: 10,
    paddingTop: 7,
  },

  timelineTitle: {
    fontSize: 13,
    fontWeight: "900",
  },

  timelineTime: {
    marginTop: 5,
    fontSize: 10.5,
    lineHeight: 16,
  },
});
