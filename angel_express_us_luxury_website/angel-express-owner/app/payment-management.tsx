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

type GenericRecord = Record<string, any>;

type BookingRecord = GenericRecord & {
  id: string | number;
  created_at?: string | null;
  completed_at?: string | null;
  status?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  manual_payment_confirmed?: boolean | null;
  driver_payout_status?: string | null;
  payout_status?: string | null;
  invoice_no?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_checkout_session_id?: string | null;
  source?: string | null;
  name?: string | null;
  passenger_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  passenger_email?: string | null;
  phone?: string | null;
  passenger_phone?: string | null;
  user_id?: string | null;
  passenger_id?: string | null;
  driver_id?: string | null;
  assigned_driver_id?: string | null;
  driver_name?: string | null;
  assigned_driver_name?: string | null;
  pickup?: string | null;
  pickup_location?: string | null;
  pickup_address?: string | null;
  dropoff?: string | null;
  dropoff_location?: string | null;
  dropoff_address?: string | null;
  total?: number | string | null;
  total_price?: number | string | null;
  total_fare?: number | string | null;
  price?: number | string | null;
  fare?: number | string | null;
  driver_share?: number | string | null;
  company_share?: number | string | null;
  tip?: number | string | null;
  taxes?: number | string | null;
  discount?: number | string | null;
  promo_discount?: number | string | null;
  refund_amount?: number | string | null;
  refund_status?: string | null;
  student_verified?: boolean | null;
  is_student?: boolean | null;
  student_discount?: number | string | null;
  resolved_name?: string | null;
  resolved_phone?: string | null;
  resolved_email?: string | null;
};

type PassengerRecord = GenericRecord & {
  id?: string;
  user_id?: string | null;
  passenger_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  passenger_email?: string | null;
  phone?: string | null;
  passenger_phone?: string | null;
  phone_number?: string | null;
};

type DriverRecord = GenericRecord & {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  payout_status?: string | null;
  stripe_account_id?: string | null;
  stripe_onboarding_complete?: boolean | null;
  payout_method?: string | null;
  zelle?: string | null;
  cash_app?: string | null;
};

type PaymentFilter =
  | "all"
  | "paid"
  | "unpaid"
  | "stripe"
  | "zelle"
  | "cashapp"
  | "payoutpending"
  | "payoutpaid"
  | "refund"
  | "website"
  | "app";

type Tone = "gold" | "success" | "warning" | "danger" | "info";

