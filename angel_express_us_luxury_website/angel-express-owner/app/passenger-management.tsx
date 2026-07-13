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

type PassengerRecord = GenericRecord & {
  id?: string | number;
  user_id?: string | null;
  passenger_id?: string | null;
  profile_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  passenger_name?: string | null;
  email?: string | null;
  passenger_email?: string | null;
  phone?: string | null;
  passenger_phone?: string | null;
  phone_number?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  student_verified?: boolean | null;
  is_student?: boolean | null;
  rating?: number | string | null;
  total_trips?: number | null;
  quiet_ride?: boolean | null;
  preferred_music?: boolean | null;
  luggage_count?: number | null;
  notes?: string | null;
  special_notes?: string | null;
  preferences?: string | null;
  ride_preferences?: string | null;
  status?: string | null;
  account_status?: string | null;
  is_blacklisted?: boolean | null;
  blacklisted?: boolean | null;
  rewards_balance?: number | string | null;
  referral_credits?: number | string | null;
  profile_photo_url?: string | null;
  last_login_at?: string | null;
};

type BookingRecord = GenericRecord & {
  id: string | number;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
  user_id?: string | null;
  passenger_id?: string | null;
  name?: string | null;
  passenger_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  passenger_email?: string | null;
  phone?: string | null;
  passenger_phone?: string | null;
  status?: string | null;
  payment_status?: string | null;
  source?: string | null;
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
  student_verified?: boolean | null;
  is_student?: boolean | null;
  student_discount?: number | string | null;
};

type PassengerFilter =
  | "all"
  | "active"
  | "travelling"
  | "student"
  | "vip"
  | "support"
  | "blacklisted"
  | "new";

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

function passengerName(passenger: PassengerRecord) {
  const direct =
    `${passenger.first_name || ""} ${passenger.last_name || ""}`.trim();

  if (direct) return direct;

  const candidates = [
    passenger.full_name,
    passenger.passenger_name,
    passenger.name,
  ];

  const valid = candidates.find(
    (item) => item && !looksLikeEmail(String(item))
  );

  return valid ? String(valid) : "Passenger";
}

function passengerEmail(passenger: PassengerRecord) {
  return (
    passenger.email ||
    passenger.passenger_email ||
    (looksLikeEmail(passenger.name) ? passenger.name : "") ||
    ""
  );
}

function passengerPhone(passenger: PassengerRecord) {
  return (
    passenger.phone ||
    passenger.passenger_phone ||
    passenger.phone_number ||
    passenger.mobile ||
    passenger.mobile_number ||
    ""
  );
}

