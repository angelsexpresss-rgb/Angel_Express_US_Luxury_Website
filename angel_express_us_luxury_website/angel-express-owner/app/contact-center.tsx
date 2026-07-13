import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
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
  status?: string | null;
  source?: string | null;
  user_id?: string | null;
  passenger_id?: string | null;
  name?: string | null;
  passenger_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  passenger_email?: string | null;
  phone?: string | null;
  passenger_phone?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  driver_id?: string | null;
  assigned_driver_id?: string | null;
  driver_name?: string | null;
  assigned_driver_name?: string | null;
  driver_phone?: string | null;
  assigned_driver_phone?: string | null;
  pickup?: string | null;
  pickup_address?: string | null;
  dropoff?: string | null;
  dropoff_address?: string | null;
};

type DriverRecord = GenericRecord & {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  driver_phone?: string | null;
  status?: string | null;
  is_online?: boolean | null;
};

type PassengerRecord = GenericRecord & {
  id?: string | number;
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
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
};

type ContactFilter =
  | "all"
  | "passengers"
  | "drivers"
  | "online"
  | "active"
  | "support"
  | "emergency"
  | "unread";

type Tone = "gold" | "success" | "warning" | "danger" | "info";

function normalize(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

function isActiveTrip(booking: BookingRecord) {
  return [
    "pending",
    "confirmed",
    "driverassigned",
    "assigned",
    "driveraccepted",
    "accepted",
    "arrivedatpickup",
    "driverarrived",
    "pickedup",
    "inprogress",
    "active",
  ].includes(normalize(booking.status));
}

function passengerName(booking: BookingRecord) {
  return (
    booking.name ||
    booking.passenger_name ||
    booking.full_name ||
    booking.email ||
    "Passenger"
  );
}

function passengerPhone(booking: BookingRecord) {
  return booking.phone || booking.passenger_phone || "";
}

function driverName(booking: BookingRecord) {
  return (
    booking.assigned_driver_name ||
    booking.driver_name ||
    "Assigned Driver"
  );
}

function driverPhone(booking: BookingRecord) {
  return (
    booking.assigned_driver_phone ||
    booking.driver_phone ||
    ""
  );
}

function driverDisplayName(driver: DriverRecord) {
  return (
    `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
    driver.full_name ||
    driver.name ||
    "Driver"
  );
}

function passengerDisplayName(passenger: PassengerRecord) {
  return (
    `${passenger.first_name || ""} ${passenger.last_name || ""}`.trim() ||
    passenger.full_name ||
    passenger.name ||
    passenger.email ||
    "Passenger"
  );
}

function passengerDisplayPhone(passenger: PassengerRecord) {
  return (
    passenger.phone ||
    passenger.passenger_phone ||
    passenger.phone_number ||
    ""
  );
}

function cleanPhone(phone?: string | null) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

export default function ContactCenterScreen() {
  const { theme, isDark } = useOwnerTheme();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [passengers, setPassengers] = useState<PassengerRecord[]>([]);
  const [chatMessages, setChatMessages] = useState<GenericRecord[]>([]);
  const [supportMessages, setSupportMessages] = useState<GenericRecord[]>([]);
  const [driverSupportMessages, setDriverSupportMessages] =
    useState<GenericRecord[]>([]);
  const [passengerNotifications, setPassengerNotifications] =
    useState<GenericRecord[]>([]);
  const [driverNotifications, setDriverNotifications] =
    useState<GenericRecord[]>([]);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ContactFilter>("all");

  const [broadcastVisible, setBroadcastVisible] = useState(false);
  const [broadcastAudience, setBroadcastAudience] =
    useState<"drivers" | "passengers">("drivers");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");

  const isTablet = width >= 700;
  const isLarge = width >= 1050;

  useFocusEffect(
    useCallback(() => {
      loadCommunicationData();
    }, [])
  );

  useEffect(() => {
    const channel = supabase
      .channel("owner-communication-hub")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => loadCommunicationData(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_messages" },
        () => loadCommunicationData(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_support_messages",
        },
        () => loadCommunicationData(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadCommunicationData(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadCommunicationData(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const [
        bookingsResponse,
        driversResponse,
        passengersResponse,
        profilesResponse,
        chatResponse,
        supportResponse,
        driverSupportResponse,
        passengerNotificationsResponse,
        driverNotificationsResponse,
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("drivers")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase.from("passengers").select("*"),

        supabase.from("passenger_profiles").select("*"),

        supabase
          .from("chat_messages")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("support_messages")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("driver_support_messages")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("passenger_notifications")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("driver_notifications")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (bookingsResponse.error) throw bookingsResponse.error;
      if (driversResponse.error) throw driversResponse.error;

      setBookings(bookingsResponse.data || []);
      setDrivers(driversResponse.data || []);
      setPassengers([
        ...(passengersResponse.data || []),
        ...(profilesResponse.data || []),
      ]);
      setChatMessages(chatResponse.data || []);
      setSupportMessages(supportResponse.data || []);
      setDriverSupportMessages(driverSupportResponse.data || []);
      setPassengerNotifications(passengerNotificationsResponse.data || []);
      setDriverNotifications(driverNotificationsResponse.data || []);
    } catch (error: any) {
      Alert.alert(
        "Communication Hub Error",
        error?.message || "Unable to load communication data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  function whatsappNumber(
    phone: string | null | undefined,
    message: string
  ) {
    const cleaned = cleanPhone(phone).replace("+", "");

    if (!cleaned) {
      Alert.alert(
        "WhatsApp unavailable",
        "No WhatsApp number is available."
      );
      return;
    }

    Linking.openURL(
      `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`
    );
  }

  function openChat(
    booking: BookingRecord,
    receiverRole: "passenger" | "driver" | "emergency"
  ) {
    router.push({
      pathname: "/owner-chat",
      params: {
        bookingId: String(booking.id),
        receiverRole,
        passengerName: passengerName(booking),
        driverName: driverName(booking),
      },
    } as any);
  }

  function chatCountForBooking(bookingId: string | number) {
    return chatMessages.filter(
      (message) =>
        String(message.booking_id) === String(bookingId)
    ).length;
  }

  function unreadChatCountForBooking(
    bookingId: string | number
  ) {
    return chatMessages.filter(
      (message) =>
        String(message.booking_id) === String(bookingId) &&
        message.sender_role !== "owner" &&
        (message.is_read === false ||
          message.read_at == null)
    ).length;
  }

  function isSupportOpen(record: GenericRecord) {
    return ![
      "resolved",
      "closed",
      "dismissed",
    ].includes(
      normalize(
        record.status ||
          record.ticket_status ||
          record.resolution_status
      )
    );
  }

  async function sendBroadcast() {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      Alert.alert(
        "Missing Information",
        "Enter a title and message."
      );
      return;
    }

    try {
      setSendingBroadcast(true);

      if (broadcastAudience === "drivers") {
        const rows = drivers.map((driver) => ({
          driver_id: driver.id,
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          type: "announcement",
          priority: "normal",
          is_read: false,
          sent_by: "owner",
        }));

        if (rows.length === 0) {
          Alert.alert("No Drivers", "No drivers are available.");
          return;
        }

        const { error } = await supabase
          .from("driver_notifications")
          .insert(rows);

        if (error) throw error;
      } else {
        const uniquePassengers = new Map<string, PassengerRecord>();

        passengers.forEach((passenger) => {
          const key = String(
            passenger.user_id ||
              passenger.id ||
              passenger.passenger_id ||
              passenger.email ||
              ""
          );

          if (key) uniquePassengers.set(key, passenger);
        });

        const rows = Array.from(uniquePassengers.values()).map(
          (passenger) => ({
            passenger_id:
              passenger.user_id ||
              passenger.id ||
              passenger.passenger_id,
            title: broadcastTitle.trim(),
            message: broadcastMessage.trim(),
            type: "announcement",
            priority: "normal",
            is_read: false,
            sent_by: "owner",
          })
        );

        if (rows.length === 0) {
          Alert.alert(
            "No Passengers",
            "No passenger profiles are available."
          );
          return;
        }

        const { error } = await supabase
          .from("passenger_notifications")
          .insert(rows);

        if (error) throw error;
      }

      Alert.alert(
        "Broadcast Sent",
        `Announcement sent to all ${broadcastAudience}.`
      );

      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastVisible(false);
      loadCommunicationData(false);
    } catch (error: any) {
      Alert.alert(
        "Broadcast Failed",
        error?.message || "Unable to send the announcement."
      );
    } finally {
      setSendingBroadcast(false);
    }
  }

  const activeTrips = useMemo(
    () => bookings.filter(isActiveTrip),
    [bookings]
  );

  const activePassengerTrips = useMemo(
    () =>
      activeTrips.filter((booking) =>
        Boolean(passengerPhone(booking))
      ),
    [activeTrips]
  );

  const activeDriverTrips = useMemo(
    () =>
      activeTrips.filter((booking) =>
        Boolean(driverPhone(booking))
      ),
    [activeTrips]
  );

  const emergencyTrips = useMemo(
    () =>
      activeTrips.filter((booking) =>
        Boolean(booking.emergency_contact_phone)
      ),
    [activeTrips]
  );

  const onlineDrivers = useMemo(
    () =>
      drivers.filter((driver) => driver.is_online === true),
    [drivers]
  );

  const openSupportCount = useMemo(
    () =>
      supportMessages.filter(isSupportOpen).length +
      driverSupportMessages.filter(isSupportOpen).length,
    [supportMessages, driverSupportMessages]
  );

  const unreadCount = useMemo(
    () =>
      chatMessages.filter(
        (message) =>
          message.sender_role !== "owner" &&
          (message.is_read === false ||
            message.read_at == null)
      ).length,
    [chatMessages]
  );

  function matchesFilter(booking: BookingRecord) {
    switch (filter) {
      case "passengers":
        return Boolean(passengerPhone(booking));
      case "drivers":
        return Boolean(driverPhone(booking));
      case "online":
        return onlineDrivers.some(
          (driver) =>
            String(driver.id) ===
            String(
              booking.driver_id ||
                booking.assigned_driver_id ||
                ""
            )
        );
      case "active":
        return isActiveTrip(booking);
      case "support":
        return openSupportCount > 0;
      case "emergency":
        return Boolean(booking.emergency_contact_phone);
      case "unread":
        return unreadChatCountForBooking(booking.id) > 0;
      case "all":
      default:
        return true;
    }
  }

  const filteredTrips = useMemo(() => {
    const search = query.trim().toLowerCase();

    return activeTrips.filter((booking) => {
      if (!matchesFilter(booking)) return false;

      if (!search) return true;

      return [
        booking.id,
        passengerName(booking),
        passengerPhone(booking),
        driverName(booking),
        driverPhone(booking),
        booking.emergency_contact_name,
        booking.emergency_contact_phone,
        booking.status,
        booking.pickup,
        booking.dropoff,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [
    activeTrips,
    filter,
    query,
    chatMessages,
    onlineDrivers,
    openSupportCount,
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

  function ContactTripCard({
    booking,
  }: {
    booking: BookingRecord;
  }) {
    const unread = unreadChatCountForBooking(booking.id);
    const chatCount = chatCountForBooking(booking.id);

    return (
      <View
        style={[
          styles.contactCard,
          {
            width: cardWidth(),
            backgroundColor: theme.colors.card,
            borderColor:
              unread > 0
                ? theme.colors.gold
                : theme.colors.cardBorder,
          },
          theme.shadows.soft,
        ]}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.cardIcon,
              {
                backgroundColor:
                  theme.colors.goldTransparent,
              },
            ]}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={22}
              color={theme.colors.gold}
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
              {booking.status || "Active"}
            </Text>
          </View>

          {unread > 0 ? (
            <View
              style={[
                styles.unreadBadge,
                { backgroundColor: theme.colors.danger },
              ]}
            >
              <Text style={styles.unreadBadgeText}>
                {unread}
              </Text>
            </View>
          ) : null}
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
              PASSENGER
            </Text>
            <Text
              style={[
                styles.personName,
                { color: theme.colors.text },
              ]}
              numberOfLines={1}
            >
              {passengerName(booking)}
            </Text>
            <Text
              style={[
                styles.personPhone,
                { color: theme.colors.textMuted },
              ]}
            >
              {passengerPhone(booking) || "Phone unavailable"}
            </Text>
          </View>

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
              {driverName(booking)}
            </Text>
            <Text
              style={[
                styles.personPhone,
                { color: theme.colors.textMuted },
              ]}
            >
              {driverPhone(booking) || "Phone unavailable"}
            </Text>
          </View>
        </View>

        <View style={styles.messageSummary}>
          <Ionicons
            name="mail-unread-outline"
            size={18}
            color={theme.colors.info}
          />
          <Text
            style={[
              styles.messageSummaryText,
              { color: theme.colors.textSecondary },
            ]}
          >
            {chatCount} message{chatCount === 1 ? "" : "s"} in this trip
          </Text>
        </View>

        <View style={styles.contactActions}>
          <TouchableOpacity
            style={styles.contactAction}
            onPress={() =>
              callNumber(passengerPhone(booking))
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
              Passenger
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactAction}
            onPress={() =>
              textNumber(
                passengerPhone(booking),
                `Hello ${passengerName(
                  booking
                )}, this is Angel Express contacting you about Trip #${booking.id}.`
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
              SMS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactAction}
            onPress={() =>
              whatsappNumber(
                passengerPhone(booking),
                `Hello ${passengerName(
                  booking
                )}, this is Angel Express contacting you about Trip #${booking.id}.`
              )
            }
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
            onPress={() => openChat(booking, "passenger")}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={20}
              color={theme.colors.gold}
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
            styles.driverActions,
            { borderTopColor: theme.colors.divider },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.driverActionButton,
              {
                backgroundColor: theme.colors.infoSoft,
                borderColor: theme.colors.info,
              },
            ]}
            onPress={() => callNumber(driverPhone(booking))}
          >
            <Ionicons
              name="car-outline"
              size={17}
              color={theme.colors.info}
            />
            <Text
              style={[
                styles.driverActionText,
                { color: theme.colors.info },
              ]}
            >
              Call Driver
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.driverActionButton,
              {
                backgroundColor:
                  theme.colors.goldTransparent,
                borderColor: theme.colors.gold,
              },
            ]}
            onPress={() => openChat(booking, "driver")}
          >
            <Ionicons
              name="chatbox-ellipses-outline"
              size={17}
              color={theme.colors.gold}
            />
            <Text
              style={[
                styles.driverActionText,
                { color: theme.colors.gold },
              ]}
            >
              Driver Chat
            </Text>
          </TouchableOpacity>

          {booking.emergency_contact_phone ? (
            <TouchableOpacity
              style={[
                styles.driverActionButton,
                {
                  backgroundColor: theme.colors.dangerSoft,
                  borderColor: theme.colors.danger,
                },
              ]}
              onPress={() =>
                callNumber(booking.emergency_contact_phone)
              }
            >
              <Ionicons
                name="warning-outline"
                size={17}
                color={theme.colors.danger}
              />
              <Text
                style={[
                  styles.driverActionText,
                  { color: theme.colors.danger },
                ]}
              >
                Emergency
              </Text>
            </TouchableOpacity>
          ) : null}
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
          Loading Communication Hub...
        </Text>
      </View>
    );
  }

  const filters: {
    key: ContactFilter;
    label: string;
    count: number;
  }[] = [
    { key: "all", label: "All", count: activeTrips.length },
    {
      key: "passengers",
      label: "Passengers",
      count: activePassengerTrips.length,
    },
    {
      key: "drivers",
      label: "Drivers",
      count: activeDriverTrips.length,
    },
    {
      key: "online",
      label: "Online Drivers",
      count: onlineDrivers.length,
    },
    {
      key: "active",
      label: "Active Trips",
      count: activeTrips.length,
    },
    {
      key: "support",
      label: "Support",
      count: openSupportCount,
    },
    {
      key: "emergency",
      label: "Emergency",
      count: emergencyTrips.length,
    },
    {
      key: "unread",
      label: "Unread",
      count: unreadCount,
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
                await loadCommunicationData(false);
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
                ANGEL EXPRESS COMMUNICATIONS
              </Text>

              <Text
                style={[
                  styles.pageTitle,
                  { color: theme.colors.text },
                ]}
              >
                Communication Hub
              </Text>

              <Text
                style={[
                  styles.pageSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                Contact passengers, drivers, emergency contacts,
                support teams, and active trip participants from one
                operations console.
              </Text>
            </View>
          </View>

          <View style={styles.metricGrid}>
            <MetricCard
              label="Active Passengers"
              value={activePassengerTrips.length}
              icon="people-outline"
              tone="info"
            />

            <MetricCard
              label="Assigned Drivers"
              value={activeDriverTrips.length}
              icon="car-outline"
              tone="gold"
            />

            <MetricCard
              label="Online Drivers"
              value={onlineDrivers.length}
              icon="radio-outline"
              tone="success"
            />

            <MetricCard
              label="Unread Messages"
              value={unreadCount}
              icon="mail-unread-outline"
              tone={unreadCount > 0 ? "warning" : "success"}
            />

            <MetricCard
              label="Open Support"
              value={openSupportCount}
              icon="headset-outline"
              tone={openSupportCount > 0 ? "warning" : "success"}
            />

            <MetricCard
              label="Emergency Contacts"
              value={emergencyTrips.length}
              icon="warning-outline"
              tone="danger"
            />

            <MetricCard
              label="Driver Notifications"
              value={driverNotifications.length}
              icon="notifications-outline"
              tone="gold"
            />

            <MetricCard
              label="Passenger Notifications"
              value={passengerNotifications.length}
              icon="notifications-circle-outline"
              tone="info"
            />
          </View>

          <View style={styles.broadcastRow}>
            <TouchableOpacity
              style={[
                styles.broadcastButton,
                {
                  backgroundColor: theme.colors.gold,
                },
              ]}
              onPress={() => {
                setBroadcastAudience("drivers");
                setBroadcastVisible(true);
              }}
            >
              <Ionicons
                name="megaphone-outline"
                size={20}
                color={theme.colors.textInverse}
              />
              <Text
                style={[
                  styles.broadcastButtonText,
                  { color: theme.colors.textInverse },
                ]}
              >
                Broadcast to Drivers
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.broadcastButton,
                {
                  backgroundColor: theme.colors.infoSoft,
                  borderColor: theme.colors.info,
                  borderWidth: 1,
                },
              ]}
              onPress={() => {
                setBroadcastAudience("passengers");
                setBroadcastVisible(true);
              }}
            >
              <Ionicons
                name="people-circle-outline"
                size={20}
                color={theme.colors.info}
              />
              <Text
                style={[
                  styles.broadcastButtonText,
                  { color: theme.colors.info },
                ]}
              >
                Broadcast to Passengers
              </Text>
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
                placeholder="Search trip, passenger, driver, phone, status, or route"
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
                Active Communication Threads
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
              onPress={() => loadCommunicationData(false)}
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
                name="chatbubbles-outline"
                size={36}
                color={theme.colors.gold}
              />

              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.text },
                ]}
              >
                No matching communication threads
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textMuted },
                ]}
              >
                Active trip conversations and contact tools will appear
                here.
              </Text>
            </View>
          ) : (
            <View style={styles.contactGrid}>
              {filteredTrips.map((booking) => (
                <ContactTripCard
                  key={String(booking.id)}
                  booking={booking}
                />
              ))}
            </View>
          )}

          <View style={styles.directoryHeader}>
            <Text
              style={[
                styles.resultsTitle,
                { color: theme.colors.text },
              ]}
            >
              Driver Directory
            </Text>
            <Text
              style={[
                styles.resultsSubtitle,
                { color: theme.colors.textMuted },
              ]}
            >
              {drivers.length} registered driver
              {drivers.length === 1 ? "" : "s"}
            </Text>
          </View>

          <View style={styles.directoryGrid}>
            {drivers.map((driver) => {
              const phone = driver.phone || driver.driver_phone || "";
              const message = `Hello ${driverDisplayName(
                driver
              )}, this is Angel Express dispatch.`;

              return (
                <View
                  key={driver.id}
                  style={[
                    styles.directoryCard,
                    {
                      width: cardWidth(),
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.directoryHeaderRow}>
                    <View
                      style={[
                        styles.directoryAvatar,
                        {
                          backgroundColor:
                            theme.colors.goldTransparent,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.directoryAvatarText,
                          { color: theme.colors.gold },
                        ]}
                      >
                        {driverDisplayName(driver)
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.directoryTitleArea}>
                      <Text
                        style={[
                          styles.directoryName,
                          { color: theme.colors.text },
                        ]}
                      >
                        {driverDisplayName(driver)}
                      </Text>
                      <Text
                        style={[
                          styles.directoryMeta,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {driver.status || "unknown"}{" "}
                        {driver.is_online ? "• Online" : ""}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.directoryActions}>
                    <TouchableOpacity
                      style={styles.directoryAction}
                      onPress={() => callNumber(phone)}
                    >
                      <Ionicons
                        name="call-outline"
                        size={19}
                        color={theme.colors.success}
                      />
                      <Text
                        style={[
                          styles.directoryActionText,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        Call
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.directoryAction}
                      onPress={() =>
                        textNumber(phone, message)
                      }
                    >
                      <Ionicons
                        name="chatbubble-outline"
                        size={19}
                        color={theme.colors.info}
                      />
                      <Text
                        style={[
                          styles.directoryActionText,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        SMS
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.directoryAction}
                      onPress={() =>
                        whatsappNumber(phone, message)
                      }
                    >
                      <Ionicons
                        name="logo-whatsapp"
                        size={19}
                        color={theme.colors.success}
                      />
                      <Text
                        style={[
                          styles.directoryActionText,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        WhatsApp
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <Modal
          visible={broadcastVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setBroadcastVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalKeyboardView}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
          >
            <View style={styles.modalBackdrop}>
              <View
                style={[
                  styles.broadcastModal,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.cardBorderStrong,
                  },
                ]}
              >
                <View style={styles.modalHandle} />

                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleArea}>
                    <Text
                      style={[
                        styles.modalEyebrow,
                        { color: theme.colors.gold },
                      ]}
                    >
                      BROADCAST ANNOUNCEMENT
                    </Text>
                    <Text
                      style={[
                        styles.modalTitle,
                        { color: theme.colors.text },
                      ]}
                    >
                      Send to all {broadcastAudience}
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
                    onPress={() => setBroadcastVisible(false)}
                  >
                    <Ionicons
                      name="close"
                      size={21}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.broadcastModalContent}
                >
                  <TextInput
                    value={broadcastTitle}
                    onChangeText={setBroadcastTitle}
                    placeholder="Announcement title"
                    placeholderTextColor={theme.colors.inputPlaceholder}
                    returnKeyType="next"
                    style={[
                      styles.modalInput,
                      {
                        color: theme.colors.text,
                        backgroundColor: theme.colors.inputBackground,
                        borderColor: theme.colors.inputBorder,
                      },
                    ]}
                  />

                  <TextInput
                    value={broadcastMessage}
                    onChangeText={setBroadcastMessage}
                    placeholder="Write the announcement..."
                    placeholderTextColor={theme.colors.inputPlaceholder}
                    multiline
                    textAlignVertical="top"
                    style={[
                      styles.modalTextArea,
                      {
                        color: theme.colors.text,
                        backgroundColor: theme.colors.inputBackground,
                        borderColor: theme.colors.inputBorder,
                      },
                    ]}
                  />

                  <TouchableOpacity
                    style={[
                      styles.sendBroadcastButton,
                      {
                        backgroundColor: theme.colors.gold,
                      },
                    ]}
                    onPress={sendBroadcast}
                    disabled={sendingBroadcast}
                  >
                    {sendingBroadcast ? (
                      <ActivityIndicator
                        color={theme.colors.textInverse}
                      />
                    ) : (
                      <>
                        <Ionicons
                          name="send-outline"
                          size={18}
                          color={theme.colors.textInverse}
                        />
                        <Text
                          style={[
                            styles.sendBroadcastText,
                            { color: theme.colors.textInverse },
                          ]}
                        >
                          Send Broadcast
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <View style={styles.modalBottomSpace} />
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
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

  broadcastRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  broadcastButton: {
    flex: 1,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  broadcastButtonText: {
    marginLeft: 8,
    fontSize: 11.5,
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

  contactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  contactCard: {
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
  unreadBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  unreadBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
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

  messageSummary: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  messageSummaryText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    fontWeight: "700",
  },

  contactActions: {
    flexDirection: "row",
    marginTop: 15,
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

  driverActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 14,
  },
  driverActionButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
  },
  driverActionText: {
    marginLeft: 6,
    fontSize: 10.5,
    fontWeight: "900",
  },

  directoryHeader: {
    marginTop: 18,
    marginBottom: 14,
  },
  directoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  directoryCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  directoryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  directoryAvatar: {
    width: 47,
    height: 47,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  directoryAvatarText: {
    fontSize: 20,
    fontWeight: "900",
  },
  directoryTitleArea: {
    flex: 1,
  },
  directoryName: {
    fontSize: 14,
    fontWeight: "900",
  },
  directoryMeta: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "600",
  },
  directoryActions: {
    flexDirection: "row",
    marginTop: 15,
  },
  directoryAction: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
  },
  directoryActionText: {
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
    lineHeight: 18,
    textAlign: "center",
  },

  modalKeyboardView: {
    flex: 1,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.66)",
    justifyContent: "flex-end",
  },
  broadcastModal: {
    maxHeight: "88%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
  },

  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.55)",
    alignSelf: "center",
    marginBottom: 10,
  },

  broadcastModalContent: {
    paddingBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
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
  modalInput: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  modalTextArea: {
    minHeight: 140,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    textAlignVertical: "top",
    marginBottom: 14,
  },
  sendBroadcastButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  sendBroadcastText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: "900",
  },

  modalBottomSpace: {
    height: 18,
  },
});