function normalize(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

function looksLikeEmail(value?: string | null) {
  return Boolean(value && String(value).includes("@"));
}

function fareOf(booking: BookingRecord) {
  return Number(
    booking.total_fare ??
      booking.total ??
      booking.total_price ??
      booking.price ??
      booking.fare ??
      0
  );
}

function driverShareOf(booking: BookingRecord) {
  return Number(
    booking.driver_share ?? fareOf(booking) * 0.7
  );
}

function companyShareOf(booking: BookingRecord) {
  return Number(
    booking.company_share ?? fareOf(booking) * 0.3
  );
}

function tipOf(booking: BookingRecord) {
  return Number(booking.tip || 0);
}

function taxesOf(booking: BookingRecord) {
  return Number(booking.taxes || 0);
}

function discountOf(booking: BookingRecord) {
  return Number(
    booking.discount ||
      booking.promo_discount ||
      booking.student_discount ||
      0
  );
}

function refundOf(booking: BookingRecord) {
  return Number(booking.refund_amount || 0);
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

function passengerName(booking: BookingRecord) {
  const candidates = [
    booking.resolved_name,
    booking.passenger_name,
    booking.full_name,
    booking.name,
  ];

  const valid = candidates.find(
    (value) => value && !looksLikeEmail(String(value))
  );

  return valid ? String(valid) : "Passenger";
}

function passengerEmail(booking: BookingRecord) {
  return (
    booking.resolved_email ||
    booking.email ||
    booking.passenger_email ||
    (looksLikeEmail(booking.name) ? booking.name : "") ||
    ""
  );
}

function passengerPhone(booking: BookingRecord) {
  return (
    booking.resolved_phone ||
    booking.phone ||
    booking.passenger_phone ||
    booking.phone_number ||
    booking.mobile ||
    booking.mobile_number ||
    ""
  );
}

function driverName(booking: BookingRecord) {
  return (
    booking.assigned_driver_name ||
    booking.driver_name ||
    "Not assigned"
  );
}

function pickup(booking: BookingRecord) {
  return (
    booking.pickup_address ||
    booking.pickup ||
    booking.pickup_location ||
    "Pickup not set"
  );
}

function dropoff(booking: BookingRecord) {
  return (
    booking.dropoff_address ||
    booking.dropoff ||
    booking.dropoff_location ||
    "Drop-off not set"
  );
}

function isPaid(booking: BookingRecord) {
  return normalize(booking.payment_status) === "paid";
}

function isCompleted(booking: BookingRecord) {
  return normalize(booking.status) === "completed";
}

function isPayoutPaid(booking: BookingRecord) {
  return [
    "paid",
    "driverpaid",
    "completed",
  ].includes(
    normalize(
      booking.driver_payout_status ||
        booking.payout_status
    )
  );
}

function isRefunded(booking: BookingRecord) {
  return (
    refundOf(booking) > 0 ||
    ["refunded", "partialrefund", "partiallyrefunded"].includes(
      normalize(booking.refund_status)
    )
  );
}

function sourceLabel(booking: BookingRecord) {
  return normalize(booking.source).includes("website")
    ? "Website"
    : "Passenger App";
}

function dateWithinDays(value: string | null | undefined, days: number) {
  if (!value) return false;

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) return false;

  return Date.now() - time <= days * 86400000;
}

function sameDay(value?: string | null) {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  return date.toDateString() === new Date().toDateString();
}

export default function PaymentManagementScreen() {
  const { theme, isDark } = useOwnerTheme();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] =
    useState<string | number | null>(null);

  const [bookings, setBookings] =
    useState<BookingRecord[]>([]);
  const [drivers, setDrivers] =
    useState<DriverRecord[]>([]);
  const [passengers, setPassengers] =
    useState<PassengerRecord[]>([]);

  const [query, setQuery] = useState("");
  const [filter, setFilter] =
    useState<PaymentFilter>("all");

  const [detailsVisible, setDetailsVisible] =
    useState(false);
  const [selectedBooking, setSelectedBooking] =
    useState<BookingRecord | null>(null);

  const isTablet = width >= 700;
  const isLarge = width >= 1050;

  useFocusEffect(
    useCallback(() => {
      loadPayments();
    }, [])
  );

  useEffect(() => {
    const channel = supabase
      .channel("owner-finance-command-center")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => loadPayments(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drivers",
        },
        () => loadPayments(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "passengers",
        },
        () => loadPayments(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadPayments(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const [
        bookingsResponse,
        driversResponse,
        passengersResponse,
        profilesResponse,
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase.from("drivers").select("*"),

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
        ...(profilesResponse.data || []),
      ];

      const byId = new Map<string, PassengerRecord>();
      const byEmail = new Map<string, PassengerRecord>();

      passengerRows.forEach((passenger) => {
        [
          passenger.id,
          passenger.user_id,
          passenger.passenger_id,
        ]
          .filter(Boolean)
          .forEach((value) =>
            byId.set(String(value), passenger)
          );

        const email = String(
          passenger.email ||
            passenger.passenger_email ||
            ""
        )
          .trim()
          .toLowerCase();

        if (email) {
          byEmail.set(email, passenger);
        }
      });

      const enrichedBookings = (
        bookingsResponse.data || []
      ).map((booking: BookingRecord) => {
        const bookingEmail = String(
          booking.email ||
            booking.passenger_email ||
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
                ""
            )
          ) || byEmail.get(bookingEmail);

        const relatedName = relatedPassenger
          ? (
              `${relatedPassenger.first_name || ""} ${
                relatedPassenger.last_name || ""
              }`
            ).trim() ||
            relatedPassenger.full_name ||
            relatedPassenger.name
          : "";

        const relatedPhone = relatedPassenger
          ? relatedPassenger.phone ||
            relatedPassenger.passenger_phone ||
            relatedPassenger.phone_number ||
            relatedPassenger.mobile ||
            relatedPassenger.mobile_number
          : "";

        const relatedEmail = relatedPassenger
          ? relatedPassenger.email ||
            relatedPassenger.passenger_email
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
      setPassengers(passengerRows);
    } catch (error: any) {
      Alert.alert(
        "Finance Center Error",
        error?.message || "Unable to load finance data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function updateBookingSafely(
    booking: BookingRecord,
    candidates: GenericRecord[],
    successMessage: string
  ) {
    try {
      setUpdatingId(booking.id);

      let lastError: any = null;
      let appliedUpdate: GenericRecord | null = null;

      for (const candidate of candidates) {
        const { error } = await supabase
          .from("bookings")
          .update(candidate)
          .eq("id", booking.id);

        if (!error) {
          appliedUpdate = candidate;
          lastError = null;
          break;
        }

        lastError = error;
      }

      if (lastError || !appliedUpdate) {
        throw lastError || new Error("No compatible payment fields were found.");
      }

      setBookings((current) =>
        current.map((item) =>
          String(item.id) === String(booking.id)
            ? { ...item, ...appliedUpdate }
            : item
        )
      );

      Alert.alert("Success", successMessage);
    } catch (error: any) {
      Alert.alert(
        "Update Failed",
        error?.message || "Unable to update this payment."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function confirmPaid(booking: BookingRecord) {
    updateBookingSafely(
      booking,
      [
        {
          payment_status: "paid",
          payment_method:
            booking.payment_method || "Owner Confirmed",
        },
        {
          payment_status: "paid",
        },
      ],
      "Payment confirmed."
    );
  }

  function markUnpaid(booking: BookingRecord) {
    updateBookingSafely(
      booking,
      [
        {
          payment_status: "unpaid",
          payment_method: null,
        },
        {
          payment_status: "unpaid",
        },
      ],
      "Payment marked as unpaid."
    );
  }

  function confirmManualPayment(
    booking: BookingRecord,
    method: "Zelle" | "Cash App" | "Cash"
  ) {
    updateBookingSafely(
      booking,
      [
        {
          payment_status: "paid",
          payment_method: method,
          manual_payment_confirmed: true,
        },
        {
          payment_status: "paid",
          payment_method: method,
        },
        {
          payment_status: "paid",
        },
      ],
      `${method} payment confirmed.`
    );
  }

  function markPayoutPaid(booking: BookingRecord) {
    updateBookingSafely(
      booking,
      [
        {
          driver_payout_status: "paid",
        },
        {
          payout_status: "paid",
        },
      ],
      "Driver payout marked as paid."
    );
  }

  function markPayoutPending(booking: BookingRecord) {
    updateBookingSafely(
      booking,
      [
        {
          driver_payout_status: "pending",
        },
        {
          payout_status: "pending",
        },
      ],
      "Driver payout marked as pending."
    );
  }

  function callPassenger(booking: BookingRecord) {
    const phone = String(
      passengerPhone(booking) || ""
    ).replace(/[^\d+]/g, "");

    if (!phone) {
      Alert.alert(
        "Phone unavailable",
        "Passenger phone number is not available."
      );
      return;
    }

    Linking.openURL(`tel:${phone}`);
  }

  function textPassenger(
    booking: BookingRecord,
    message: string
  ) {
    const phone = String(
      passengerPhone(booking) || ""
    ).replace(/[^\d+]/g, "");

    if (!phone) {
      Alert.alert(
        "Phone unavailable",
        "Passenger phone number is not available."
      );
      return;
    }

    Linking.openURL(
      `sms:${phone}?body=${encodeURIComponent(message)}`
    );
  }

  function emailPassenger(
    booking: BookingRecord,
    subject: string,
    body: string
  ) {
    const email = passengerEmail(booking);

    if (!email) {
      Alert.alert(
        "Email unavailable",
        "Passenger email is not available."
      );
      return;
    }

    Linking.openURL(
      `mailto:${email}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`
    );
  }

  function sendPaymentReminder(
    booking: BookingRecord
  ) {
    textPassenger(
      booking,
      `Hello ${passengerName(
        booking
      )}, this is Angel Express. Your trip payment of ${money(
        fareOf(booking)
      )} is pending. Please complete payment.`
    );
  }

  function sendSmsReceipt(booking: BookingRecord) {
    textPassenger(
      booking,
      `Angel Express Receipt: Trip #${
        booking.id
      }. Total fare: ${money(
        fareOf(booking)
      )}. Payment status: ${
        isPaid(booking) ? "Paid" : "Unpaid"
      }. Thank you for choosing Angel Express.`
    );
  }

  function sendEmailReceipt(booking: BookingRecord) {
    emailPassenger(
      booking,
      `Angel Express Receipt - Trip #${booking.id}`,
      [
        `Passenger: ${passengerName(booking)}`,
        `Trip: #${booking.id}`,
        `Route: ${pickup(booking)} to ${dropoff(booking)}`,
        `Fare: ${money(fareOf(booking))}`,
        `Driver share: ${money(driverShareOf(booking))}`,
        `Company share: ${money(companyShareOf(booking))}`,
        `Payment method: ${booking.payment_method || "Not confirmed"}`,
        `Payment status: ${isPaid(booking) ? "Paid" : "Unpaid"}`,
        "",
        "Thank you for choosing Angel Express.",
      ].join("\n")
    );
  }

  async function shareReceipt(booking: BookingRecord) {
    await Share.share({
      title: `Angel Express Receipt - Trip #${booking.id}`,
      message: [
        `Angel Express Receipt`,
        `Trip #${booking.id}`,
        `Passenger: ${passengerName(booking)}`,
        `Route: ${pickup(booking)} → ${dropoff(booking)}`,
        `Fare: ${money(fareOf(booking))}`,
        `Payment: ${isPaid(booking) ? "Paid" : "Unpaid"}`,
      ].join("\n"),
    });
  }

  const summary = useMemo(() => {
    const paid = bookings.filter(isPaid);
    const unpaid = bookings.filter(
      (booking) => !isPaid(booking)
    );
    const completed = bookings.filter(isCompleted);

    const totalRevenue = bookings.reduce(
      (sum, booking) => sum + fareOf(booking),
      0
    );

    const paidRevenue = paid.reduce(
      (sum, booking) => sum + fareOf(booking),
      0
    );

    const unpaidRevenue = unpaid.reduce(
      (sum, booking) => sum + fareOf(booking),
      0
    );

    const companyShare = bookings.reduce(
      (sum, booking) => sum + companyShareOf(booking),
      0
    );

    const driverShare = bookings.reduce(
      (sum, booking) => sum + driverShareOf(booking),
      0
    );

    const pendingPayout = bookings
      .filter((booking) => !isPayoutPaid(booking))
      .reduce(
        (sum, booking) =>
          sum + driverShareOf(booking),
        0
      );

    const paidPayout = bookings
      .filter(isPayoutPaid)
      .reduce(
        (sum, booking) =>
          sum + driverShareOf(booking),
        0
      );

    const todayRevenue = bookings
      .filter((booking) =>
        sameDay(
          booking.completed_at || booking.created_at
        )
      )
      .reduce(
        (sum, booking) => sum + fareOf(booking),
        0
      );

    const weeklyRevenue = bookings
      .filter((booking) =>
        dateWithinDays(
          booking.completed_at || booking.created_at,
          7
        )
      )
      .reduce(
        (sum, booking) => sum + fareOf(booking),
        0
      );

    const monthlyRevenue = bookings
      .filter((booking) =>
        dateWithinDays(
          booking.completed_at || booking.created_at,
          30
        )
      )
      .reduce(
        (sum, booking) => sum + fareOf(booking),
        0
      );

    const averageFare =
      bookings.length > 0
        ? totalRevenue / bookings.length
        : 0;

    const websiteRevenue = bookings
      .filter((booking) =>
        normalize(booking.source).includes("website")
      )
      .reduce(
        (sum, booking) => sum + fareOf(booking),
        0
      );

    const appRevenue = bookings
      .filter((booking) =>
        normalize(booking.source).includes("app")
      )
      .reduce(
        (sum, booking) => sum + fareOf(booking),
        0
      );

    const refunds = bookings.filter(isRefunded);

    return {
      paid,
      unpaid,
      completed,
      totalRevenue,
      paidRevenue,
      unpaidRevenue,
      companyShare,
      driverShare,
      pendingPayout,
      paidPayout,
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      averageFare,
      websiteRevenue,
      appRevenue,
      refunds,
    };
  }, [bookings]);

  function matchesFilter(booking: BookingRecord) {
    switch (filter) {
      case "paid":
        return isPaid(booking);
      case "unpaid":
        return !isPaid(booking);
      case "stripe":
        return normalize(
          booking.payment_method
        ).includes("stripe");
      case "zelle":
        return normalize(
          booking.payment_method
        ).includes("zelle");
      case "cashapp":
        return normalize(
          booking.payment_method
        ).includes("cashapp");
      case "payoutpending":
        return !isPayoutPaid(booking);
      case "payoutpaid":
        return isPayoutPaid(booking);
      case "refund":
        return isRefunded(booking);
      case "website":
        return normalize(
          booking.source
        ).includes("website");
      case "app":
        return normalize(
          booking.source
        ).includes("app");
      case "all":
      default:
        return true;
    }
  }

  const filteredBookings = useMemo(() => {
    const search = query.trim().toLowerCase();

    return bookings.filter((booking) => {
      if (!matchesFilter(booking)) return false;

      if (!search) return true;

      return [
        booking.id,
        booking.invoice_no,
        passengerName(booking),
        passengerEmail(booking),
        passengerPhone(booking),
        driverName(booking),
        booking.payment_status,
        booking.payment_method,
        pickup(booking),
        dropoff(booking),
        booking.source,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [bookings, filter, query]);

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
            {
              backgroundColor: colors.background,
            },
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

  function PaymentCard({
    booking,
  }: {
    booking: BookingRecord;
  }) {
    const paid = isPaid(booking);
    const payoutPaid = isPayoutPaid(booking);
    const updating =
      String(updatingId) === String(booking.id);

    return (
      <View
        style={[
          styles.paymentCard,
          {
            width: cardWidth(),
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.cardBorder,
          },
          theme.shadows.soft,
        ]}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.cardIcon,
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
              size={22}
              color={
                paid
                  ? theme.colors.success
                  : theme.colors.warning
              }
            />
          </View>

          <View style={styles.cardTitleArea}>
            <Text
              style={[
                styles.cardTitle,
                { color: theme.colors.text },
              ]}
            >
              Trip #{booking.id}
            </Text>

            <Text
              style={[
                styles.cardSubtitle,
                { color: theme.colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {passengerName(booking)}
            </Text>
          </View>

          <View style={styles.cardBadges}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: paid
                    ? theme.colors.successSoft
                    : theme.colors.warningSoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
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
                {sourceLabel(booking)}
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
            {pickup(booking)} → {dropoff(booking)}
          </Text>
        </View>

        <View
          style={[
            styles.financeGrid,
            { borderTopColor: theme.colors.divider },
          ]}
        >
          <View style={styles.financeItem}>
            <Text
              style={[
                styles.financeLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              TOTAL FARE
            </Text>
            <Text
              style={[
                styles.financeValue,
                { color: theme.colors.gold },
              ]}
            >
              {money(fareOf(booking))}
            </Text>
          </View>

          <View style={styles.financeItem}>
            <Text
              style={[
                styles.financeLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              DRIVER 70%
            </Text>
            <Text
              style={[
                styles.financeValue,
                { color: theme.colors.success },
              ]}
            >
              {money(driverShareOf(booking))}
            </Text>
          </View>

          <View style={styles.financeItem}>
            <Text
              style={[
                styles.financeLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              COMPANY 30%
            </Text>
            <Text
              style={[
                styles.financeValue,
                { color: theme.colors.info },
              ]}
            >
              {money(companyShareOf(booking))}
            </Text>
          </View>

          <View style={styles.financeItem}>
            <Text
              style={[
                styles.financeLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              PAYOUT
            </Text>
            <Text
              style={[
                styles.financeValue,
                {
                  color: payoutPaid
                    ? theme.colors.success
                    : theme.colors.warning,
                },
              ]}
            >
              {payoutPaid ? "Paid" : "Pending"}
            </Text>
          </View>
        </View>

        <View style={styles.detailBlock}>
          <View style={styles.detailRow}>
            <Ionicons
              name="person-outline"
              size={17}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.detailText,
                { color: theme.colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {driverName(booking)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons
              name="card-outline"
              size={17}
              color={theme.colors.info}
            />
            <Text
              style={[
                styles.detailText,
                { color: theme.colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {booking.payment_method || "Method not confirmed"}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons
              name="receipt-outline"
              size={17}
              color={theme.colors.success}
            />
            <Text
              style={[
                styles.detailText,
                { color: theme.colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              Invoice: {booking.invoice_no || `TRIP-${booking.id}`}
            </Text>
          </View>
        </View>

        <View style={styles.primaryActions}>
          {!paid ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: theme.colors.successSoft,
                  borderColor: theme.colors.success,
                },
              ]}
              onPress={() => confirmPaid(booking)}
              disabled={updating}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={17}
                color={theme.colors.success}
              />
              <Text
                style={[
                  styles.actionText,
                  { color: theme.colors.success },
                ]}
              >
                Mark Paid
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: theme.colors.warningSoft,
                  borderColor: theme.colors.warning,
                },
              ]}
              onPress={() => markUnpaid(booking)}
              disabled={updating}
            >
              <Ionicons
                name="close-circle-outline"
                size={17}
                color={theme.colors.warning}
              />
              <Text
                style={[
                  styles.actionText,
                  { color: theme.colors.warning },
                ]}
              >
                Mark Unpaid
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor:
                  theme.colors.goldTransparent,
                borderColor: theme.colors.gold,
              },
            ]}
            onPress={() =>
              confirmManualPayment(booking, "Zelle")
            }
            disabled={updating}
          >
            <Ionicons
              name="cash-outline"
              size={17}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.actionText,
                { color: theme.colors.gold },
              ]}
            >
              Zelle
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor:
                  theme.colors.goldTransparent,
                borderColor: theme.colors.gold,
              },
            ]}
            onPress={() =>
              confirmManualPayment(booking, "Cash App")
            }
            disabled={updating}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={17}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.actionText,
                { color: theme.colors.gold },
              ]}
            >
              Cash App
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.primaryActions}>
          {!payoutPaid ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: theme.colors.infoSoft,
                  borderColor: theme.colors.info,
                },
              ]}
              onPress={() => markPayoutPaid(booking)}
              disabled={updating}
            >
              <Ionicons
                name="wallet-outline"
                size={17}
                color={theme.colors.info}
              />
              <Text
                style={[
                  styles.actionText,
                  { color: theme.colors.info },
                ]}
              >
                Payout Paid
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: theme.colors.warningSoft,
                  borderColor: theme.colors.warning,
                },
              ]}
              onPress={() =>
                markPayoutPending(booking)
              }
              disabled={updating}
            >
              <Ionicons
                name="time-outline"
                size={17}
                color={theme.colors.warning}
              />
              <Text
                style={[
                  styles.actionText,
                  { color: theme.colors.warning },
                ]}
              >
                Payout Pending
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: theme.colors.infoSoft,
                borderColor: theme.colors.info,
              },
            ]}
            onPress={() => sendPaymentReminder(booking)}
          >
            <Ionicons
              name="notifications-outline"
              size={17}
              color={theme.colors.info}
            />
            <Text
              style={[
                styles.actionText,
                { color: theme.colors.info },
              ]}
            >
              Reminder
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor:
                  theme.colors.goldTransparent,
                borderColor: theme.colors.gold,
              },
            ]}
            onPress={() => sendSmsReceipt(booking)}
          >
            <Ionicons
              name="receipt-outline"
              size={17}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.actionText,
                { color: theme.colors.gold },
              ]}
            >
              SMS Receipt
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.secondaryActions,
            { borderTopColor: theme.colors.divider },
          ]}
        >
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => callPassenger(booking)}
          >
            <Ionicons
              name="call-outline"
              size={19}
              color={theme.colors.success}
            />
            <Text
              style={[
                styles.secondaryActionText,
                { color: theme.colors.textMuted },
              ]}
            >
              Call
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => sendEmailReceipt(booking)}
          >
            <Ionicons
              name="mail-outline"
              size={19}
              color={theme.colors.info}
            />
            <Text
              style={[
                styles.secondaryActionText,
                { color: theme.colors.textMuted },
              ]}
            >
              Email
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => shareReceipt(booking)}
          >
            <Ionicons
              name="share-social-outline"
              size={19}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.secondaryActionText,
                { color: theme.colors.textMuted },
              ]}
            >
              Share
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => {
              setSelectedBooking(booking);
              setDetailsVisible(true);
            }}
          >
            <Ionicons
              name="information-circle-outline"
              size={19}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.secondaryActionText,
                { color: theme.colors.textMuted },
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
          color={theme.colors.gold}
        />

        <Text
          style={[
            styles.loadingText,
            { color: theme.colors.textSecondary },
          ]}
        >
          Loading Finance & Revenue Command Center...
        </Text>
      </View>
    );
  }

  const filters: {
    key: PaymentFilter;
    label: string;
    count: number;
  }[] = [
    {
      key: "all",
      label: "All",
      count: bookings.length,
    },
    {
      key: "paid",
      label: "Paid",
      count: summary.paid.length,
    },
    {
      key: "unpaid",
      label: "Unpaid",
      count: summary.unpaid.length,
    },
    {
      key: "stripe",
      label: "Stripe",
      count: bookings.filter((booking) =>
        normalize(
          booking.payment_method
        ).includes("stripe")
      ).length,
    },
    {
      key: "zelle",
      label: "Zelle",
      count: bookings.filter((booking) =>
        normalize(
          booking.payment_method
        ).includes("zelle")
      ).length,
    },
    {
      key: "cashapp",
      label: "Cash App",
      count: bookings.filter((booking) =>
        normalize(
          booking.payment_method
        ).includes("cashapp")
      ).length,
    },
    {
      key: "payoutpending",
      label: "Payout Pending",
      count: bookings.filter(
        (booking) => !isPayoutPaid(booking)
      ).length,
    },
    {
      key: "payoutpaid",
      label: "Payout Paid",
      count: bookings.filter(isPayoutPaid).length,
    },
    {
      key: "refund",
      label: "Refunds",
      count: summary.refunds.length,
    },
    {
      key: "website",
      label: "Website",
      count: bookings.filter((booking) =>
        normalize(
          booking.source
        ).includes("website")
      ).length,
    },
    {
      key: "app",
      label: "Passenger App",
      count: bookings.filter((booking) =>
        normalize(booking.source).includes("app")
      ).length,
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
                await loadPayments(false);
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
                ANGEL EXPRESS FINANCE
              </Text>

              <Text
                style={[
                  styles.pageTitle,
                  { color: theme.colors.text },
                ]}
              >
                Finance & Revenue Command Center
              </Text>

              <Text
                style={[
                  styles.pageSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                Monitor fares, revenue, payment status, manual
                confirmations, company share, driver payouts, receipts,
                and outstanding balances.
              </Text>
            </View>
          </View>

          <View style={styles.metricGrid}>
            <MetricCard
              label="Today's Revenue"
              value={money(summary.todayRevenue)}
              icon="today-outline"
              tone="gold"
            />

            <MetricCard
              label="Weekly Revenue"
              value={money(summary.weeklyRevenue)}
              icon="calendar-outline"
              tone="success"
            />

            <MetricCard
              label="Monthly Revenue"
              value={money(summary.monthlyRevenue)}
              icon="bar-chart-outline"
              tone="info"
            />

            <MetricCard
              label="Lifetime Revenue"
              value={money(summary.totalRevenue)}
              icon="cash-outline"
              tone="gold"
            />

            <MetricCard
              label="Paid Revenue"
              value={money(summary.paidRevenue)}
              icon="checkmark-circle-outline"
              tone="success"
            />

            <MetricCard
              label="Outstanding"
              value={money(summary.unpaidRevenue)}
              icon="time-outline"
              tone={
                summary.unpaidRevenue > 0
                  ? "warning"
                  : "success"
              }
            />

            <MetricCard
              label="Company 30%"
              value={money(summary.companyShare)}
              icon="business-outline"
              tone="info"
            />

            <MetricCard
              label="Driver 70%"
              value={money(summary.driverShare)}
              icon="car-outline"
              tone="success"
            />

            <MetricCard
              label="Pending Payouts"
              value={money(summary.pendingPayout)}
              icon="wallet-outline"
              tone={
                summary.pendingPayout > 0
                  ? "warning"
                  : "success"
              }
            />

            <MetricCard
              label="Paid Payouts"
              value={money(summary.paidPayout)}
              icon="checkmark-done-outline"
              tone="success"
            />

            <MetricCard
              label="Average Fare"
              value={money(summary.averageFare)}
              icon="analytics-outline"
              tone="gold"
            />

            <MetricCard
              label="Refund Records"
              value={summary.refunds.length}
              icon="return-down-back-outline"
              tone={
                summary.refunds.length > 0
                  ? "danger"
                  : "success"
              }
            />
          </View>

          <View
            style={[
              styles.revenueSplitCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorderStrong,
              },
              theme.shadows.premium,
            ]}
          >
            <View style={styles.revenueSplitHeader}>
              <View>
                <Text
                  style={[
                    styles.sectionEyebrow,
                    { color: theme.colors.gold },
                  ]}
                >
                  REVENUE CHANNELS
                </Text>

                <Text
                  style={[
                    styles.revenueSplitTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  Booking Source Performance
                </Text>
              </View>

              <View
                style={[
                  styles.revenueIcon,
                  {
                    backgroundColor:
                      theme.colors.goldTransparent,
                  },
                ]}
              >
                <Ionicons
                  name="trending-up-outline"
                  size={24}
                  color={theme.colors.gold}
                />
              </View>
            </View>

            <View style={styles.revenueSourceGrid}>
              <View
                style={[
                  styles.revenueSourceCard,
                  {
                    backgroundColor: theme.colors.infoSoft,
                    borderColor: theme.colors.info,
                  },
                ]}
              >
                <Ionicons
                  name="globe-outline"
                  size={23}
                  color={theme.colors.info}
                />
                <Text
                  style={[
                    styles.revenueSourceValue,
                    { color: theme.colors.text },
                  ]}
                >
                  {money(summary.websiteRevenue)}
                </Text>
                <Text
                  style={[
                    styles.revenueSourceLabel,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Website Revenue
                </Text>
              </View>

              <View
                style={[
                  styles.revenueSourceCard,
                  {
                    backgroundColor:
                      theme.colors.goldTransparent,
                    borderColor: theme.colors.gold,
                  },
                ]}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={23}
                  color={theme.colors.gold}
                />
                <Text
                  style={[
                    styles.revenueSourceValue,
                    { color: theme.colors.text },
                  ]}
                >
                  {money(summary.appRevenue)}
                </Text>
                <Text
                  style={[
                    styles.revenueSourceLabel,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Passenger App Revenue
                </Text>
              </View>
            </View>
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
                placeholder="Search passenger, driver, invoice, trip, phone, email, or route"
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
                  filters.find(
                    (item) => item.key === filter
                  )?.label
                }{" "}
                Transactions
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
              onPress={() => loadPayments(false)}
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
              <Ionicons
                name="wallet-outline"
                size={34}
                color={theme.colors.gold}
              />

              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.text },
                ]}
              >
                No matching transactions
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
            <View style={styles.paymentGrid}>
              {filteredBookings.map((booking) => (
                <PaymentCard
                  key={String(booking.id)}
                  booking={booking}
                />
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
                      { color: theme.colors.gold },
                    ]}
                  >
                    TRANSACTION DETAILS
                  </Text>

                  <Text
                    style={[
                      styles.modalTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    {selectedBooking
                      ? `Trip #${selectedBooking.id}`
                      : "Payment Details"}
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

              {selectedBooking ? (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={
                    styles.detailsContent
                  }
                >
                  {[
                    [
                      "Passenger",
                      passengerName(selectedBooking),
                    ],
                    [
                      "Passenger Email",
                      passengerEmail(selectedBooking) ||
                        "Not provided",
                    ],
                    [
                      "Passenger Phone",
                      passengerPhone(selectedBooking) ||
                        "Not provided",
                    ],
                    [
                      "Driver",
                      driverName(selectedBooking),
                    ],
                    [
                      "Invoice",
                      selectedBooking.invoice_no ||
                        `TRIP-${selectedBooking.id}`,
                    ],
                    [
                      "Payment Status",
                      selectedBooking.payment_status ||
                        "unpaid",
                    ],
                    [
                      "Payment Method",
                      selectedBooking.payment_method ||
                        "Not confirmed",
                    ],
                    [
                      "Manual Confirmation",
                      selectedBooking.manual_payment_confirmed
                        ? "Yes"
                        : "No",
                    ],
                    [
                      "Driver Payout",
                      selectedBooking.driver_payout_status ||
                        selectedBooking.payout_status ||
                        "pending",
                    ],
                    [
                      "Fare",
                      money(fareOf(selectedBooking)),
                    ],
                    [
                      "Driver Share",
                      money(
                        driverShareOf(selectedBooking)
                      ),
                    ],
                    [
                      "Company Share",
                      money(
                        companyShareOf(selectedBooking)
                      ),
                    ],
                    [
                      "Tip",
                      money(tipOf(selectedBooking)),
                    ],
                    [
                      "Taxes",
                      money(taxesOf(selectedBooking)),
                    ],
                    [
                      "Discount",
                      money(discountOf(selectedBooking)),
                    ],
                    [
                      "Refund",
                      money(refundOf(selectedBooking)),
                    ],
                    [
                      "Pickup",
                      pickup(selectedBooking),
                    ],
                    [
                      "Drop-off",
                      dropoff(selectedBooking),
                    ],
                    [
                      "Created",
                      selectedBooking.created_at
                        ? new Date(
                            selectedBooking.created_at
                          ).toLocaleString()
                        : "Unknown",
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

  revenueSplitCard: {
    borderWidth: 1,
    borderRadius: 25,
    padding: 18,
    marginBottom: 22,
  },

  revenueSplitHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 5,
  },

  revenueSplitTitle: {
    fontSize: 20,
    fontWeight: "900",
  },

  revenueIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  revenueSourceGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },

  revenueSourceCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },

  revenueSourceValue: {
    marginTop: 14,
    fontSize: 20,
    fontWeight: "900",
  },

  revenueSourceLabel: {
    marginTop: 5,
    fontSize: 11,
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

  refreshText: {
    marginLeft: 7,
    fontSize: 12,
    fontWeight: "800",
  },

  paymentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  paymentCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  cardTitleArea: {
    flex: 1,
    paddingRight: 8,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
  },

  cardSubtitle: {
    marginTop: 3,
    fontSize: 10.5,
    fontWeight: "600",
  },

  cardBadges: {
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

  financeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    marginTop: 18,
    paddingTop: 15,
  },

  financeItem: {
    width: "50%",
    marginBottom: 14,
  },

  financeLabel: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  financeValue: {
    marginTop: 5,
    fontSize: 15,
    fontWeight: "900",
  },

  detailBlock: {
    marginTop: 2,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  detailText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    fontWeight: "700",
  },

  primaryActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },

  actionButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 11,
  },

  actionText: {
    marginLeft: 6,
    fontSize: 10.5,
    fontWeight: "900",
  },

  secondaryActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 13,
  },

  secondaryAction: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },

  secondaryActionText: {
    marginTop: 5,
    fontSize: 8.5,
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