function cleanPhone(value?: string | null) {
  return String(value || "").replace(/[^\d+]/g, "");
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

function isCancelled(booking: BookingRecord) {
  return ["cancelled", "canceled"].includes(
    normalize(booking.status)
  );
}

function isTravelling(booking: BookingRecord) {
  return [
    "assigned",
    "driverassigned",
    "driveraccepted",
    "accepted",
    "arriving",
    "driverarrived",
    "arrivedatpickup",
    "pickedup",
    "inprogress",
    "active",
    "started",
  ].includes(normalize(booking.status));
}

function isOpenRecord(record: GenericRecord) {
  return ![
    "resolved",
    "closed",
    "completed",
    "dismissed",
    "cancelled",
    "canceled",
    "read",
    "approved",
    "rejected",
  ].includes(
    normalize(
      record.status ||
        record.ticket_status ||
        record.resolution_status ||
        record.review_status
    )
  );
}

function isStudentPassenger(passenger: PassengerRecord) {
  return (
    passenger.student_verified === true ||
    passenger.is_student === true ||
    normalize(passenger.student_status) === "verified"
  );
}

export default function PassengerManagementScreen() {
  const { theme, isDark } = useOwnerTheme();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingPassengerId, setUpdatingPassengerId] =
    useState<string | null>(null);

  const [passengersTable, setPassengersTable] =
    useState<PassengerRecord[]>([]);
  const [passengerProfiles, setPassengerProfiles] =
    useState<PassengerRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [ratings, setRatings] = useState<GenericRecord[]>([]);
  const [ratingSummary, setRatingSummary] =
    useState<GenericRecord[]>([]);
  const [supportMessages, setSupportMessages] =
    useState<GenericRecord[]>([]);
  const [familyCheckins, setFamilyCheckins] =
    useState<GenericRecord[]>([]);
  const [studentVerifications, setStudentVerifications] =
    useState<GenericRecord[]>([]);
  const [notifications, setNotifications] =
    useState<GenericRecord[]>([]);
  const [referralRewards, setReferralRewards] =
    useState<GenericRecord[]>([]);

  const [query, setQuery] = useState("");
  const [filter, setFilter] =
    useState<PassengerFilter>("all");

  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedPassenger, setSelectedPassenger] =
    useState<PassengerRecord | null>(null);

  const isTablet = width >= 700;
  const isLarge = width >= 1050;

  useFocusEffect(
    useCallback(() => {
      loadPassengerData();
    }, [])
  );

  useEffect(() => {
    const channel = supabase
      .channel("owner-passenger-operations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "passengers" },
        () => loadPassengerData(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "passenger_profiles",
        },
        () => loadPassengerData(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadPassengerData(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "passenger_ratings",
        },
        () => loadPassengerData(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_messages",
        },
        () => loadPassengerData(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_verifications",
        },
        () => loadPassengerData(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadPassengerData(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const [
        passengersResponse,
        profilesResponse,
        bookingsResponse,
        ratingsResponse,
        ratingSummaryResponse,
        supportResponse,
        familyResponse,
        studentResponse,
        notificationsResponse,
        rewardsResponse,
      ] = await Promise.all([
        supabase
          .from("passengers")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("passenger_profiles")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("passenger_ratings")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("passenger_rating_summary")
          .select("*"),

        supabase
          .from("support_messages")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("family_checkins")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("student_verifications")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("passenger_notifications")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("referral_rewards")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (bookingsResponse.error) {
        throw bookingsResponse.error;
      }

      setPassengersTable(passengersResponse.data || []);
      setPassengerProfiles(profilesResponse.data || []);
      setBookings(bookingsResponse.data || []);
      setRatings(ratingsResponse.data || []);
      setRatingSummary(ratingSummaryResponse.data || []);
      setSupportMessages(supportResponse.data || []);
      setFamilyCheckins(familyResponse.data || []);
      setStudentVerifications(studentResponse.data || []);
      setNotifications(notificationsResponse.data || []);
      setReferralRewards(rewardsResponse.data || []);
    } catch (error: any) {
      Alert.alert(
        "Passenger Operations Error",
        error?.message || "Unable to load passenger operations."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function identityKeys(passenger: PassengerRecord) {
    return [
      passenger.id,
      passenger.user_id,
      passenger.passenger_id,
      passenger.profile_id,
      passengerEmail(passenger).toLowerCase(),
      passengerPhone(passenger),
    ]
      .filter(Boolean)
      .map(String);
  }

  const passengers = useMemo(() => {
    const map = new Map<string, PassengerRecord>();

    const seedRows: PassengerRecord[] = [
      ...passengersTable,
      ...passengerProfiles,
      ...bookings.map((booking) => ({
        ...booking,
        id:
          booking.user_id ||
          booking.passenger_id ||
          passengerEmail(booking) ||
          passengerPhone(booking) ||
          String(booking.id),
      })),
    ];

    seedRows.forEach((row) => {
      const keys = identityKeys(row);
      const existing = keys
        .map((key) => map.get(key))
        .find(Boolean);

      const merged = existing
        ? {
            ...existing,
            ...row,
            emergency_contact_name:
              row.emergency_contact_name ||
              existing.emergency_contact_name,
            emergency_contact_phone:
              row.emergency_contact_phone ||
              existing.emergency_contact_phone,
          }
        : { ...row };

      identityKeys(merged).forEach((key) => map.set(key, merged));
    });

    const unique = new Map<string, PassengerRecord>();

    Array.from(map.values()).forEach((passenger) => {
      const canonical =
        passenger.user_id ||
        passenger.id ||
        passengerEmail(passenger) ||
        passengerPhone(passenger);

      if (canonical) {
        unique.set(String(canonical), passenger);
      }
    });

    return Array.from(unique.values());
  }, [passengersTable, passengerProfiles, bookings]);

  function passengerBookings(passenger: PassengerRecord) {
    const keys = new Set(identityKeys(passenger));

    return bookings.filter((booking) => {
      const bookingKeys = [
        booking.user_id,
        booking.passenger_id,
        passengerEmail(booking).toLowerCase(),
        passengerPhone(booking),
      ]
        .filter(Boolean)
        .map(String);

      return bookingKeys.some((key) => keys.has(key));
    });
  }

  function passengerCompletedTrips(passenger: PassengerRecord) {
    return passengerBookings(passenger).filter(isCompleted);
  }

  function passengerCancelledTrips(passenger: PassengerRecord) {
    return passengerBookings(passenger).filter(isCancelled);
  }

  function passengerActiveTrips(passenger: PassengerRecord) {
    return passengerBookings(passenger).filter(isTravelling);
  }

  function passengerRevenue(passenger: PassengerRecord) {
    return passengerCompletedTrips(passenger).reduce(
      (sum, booking) => sum + bookingAmount(booking),
      0
    );
  }

  function averageTripValue(passenger: PassengerRecord) {
    const trips = passengerCompletedTrips(passenger);

    if (trips.length === 0) return 0;

    return passengerRevenue(passenger) / trips.length;
  }

  function passengerRatings(passenger: PassengerRecord) {
    const keys = new Set(identityKeys(passenger));

    return ratings.filter((rating) => {
      const ratingKeys = [
        rating.passenger_id,
        rating.passenger_user_id,
        rating.user_id,
        rating.passenger_email?.toLowerCase(),
      ]
        .filter(Boolean)
        .map(String);

      return ratingKeys.some((key) => keys.has(key));
    });
  }

  function passengerRating(passenger: PassengerRecord) {
    const summary = ratingSummary.find((row) => {
      const keys = new Set(identityKeys(passenger));

      return [
        row.passenger_id,
        row.passenger_user_id,
        row.user_id,
        row.passenger_email?.toLowerCase(),
      ]
        .filter(Boolean)
        .map(String)
        .some((key) => keys.has(key));
    });

    if (summary) {
      return Number(
        summary.average_rating ||
          summary.overall_rating ||
          summary.rating ||
          5
      );
    }

    const rows = passengerRatings(passenger);

    if (rows.length === 0) {
      return Number(passenger.rating || 5);
    }

    return (
      rows.reduce(
        (sum, row) =>
          sum +
          Number(
            row.overall_rating ||
              row.rating ||
              row.score ||
              5
          ),
        0
      ) / rows.length
    );
  }

  function passengerSupport(passenger: PassengerRecord) {
    const keys = new Set(identityKeys(passenger));

    return supportMessages.filter((message) =>
      [
        message.passenger_id,
        message.user_id,
        message.passenger_user_id,
        message.passenger_email?.toLowerCase(),
      ]
        .filter(Boolean)
        .map(String)
        .some((key) => keys.has(key))
    );
  }

  function passengerCheckins(passenger: PassengerRecord) {
    const keys = new Set(identityKeys(passenger));

    return familyCheckins.filter((checkin) =>
      [
        checkin.passenger_id,
        checkin.user_id,
        checkin.passenger_user_id,
        checkin.passenger_email?.toLowerCase(),
      ]
        .filter(Boolean)
        .map(String)
        .some((key) => keys.has(key))
    );
  }

  function passengerStudentVerification(passenger: PassengerRecord) {
    const keys = new Set(identityKeys(passenger));

    return studentVerifications.find((verification) =>
      [
        verification.passenger_id,
        verification.user_id,
        verification.passenger_user_id,
        verification.email?.toLowerCase(),
      ]
        .filter(Boolean)
        .map(String)
        .some((key) => keys.has(key))
    );
  }

  function passengerNotifications(passenger: PassengerRecord) {
    const keys = new Set(identityKeys(passenger));

    return notifications.filter((notification) =>
      [
        notification.passenger_id,
        notification.user_id,
        notification.passenger_user_id,
        notification.passenger_email?.toLowerCase(),
      ]
        .filter(Boolean)
        .map(String)
        .some((key) => keys.has(key))
    );
  }

  function passengerRewards(passenger: PassengerRecord) {
    const keys = new Set(identityKeys(passenger));

    return referralRewards.filter((reward) =>
      [
        reward.passenger_id,
        reward.user_id,
        reward.referrer_id,
        reward.passenger_email?.toLowerCase(),
      ]
        .filter(Boolean)
        .map(String)
        .some((key) => keys.has(key))
    );
  }

  function rewardsBalance(passenger: PassengerRecord) {
    const records = passengerRewards(passenger);

    const calculated = records.reduce(
      (sum, reward) =>
        sum +
        Number(
          reward.amount ||
            reward.credit_amount ||
            reward.reward_value ||
            0
        ),
      0
    );

    return Number(
      passenger.rewards_balance ||
        passenger.referral_credits ||
        calculated
    );
  }

  function frequentRoute(passenger: PassengerRecord) {
    const counts = new Map<string, number>();

    passengerBookings(passenger).forEach((booking) => {
      const pickup =
        booking.pickup_address ||
        booking.pickup ||
        booking.pickup_location ||
        "Pickup";

      const dropoff =
        booking.dropoff_address ||
        booking.dropoff ||
        booking.dropoff_location ||
        "Drop-off";

      const route = `${pickup} → ${dropoff}`;

      counts.set(route, (counts.get(route) || 0) + 1);
    });

    return (
      Array.from(counts.entries()).sort(
        (first, second) => second[1] - first[1]
      )[0]?.[0] || "No frequent route yet"
    );
  }

  function isBlacklisted(passenger: PassengerRecord) {
    return (
      passenger.is_blacklisted === true ||
      passenger.blacklisted === true ||
      ["blacklisted", "blocked", "suspended"].includes(
        normalize(
          passenger.account_status || passenger.status
        )
      )
    );
  }

  function isVip(passenger: PassengerRecord) {
    return (
      passengerCompletedTrips(passenger).length >= 5 ||
      passengerRevenue(passenger) >= 1000 ||
      normalize(passenger.membership_level) === "vip"
    );
  }

  function isNewPassenger(passenger: PassengerRecord) {
    if (!passenger.created_at) return false;

    const created = new Date(passenger.created_at).getTime();

    if (Number.isNaN(created)) return false;

    return Date.now() - created <= 7 * 86400000;
  }

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

  function matchesFilter(
    passenger: PassengerRecord,
    currentFilter: PassengerFilter
  ) {
    switch (currentFilter) {
      case "active":
        return passengerBookings(passenger).length > 0;
      case "travelling":
        return passengerActiveTrips(passenger).length > 0;
      case "student":
        return (
          isStudentPassenger(passenger) ||
          Boolean(passengerStudentVerification(passenger))
        );
      case "vip":
        return isVip(passenger);
      case "support":
        return passengerSupport(passenger).some(isOpenRecord);
      case "blacklisted":
        return isBlacklisted(passenger);
      case "new":
        return isNewPassenger(passenger);
      case "all":
      default:
        return true;
    }
  }

  const filteredPassengers = useMemo(() => {
    const search = query.trim().toLowerCase();

    return passengers.filter((passenger) => {
      if (!matchesFilter(passenger, filter)) {
        return false;
      }

      if (!search) return true;

      return [
        passengerName(passenger),
        passengerEmail(passenger),
        passengerPhone(passenger),
        passenger.emergency_contact_name,
        passenger.emergency_contact_phone,
        frequentRoute(passenger),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [
    passengers,
    filter,
    query,
    bookings,
    supportMessages,
    studentVerifications,
  ]);

  const summary = useMemo(() => {
    const travelling = passengers.filter(
      (passenger) =>
        passengerActiveTrips(passenger).length > 0
    );

    const student = passengers.filter(
      (passenger) =>
        isStudentPassenger(passenger) ||
        Boolean(passengerStudentVerification(passenger))
    );

    const vip = passengers.filter(isVip);

    const blacklisted = passengers.filter(isBlacklisted);

    const supportQueue = passengers.filter((passenger) =>
      passengerSupport(passenger).some(isOpenRecord)
    );

    const totalRevenue = passengers.reduce(
      (sum, passenger) =>
        sum + passengerRevenue(passenger),
      0
    );

    const averageRating =
      passengers.length > 0
        ? passengers.reduce(
            (sum, passenger) =>
              sum + passengerRating(passenger),
            0
          ) / passengers.length
        : 0;

    return {
      travelling,
      student,
      vip,
      blacklisted,
      supportQueue,
      totalRevenue,
      averageRating,
      newPassengers: passengers.filter(isNewPassenger),
    };
  }, [
    passengers,
    bookings,
    ratings,
    ratingSummary,
    supportMessages,
    studentVerifications,
  ]);

  async function updatePassengerStatus(
    passenger: PassengerRecord,
    update: GenericRecord,
    message: string
  ) {
    const targetId =
      passenger.id ||
      passenger.user_id ||
      passenger.passenger_id;

    if (!targetId) {
      Alert.alert(
        "Passenger Update",
        "This passenger does not have a profile record that can be updated."
      );
      return;
    }

    try {
      setUpdatingPassengerId(String(targetId));

      let response = await supabase
        .from("passenger_profiles")
        .update(update)
        .or(
          `id.eq.${targetId},user_id.eq.${targetId},passenger_id.eq.${targetId}`
        );

      if (response.error) {
        response = await supabase
          .from("passengers")
          .update(update)
          .eq("id", targetId);
      }

      if (response.error) throw response.error;

      Alert.alert("Success", message);
      await loadPassengerData(false);
    } catch (error: any) {
      Alert.alert(
        "Update Failed",
        error?.message || "Unable to update passenger."
      );
    } finally {
      setUpdatingPassengerId(null);
    }
  }

  function blacklistPassenger(passenger: PassengerRecord) {
    Alert.alert(
      "Blacklist Passenger",
      `Blacklist ${passengerName(passenger)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Blacklist",
          style: "destructive",
          onPress: () =>
            updatePassengerStatus(
              passenger,
              {
                is_blacklisted: true,
                status: "blacklisted",
              },
              `${passengerName(passenger)} has been blacklisted.`
            ),
        },
      ]
    );
  }

  function restorePassenger(passenger: PassengerRecord) {
    updatePassengerStatus(
      passenger,
      {
        is_blacklisted: false,
        status: "active",
      },
      `${passengerName(passenger)} has been restored.`
    );
  }

  function callPassenger(passenger: PassengerRecord) {
    const phone = cleanPhone(passengerPhone(passenger));

    if (!phone) {
      Alert.alert(
        "Phone unavailable",
        "Passenger phone number is not available."
      );
      return;
    }

    Linking.openURL(`tel:${phone}`);
  }

  function smsPassenger(passenger: PassengerRecord) {
    const phone = cleanPhone(passengerPhone(passenger));

    if (!phone) {
      Alert.alert(
        "Phone unavailable",
        "Passenger phone number is not available."
      );
      return;
    }

    const message = `Hello ${passengerName(
      passenger
    )}, this is Angel Express support.`;

    Linking.openURL(
      `sms:${phone}?body=${encodeURIComponent(message)}`
    );
  }

  function whatsappPassenger(passenger: PassengerRecord) {
    const phone = cleanPhone(passengerPhone(passenger)).replace(
      "+",
      ""
    );

    if (!phone) {
      Alert.alert(
        "WhatsApp unavailable",
        "Passenger phone number is not available."
      );
      return;
    }

    const message = `Hello ${passengerName(
      passenger
    )}, this is Angel Express support.`;

    Linking.openURL(
      `https://wa.me/${phone}?text=${encodeURIComponent(
        message
      )}`
    );
  }

  function emailPassenger(passenger: PassengerRecord) {
    const email = passengerEmail(passenger);

    if (!email) {
      Alert.alert(
        "Email unavailable",
        "Passenger email is not available."
      );
      return;
    }

    Linking.openURL(
      `mailto:${email}?subject=${encodeURIComponent(
        "Angel Express Support"
      )}`
    );
  }

  function openPassengerChat(passenger: PassengerRecord) {
    const latestBooking = passengerBookings(passenger)[0];

    if (!latestBooking) {
      Alert.alert(
        "No Trip",
        "This passenger has no trip history for in-app chat."
      );
      return;
    }

    router.push({
      pathname: "/owner-chat",
      params: {
        bookingId: String(latestBooking.id),
        receiverRole: "passenger",
        passengerName: passengerName(passenger),
      },
    } as any);
  }

  async function sharePassengerSummary(
    passenger: PassengerRecord
  ) {
    const summaryText = [
      `Passenger: ${passengerName(passenger)}`,
      `Email: ${passengerEmail(passenger) || "Not provided"}`,
      `Phone: ${passengerPhone(passenger) || "Not provided"}`,
      `Trips: ${passengerBookings(passenger).length}`,
      `Completed: ${passengerCompletedTrips(passenger).length}`,
      `Lifetime revenue: ${money(passengerRevenue(passenger))}`,
      `Rating: ${passengerRating(passenger).toFixed(1)}`,
    ].join("\n");

    await Share.share({
      title: "Angel Express Passenger Summary",
      message: summaryText,
    });
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

  function PassengerCard({
    passenger,
  }: {
    passenger: PassengerRecord;
  }) {
    const trips = passengerBookings(passenger);
    const completed = passengerCompletedTrips(passenger);
    const cancelled = passengerCancelledTrips(passenger);
    const travelling = passengerActiveTrips(passenger);
    const support = passengerSupport(passenger);
    const checkins = passengerCheckins(passenger);
    const studentVerification =
      passengerStudentVerification(passenger);
    const rating = passengerRating(passenger);
    const blacklisted = isBlacklisted(passenger);
    const vip = isVip(passenger);
    const student =
      isStudentPassenger(passenger) ||
      Boolean(studentVerification);

    const targetId =
      passenger.id ||
      passenger.user_id ||
      passenger.passenger_id ||
      passengerEmail(passenger);

    const updating =
      String(updatingPassengerId) === String(targetId);

    return (
      <View
        style={[
          styles.passengerCard,
          {
            width: cardWidth(),
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.cardBorder,
          },
          theme.shadows.soft,
        ]}
      >
        <View style={styles.passengerHeader}>
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
              {passengerName(passenger)
                .charAt(0)
                .toUpperCase()}
            </Text>

            {travelling.length > 0 ? (
              <View
                style={[
                  styles.activityDot,
                  {
                    backgroundColor: theme.colors.success,
                    borderColor: theme.colors.card,
                  },
                ]}
              />
            ) : null}
          </View>

          <View style={styles.passengerTitleArea}>
            <Text
              style={[
                styles.passengerName,
                { color: theme.colors.text },
              ]}
              numberOfLines={1}
            >
              {passengerName(passenger)}
            </Text>

            <Text
              style={[
                styles.passengerContact,
                { color: theme.colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {passengerEmail(passenger) || "Email not provided"}
            </Text>

            <Text
              style={[
                styles.passengerContact,
                { color: theme.colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {passengerPhone(passenger) || "Phone not provided"}
            </Text>
          </View>

          <View style={styles.headerBadges}>
            {vip ? (
              <View
                style={[
                  styles.headerBadge,
                  {
                    backgroundColor:
                      theme.colors.goldTransparent,
                  },
                ]}
              >
                <Ionicons
                  name="diamond-outline"
                  size={12}
                  color={theme.colors.gold}
                />
                <Text
                  style={[
                    styles.headerBadgeText,
                    { color: theme.colors.gold },
                  ]}
                >
                  VIP
                </Text>
              </View>
            ) : null}

            {student ? (
              <View
                style={[
                  styles.headerBadge,
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
                    styles.headerBadgeText,
                    { color: theme.colors.success },
                  ]}
                >
                  Student
                </Text>
              </View>
            ) : null}

            {blacklisted ? (
              <View
                style={[
                  styles.headerBadge,
                  {
                    backgroundColor:
                      theme.colors.dangerSoft,
                  },
                ]}
              >
                <Ionicons
                  name="ban-outline"
                  size={12}
                  color={theme.colors.danger}
                />
                <Text
                  style={[
                    styles.headerBadgeText,
                    { color: theme.colors.danger },
                  ]}
                >
                  Blocked
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View
            style={[
              styles.smallBadge,
              {
                backgroundColor:
                  theme.colors.goldTransparent,
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
              {rating.toFixed(1)}
            </Text>
          </View>

          {travelling.length > 0 ? (
            <View
              style={[
                styles.smallBadge,
                {
                  backgroundColor:
                    theme.colors.successSoft,
                },
              ]}
            >
              <Ionicons
                name="navigate-outline"
                size={13}
                color={theme.colors.success}
              />
              <Text
                style={[
                  styles.smallBadgeText,
                  { color: theme.colors.success },
                ]}
              >
                Travelling
              </Text>
            </View>
          ) : null}

          {support.some(isOpenRecord) ? (
            <View
              style={[
                styles.smallBadge,
                {
                  backgroundColor:
                    theme.colors.warningSoft,
                },
              ]}
            >
              <Ionicons
                name="headset-outline"
                size={13}
                color={theme.colors.warning}
              />
              <Text
                style={[
                  styles.smallBadgeText,
                  { color: theme.colors.warning },
                ]}
              >
                Support Open
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
              name="car-outline"
              size={18}
              color={theme.colors.info}
            />
            <Text
              style={[
                styles.operationValue,
                { color: theme.colors.text },
              ]}
            >
              {trips.length}
            </Text>
            <Text
              style={[
                styles.operationLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              Total Trips
            </Text>
          </View>

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
              name="close-circle-outline"
              size={18}
              color={theme.colors.danger}
            />
            <Text
              style={[
                styles.operationValue,
                { color: theme.colors.text },
              ]}
            >
              {cancelled.length}
            </Text>
            <Text
              style={[
                styles.operationLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              Cancelled
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
              {money(passengerRevenue(passenger))}
            </Text>
            <Text
              style={[
                styles.operationLabel,
                { color: theme.colors.textMuted },
              ]}
            >
              Revenue
            </Text>
          </View>
        </View>

        <View style={styles.infoBlock}>
          <View style={styles.infoRow}>
            <Ionicons
              name="location-outline"
              size={18}
              color={theme.colors.info}
            />
            <View style={styles.infoTextArea}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textMuted },
                ]}
              >
                FREQUENT ROUTE
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  { color: theme.colors.textSecondary },
                ]}
                numberOfLines={2}
              >
                {frequentRoute(passenger)}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              name="people-outline"
              size={18}
              color={theme.colors.success}
            />
            <View style={styles.infoTextArea}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textMuted },
                ]}
              >
                EMERGENCY CONTACT
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {passenger.emergency_contact_name ||
                  "Not provided"}
              </Text>
              <Text
                style={[
                  styles.infoSubValue,
                  { color: theme.colors.textMuted },
                ]}
              >
                {passenger.emergency_contact_phone ||
                  "Phone not provided"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              name="gift-outline"
              size={18}
              color={theme.colors.gold}
            />
            <View style={styles.infoTextArea}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textMuted },
                ]}
              >
                REWARDS
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {money(rewardsBalance(passenger))}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={theme.colors.success}
            />
            <View style={styles.infoTextArea}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textMuted },
                ]}
              >
                FAMILY CHECK-INS
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {checkins.length}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.contactActions}>
          <TouchableOpacity
            style={styles.contactAction}
            onPress={() => callPassenger(passenger)}
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
            onPress={() => smsPassenger(passenger)}
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
            onPress={() => whatsappPassenger(passenger)}
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
            onPress={() => emailPassenger(passenger)}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.contactActionText,
                { color: theme.colors.textMuted },
              ]}
            >
              Email
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactAction}
            onPress={() => openPassengerChat(passenger)}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={20}
              color={theme.colors.info}
            />
            <Text
              style={[
                styles.contactActionText,
                { color: theme.colors.textMuted },
              ]}
            >
              Chat
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.managementActions,
            { borderTopColor: theme.colors.divider },
          ]}
        >
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
              setSelectedPassenger(passenger);
              setDetailsVisible(true);
            }}
          >
            <Ionicons
              name="person-circle-outline"
              size={18}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.managementButtonText,
                { color: theme.colors.gold },
              ]}
            >
              View Profile
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.managementButton,
              {
                backgroundColor: theme.colors.infoSoft,
                borderColor: theme.colors.info,
              },
            ]}
            onPress={() =>
              sharePassengerSummary(passenger)
            }
          >
            <Ionicons
              name="share-social-outline"
              size={18}
              color={theme.colors.info}
            />
            <Text
              style={[
                styles.managementButtonText,
                { color: theme.colors.info },
              ]}
            >
              Share Summary
            </Text>
          </TouchableOpacity>

          {blacklisted ? (
            <TouchableOpacity
              style={[
                styles.managementButton,
                {
                  backgroundColor:
                    theme.colors.successSoft,
                  borderColor: theme.colors.success,
                },
              ]}
              onPress={() => restorePassenger(passenger)}
              disabled={updating}
            >
              <Ionicons
                name="refresh-circle-outline"
                size={18}
                color={theme.colors.success}
              />
              <Text
                style={[
                  styles.managementButtonText,
                  { color: theme.colors.success },
                ]}
              >
                Restore
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.managementButton,
                {
                  backgroundColor: theme.colors.dangerSoft,
                  borderColor: theme.colors.danger,
                },
              ]}
              onPress={() => blacklistPassenger(passenger)}
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
                    name="ban-outline"
                    size={18}
                    color={theme.colors.danger}
                  />
                  <Text
                    style={[
                      styles.managementButtonText,
                      { color: theme.colors.danger },
                    ]}
                  >
                    Blacklist
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
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
          Loading Passenger Operations Center...
        </Text>
      </View>
    );
  }

  const filters: {
    key: PassengerFilter;
    label: string;
    count: number;
  }[] = [
    {
      key: "all",
      label: "All",
      count: passengers.length,
    },
    {
      key: "active",
      label: "With Trips",
      count: passengers.filter(
        (passenger) =>
          passengerBookings(passenger).length > 0
      ).length,
    },
    {
      key: "travelling",
      label: "Travelling",
      count: summary.travelling.length,
    },
    {
      key: "student",
      label: "Students",
      count: summary.student.length,
    },
    {
      key: "vip",
      label: "VIP",
      count: summary.vip.length,
    },
    {
      key: "support",
      label: "Support",
      count: summary.supportQueue.length,
    },
    {
      key: "blacklisted",
      label: "Blacklisted",
      count: summary.blacklisted.length,
    },
    {
      key: "new",
      label: "New",
      count: summary.newPassengers.length,
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
                await loadPassengerData(false);
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
                Passenger Operations Center
              </Text>

              <Text
                style={[
                  styles.pageSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                Monitor passenger profiles, trips, safety, support,
                student status, rewards, and lifetime value.
              </Text>
            </View>
          </View>

          <View style={styles.metricGrid}>
            <MetricCard
              label="Total Passengers"
              value={passengers.length}
              icon="people-outline"
              tone="gold"
            />

            <MetricCard
              label="Travelling"
              value={summary.travelling.length}
              icon="navigate-outline"
              tone="success"
            />

            <MetricCard
              label="Student Riders"
              value={summary.student.length}
              icon="school-outline"
              tone="info"
            />

            <MetricCard
              label="VIP Members"
              value={summary.vip.length}
              icon="diamond-outline"
              tone="gold"
            />

            <MetricCard
              label="Lifetime Revenue"
              value={money(summary.totalRevenue)}
              icon="cash-outline"
              tone="success"
            />

            <MetricCard
              label="Average Rating"
              value={summary.averageRating.toFixed(1)}
              icon="star-outline"
              tone="gold"
            />

            <MetricCard
              label="Open Support"
              value={summary.supportQueue.length}
              icon="headset-outline"
              tone={
                summary.supportQueue.length > 0
                  ? "warning"
                  : "success"
              }
            />

            <MetricCard
              label="Blacklisted"
              value={summary.blacklisted.length}
              icon="ban-outline"
              tone={
                summary.blacklisted.length > 0
                  ? "danger"
                  : "success"
              }
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
                placeholder="Search passenger, phone, email, route, or emergency contact"
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
                Passengers
              </Text>

              <Text
                style={[
                  styles.resultsSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                {filteredPassengers.length} result
                {filteredPassengers.length === 1 ? "" : "s"}
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
              onPress={() => loadPassengerData(false)}
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

          {filteredPassengers.length === 0 ? (
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
                name="people-outline"
                size={34}
                color={theme.colors.gold}
              />
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.text },
                ]}
              >
                No matching passengers
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
            <View style={styles.passengerGrid}>
              {filteredPassengers.map((passenger) => (
                <PassengerCard
                  key={
                    passenger.user_id ||
                    passenger.id ||
                    passengerEmail(passenger) ||
                    passengerPhone(passenger)
                  }
                  passenger={passenger}
                />
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
                  backgroundColor:
                    theme.colors.surfaceElevated,
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
                    PASSENGER PROFILE
                  </Text>

                  <Text
                    style={[
                      styles.modalTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    {selectedPassenger
                      ? passengerName(selectedPassenger)
                      : "Passenger Details"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.modalClose,
                    {
                      backgroundColor:
                        theme.colors.surfaceSoft,
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

              {selectedPassenger ? (
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
                    PASSENGER SUMMARY
                  </Text>

                  {[
                    [
                      "Email",
                      passengerEmail(selectedPassenger) ||
                        "Not provided",
                    ],
                    [
                      "Phone",
                      passengerPhone(selectedPassenger) ||
                        "Not provided",
                    ],
                    [
                      "Rating",
                      passengerRating(selectedPassenger).toFixed(1),
                    ],
                    [
                      "Total Trips",
                      String(
                        passengerBookings(selectedPassenger).length
                      ),
                    ],
                    [
                      "Completed Trips",
                      String(
                        passengerCompletedTrips(
                          selectedPassenger
                        ).length
                      ),
                    ],
                    [
                      "Cancelled Trips",
                      String(
                        passengerCancelledTrips(
                          selectedPassenger
                        ).length
                      ),
                    ],
                    [
                      "Lifetime Revenue",
                      money(passengerRevenue(selectedPassenger)),
                    ],
                    [
                      "Average Trip Value",
                      money(averageTripValue(selectedPassenger)),
                    ],
                    [
                      "Rewards Balance",
                      money(rewardsBalance(selectedPassenger)),
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
                    SAFETY & CONTACT
                  </Text>

                  {[
                    [
                      "Emergency Contact",
                      selectedPassenger.emergency_contact_name ||
                        "Not provided",
                    ],
                    [
                      "Emergency Phone",
                      selectedPassenger.emergency_contact_phone ||
                        "Not provided",
                    ],
                    [
                      "Family Check-ins",
                      String(
                        passengerCheckins(selectedPassenger).length
                      ),
                    ],
                    [
                      "Open Support Cases",
                      String(
                        passengerSupport(
                          selectedPassenger
                        ).filter(isOpenRecord).length
                      ),
                    ],
                    [
                      "Account Status",
                      isBlacklisted(selectedPassenger)
                        ? "Blacklisted"
                        : selectedPassenger.status ||
                          selectedPassenger.account_status ||
                          "Active",
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
                              label === "Account Status" &&
                              value === "Blacklisted"
                                ? theme.colors.danger
                                : theme.colors.text,
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
                    PREFERENCES
                  </Text>

                  {[
                    [
                      "Quiet Ride",
                      selectedPassenger.quiet_ride
                        ? "Yes"
                        : "No",
                    ],
                    [
                      "Preferred Music",
                      selectedPassenger.preferred_music
                        ? "Yes"
                        : "No",
                    ],
                    [
                      "Luggage Count",
                      String(
                        selectedPassenger.luggage_count || 0
                      ),
                    ],
                    [
                      "Notes",
                      selectedPassenger.notes ||
                        selectedPassenger.special_notes ||
                        "No notes",
                    ],
                    [
                      "Ride Preferences",
                      selectedPassenger.preferences ||
                        selectedPassenger.ride_preferences ||
                        "No preferences",
                    ],
                    [
                      "Frequent Route",
                      frequentRoute(selectedPassenger),
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
                    RECENT TRIPS
                  </Text>

                  {passengerBookings(selectedPassenger)
                    .slice(0, 5)
                    .map((trip) => (
                      <View
                        key={String(trip.id)}
                        style={[
                          styles.tripCard,
                          {
                            backgroundColor:
                              theme.colors.surfaceSoft,
                            borderColor:
                              theme.colors.cardBorder,
                          },
                        ]}
                      >
                        <View style={styles.tripTopRow}>
                          <Text
                            style={[
                              styles.tripId,
                              { color: theme.colors.text },
                            ]}
                          >
                            Trip #{trip.id}
                          </Text>

                          <Text
                            style={[
                              styles.tripStatus,
                              {
                                color: isCompleted(trip)
                                  ? theme.colors.success
                                  : isCancelled(trip)
                                    ? theme.colors.danger
                                    : theme.colors.warning,
                              },
                            ]}
                          >
                            {trip.status || "Unknown"}
                          </Text>
                        </View>

                        <Text
                          style={[
                            styles.tripRoute,
                            {
                              color:
                                theme.colors.textSecondary,
                            },
                          ]}
                        >
                          {trip.pickup_address ||
                            trip.pickup ||
                            "Pickup"}{" "}
                          →{" "}
                          {trip.dropoff_address ||
                            trip.dropoff ||
                            "Drop-off"}
                        </Text>

                        <Text
                          style={[
                            styles.tripAmount,
                            { color: theme.colors.gold },
                          ]}
                        >
                          {money(bookingAmount(trip))}
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

  refreshText: {
    marginLeft: 7,
    fontSize: 12,
    fontWeight: "800",
  },

  passengerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  passengerCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },

  passengerHeader: {
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

  avatarText: {
    fontSize: 23,
    fontWeight: "900",
  },

  activityDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 15,
    height: 15,
    borderRadius: 999,
    borderWidth: 3,
  },

  passengerTitleArea: {
    flex: 1,
    paddingRight: 8,
  },

  passengerName: {
    fontSize: 16,
    fontWeight: "900",
  },

  passengerContact: {
    marginTop: 3,
    fontSize: 9.5,
    fontWeight: "600",
  },

  headerBadges: {
    alignItems: "flex-end",
    gap: 6,
  },

  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  headerBadgeText: {
    marginLeft: 4,
    fontSize: 8.5,
    fontWeight: "900",
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

  infoBlock: {
    marginTop: 18,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },

  infoTextArea: {
    flex: 1,
    marginLeft: 10,
  },

  infoLabel: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  infoValue: {
    marginTop: 4,
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "700",
  },

  infoSubValue: {
    marginTop: 3,
    fontSize: 10.5,
    fontWeight: "600",
  },

  contactActions: {
    flexDirection: "row",
    marginTop: 10,
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

  detailsSectionTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
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

  tripCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },

  tripTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  tripId: {
    fontSize: 12,
    fontWeight: "900",
  },

  tripStatus: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "capitalize",
  },

  tripRoute: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 17,
  },

  tripAmount: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "900",
  },
});
